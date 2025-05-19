const express = require('express');
const categoryController = require('../controllers/category.controller');
const authController = require('../controllers/auth.controller');

const router = express.Router();

// Public routes
router.get('/', categoryController.getAllCategories);
router.get('/content-type/:contentType', categoryController.getCategoriesByContentType);
router.get('/:slug', categoryController.getCategory);

// Protected routes (admin and moderator only)
router.use(authController.protect);
router.use(authController.restrictTo('admin', 'moderator'));

// Add a new route for categories with pool statistics
router.get('/stats/pools', categoryController.getCategoriesWithPoolStats);

// Add a new route for activating all categories
router.post('/activate-all', categoryController.activateAllCategories);

router.post('/', categoryController.createCategory);
router.patch('/:id', categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);
router.get('/:id/stats', categoryController.getCategoryStats);

module.exports = router; 