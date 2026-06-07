const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/register', authLimiter, authController.register);
router.post('/login',    authLimiter, authController.login);
router.post('/prime',    protect,     authController.activatePrime);
router.post('/logout',   protect, authController.logout);
router.get('/me',        protect, authController.getMe);
router.put('/profile',   protect, authController.updateProfile);
router.post('/wishlist/:productId', protect, authController.toggleWishlist);

router.get('/users',     protect, adminOnly, authController.getAllUsers);
router.delete('/users/:id', protect, adminOnly, authController.deleteUser);

module.exports = router;
