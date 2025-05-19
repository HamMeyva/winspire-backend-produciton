const express = require('express');
const userController = require('../controllers/user.controller');
const authController = require('../controllers/auth.controller');

const router = express.Router();

// Protect all routes
router.use(authController.protect);

// Profile routes
router.get('/profile', userController.getProfile);
router.patch('/profile', userController.updateProfile);
router.patch('/preferences', userController.updatePreferences);
router.get('/progress', userController.getProgress);

// Device management for push notifications
router.post('/devices', userController.registerDevice);
router.delete('/devices', userController.unregisterDevice);

// Account management
router.delete('/deactivate', userController.deactivateAccount);

module.exports = router; 