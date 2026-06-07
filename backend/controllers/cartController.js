const asyncHandler = require('express-async-handler');
const Cart = require('../models/Cart');
const Product = require('../models/Product');

// Helper: get or create cart for user
const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) cart = new Cart({ user: userId, items: [] });
  return cart;
};

// @desc    Get current user's cart
// @route   GET /api/cart
// @access  Private
const getCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id }).populate(
    'items.product',
    'name images price stock'
  );
  if (!cart) {
    return res.json({ success: true, cart: { items: [], totalPrice: 0, totalItems: 0 } });
  }
  res.json({ success: true, cart });
});

// @desc    Add item to cart
// @route   POST /api/cart/add
// @access  Private
const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body;

  if (!productId) {
    res.status(400);
    throw new Error('Product ID is required.');
  }

  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error('Product not found.');
  }
  if (product.stock < 1) {
    res.status(400);
    throw new Error('Product is out of stock.');
  }

  const qty = Math.max(1, parseInt(quantity));
  const cart = await getOrCreateCart(req.user._id);

  const existingIdx = cart.items.findIndex(
    (item) => item.product.toString() === productId
  );

  if (existingIdx > -1) {
    const newQty = cart.items[existingIdx].quantity + qty;
    cart.items[existingIdx].quantity = Math.min(newQty, product.stock, 10);
  } else {
    cart.items.push({
      product:  product._id,
      name:     product.name,
      image:    product.images[0],
      price:    product.price,
      quantity: Math.min(qty, product.stock, 10),
    });
  }

  await cart.save();
  res.json({ success: true, message: 'Item added to cart!', cart });
});

// @desc    Update item quantity
// @route   PUT /api/cart/update
// @access  Private
const updateCartItem = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;

  if (!productId || quantity === undefined) {
    res.status(400);
    throw new Error('productId and quantity are required.');
  }

  const cart = await getOrCreateCart(req.user._id);
  const idx = cart.items.findIndex((item) => item.product.toString() === productId);

  if (idx === -1) {
    res.status(404);
    throw new Error('Item not in cart.');
  }

  const qty = parseInt(quantity);
  if (qty < 1) {
    cart.items.splice(idx, 1);
  } else {
    cart.items[idx].quantity = Math.min(qty, 10);
  }

  await cart.save();
  res.json({ success: true, cart });
});

// @desc    Remove item from cart
// @route   DELETE /api/cart/remove/:productId
// @access  Private
const removeFromCart = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const cart = await getOrCreateCart(req.user._id);

  cart.items = cart.items.filter((item) => item.product.toString() !== productId);
  await cart.save();

  res.json({ success: true, message: 'Item removed from cart.', cart });
});

// @desc    Clear entire cart
// @route   DELETE /api/cart/clear
// @access  Private
const clearCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  cart.items = [];
  await cart.save();
  res.json({ success: true, message: 'Cart cleared.', cart });
});

// @desc    Get all carts (Admin only)
// @route   GET /api/cart/all
// @access  Private/Admin
const getAllCarts = asyncHandler(async (req, res) => {
  const carts = await Cart.find({})
    .populate('user', 'name email role')
    .populate('items.product', 'name images price stock')
    .sort({ updatedAt: -1 });
  
  res.json({ success: true, carts });
});

module.exports = { getCart, addToCart, updateCartItem, removeFromCart, clearCart, getAllCarts };
