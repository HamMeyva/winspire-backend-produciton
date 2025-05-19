require('dotenv').config();
const mongoose = require('mongoose');
const Content = require('./src/models/content.model');

async function checkContentSchema() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/windscribe');
    console.log('Connected to MongoDB');
    
    // Get content types from schema
    const contentTypes = Content.schema.path('contentType').enumValues;
    console.log('Content types from schema:', contentTypes);
    
    // Create sample content if none exists
    const contentCount = await Content.countDocuments();
    console.log(`Total content items: ${contentCount}`);
    
    if (contentCount === 0) {
      console.log('Creating sample content...');
      
      // Create one sample for each content type
      for (const type of contentTypes) {
        await Content.create({
          title: `Sample ${type}`,
          body: `This is a sample ${type} content.`,
          summary: `Sample ${type} summary`,
          category: new mongoose.Types.ObjectId(), // Mock ID
          contentType: type,
          authorId: new mongoose.Types.ObjectId(), // Mock ID
        });
      }
      
      console.log('Sample content created successfully');
    }
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkContentSchema(); 