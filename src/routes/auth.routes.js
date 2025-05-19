const express = require('express');
const authController = require('../controllers/auth.controller');
const googleAuthController = require('../controllers/google-auth.controller');

const router = express.Router();

// Public routes
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.patch('/reset-password', authController.resetPassword);

// Google authentication
router.post('/google', googleAuthController.googleAuth);

// Protected routes (require authentication)
router.use(authController.protect);
router.patch('/update-password', authController.updatePassword);

module.exports = router; 