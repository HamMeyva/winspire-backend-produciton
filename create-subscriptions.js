const mongoose = require('mongoose');
require('dotenv').config();

const { SubscriptionPlan } = require('./src/models/subscription.model');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/windspire')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Check if plans already exist
    const count = await SubscriptionPlan.countDocuments();
    if (count > 0) {
      console.log('Plans already exist. Skipping creation.');
      process.exit(0);
    }
    
    // Create default plans
    const plans = [
      {
        name: 'Free',
        slug: 'free',
        description: 'Basic access to Windspire content with limited features',
        features: [
          'Access to basic content',
          '5 items per day',
          '3 categories',
          'Single device'
        ],
        tier: 'free',
        active: true,
        limits: {
          dailyContent: 5,
          categoryAccess: 3,
          offlineAccess: false,
          premiumContent: false,
          aiAssistants: false,
          maxDevices: 1
        },
        prices: []
      },
      {
        name: 'Premium',
        slug: 'premium',
        description: 'Full access to all Windspire content and features',
        features: [
          'Unlimited access to all content',
          'All categories available',
          'Offline mode',
          'Premium content access',
          'AI assistants for personalized advice',
          'Up to 5 devices'
        ],
        tier: 'premium',
        active: true,
        limits: {
          dailyContent: 999,
          categoryAccess: 999,
          offlineAccess: true,
          premiumContent: true,
          aiAssistants: true,
          maxDevices: 5
        },
        prices: [
          {
            interval: 'monthly',
            amount: 9.99,
            currency: 'USD',
            trialDays: 7
          },
          {
            interval: 'yearly',
            amount: 89.99,
            currency: 'USD',
            trialDays: 14
          }
        ]
      }
    ];
    
    await SubscriptionPlan.create(plans);
    console.log('Default subscription plans created!');
    
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('Error connecting to MongoDB:', err);
    process.exit(1);
  }); 