const express = require('express');
const adminController = require('../controllers/admin.controller');
const authController = require('../controllers/auth.controller');
const userController = require('../controllers/user.controller');
const contentController = require('../controllers/content.controller');

const router = express.Router();

// Protect all routes and restrict to admin and moderator roles
router.use(authController.protect);
router.use(authController.restrictTo('admin', 'moderator'));

// User management routes (admin only)
router.get('/users', 
  authController.restrictTo('admin'),
  userController.getAllUsers
);

router.get('/users/:id', 
  authController.restrictTo('admin'),
  userController.getUser
);

router.patch('/users/:id', 
  authController.restrictTo('admin'),
  userController.updateUser
);

router.delete('/users/:id', 
  authController.restrictTo('admin'),
  userController.deleteUser
);

// Content moderation routes
router.get('/content/pending', adminController.getPendingContent);
router.patch('/content/:id/moderate', adminController.moderateContent);
router.patch('/content/:id/schedule', adminController.scheduleContent);
router.delete('/content/:id', adminController.deleteContent);
router.post('/content', adminController.createContent);

// Content generation routes
router.post('/content/generate', 
  authController.restrictTo('admin', 'content-creator'),
  adminController.generateContent
);

// Move published content to deleted status
router.post('/content/move-published-to-deleted',
  authController.restrictTo('admin'),
  adminController.movePublishedToDeleted
);

// Bulk publish draft content
router.post('/content/bulk-publish',
  authController.restrictTo('admin', 'moderator'),
  adminController.bulkPublishContent
);

// Analytics routes
router.get('/analytics/content', adminController.getContentAnalytics);
router.get('/analytics/users', 
  authController.restrictTo('admin'), // Only admins can access user analytics
  adminController.getUserAnalytics
);

// Prompt seeding route (Admin only)
router.post('/prompts/seed-from-file', 
  authController.restrictTo('admin'), 
  adminController.seedPromptsFromFile
);

// OpenAI API test endpoint (Admin only)
router.get('/api/test-openai',
  authController.restrictTo('admin'),
  adminController.testOpenAIConnection
);

// Cleanup duplicate content
router.post('/content/cleanup-duplicates',
  authController.restrictTo('admin'),
  adminController.cleanupDuplicateContent
);

// Add admin-only endpoint to trigger daily content refresh
router.post('/trigger-daily-refresh', 
  authController.restrictTo('admin'),
  contentController.triggerDailyContentRefresh
);

module.exports = router; 