const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { connectDB, clearDatabase, disconnectDB } = require('../helpers/db');
const User = require('../../src/models/user.model');
const errorHandler = require('../../src/middleware/error.middleware');
const authRoutes = require('../../src/routes/auth.routes');

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use(errorHandler);

// Test data
const testUser = {
  name: 'Integration Test User',
  email: 'integration-test@example.com',
  password: 'Password123!'
};

let refreshToken;

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await clearDatabase();
  await disconnectDB();
});

describe('Auth API', () => {
  describe('POST /api/auth/signup', () => {
    test('should register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send(testUser)
        .expect(201);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user).toHaveProperty('name', testUser.name);
      expect(response.body.data.user).toHaveProperty('email', testUser.email);
      expect(response.body.data).toHaveProperty('token');
    });
    
    test('should reject duplicate email', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send(testUser)
        .expect(400);
      
      expect(response.body).toHaveProperty('status', 'fail');
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/email/i);
    });
    
    test('should reject invalid input', async () => {
      const invalidUser = {
        name: 'Test',
        email: 'not-an-email',
        password: 'short'
      };
      
      const response = await request(app)
        .post('/api/auth/signup')
        .send(invalidUser)
        .expect(400);
      
      expect(response.body).toHaveProperty('status', 'fail');
    });
  });
  
  describe('POST /api/auth/login', () => {
    test('should login existing user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('refreshToken');
      
      // Store refresh token for later tests
      refreshToken = response.body.data.refreshToken;
    });
    
    test('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrong-password'
        })
        .expect(401);
      
      expect(response.body).toHaveProperty('status', 'fail');
      expect(response.body).toHaveProperty('message');
    });
  });
  
  describe('POST /api/auth/refresh', () => {
    test('should issue new tokens with valid refresh token', async () => {
      // Skip if refresh token wasn't obtained
      if (!refreshToken) {
        return console.log('Skipping refresh token test - no token available');
      }
      
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('refreshToken');
    });
    
    test('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);
      
      expect(response.body).toHaveProperty('status', 'fail');
    });
  });
}); 