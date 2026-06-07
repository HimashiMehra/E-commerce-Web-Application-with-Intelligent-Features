const express = require('express');
const router = express.Router();
const {
  createOrder, getMyOrders, getOrderById, getAllOrders, updateOrderStatus,
  cancelOrder, payOrder, refundOrder, getAnalyticsDashboard
} = require('../controllers/orderController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.post('/',                      protect, createOrder);
router.get('/myorders',               protect, getMyOrders);
router.get('/analytics/dashboard',    protect, adminOnly, getAnalyticsDashboard);
router.get('/:id',                    protect, getOrderById);
router.get('/',                       protect, adminOnly, getAllOrders);
router.put('/:id/status',             protect, adminOnly, updateOrderStatus);
router.put('/:id/cancel',             protect, cancelOrder);
router.put('/:id/pay',                protect, payOrder);
router.put('/:id/refund',             protect, adminOnly, refundOrder);

module.exports = router;
