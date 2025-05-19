const Joi = require('joi');
const AppError = require('../utils/appError');

/**
 * Middleware factory to validate request body against a Joi schema
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
const validateBody = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errorMessage = error.details.map((detail) => detail.message).join('; ');
      return next(new AppError(errorMessage, 400));
    }
    
    next();
  };
};

/**
 * Middleware factory to validate request query parameters against a Joi schema
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.query, { abortEarly: false });
    
    if (error) {
      const errorMessage = error.details.map((detail) => detail.message).join('; ');
      return next(new AppError(errorMessage, 400));
    }
    
    next();
  };
};

/**
 * Middleware factory to validate request parameters against a Joi schema
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
const validateParams = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.params, { abortEarly: false });
    
    if (error) {
      const errorMessage = error.details.map((detail) => detail.message).join('; ');
      return next(new AppError(errorMessage, 400));
    }
    
    next();
  };
};

// Common validation schemas
const schemas = {
  // Auth schemas
  signup: Joi.object({
    name: Joi.string().trim().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
  }),
  
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),
  
  refreshToken: Joi.object({
    refreshToken: Joi.string().required(),
  }),
  
  passwordReset: Joi.object({
    token: Joi.string().required(),
    password: Joi.string().min(8).required(),
  }),
  
  // Content schemas
  contentRate: Joi.object({
    rating: Joi.string().valid('like', 'dislike').required(),
  }),
  
  contentGenerate: Joi.object({
    categoryId: Joi.string().required(),
    topic: Joi.string(),
    difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced'),
  }),
  
  // Category schemas
  categoryCreate: Joi.object({
    name: Joi.string().trim().min(2).max(50).required(),
    description: Joi.string().trim().required(),
    icon: Joi.string().allow(null, ''),
    color: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).allow(null),
    slug: Joi.string().pattern(/^[a-z0-9-]+$/).allow(null),
    priority: Joi.number(),
  }),
  
  categoryUpdate: Joi.object({
    name: Joi.string().trim().min(2).max(50),
    description: Joi.string().trim(),
    icon: Joi.string().allow(null, ''),
    color: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).allow(null),
    priority: Joi.number(),
    active: Joi.boolean(),
  }),
  
  // User schemas
  userUpdateProfile: Joi.object({
    name: Joi.string().trim().min(2).max(50),
    avatar: Joi.string().uri().allow(null, ''),
  }),
  
  userUpdatePreferences: Joi.object({
    theme: Joi.string().valid('light', 'dark', 'system'),
    notifications: Joi.object({
      email: Joi.boolean(),
      push: Joi.boolean(),
    }),
    contentPreferences: Joi.object({
      categories: Joi.array().items(Joi.string()),
      difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced', 'all'),
    }),
  }),
  
  userRegisterDevice: Joi.object({
    token: Joi.string().required(),
    platform: Joi.string().valid('ios', 'android', 'web').required(),
  }),
  
  // Subscription schemas
  checkoutSession: Joi.object({
    planId: Joi.string().required(),
    priceIndex: Joi.number().min(0).required(),
    successUrl: Joi.string().uri().required(),
    cancelUrl: Joi.string().uri().required(),
  }),
  
  subscriptionCancel: Joi.object({
    reason: Joi.string().allow('', null),
  }),
  
  // Admin schemas
  contentModerate: Joi.object({
    action: Joi.string().valid('approve', 'reject').required(),
    notes: Joi.string().allow('', null),
  }),
  
  contentSchedule: Joi.object({
    publishDate: Joi.date().iso().greater('now').required(),
  }),
  
  contentBulkGenerate: Joi.object({
    categoryId: Joi.string().required(),
    count: Joi.number().integer().min(1).max(50).default(10),
  }),
};

module.exports = {
  validateBody,
  validateQuery,
  validateParams,
  schemas,
}; 