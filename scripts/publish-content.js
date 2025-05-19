const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    publishContent();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Load Content model
const Content = require('../src/models/content.model');

async function publishContent() {
  try {
    // Get the count of draft content
    const draftCount = await Content.countDocuments({ status: 'draft' });
    console.log(`Found ${draftCount} content items in 'draft' status`);
    
    // Limit the number of items to publish (e.g., 50)
    const limitToPublish = 50;
    const actualLimit = Math.min(draftCount, limitToPublish);
    
    console.log(`Will publish ${actualLimit} content items`);
    
    // Get content to update
    const contentToUpdate = await Content.find({ status: 'draft' })
      .limit(actualLimit);
    
    // Set current date for publishDate
    const now = new Date();
    
    // Update each item to published status
    let publishedCount = 0;
    
    for (const item of contentToUpdate) {
      item.status = 'published';
      item.publishDate = now;
      item.hasBeenPublished = true;
      
      await item.save();
      publishedCount++;
      console.log(`Published item: ${item.title}`);
    }
    
    console.log(`\nSuccessfully published ${publishedCount} content items`);
    console.log('Updated status counts:');
    
    // Show final counts
    const statusCounts = await Content.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    console.log(statusCounts);
    
  } catch (error) {
    console.error('Error publishing content:', error);
  } finally {
    // Close MongoDB connection
    mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}
