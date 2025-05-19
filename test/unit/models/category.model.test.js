const mongoose = require('mongoose');
const { connectDB, clearDatabase, disconnectDB } = require('../../helpers/db');
const Category = require('../../../src/models/category.model');
const User = require('../../../src/models/user.model');

// Test data
let testUser;

beforeAll(async () => {
  await connectDB();
  
  // Create test user
  testUser = await User.create({
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
    role: 'admin'
  });
});

afterAll(async () => {
  await clearDatabase();
  await disconnectDB();
});

describe('Category Model', () => {
  test('should create a new category successfully', async () => {
    // Given
    const categoryData = {
      name: 'Test Category',
      description: 'Category description for testing',
      icon: '🧪',
      color: '#FF5733',
      slug: 'test-category',
      priority: 100,
      createdBy: testUser._id
    };
    
    // When
    const category = await Category.create(categoryData);
    
    // Then
    expect(category._id).toBeDefined();
    expect(category.name).toBe(categoryData.name);
    expect(category.description).toBe(categoryData.description);
    expect(category.icon).toBe(categoryData.icon);
    expect(category.color).toBe(categoryData.color);
    expect(category.slug).toBe(categoryData.slug);
    expect(category.priority).toBe(categoryData.priority);
    expect(category.active).toBe(true); // Default value
    expect(category.createdBy.toString()).toBe(testUser._id.toString());
  });
  
  test('should generate slug from name if not provided', async () => {
    // Given
    const categoryData = {
      name: 'Auto Slug Category',
      description: 'This category will have an auto-generated slug',
      createdBy: testUser._id
    };
    
    // When
    const category = await Category.create(categoryData);
    
    // Then
    expect(category.slug).toBe('auto-slug-category');
  });
  
  test('should reject category with duplicate name', async () => {
    // Given
    const categoryData = {
      name: 'Test Category', // Same name as the first test
      description: 'This should fail due to duplicate name',
      createdBy: testUser._id
    };
    
    // When & Then
    await expect(Category.create(categoryData)).rejects.toThrow();
  });
  
  test('should reject category without required fields', async () => {
    // Given - missing name
    const categoryWithoutName = {
      description: 'Missing name field',
      createdBy: testUser._id
    };
    
    // Given - missing description
    const categoryWithoutDescription = {
      name: 'No Description Category',
      createdBy: testUser._id
    };
    
    // Given - missing createdBy
    const categoryWithoutCreator = {
      name: 'No Creator Category',
      description: 'Missing creator field'
    };
    
    // When & Then
    await expect(Category.create(categoryWithoutName)).rejects.toThrow();
    await expect(Category.create(categoryWithoutDescription)).rejects.toThrow();
    await expect(Category.create(categoryWithoutCreator)).rejects.toThrow();
  });
}); 