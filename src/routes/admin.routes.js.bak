const express = require('express');
const adminController = require('../controllers/admin.controller');
const authController = require('../controllers/auth.controller');

const router = express.Router();

// Protect all routes and restrict to admin and moderator roles
router.use(authController.protect);
router.use(authController.restrictTo('admin', 'moderator'));

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

module.exports = router; 