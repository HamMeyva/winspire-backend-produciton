const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const Category = require('../models/category.model');
const { SubscriptionPlan } = require('../models/subscription.model');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Connect to database
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB for seeding'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Initial categories
const categories = [
  {
    name: 'Health & Fitness',
    description: 'Tips for maintaining a healthy lifestyle, exercise routines, and wellness habits.',
    icon: '🏃‍♂️',
    color: '#4CAF50',
    slug: 'health-fitness',
    priority: 100,
  },
  {
    name: 'Productivity',
    description: 'Techniques to improve focus, time management, and work efficiency.',
    icon: '⏱️',
    color: '#2196F3',
    slug: 'productivity',
    priority: 200,
  },
  {
    name: 'Finance',
    description: 'Smart money management, saving strategies, and investment tips.',
    icon: '💰',
    color: '#4CAF50',
    slug: 'finance',
    priority: 300,
  },
  {
    name: 'Home Organization',
    description: 'Creative solutions for decluttering, organizing, and maintaining your living space.',
    icon: '🏠',
    color: '#9C27B0',
    slug: 'home-organization',
    priority: 400,
  },
  {
    name: 'Cooking',
    description: 'Quick recipes, cooking shortcuts, and kitchen hacks to make meal preparation easier.',
    icon: '🍳',
    color: '#FF5722',
    slug: 'cooking',
    priority: 500,
  },
  {
    name: 'Technology',
    description: 'Tips for using digital tools, apps, and devices more effectively.',
    icon: '💻',
    color: '#607D8B',
    slug: 'technology',
    priority: 600,
  },
  {
    name: 'Travel',
    description: 'Smart packing, budget travel tips, and destination hacks.',
    icon: '✈️',
    color: '#03A9F4',
    slug: 'travel',
    priority: 700,
  },
  {
    name: 'Mindfulness',
    description: 'Practices for mental clarity, stress reduction, and emotional well-being.',
    icon: '🧘',
    color: '#9C27B0',
    slug: 'mindfulness',
    priority: 800,
  },
  {
    name: 'Parenting',
    description: 'Creative solutions for common parenting challenges and family activities.',
    icon: '👨‍👩‍👧‍👦',
    color: '#FF9800',
    slug: 'parenting',
    priority: 900,
  },
  {
    name: 'DIY & Crafts',
    description: 'Easy do-it-yourself projects, repairs, and creative crafts.',
    icon: '🛠️',
    color: '#795548',
    slug: 'diy-crafts',
    priority: 1000,
  },
  {
    name: 'Social Skills',
    description: 'Tips for improving communication, networking, and relationships.',
    icon: '🗣️',
    color: '#E91E63',
    slug: 'social-skills',
    priority: 1100,
  },
  {
    name: 'Career Growth',
    description: 'Strategies for professional development, job searching, and workplace success.',
    icon: '💼',
    color: '#3F51B5',
    slug: 'career-growth',
    priority: 1200,
  },
  {
    name: 'Beauty & Style',
    description: 'Quick tips for fashion, skincare, and personal grooming.',
    icon: '💄',
    color: '#F06292',
    slug: 'beauty-style',
    priority: 1300,
  },
  {
    name: 'Eco-Friendly Living',
    description: 'Practical ways to reduce waste and live more sustainably.',
    icon: '♻️',
    color: '#4CAF50',
    slug: 'eco-friendly',
    priority: 1400,
  },
  {
    name: 'Sleep Improvement',
    description: 'Techniques for better sleep quality and establishing healthy bedtime routines.',
    icon: '😴',
    color: '#673AB7',
    slug: 'sleep',
    priority: 1500,
  },
  {
    name: 'Learning',
    description: 'Study techniques, memory improvement, and accelerated learning methods.',
    icon: '📚',
    color: '#FFC107',
    slug: 'learning',
    priority: 1600,
  },
  {
    name: 'Cleaning',
    description: 'Effective cleaning methods, stain removal, and home maintenance shortcuts.',
    icon: '🧹',
    color: '#00BCD4',
    slug: 'cleaning',
    priority: 1700,
  },
  {
    name: 'Digital Wellbeing',
    description: 'Strategies for healthy technology use and digital detox.',
    icon: '📱',
    color: '#607D8B',
    slug: 'digital-wellbeing',
    priority: 1800,
  },
  {
    name: 'Public Speaking',
    description: 'Tips for overcoming nervousness and delivering impactful presentations.',
    icon: '🎤',
    color: '#E91E63',
    slug: 'public-speaking',
    priority: 1900,
  },
  {
    name: 'Gardening',
    description: 'Plant care tips, garden planning, and growing food at home.',
    icon: '🌱',
    color: '#8BC34A',
    slug: 'gardening',
    priority: 2000,
  },
];

