const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Please provide name, email, and password.');
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    res.status(400);
    throw new Error('An account with this email already exists.');
  }

  // Create user (password gets hashed by pre-save hook)
  const user = await User.create({ name, email, password });

  const token = generateToken(user._id);

  res.status(201).json({
    success: true,
    message: 'Account created successfully!',
    token,
    user: {
      _id:   user._id,
      name:  user.name,
      email: user.email,
      role:  user.role,
      isPrime: user.isPrime,
    },
  });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('Please provide email and password.');
  }

  // Find user by email or name (case-insensitive)
  const user = await User.findOne({
    $or: [
      { email: email.trim().toLowerCase() },
      { name: { $regex: new RegExp(`^${email.trim()}$`, 'i') } }
    ]
  }).select('+password');
  if (!user || !user.isActive) {
    res.status(401);
    throw new Error('Invalid email or password.');
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    res.status(401);
    throw new Error('Invalid email or password.');
  }

  const token = generateToken(user._id);

  res.json({
    success: true,
    message: 'Login successful!',
    token,
    user: {
      _id:     user._id,
      name:    user.name,
      email:   user.email,
      role:    user.role,
      address: user.address,
      isPrime: user.isPrime,
    },
  });
});

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('wishlist', 'name images price rating');
  res.json({ success: true, user });
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found.');
  }

  user.name    = req.body.name    || user.name;
  user.phone   = req.body.phone   || user.phone;
  user.address = req.body.address || user.address;

  if (req.body.password) {
    if (req.body.password.length < 6) {
      res.status(400);
      throw new Error('Password must be at least 6 characters.');
    }
    user.password = req.body.password;
  }

  const updated = await user.save();
  const token = generateToken(updated._id);

  res.json({
    success: true,
    message: 'Profile updated!',
    token,
    user: {
      _id:     updated._id,
      name:    updated.name,
      email:   updated.email,
      role:    updated.role,
      address: updated.address,
      phone:   updated.phone,
      isPrime: updated.isPrime,
    },
  });
});

// @desc    Toggle wishlist item
// @route   POST /api/auth/wishlist/:productId
// @access  Private
const toggleWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const { productId } = req.params;

  const idx = user.wishlist.findIndex((id) => id.toString() === productId);
  let action;
  if (idx > -1) {
    user.wishlist.splice(idx, 1);
    action = 'removed';
  } else {
    user.wishlist.push(productId);
    action = 'added';
  }
  await user.save();

  res.json({ success: true, action, wishlist: user.wishlist });
});

// @desc    Logout (client should clear token; this invalidates cookies)
// @route   POST /api/auth/logout
// @access  Private
const logout = asyncHandler(async (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully.' });
});

// @desc    Get all users (Admin only)
// @route   GET /api/auth/users
// @access  Private/Admin
const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).select('-password').sort({ createdAt: -1 });
  res.json({ success: true, users });
});

// @desc    Delete a user (Admin only)
// @route   DELETE /api/auth/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    res.status(404);
    throw new Error('User not found.');
  }

  // Prevent deleting self
  if (user._id.toString() === req.user._id.toString()) {
    res.status(400);
    throw new Error('You cannot delete yourself.');
  }

  await User.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'User deleted successfully.' });
});

// @desc    Activate Prime membership
// @route   POST /api/auth/prime
// @access  Private
const activatePrime = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found.');
  }

  if (user.isPrime) {
    res.status(400);
    throw new Error('You are already an Amazon Prime member!');
  }

  user.isPrime = true;
  await user.save();

  res.json({
    success: true,
    message: 'Amazon Prime activated successfully! 🎉',
    user: {
      _id:     user._id,
      name:    user.name,
      email:   user.email,
      role:    user.role,
      address: user.address,
      phone:   user.phone,
      isPrime: user.isPrime,
    }
  });
});

module.exports = { register, login, getMe, updateProfile, toggleWishlist, logout, getAllUsers, deleteUser, activatePrime };
