const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.use(protect); // All cart routes require authentication

router.get('/all', adminOnly, cartController.getAllCarts);

router.get('/',                    cartController.getCart);
router.post('/add',                cartController.addToCart);
router.put('/update',              cartController.updateCartItem);
router.delete('/clear',            cartController.clearCart);
router.delete('/remove/:productId', cartController.removeFromCart);

module.exports = router;
