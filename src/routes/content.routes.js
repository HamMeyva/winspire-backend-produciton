const express = require('express');
const contentController = require('../controllers/content.controller');
const authController = require('../controllers/auth.controller');

const router = express.Router();

// Public route for content types (no authentication required)
router.get('/types', contentController.getContentTypes);
router.get('/category/:categoryId', contentController.getContentByCategory);

// Public route for user actions (like/dislike/maybe) without authentication
router.post('/action-public', contentController.recordUserAction);

// Public routes for viewed and expired actions
router.post('/viewed', contentController.markPromptViewedPublic);
router.post('/expired', contentController.markPromptExpiredPublic);

// Protect all routes after this middleware
router.use(authController.protect);

// Get all content (paginated)
router.get('/', contentController.getAllContent);

// Daily content routes
router.get('/daily', contentController.getDailyContent);

// Get content by pool
router.get('/pool', contentController.getContentByPool);

// Saved content route
router.get('/user/saved', contentController.getSavedContent);

// Content generation (restricted to admins and content creators)
router.post(
  '/generate',
  authController.restrictTo('admin', 'content-creator', 'moderator'),
  contentController.generateContent
);

// Multiple content generation
router.post(
  '/generate-multiple',
  authController.restrictTo('admin', 'content-creator', 'moderator'),
  contentController.generateMultipleContent
);

// Deleted content routes - moved up before the /:id routes
router.route('/deleted')
  .get(authController.restrictTo('admin', 'moderator'), contentController.getDeletedContent);

router.route('/deleted/:id')
  .delete(authController.restrictTo('admin'), contentController.permanentlyDeleteContent);

router.route('/deleted/:id/restore')
  .post(authController.restrictTo('admin'), contentController.restoreDeletedContent);

// Content item routes
router.get('/:id', contentController.getContent);
router.post('/:id/rate', contentController.rateContent);
router.post('/:id/save', contentController.saveContent);
router.delete('/:id/save', contentController.unsaveContent);
router.post('/:id/share', contentController.shareContent);
router.post(
  '/:id/rewrite',
  authController.restrictTo('admin', 'content-creator', 'moderator'),
  contentController.rewriteContent
);

// Routes for marking content as duplicate
router.route('/:id/mark-duplicate')
  .post(authController.restrictTo('admin', 'moderator'), contentController.markContentAsDuplicate);

router.route('/:id/unmark-duplicate')
  .post(authController.restrictTo('admin', 'moderator'), contentController.unmarkContentAsDuplicate);

// Regular content routes
router.route('/')
  .get(contentController.getAllContent)
  .post(authController.restrictTo('admin', 'moderator'), contentController.createContent);

router.route('/generate')
  .post(authController.restrictTo('admin', 'moderator'), contentController.generateContent);

router.route('/:id')
  .get(contentController.getContent)
  .patch(authController.restrictTo('admin', 'moderator'), contentController.updateContent)
  .delete(authController.restrictTo('admin', 'moderator'), contentController.deleteContent);

router.route('/:id/publish')
  .post(authController.restrictTo('admin', 'moderator'), contentController.publishContent);

router.route('/:id/reject')
  .post(authController.restrictTo('admin', 'moderator'), contentController.rejectContent);

router.route('/:id/archive')
  .post(authController.restrictTo('admin', 'moderator'), contentController.archiveContent);

module.exports = router; 