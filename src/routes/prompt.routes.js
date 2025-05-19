const express = require('express');
const promptController = require('../controllers/prompt.controller');
const authController = require('../controllers/auth.controller');

const router = express.Router();

// Protect all routes
router.use(authController.protect);

// Get all prompts (available to all authenticated users)
router.get('/', promptController.getAllPromptTemplates);

// Get single prompt by ID
router.get('/:id', promptController.getPromptTemplate);

// Import default prompts from file - admin only
router.post(
  '/import-defaults',
  authController.restrictTo('admin'),
  promptController.importDefaultPrompts
);

// Routes restricted to admin and content creators
router.use(authController.restrictTo('admin', 'content-creator'));

// Create, update, delete prompts
router.post('/', promptController.createPromptTemplate);
router.patch('/:id', promptController.updatePromptTemplate);
router.delete('/:id', promptController.deletePromptTemplate);

module.exports = router; 