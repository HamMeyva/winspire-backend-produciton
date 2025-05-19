const axios = require('axios');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables
dotenv.config();

async function testLogin() {
  try {
    console.log('Testing admin login...');
    
    // Get admin credentials from environment variables or use defaults
    const email = process.env.ADMIN_EMAIL || 'admin@example.com';
    const password = process.env.ADMIN_PASSWORD || 'adminpassword123'; // Updated password from setup-admin
    
    console.log(`Using admin credentials: ${email}`);
    
    // Call login API
    const response = await axios.post('http://localhost:5010/api/auth/login', {
      email,
      password
    });
    
    console.log('Login successful!');
    console.log('User:', response.data.data.user);
    console.log('Token:', response.data.token ? 'Received (not showing for security)' : 'Not received');
    
    // Save token to a file for easy use
    if (response.data.token) {
      const tokenPath = path.join(__dirname, 'admin-dashboard', 'src', 'testToken');
      fs.writeFileSync(tokenPath, response.data.token);
      console.log(`Token saved to ${tokenPath}`);
      
      // Test the token
      console.log('\nTesting token with a protected endpoint...');
      try {
        const testResponse = await axios.get('http://localhost:5010/api/content/deleted?page=1&limit=10', {
          headers: {
            Authorization: `Bearer ${response.data.token}`
          }
        });
        console.log('Protected endpoint test successful!');
        console.log('Response:', JSON.stringify(testResponse.data, null, 2));
      } catch (error) {
        console.error('Protected endpoint test failed:');
        console.error('Status:', error.response?.status);
        console.error('Message:', error.response?.data?.message || error.message);
      }
    }
    
  } catch (error) {
    console.error('Login test failed:');
    console.error('Status:', error.response?.status);
    console.error('Message:', error.response?.data?.message || error.message);
  }
}

testLogin(); 