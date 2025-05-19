// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/user.model');
const { SubscriptionPlan, SubscriptionTransaction } = require('../models/subscription.model');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

// Get all subscription plans
exports.getSubscriptionPlans = catchAsync(async (req, res, next) => {
  const plans = await SubscriptionPlan.find().sort('tier');
  
  res.status(200).json({
    status: 'success',
    success: true,
    results: plans.length,
    data: {
      plans,
    },
  });
});

// Get single subscription plan
exports.getSubscriptionPlan = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  const plan = await SubscriptionPlan.findById(id);
  
  if (!plan) {
    return next(new AppError('Subscription plan not found', 404));
  }
  
  res.status(200).json({
    status: 'success',
    success: true,
    data: {
      plan,
    },
  });
});

// Create new subscription plan
exports.createSubscriptionPlan = catchAsync(async (req, res, next) => {
  const newPlan = await SubscriptionPlan.create(req.body);
  
  res.status(201).json({
    status: 'success',
    success: true,
    data: {
      plan: newPlan,
    },
  });
});

// Update subscription plan
exports.updateSubscriptionPlan = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  const plan = await SubscriptionPlan.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  });
  
  if (!plan) {
    return next(new AppError('Subscription plan not found', 404));
  }
  
  res.status(200).json({
    status: 'success',
    success: true,
    data: {
      plan,
    },
  });
});

// Delete subscription plan
exports.deleteSubscriptionPlan = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  const plan = await SubscriptionPlan.findByIdAndDelete(id);
  
  if (!plan) {
    return next(new AppError('Subscription plan not found', 404));
  }
  
  res.status(204).json({
    status: 'success',
    success: true,
    data: null,
  });
});

// Get current user subscription
exports.getCurrentSubscription = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('subscription');
  
  // Get subscription plan details if user has an active subscription
  let planDetails = null;
  if (
    user.subscription.tier !== 'free' &&
    user.subscription.status === 'active'
  ) {
    planDetails = await SubscriptionPlan.findOne({ tier: user.subscription.tier });
  }
  
  res.status(200).json({
    status: 'success',
    success: true,
    data: {
      subscription: user.subscription,
      plan: planDetails,
    },
  });
});

// Note: The following endpoints have been removed as they depend on Stripe:
// - createCheckoutSession
// - handleStripeWebhook
// - cancelSubscription
// - getTransactionHistory

// Instead, we'll provide an informational endpoint about IAP integration:
exports.getIAPInfo = catchAsync(async (req, res, next) => {
  res.status(200).json({
    status: 'success',
    success: true,
    data: {
      message: "In-App Purchases are handled directly through the app's native integration with App Store/Google Play.",
      info: "The subscription plans defined here will be used to determine feature access and limits, but payment processing is handled by the app platforms.",
      documentation: "Please refer to Apple's StoreKit and Google's Billing Library documentation for implementation details."
    },
  });
}); 