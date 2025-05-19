const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { connectDB, clearDatabase, disconnectDB } = require('../helpers/db');
const User = require('../../src/models/user.model');
const Category = require('../../src/models/category.model');
const errorHandler = require('../../src/middleware/error.middleware');
const categoryRoutes = require('../../src/routes/category.routes');
const jwt = require('jsonwebtoken');

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/categories', categoryRoutes);
app.use(errorHandler);

// Test data
let testUser;
let adminUser;
let userToken;
let adminToken;

const createToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

beforeAll(async () => {
  await connectDB();
  
  // Create test users
  testUser = await User.create({
    name: 'Regular User',
    email: 'regular-user@example.com',
    password: 'password123',
    role: 'user',
    verified: true
  });
  
  adminUser = await User.create({
    name: 'Admin User',
    email: 'admin-user@example.com',
    password: 'password123',
    role: 'admin',
    verified: true
  });
  
  // Create tokens
  userToken = createToken(testUser);
  adminToken = createToken(adminUser);
});

afterAll(async () => {
  await clearDatabase();
  await disconnectDB();
});

describe('Categories API', () => {
  describe('GET /api/categories', () => {
    test('should get all categories - unauthenticated', async () => {
      const response = await request(app)
        .get('/api/categories')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('categories');
      expect(Array.isArray(response.body.data.categories)).toBe(true);
    });
  });
  
  describe('POST /api/categories', () => {
    test('should create new category as admin', async () => {
      const categoryData = {
        name: 'Test Category',
        description: 'This is a test category',
        icon: '🧪',
        color: '#FF5733',
        priority: 1000
      };
      
      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(categoryData)
        .expect(201);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('category');
      expect(response.body.data.category).toHaveProperty('name', categoryData.name);
      expect(response.body.data.category).toHaveProperty('slug', 'test-category');
    });
    
    test('should reject category creation for non-admin', async () => {
      const categoryData = {
        name: 'User Created Category',
        description: 'This should fail',
        icon: '🚫',
        color: '#FF0000'
      };
      
      await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${userToken}`)
        .send(categoryData)
        .expect(403);
    });
  });
  
  describe('GET /api/categories/:id', () => {
    test('should get category by ID', async () => {
      // First create a category to test with
      const category = await Category.create({
        name: 'Category to Retrieve',
        description: 'This category will be retrieved by ID',
        createdBy: adminUser._id
      });
      
      const response = await request(app)
        .get(`/api/categories/${category._id}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('category');
      expect(response.body.data.category).toHaveProperty('name', 'Category to Retrieve');
    });
    
    test('should return 404 for nonexistent category', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      await request(app)
        .get(`/api/categories/${nonExistentId}`)
        .expect(404);
    });
  });
  
  describe('PATCH /api/categories/:id', () => {
    test('should update category as admin', async () => {
      // First create a category to test with
      const category = await Category.create({
        name: 'Category to Update',
        description: 'This category will be updated',
        createdBy: adminUser._id
      });
      
      const updateData = {
        name: 'Updated Category Name',
        description: 'This category has been updated',
        icon: '✅',
        color: '#00FF00'
      };
      
      const response = await request(app)
        .patch(`/api/categories/${category._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('category');
      expect(response.body.data.category).toHaveProperty('name', updateData.name);
      expect(response.body.data.category).toHaveProperty('description', updateData.description);
      expect(response.body.data.category).toHaveProperty('icon', updateData.icon);
      expect(response.body.data.category).toHaveProperty('color', updateData.color);
    });
    
    test('should reject update for non-admin', async () => {
      const category = await Category.create({
        name: 'No Update Category',
        description: 'Regular users should not be able to update this',
        createdBy: adminUser._id
      });
      
      const updateData = {
        name: 'Attempted Update',
        description: 'This update should be rejected'
      };
      
      await request(app)
        .patch(`/api/categories/${category._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(403);
    });
  });
}); 