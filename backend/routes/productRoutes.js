const express = require('express');
const router = express.Router();
const {
  getProducts, getProductById, createProduct,
  updateProduct, deleteProduct, addReview, getCategories,
} = require('../controllers/productController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/categories', getCategories);
router.get('/',           getProducts);
router.get('/:id',        getProductById);
router.post('/',          protect, adminOnly, createProduct);
router.put('/:id',        protect, adminOnly, updateProduct);
router.delete('/:id',     protect, adminOnly, deleteProduct);
router.post('/:id/review', protect, addReview);

module.exports = router;
