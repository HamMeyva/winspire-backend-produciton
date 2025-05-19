const axios = require('axios');

const API_URL = 'http://localhost:5010/api';
let authToken = null;

// Test user data
const testUser = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'TestPassword123'
};

// Helper function to log responses
const logResponse = (title, response) => {
  console.log('\n===', title, '===');
  console.log('Status:', response.status);
  console.log('Data:', JSON.stringify(response.data, null, 2));
};

// Test API endpoints
const testAPI = async () => {
  try {
    console.log('Starting API tests...');

    // Health check
    const healthCheck = await axios.get(`${API_URL.replace('/api', '')}/health`);
    logResponse('Health Check', healthCheck);

    // Register new user
    try {
      const registerResponse = await axios.post(`${API_URL}/auth/signup`, testUser);
      logResponse('Register User', registerResponse);
    } catch (error) {
      console.log('\n=== Register User (Failed) ===');
      console.log('User might already exist, trying login instead');
    }

    // Login
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    logResponse('Login', loginResponse);
    authToken = loginResponse.data.token || loginResponse.data.data.token;

    // Setup auth header
    const config = {
      headers: { Authorization: `Bearer ${authToken}` }
    };

    // Get categories
    const categoriesResponse = await axios.get(`${API_URL}/categories`);
    logResponse('Get Categories', categoriesResponse);

    // Get subscription plans
    const plansResponse = await axios.get(`${API_URL}/subscriptions/plans`);
    logResponse('Get Subscription Plans', plansResponse);

    // Get user profile
    const profileResponse = await axios.get(`${API_URL}/users/profile`, config);
    logResponse('Get User Profile', profileResponse);

    console.log('\nAPI tests completed!');
  } catch (error) {
    console.error('Error during API tests:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
};

// Run tests
testAPI(); 