const mongoose = require('mongoose');
const User = require('../models/user.model');

/**
 * This utility finds or creates an admin user and sets
 * the ADMIN_USER_ID environment variable
 */
const setupAdminUserId = async () => {
  try {
    console.log('Setting up admin user ID...');
    
    // First, check if there's an admin user already
    let admin = await User.findOne({ role: 'admin' });
    
    // If no admin exists, create one
    if (!admin) {
      console.log('No admin user found. Creating default admin...');
      
      // Create a default admin user
      admin = await User.create({
        name: 'System Admin',
        email: 'admin@example.com',
        password: 'AdminP@ssw0rd' + Math.random().toString(36).slice(-4), // Generate random password suffix
        role: 'admin',
        active: true
      });
      
      console.log('Default admin user created.');
    } else {
      console.log('Admin user found.');
    }
    
    // Set the admin user ID in the environment
    process.env.ADMIN_USER_ID = admin._id.toString();
    console.log(`ADMIN_USER_ID set to: ${process.env.ADMIN_USER_ID}`);
    
    return admin._id;
  } catch (error) {
    console.error('Error setting up admin user ID:', error);
    throw error;
  }
};

module.exports = setupAdminUserId; 