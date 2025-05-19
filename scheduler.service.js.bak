const cron = require('node-cron');
const contentService = require('./content.service');
const Content = require('../models/content.model');
const Category = require('../models/category.model');
const User = require('../models/user.model');
const mongoose = require('mongoose');

// Initialize scheduler service
const initScheduler = () => {
  // Schedule daily content generation - runs at 1:00 AM every day
  cron.schedule('0 1 * * *', async () => {
    console.log('Running daily content generation job');
    try {
      const summary = await generateDailyContent();
      console.log('Daily content generation completed:', summary);
    } catch (error) {
      console.error('Error in daily content generation job:', error);
    }
  });

  // Schedule content recycling - runs at 2:00 AM every day
  cron.schedule('0 2 * * *', async () => {
    console.log('Running content recycling job');
    try {
      const recycledCount = await recyclePopularContent();
      console.log(`Content recycling completed: ${recycledCount} items recycled`);
    } catch (error) {
      console.error('Error in content recycling job:', error);
    }
  });

  // Schedule user streak reset check - runs at 3:00 AM every day
  cron.schedule('0 3 * * *', async () => {
    console.log('Running user streak check job');
    try {
      const updatedCount = await checkUserStreaks();
      console.log(`User streak check completed: ${updatedCount} users updated`);
    } catch (error) {
      console.error('Error in user streak check job:', error);
    }
  });

  // Schedule expired subscription check - runs at 4:00 AM every day
  cron.schedule('0 4 * * *', async () => {
    console.log('Running subscription expiry check job');
    try {
      const expiredCount = await checkExpiredSubscriptions();
      console.log(`Subscription expiry check completed: ${expiredCount} subscriptions expired`);
    } catch (error) {
      console.error('Error in subscription expiry check job:', error);
    }
  });

  console.log('Scheduler service initialized');
};

// Generate daily content for all active categories
const generateDailyContent = async () => {
  // Get admin user to assign as content creator
  const admin = await User.findOne({ role: 'admin' });
  
  if (!admin) {
    throw new Error('No admin user found to assign as content creator');
  }
  
  // Set process environment variable for admin user ID
  process.env.ADMIN_USER_ID = admin._id;
  
  // Generate content using content service
  return await contentService.generateDailyContent(10); // 10 items per category
};

// Recycle popular and highly-rated content
const recyclePopularContent = async () => {
  try {
    // Find recyclable content
    const recyclableContent = await contentService.findRecyclableContent(20);
    
    if (recyclableContent.length === 0) {
      return 0;
    }
    
    // Extract IDs of content to recycle
    const contentIds = recyclableContent.map(content => content._id);
    
    // Recycle content
    const recycledCount = await contentService.recycleContent(contentIds);
    
    return recycledCount;
  } catch (error) {
    console.error('Error recycling content:', error);
    throw error;
  }
};

// Check and update user streaks
const checkUserStreaks = async () => {
  try {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    
    // Find users who haven't logged in for more than 1 day and have a streak > 0
    const usersToUpdate = await User.find({
      lastLogin: { $lt: twoDaysAgo },
      'stats.streak.current': { $gt: 0 }
    });
    
    // Update streaks to 0 for these users
    if (usersToUpdate.length > 0) {
      const result = await User.updateMany(
        { _id: { $in: usersToUpdate.map(user => user._id) } },
        { $set: { 'stats.streak.current': 0 } }
      );
      
      return result.modifiedCount;
    }
    
    return 0;
  } catch (error) {
    console.error('Error updating user streaks:', error);
    throw error;
  }
};

// Check and handle expired subscriptions
const checkExpiredSubscriptions = async () => {
  try {
    const now = new Date();
    
    // Find users with expired subscriptions that are still marked as active or cancelled
    const usersToUpdate = await User.find({
      'subscription.endDate': { $lt: now },
      'subscription.status': { $in: ['active', 'cancelled'] },
      'subscription.tier': { $ne: 'free' }
    });
    
    // Update subscription status to expired and tier to free
    if (usersToUpdate.length > 0) {
      const result = await User.updateMany(
        { _id: { $in: usersToUpdate.map(user => user._id) } },
        {
          $set: {
            'subscription.status': 'expired',
            'subscription.tier': 'free'
          }
        }
      );
      
      return result.modifiedCount;
    }
    
    return 0;
  } catch (error) {
    console.error('Error updating expired subscriptions:', error);
    throw error;
  }
};

module.exports = {
  initScheduler,
  generateDailyContent,
  recyclePopularContent,
  checkUserStreaks,
  checkExpiredSubscriptions
}; 