const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

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
});

// Create User model
const User = mongoose.model('User', userSchema);

// Create or update admin user
async function updateAdmin() {
  try {
    // Check if admin already exists
    let adminUser = await User.findOne({ email: 'admin@example.com' });
    
    // Hash the password
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    if (adminUser) {
      console.log('Updating existing admin user...');
      
      // Update the admin user
      adminUser.password = hashedPassword;
      adminUser.role = 'admin';
      adminUser.active = true;
      adminUser.verified = true;
      
      await adminUser.save();
      
      console.log('Admin user updated successfully!');
      console.log('Email: admin@example.com');
      console.log('Password: admin123');
    } else {
      // Create new admin user
      adminUser = await User.create({
        name: 'Admin User',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin',
        active: true,
        verified: true,
      });
      
      console.log('New admin user created successfully!');
      console.log('Email: admin@example.com');
      console.log('Password: admin123');
    }
    
    console.log('You should now be able to log in with these credentials in both browsers.');
    
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error updating admin user:', error);
    mongoose.connection.close();
    process.exit(1);
  }
}

updateAdmin(); 