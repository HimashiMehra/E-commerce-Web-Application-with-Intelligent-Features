const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');

// Helpers to update stock level
const decreaseStock = async (items) => {
  for (const item of items) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: -item.quantity },
    });
  }
};

const increaseStock = async (items) => {
  for (const item of items) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: item.quantity },
    });
  }
};

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createOrder = asyncHandler(async (req, res) => {
  const { orderItems, shippingAddress, paymentMethod = 'stripe' } = req.body;

  if (!orderItems || orderItems.length === 0) {
    res.status(400);
    throw new Error('No order items.');
  }
  if (!shippingAddress) {
    res.status(400);
    throw new Error('Shipping address is required.');
  }

  // Check stock availability
  for (const item of orderItems) {
    const product = await Product.findById(item.product);
    if (!product) {
      res.status(404);
      throw new Error(`Product ${item.name} not found.`);
    }
    if (product.stock < item.quantity) {
      res.status(400);
      throw new Error(`Insufficient stock for ${item.name}. Only ${product.stock} left.`);
    }
  }

  // Calculate prices
  const itemsPrice = parseFloat(
    orderItems.reduce((acc, item) => acc + item.price * item.quantity, 0).toFixed(2)
  );
  const shippingPrice = itemsPrice >= 499 ? 0 : 40;
  const taxPrice      = parseFloat((itemsPrice * 0.18).toFixed(2)); // 18% GST
  const totalPrice    = parseFloat((itemsPrice + shippingPrice + taxPrice).toFixed(2));

  const order = await Order.create({
    user:            req.user._id,
    orderItems,
    shippingAddress,
    paymentMethod,
    itemsPrice,
    shippingPrice,
    taxPrice,
    totalPrice,
  });

  // Decrease stock immediately
  await decreaseStock(orderItems);

  res.status(201).json({ success: true, order });
});

// @desc    Get logged-in user's orders
// @route   GET /api/orders/myorders
// @access  Private
const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .select('-__v');

  res.json({ success: true, orders });
});

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email');

  if (!order) {
    res.status(404);
    throw new Error('Order not found.');
  }

  // Ensure the user owns the order (or is admin)
  if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to view this order.');
  }

  res.json({ success: true, order });
});

// @desc    Get all orders (admin)
// @route   GET /api/orders
// @access  Private/Admin
const getAllOrders = asyncHandler(async (req, res) => {
  const page  = parseInt(req.query.page)  || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip  = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    Order.find({})
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Order.countDocuments({}),
  ]);

  // Summary stats
  const stats = await Order.aggregate([
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$totalPrice' },
        totalOrders:  { $sum: 1 },
        paidOrders:   { $sum: { $cond: ['$isPaid', 1, 0] } },
      },
    },
  ]);

  res.json({
    success: true,
    orders,
    page,
    pages: Math.ceil(total / limit),
    total,
    stats: stats[0] || { totalRevenue: 0, totalOrders: 0, paidOrders: 0 },
  });
});
// @desc    Update order status (admin)
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { orderStatus } = req.body;
  const validStatuses = ['processing', 'confirmed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'];

  if (!validStatuses.includes(orderStatus)) {
    res.status(400);
    throw new Error(`Invalid status. Valid: ${validStatuses.join(', ')}`);
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found.');
  }

  // If status is changed to cancelled and it wasn't cancelled before, restore stock
  if (orderStatus === 'cancelled' && order.orderStatus !== 'cancelled') {
    await increaseStock(order.orderItems);
    if (order.isPaid || order.paymentStatus === 'paid') {
      order.paymentStatus = 'refund_pending';
    }
  }

  order.orderStatus = orderStatus;
  if (orderStatus === 'delivered') {
    order.deliveredAt = Date.now();
  }

  await order.save();
  res.json({ success: true, order });
});

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private
const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found.');
  }

  // Ensure authorized (owner or admin)
  if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized.');
  }

  // Cannot cancel if already shipped/delivered
  const restrictCancel = ['shipped', 'out_for_delivery', 'delivered'];
  if (restrictCancel.includes(order.orderStatus)) {
    res.status(400);
    throw new Error(`Cannot cancel order after it has been ${order.orderStatus.replace(/_/g, ' ')}.`);
  }

  if (order.orderStatus === 'cancelled') {
    res.status(400);
    throw new Error('Order is already cancelled.');
  }

  order.orderStatus = 'cancelled';

  // Restore inventory
  await increaseStock(order.orderItems);

  // Refund status handling
  if (order.isPaid || order.paymentStatus === 'paid') {
    order.paymentStatus = 'refund_pending';
  }

  await order.save();
  res.json({ success: true, message: 'Order cancelled successfully.', order });
});

