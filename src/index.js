const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');

// Load environment variables
dotenv.config();

// Debug environment variables
console.log('Environment:', process.env.NODE_ENV);
console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Set' : 'Not set');
console.log('OpenAI API Key:', process.env.OPENAI_API_KEY ? 'Set' : 'Not set');
console.log('OpenAI Key length:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0);

// Import middleware
const stripeWebhookMiddleware = require('./middleware/stripe.middleware');
const errorHandler = require('./middleware/error.middleware');

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const contentRoutes = require('./routes/content.routes');
const categoryRoutes = require('./routes/category.routes');
const adminRoutes = require('./routes/admin.routes');
const subscriptionRoutes = require('./routes/subscription.routes');
const promptRoutes = require('./routes/prompt.routes');

// Import scheduler service
const schedulerService = require('./services/scheduler.service');

// Initialize express app
const app = express();

// Apply Stripe webhook middleware before body parser
app.use(stripeWebhookMiddleware);

// Middleware
app.use(helmet()); // Security headers
app.use(compression()); // Compress responses
app.use(cors({
  origin: '*', // DRASTIC DEBUG: Allow all origins
  credentials: true, // Note: credentials:true with origin:'*' can be problematic but good for this test
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(morgan('dev')); // HTTP request logger

// Root endpoint for default health check
app.get('/', (req, res) => {
  res.status(200).send('OK - V3 TEST'); // Specific message for deployment confirmation
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', message: 'Server is running' });
});

// Apply rate limiting with different configurations for regular and admin routes
const apiLimiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes default
  max: process.env.RATE_LIMIT_MAX || 100, // Limit each IP to 100 requests per windowMs default
  standardHeaders: true,
  legacyHeaders: false,
});

// More permissive rate limiter for admin routes
const adminLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 300, // 300 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiters to specific routes
app.use('/api/admin', adminLimiter); // Apply admin-specific limiter first
app.use('/api/content/deleted', adminLimiter); // Apply admin limiter to deleted content endpoints

// Apply general API limiter to all other routes
app.use('/api/auth', apiLimiter);
app.use('/api/users', apiLimiter);
// app.use('/api/content', apiLimiter); // Removed rate limit for content APIs
app.use('/api/categories', apiLimiter);
app.use('/api/subscriptions', apiLimiter);
app.use('/api/prompts', apiLimiter);

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/prompts', promptRoutes);

// Apply global error handler
app.use(errorHandler);

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Initialize admin user ID
    const setupAdminUserId = require('./utils/setupAdminId');
    try {
      await setupAdminUserId();
      console.log('Admin user ID setup complete');
    } catch (error) {
      console.error('Failed to set up admin user ID:', error);
      // Continue starting the server even if this fails
    }
    
    // Initialize scheduler service after successful DB connection
    if (process.env.ENABLE_SCHEDULER === 'true') {
      schedulerService.initScheduler();
    }
    
    // Start server
    const PORT = process.env.PORT || 5010;
    const HOST = process.env.HOST || '0.0.0.0'; // Listen on all network interfaces
    const server = app.listen(PORT, HOST, () => {
      console.log(`Server running on ${HOST}:${PORT}`);
      console.log(`Access from other devices via http://${process.env.YOUR_LOCAL_IP || '192.168.1.34'}:${PORT}`);
    });
    
    // Increase server timeout settings to handle long-running AI requests
    server.timeout = 180000; // 3 minutes timeout for long AI generations
    server.keepAliveTimeout = 120000; // 2 minutes keep-alive timeout
    server.headersTimeout = 120000; // 2 minutes headers timeout
    
    console.log('Server timeout settings:');
    console.log(`Timeout: ${server.timeout}ms`);
    console.log(`Keep-alive timeout: ${server.keepAliveTimeout}ms`);
    console.log(`Headers timeout: ${server.headersTimeout}ms`);
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }); 