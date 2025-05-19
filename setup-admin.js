const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Define a simplified User schema
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
  active: Boolean,
  verified: Boolean,
  subscription: {
    tier: {
      type: String,
      default: 'free'
    },
    status: {
      type: String,
      default: 'none'
    }
  },
  preferences: {
    notifications: {
      email: Boolean,
      push: Boolean
    }
  },
  lastLogin: Date
});

// Create User model
const User = mongoose.model('User', userSchema);

// Function to update .env file with admin ID
const updateEnvFile = (adminId) => {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    
    // Check if .env file exists
    if (!fs.existsSync(envPath)) {
      console.error('No .env file found. Please create a .env file with ADMIN_EMAIL and ADMIN_PASSWORD variables.');
      return;
    }

    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Replace or add ADMIN_USER_ID
    if (envContent.includes('ADMIN_USER_ID=')) {
      envContent = envContent.replace(/ADMIN_USER_ID=.*/g, `ADMIN_USER_ID=${adminId}`);
    } else {
      envContent += `\nADMIN_USER_ID=${adminId}`;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log(`Updated .env file with ADMIN_USER_ID=${adminId}`);
  } catch (error) {
    console.error('Error updating .env file:', error);
  }
};

// Create admin user
async function setupAdmin() {
  try {
    // Use admin credentials from environment variables
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@windspire.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    console.log(`Setting up admin with email: ${adminEmail}`);
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    
    if (existingAdmin) {
      console.log('Updating existing admin user...');
      
      // Hash the password from env
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      
      existingAdmin.password = hashedPassword;
      await existingAdmin.save();
      
      console.log(`Admin user updated with password from environment variables`);
      console.log(`Admin ID: ${existingAdmin._id}`);
      
      // Update the .env file with the admin ID
      updateEnvFile(existingAdmin._id);
    } else {
      // Create new admin
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      
      const admin = new User({
        name: 'Admin User',
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
        active: true,
        verified: true,
        subscription: {
          tier: 'premium',
          status: 'active'
        },
        preferences: {
          notifications: {
            email: true,
            push: true
          }
        },
        lastLogin: new Date()
      });
      
      await admin.save();
      console.log(`New admin user created with credentials from environment variables`);
      console.log(`Admin ID: ${admin._id}`);
      
      // Update the .env file with the admin ID
      updateEnvFile(admin._id);
    }
    
    console.log(`
Admin Setup Complete!
---------------------------
Email: ${adminEmail}
Password: ${adminPassword}
---------------------------
You can now use these credentials to login to the admin dashboard.
    `);
    
    process.exit(0);
  } catch (error) {
    console.error('Error setting up admin user:', error);
    process.exit(1);
  }
}

setupAdmin(); 