// @desc    Mark order as paid
// @route   PUT /api/orders/:id/pay
// @access  Private
const payOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found.');
  }

  if (order.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized.');
  }

  order.isPaid = true;
  order.paidAt = Date.now();
  order.paymentStatus = 'paid';
  order.orderStatus = 'confirmed'; // confirm order upon payment!

  await order.save();
  res.json({ success: true, message: 'Order paid successfully.', order });
});

// @desc    Process order refund (Admin only)
// @route   PUT /api/orders/:id/refund
// @access  Private/Admin
const refundOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found.');
  }

  if (order.paymentStatus !== 'refund_pending') {
    res.status(400);
    throw new Error('Refund is not pending for this order.');
  }

  order.paymentStatus = 'refunded';
  await order.save();
  
  res.json({ success: true, message: 'Refund marked as completed.', order });
});

// @desc    Get high-fidelity dashboard metrics (Admin only)
// @route   GET /api/orders/analytics/dashboard
// @access  Private/Admin
const getAnalyticsDashboard = asyncHandler(async (req, res) => {
  // 1. Basic Stats
  const totalOrders = await Order.countDocuments({});
  const cancelledOrders = await Order.countDocuments({ orderStatus: 'cancelled' });
  const refundPendingCount = await Order.countDocuments({ paymentStatus: 'refund_pending' });

  // Total users
  const User = require('../models/User');
  const totalUsers = await User.countDocuments({ role: 'user' });

  // Low stock products
  const lowStockCount = await Product.countDocuments({ stock: { $lt: 5 } });

  // 2. Gross revenue (excluding cancelled orders)
  const revenueData = await Order.aggregate([
    { $match: { orderStatus: { $ne: 'cancelled' } } },
    { $group: { _id: null, total: { $sum: '$totalPrice' } } }
  ]);
  const totalRevenue = revenueData.length > 0 ? revenueData[0].total : 0;

  // 3. Category sales breakdown
  const categorySales = await Order.aggregate([
    { $match: { orderStatus: { $ne: 'cancelled' } } },
    { $unwind: '$orderItems' },
    {
      $lookup: {
        from: 'products',
        localField: 'orderItems.product',
        foreignField: '_id',
        as: 'productInfo'
      }
    },
    { $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: { $ifNull: ['$productInfo.category', 'Other'] },
        totalSales: { $sum: { $multiply: ['$orderItems.price', '$orderItems.quantity'] } }
      }
    },
    { $project: { category: '$_id', totalSales: 1, _id: 0 } }
  ]);

  // 4. Payment methods breakdown
  const paymentMethodStats = await Order.aggregate([
    { $match: { orderStatus: { $ne: 'cancelled' } } },
    {
      $group: {
        _id: '$paymentMethod',
        count: { $sum: 1 },
        revenue: { $sum: '$totalPrice' }
      }
    },
    { $project: { method: '$_id', count: 1, revenue: 1, _id: 0 } }
  ]);

  // 5. Top-selling products
  const topProducts = await Order.aggregate([
    { $match: { orderStatus: { $ne: 'cancelled' } } },
    { $unwind: '$orderItems' },
    {
      $group: {
        _id: '$orderItems.product',
        name: { $first: '$orderItems.name' },
        image: { $first: '$orderItems.image' },
        price: { $first: '$orderItems.price' },
        totalQty: { $sum: '$orderItems.quantity' },
        totalRevenue: { $sum: { $multiply: ['$orderItems.price', '$orderItems.quantity'] } }
      }
    },
    { $sort: { totalQty: -1 } },
    { $limit: 5 }
  ]);

  // Recent 6 orders
  const recentOrders = await Order.find({})
    .populate('user', 'name email')
    .sort({ createdAt: -1 })
    .limit(6);

  res.json({
    success: true,
    stats: {
      totalRevenue,
      totalOrders,
      totalUsers,
      cancelledOrders,
      refundPendingCount,
      lowStockCount
    },
    categorySales,
    paymentMethodStats,
    topProducts,
    recentOrders
  });
});

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  cancelOrder,
  payOrder,
  refundOrder,
  getAnalyticsDashboard
};
