// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_EXPIRES_IN = '1h';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.MONGODB_URI = 'mongodb://localhost:27017/windspire-test';
process.env.ENABLE_SCHEDULER = 'false';

// Global test teardown function
afterAll(async () => {
  // Add any cleanup code here if needed
  // This runs after all tests are complete
}); 