// Subscription plans
const subscriptionPlans = [
  {
    name: 'Free Plan',
    slug: 'free-plan',
    description: 'Access to basic features with limited content.',
    features: [
      'Access to 5 categories',
      '5 daily content items',
      'Basic content only',
      'Single device login',
      'No offline access',
    ],
    tier: 'free',
    prices: [
      {
        interval: 'monthly',
        amount: 0,
        currency: 'USD',
      },
    ],
    limits: {
      dailyContent: 5,
      categoryAccess: 5,
      offlineAccess: false,
      premiumContent: false,
      aiAssistants: false,
      maxDevices: 1,
    },
  },
  {
    name: 'Basic Plan',
    slug: 'basic-plan',
    description: 'Enhanced access with more content and categories.',
    features: [
      'Access to 10 categories',
      '10 daily content items',
      'Basic content only',
      'Up to 2 device logins',
      'Limited offline access',
    ],
    tier: 'basic',
    prices: [
      {
        interval: 'monthly',
        amount: 4.99,
        currency: 'USD',
        trialDays: 7,
      },
      {
        interval: 'yearly',
        amount: 49.99,
        currency: 'USD',
        trialDays: 14,
      },
    ],
    limits: {
      dailyContent: 10,
      categoryAccess: 10,
      offlineAccess: true,
      premiumContent: false,
      aiAssistants: false,
      maxDevices: 2,
    },
  },
  {
    name: 'Premium Plan',
    slug: 'premium-plan',
    description: 'Full access to all content and premium features.',
    features: [
      'Access to all categories',
      '20 daily content items',
      'Premium content included',
      'Up to 5 device logins',
      'Full offline access',
      'AI personalization',
    ],
    tier: 'premium',
    prices: [
      {
        interval: 'monthly',
        amount: 9.99,
        currency: 'USD',
        trialDays: 7,
      },
      {
        interval: 'yearly',
        amount: 99.99,
        currency: 'USD',
        trialDays: 14,
      },
    ],
    limits: {
      dailyContent: 20,
      categoryAccess: 100,
      offlineAccess: true,
      premiumContent: true,
      aiAssistants: true,
      maxDevices: 5,
    },
  },
];

// Seed database function
const seedDatabase = async () => {
  try {
    // Clear existing data
    await User.deleteMany({ role: { $ne: 'admin' } }); // Keep admin users
    await Category.deleteMany({});
    await SubscriptionPlan.deleteMany({});

    // Create admin user if it doesn't exist
    const adminExists = await User.findOne({ email: process.env.ADMIN_EMAIL });

    if (!adminExists) {
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
      
      const adminUser = await User.create({
        name: 'Admin User',
        email: process.env.ADMIN_EMAIL,
        password: hashedPassword,
        role: 'admin',
        verified: true,
        active: true,
      });
      
      console.log(`Admin user created: ${adminUser.email}`);
    } else {
      console.log('Admin user already exists');
    }

    // Create categories
    const admin = await User.findOne({ role: 'admin' });
    
    if (!admin) {
      throw new Error('No admin user found to assign as category creator');
    }
    
    const createdCategories = await Promise.all(
      categories.map(async (category) => {
        return await Category.create({
          ...category,
          createdBy: admin._id,
        });
      })
    );
    
    console.log(`Created ${createdCategories.length} categories`);

    // Create subscription plans
    const createdPlans = await Promise.all(
      subscriptionPlans.map(async (plan) => {
        return await SubscriptionPlan.create(plan);
      })
    );
    
    console.log(`Created ${createdPlans.length} subscription plans`);

    console.log('Database seeding completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

// Run seeder
seedDatabase(); 