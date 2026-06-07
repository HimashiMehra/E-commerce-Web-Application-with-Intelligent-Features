const asyncHandler = require('express-async-handler');
const Product = require('../models/Product');

// @desc    Get all products with search, filter, sort, pagination
// @route   GET /api/products
// @access  Public
const getProducts = asyncHandler(async (req, res) => {
  const {
    keyword,
    category,
    minPrice,
    maxPrice,
    sortBy,
    page = 1,
    limit = 12,
    featured,
    badge,
  } = req.query;

  const query = {};

  // Full-text search
  if (keyword && keyword.trim()) {
    query.$text = { $search: keyword.trim() };
  }

  // Category filter
  if (category && category !== 'all') {
    query.category = category;
  }

  // Price range filter
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  // Featured filter
  if (featured === 'true') query.featured = true;

  // Badge filter
  if (badge) query.badge = badge;

  // Sort
  let sortOption = { createdAt: -1 };
  switch (sortBy) {
    case 'priceAsc':    sortOption = { price: 1 };     break;
    case 'priceDesc':   sortOption = { price: -1 };    break;
    case 'rating':      sortOption = { rating: -1 };   break;
    case 'newest':      sortOption = { createdAt: -1 }; break;
    case 'featured':    sortOption = { featured: -1, createdAt: -1 }; break;
    default:            sortOption = { featured: -1, createdAt: -1 }; break;
  }

  const pageNum  = Math.max(1, parseInt(page));
  const pageSize = Math.min(50, parseInt(limit));
  const skip     = (pageNum - 1) * pageSize;

  const [products, total] = await Promise.all([
    Product.find(query).sort(sortOption).skip(skip).limit(pageSize),
    Product.countDocuments(query),
  ]);

  res.json({
    success: true,
    products,
    page: pageNum,
    pages: Math.ceil(total / pageSize),
    total,
    limit: pageSize,
  });
});

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate(
    'reviews.user',
    'name avatar'
  );
  if (!product) {
    res.status(404);
    throw new Error('Product not found.');
  }
  res.json({ success: true, product });
});

// @desc    Create a product (admin)
// @route   POST /api/products
// @access  Private/Admin
const createProduct = asyncHandler(async (req, res) => {
  const {
    name, description, images, category, brand,
    price, originalPrice, stock, badge, featured, features, prime,
  } = req.body;

  if (!name || !description || !category || !price) {
    res.status(400);
    throw new Error('Name, description, category, and price are required.');
  }

  const product = await Product.create({
    name, description,
    images: images || [],
    category, brand, price,
    originalPrice: originalPrice || null,
    stock: stock || 0,
    badge: badge || '',
    featured: featured || false,
    features: features || [],
    prime: prime !== false,
  });

  res.status(201).json({ success: true, product });
});

// @desc    Update product (admin)
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Product not found.');
  }

  const allowedFields = [
    'name', 'description', 'images', 'category', 'brand',
    'price', 'originalPrice', 'stock', 'badge', 'featured', 'features', 'prime',
  ];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      product[field] = req.body[field];
    }
  });

  const updated = await product.save();
  res.json({ success: true, product: updated });
});

// @desc    Delete product (admin)
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Product not found.');
  }
  await product.deleteOne();
  res.json({ success: true, message: 'Product deleted successfully.' });
});

// @desc    Add a review to a product
// @route   POST /api/products/:id/review
// @access  Private
const addReview = asyncHandler(async (req, res) => {
  const { rating, title, comment } = req.body;
  if (!rating || !comment) {
    res.status(400);
    throw new Error('Rating and comment are required.');
  }

  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Product not found.');
  }

  // Check if already reviewed
  const alreadyReviewed = product.reviews.find(
    (r) => r.user.toString() === req.user._id.toString()
  );
  if (alreadyReviewed) {
    res.status(400);
    throw new Error('You have already reviewed this product.');
  }

  product.reviews.push({
    user:     req.user._id,
    name:     req.user.name,
    rating:   Number(rating),
    title:    title || '',
    comment,
    verified: true,
  });

  product.recalcRating();
  await product.save();

  res.status(201).json({ success: true, message: 'Review submitted!', product });
});

// @desc    Get product categories with counts
// @route   GET /api/products/categories
// @access  Public
const getCategories = asyncHandler(async (req, res) => {
  const cats = await Product.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  res.json({ success: true, categories: cats });
});

module.exports = {
  getProducts, getProductById, createProduct,
  updateProduct, deleteProduct, addReview, getCategories,
};
