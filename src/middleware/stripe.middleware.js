/**
 * Middleware to handle Stripe webhooks which need raw body data
 * This middleware parses the raw body for Stripe but uses standard JSON parsing for other routes
 */

const bodyParser = require('body-parser');

const stripeWebhookMiddleware = (req, res, next) => {
  // Check if request is to the Stripe webhook endpoint
  if (req.originalUrl === '/api/subscriptions/webhook' && req.method === 'POST') {
    // For Stripe webhooks, use raw body parser
    bodyParser.raw({ type: 'application/json' })(req, res, next);
  } else {
    // For all other routes, use JSON parser
    bodyParser.json()(req, res, next);
  }
};

module.exports = stripeWebhookMiddleware; 