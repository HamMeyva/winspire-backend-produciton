const express = require('express');
const cors = require('cors');
const userRoutes = require('./routes/user.routes');
const authRoutes = require('./routes/auth.routes');
const contentRoutes = require('./routes/content.routes');
const categoryRoutes = require('./routes/category.routes');
const adminRoutes = require('./routes/admin.routes');
const subscriptionRoutes = require('./routes/subscription.routes');
const promptRoutes = require('./routes/prompt.routes');
const duplicateRoutes = require('./routes/duplicate.routes');

const app = express();

// Enable CORS for all routes
app.use(cors());

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/prompts', promptRoutes);
app.use('/api/duplicates', duplicateRoutes); 