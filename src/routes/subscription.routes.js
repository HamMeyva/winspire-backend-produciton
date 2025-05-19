const express = require('express');
const subscriptionController = require('../controllers/subscription.controller');
const authController = require('../controllers/auth.controller');

const router = express.Router();

// Public routes
router.get('/plans', subscriptionController.getSubscriptionPlans);
router.get('/plans/:id', subscriptionController.getSubscriptionPlan);
router.get('/iap-info', subscriptionController.getIAPInfo);

// Protected routes for admin only
router.use(authController.protect);
router.use(authController.restrictTo('admin'));

// Subscription plan management (admin only)
router.post('/plans', subscriptionController.createSubscriptionPlan);
router.patch('/plans/:id', subscriptionController.updateSubscriptionPlan);
router.delete('/plans/:id', subscriptionController.deleteSubscriptionPlan);

// User subscription info
router.get('/current', subscriptionController.getCurrentSubscription);

module.exports = router; 