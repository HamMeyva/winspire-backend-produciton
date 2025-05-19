const mongoose = require('mongoose');
const { connectDB, clearDatabase, disconnectDB } = require('../../helpers/db');
const User = require('../../../src/models/user.model');
const { SubscriptionPlan } = require('../../../src/models/subscription.model');

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => {
    return {
      checkout: {
        sessions: {
          create: jest.fn().mockResolvedValue({
            id: 'test_session_id',
            url: 'https://test-checkout-url.com'
          })
        }
      },
      subscriptions: {
        update: jest.fn().mockResolvedValue({
          id: 'sub_123',
          status: 'canceled'
        }),
        retrieve: jest.fn().mockResolvedValue({
          id: 'sub_123',
          status: 'active',
          items: {
            data: [{
              price: {
                product: 'prod_123'
              }
            }]
          }
        })
      },
      customers: {
        retrieve: jest.fn().mockResolvedValue({
          id: 'cus_123',
          email: 'test@example.com'
        })
      },
      products: {
        retrieve: jest.fn().mockResolvedValue({
          id: 'prod_123',
          name: 'Premium Plan'
        })
      }
    };
  });
});

// Import the service after mocking dependencies
const subscriptionService = require('../../../src/services/subscription.service');

// Setup test data
let testUser;
let testPlan;

beforeAll(async () => {
  await connectDB();
  
  // Create test user
  testUser = await User.create({
    name: 'Subscription Test User',
    email: 'subscription-test@example.com',
    password: 'password123',
    role: 'user',
    verified: true,
    subscription: {
      status: 'none',
      tier: 'free'
    }
  });
  
  // Create test subscription plan
  testPlan = await SubscriptionPlan.create({
    name: 'Test Premium Plan',
    slug: 'test-premium-plan',
    description: 'Test premium subscription plan',
    tier: 'premium',
    features: [
      'Access to all categories',
      'Premium content included'
    ],
    prices: [
      {
        interval: 'monthly',
        amount: 9.99,
        currency: 'USD',
        trialDays: 7
      },
      {
        interval: 'yearly',
        amount: 99.99,
        currency: 'USD',
        trialDays: 14
      }
    ],
    limits: {
      dailyContent: 20,
      categoryAccess: 100,
      offlineAccess: true,
      premiumContent: true,
      aiAssistants: true,
      maxDevices: 5
    }
  });
});

afterAll(async () => {
  await clearDatabase();
  await disconnectDB();
});

describe('Subscription Service', () => {
  describe('getSubscriptionPlans', () => {
    test('should return all subscription plans', async () => {
      // When
      const plans = await subscriptionService.getSubscriptionPlans();
      
      // Then
      expect(plans).toBeDefined();
      expect(Array.isArray(plans)).toBe(true);
      expect(plans.length).toBeGreaterThan(0);
      expect(plans[0]).toHaveProperty('name');
      expect(plans[0]).toHaveProperty('tier');
    });
  });
  
  describe('getSubscriptionPlanById', () => {
    test('should return a subscription plan by ID', async () => {
      // When
      const plan = await subscriptionService.getSubscriptionPlanById(testPlan._id);
      
      // Then
      expect(plan).toBeDefined();
      expect(plan.name).toBe(testPlan.name);
      expect(plan.tier).toBe(testPlan.tier);
    });
    
    test('should return null for non-existent plan ID', async () => {
      // Given
      const nonExistentId = new mongoose.Types.ObjectId();
      
      // When
      const plan = await subscriptionService.getSubscriptionPlanById(nonExistentId);
      
      // Then
      expect(plan).toBeNull();
    });
  });
  
  describe('createCheckoutSession', () => {
    test('should create a checkout session', async () => {
      // Given
      const checkoutData = {
        planId: testPlan._id,
        priceIndex: 0, // Monthly price
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel'
      };
      
      // When
      const session = await subscriptionService.createCheckoutSession(testUser._id, checkoutData);
      
      // Then
      expect(session).toBeDefined();
      expect(session).toHaveProperty('id', 'test_session_id');
      expect(session).toHaveProperty('url', 'https://test-checkout-url.com');
    });
  });
  
  describe('cancelSubscription', () => {
    test('should cancel a subscription', async () => {
      // Given
      // Update test user to have active subscription
      await User.findByIdAndUpdate(testUser._id, {
        subscription: {
          status: 'active',
          tier: 'premium',
          stripeSubscriptionId: 'sub_123',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days in the future
        }
      });
      
      // When
      const result = await subscriptionService.cancelSubscription(testUser._id, { reason: 'Test cancellation' });
      
      // Then
      expect(result).toBeDefined();
      expect(result).toHaveProperty('success', true);
      
      // Check if user's subscription status was updated in the database
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.subscription.status).toBe('cancelled');
    });
  });
}); 