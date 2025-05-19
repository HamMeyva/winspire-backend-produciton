const cron = require('node-cron');
const contentService = require('./content.service');
const Content = require('../models/content.model');
const Category = require('../models/category.model');
const User = require('../models/user.model');
const mongoose = require('mongoose');
const DeletedContent = require('../models/deletedContent.model');

// Initialize scheduler service
const initScheduler = () => {
  // Schedule daily content generation - runs at 1:00 AM every day
  cron.schedule('0 1 * * *', async () => {
    console.log('Running daily content generation job');
    try {
      const summary = await generateDailyContent();
      console.log('Daily content generation completed:', summary);
    } catch (error) {
      console.error('Error in daily content generation job:', error);
    }
  });

  // Schedule content recycling - runs at 2:00 AM every day
  cron.schedule('0 2 * * *', async () => {
    console.log('Running content recycling job');
    try {
      const recycledCount = await recyclePopularContent();
      console.log(`Content recycling completed: ${recycledCount} items recycled`);
    } catch (error) {
      console.error('Error in content recycling job:', error);
    }
  });

  // Schedule user streak reset check - runs at 3:00 AM every day
  cron.schedule('0 3 * * *', async () => {
    console.log('Running user streak check job');
    try {
      const updatedCount = await checkUserStreaks();
      console.log(`User streak check completed: ${updatedCount} users updated`);
    } catch (error) {
      console.error('Error in user streak check job:', error);
    }
  });

  // Schedule expired subscription check - runs at 4:00 AM every day
  cron.schedule('0 4 * * *', async () => {
    console.log('Running subscription expiry check job');
    try {
      const expiredCount = await checkExpiredSubscriptions();
      console.log(`Subscription expiry check completed: ${expiredCount} subscriptions expired`);
    } catch (error) {
      console.error('Error in subscription expiry check job:', error);
    }
  });

  // 24 saatte bir content integrity kontrolü (her gün gece yarısı)
  cron.schedule('0 0 * * *', async () => {
    console.log('Running DAILY content integrity check and cleaning up shown prompts');
    try {
      await cleanupAndRefreshContent();
    } catch (error) {
      console.error('Error in daily content integrity job:', error);
    }
  });

  console.log('Scheduler service initialized');
};

// Generate daily content for all active categories
const generateDailyContent = async () => {
  // Get admin user to assign as content creator
  const admin = await User.findOne({ role: 'admin' });
  
  if (!admin) {
    throw new Error('No admin user found to assign as content creator');
  }
  
  // Set process environment variable for admin user ID
  process.env.ADMIN_USER_ID = admin._id;
  
  // Generate content using content service
  return await contentService.generateDailyContent(10); // 10 items per category
};

// Recycle popular and highly-rated content
const recyclePopularContent = async () => {
  try {
    // Find recyclable content
    const recyclableContent = await contentService.findRecyclableContent(20);
    
    if (recyclableContent.length === 0) {
      return 0;
    }
    
    // Extract IDs of content to recycle
    const contentIds = recyclableContent.map(content => content._id);
    
    // Recycle content
    const recycledCount = await contentService.recycleContent(contentIds);
    
    return recycledCount;
  } catch (error) {
    console.error('Error recycling content:', error);
    throw error;
  }
};

// Check and update user streaks
const checkUserStreaks = async () => {
  try {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    
    // Find users who haven't logged in for more than 1 day and have a streak > 0
    const usersToUpdate = await User.find({
      lastLogin: { $lt: twoDaysAgo },
      'stats.streak.current': { $gt: 0 }
    });
    
    // Update streaks to 0 for these users
    if (usersToUpdate.length > 0) {
      const result = await User.updateMany(
        { _id: { $in: usersToUpdate.map(user => user._id) } },
        { $set: { 'stats.streak.current': 0 } }
      );
      
      return result.modifiedCount;
    }
    
    return 0;
  } catch (error) {
    console.error('Error updating user streaks:', error);
    throw error;
  }
};

// Check and handle expired subscriptions
const checkExpiredSubscriptions = async () => {
  try {
    const now = new Date();
    
    // Find users with expired subscriptions that are still marked as active or cancelled
    const usersToUpdate = await User.find({
      'subscription.endDate': { $lt: now },
      'subscription.status': { $in: ['active', 'cancelled'] },
      'subscription.tier': { $ne: 'free' }
    });
    
    // Update subscription status to expired and tier to free
    if (usersToUpdate.length > 0) {
      const result = await User.updateMany(
        { _id: { $in: usersToUpdate.map(user => user._id) } },
        {
          $set: {
            'subscription.status': 'expired',
            'subscription.tier': 'free'
          }
        }
      );
      
      return result.modifiedCount;
    }
    
    return 0;
  } catch (error) {
    console.error('Error updating expired subscriptions:', error);
    throw error;
  }
};

// Temizleme ve yenileme işlemleri - hem cron job hem de manuel tetiklenebilir
const cleanupAndRefreshContent = async () => {
  // Direkt olarak fonksiyonu burada uygula
  const Content = require('../models/content.model');
  const DeletedContent = require('../models/deletedContent.model');
  const Category = require('../models/category.model');
  const User = require('../models/user.model');
  const perCategory = 10; // Her kategori için 10 adet content

  console.log('Starting cleanup and refresh content process...');
  console.log('Step 1: Generating new content for each category');
  console.log('Step 2: Moving published content to deleted');
  console.log('Step 3: Selecting new content to publish');
  console.log('Step 4: Detecting and cleaning duplicates');

  const categories = await Category.find({ active: true });
  const admin = await User.findOne({ role: 'admin' });
  
  if (!admin) throw new Error('No admin user found');

  const results = {
    cleanedUp: 0,
    generated: 0,
    published: 0,
    categories: 0,
    duplicates: {
      processed: 0,
      detected: 0,
      deleted: 0
    }
  };

  for (const category of categories) {
    results.categories++;
    console.log(`\nProcessing category: ${category.name}`);
    
    // 1. Generate 10 new content items for each category
    console.log(`Generating ${perCategory} new content items for category: ${category.name}`);
    const newContentIds = [];
    
    for (let i = 0; i < perCategory; i++) {
      try {
        // Generate with varying difficulty levels
        const difficulty = i < perCategory * 0.6 ? 'beginner' : 
                        i < perCategory * 0.9 ? 'intermediate' : 'advanced';
        
        const generated = await contentService.generateWithAI(category, null, difficulty);
        
        // Create new content in draft status
        const newContent = await Content.create({
          title: generated.title,
          body: generated.body,
          summary: generated.summary || generated.title,
          category: category._id,
          authorId: admin._id,
          status: 'draft',
          source: 'ai',
          difficulty,
          tags: generated.tags || [],
          publishDate: null,
          hasBeenPublished: false
        });
        
        newContentIds.push(newContent._id);
        results.generated++;
        console.log(`Generated content: "${generated.title.substring(0, 30)}..." (${difficulty})`);
      } catch (genError) {
        console.error(`Error generating content for ${category.name}:`, genError);
      }
    }
    
    // 2. Move published content to deleted with reason "auto-deleted"
    console.log(`Moving published content for category: ${category.name} to deleted`);
    const publishedContents = await Content.find({
      category: category._id,
      status: 'published'
    });
    
    for (const content of publishedContents) {
      try {
        // Prepare data for DeletedContent
        const contentData = content.toObject();
        const originalId = contentData._id;
        delete contentData._id; // remove to avoid duplicate key error
        
        // Add metadata
        contentData.deletedAt = new Date();
        contentData.originalContentId = originalId;
        contentData.reason = 'auto_delete';
        
        // Create a record in DeletedContent collection
        await DeletedContent.create(contentData);
        
        // Remove original content
        await content.deleteOne();
        
        results.cleanedUp++;
        console.log(`Moved published content: "${content.title.substring(0, 30)}..." to deleted`);
      } catch (err) {
        console.error(`Error moving content ${content._id} to deleted:`, err);
      }
    }
    
    // 3. Randomly select 10 draft contents and publish them (including new ones)
    console.log(`Selecting ${perCategory} draft contents to publish for category: ${category.name}`);
    const draftContents = await Content.find({
      category: category._id,
      status: 'draft'
    });
    
    if (draftContents.length > 0) {
      // Create a random subset of drafts to publish (up to perCategory)
      const shuffled = draftContents.sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, perCategory);
      
      for (const draft of selected) {
        try {
          await Content.findByIdAndUpdate(draft._id, {
            status: 'published',
            publishDate: new Date(),
            hasBeenPublished: true
          });
          
          results.published++;
          console.log(`Published draft content: "${draft.title.substring(0, 30)}..."`);
        } catch (err) {
          console.error(`Error publishing draft content ${draft._id}:`, err);
        }
      }
    } else {
      console.log(`No draft contents found for category: ${category.name}`);
    }
  }
  
  // 4. Check for duplicates and clean them up
  console.log('\nChecking for duplicate content...');
  try {
    // Find all content
    const allContent = await Content.find().sort('-createdAt');
    
    // Group by category
    const contentByCategory = {};
    allContent.forEach(item => {
      if (!item.category) return;
      
      const categoryId = typeof item.category === 'object' ? 
        item.category._id.toString() : item.category.toString();
      
      if (!contentByCategory[categoryId]) {
        contentByCategory[categoryId] = [];
      }
      contentByCategory[categoryId].push(item);
    });
    
    // For each category, compare contents to find duplicates
    for (const categoryId in contentByCategory) {
      const categoryItems = contentByCategory[categoryId];
      
      // Skip if less than 2 items in category
      if (categoryItems.length < 2) continue;
      
      // Compare each item with others in same category
      for (let i = 0; i < categoryItems.length; i++) {
        const itemA = categoryItems[i];
        if (!itemA) continue;
        
        const bodyA = (itemA.body || '').trim().toLowerCase();
        if (!bodyA) continue;
        
        const titleA = (itemA.title || '').trim().toLowerCase();
        if (!titleA) continue;
        
        // Check if this item has already been processed
        if (itemA._id === null) continue;
        
        const duplicatesOfA = [];
        
        for (let j = i + 1; j < categoryItems.length; j++) {
          const itemB = categoryItems[j];
          if (!itemB || itemB._id === null) continue;
          
          const bodyB = (itemB.body || '').trim().toLowerCase();
          if (!bodyB) continue;
          
          const titleB = (itemB.title || '').trim().toLowerCase();
          if (!titleB) continue;
          
          // Calculate similarity based on body and title
          const bodySimilarity = calculateSimilarity(bodyA, bodyB);
          const titleSimilarity = calculateSimilarity(titleA, titleB);
          
          // Weight body similarity more than title
          const overallSimilarity = (bodySimilarity * 0.7) + (titleSimilarity * 0.3);
          
          // If similarity is high, mark as duplicate
          if (overallSimilarity > 0.7) { // 70% similarity threshold
            duplicatesOfA.push({
              item: itemB,
              similarity: overallSimilarity
            });
            
            // Mark as processed by setting id to null
            categoryItems[j]._id = null;
            
            results.duplicates.detected++;
          }
        }
        
        // Process duplicates if found
        if (duplicatesOfA.length > 0) {
          // Keep the original and move duplicates to deleted
          for (const dup of duplicatesOfA) {
            try {
              // Prepare data for DeletedContent
              const contentData = dup.item.toObject();
              const originalId = contentData._id;
              delete contentData._id; // remove to avoid duplicate key error
              
              // Add metadata
              contentData.deletedAt = new Date();
              contentData.originalContentId = originalId;
              contentData.reason = 'duplicate';
              
              // Create a record in DeletedContent collection
              await DeletedContent.create(contentData);
              
              // Remove original content
              await Content.findByIdAndDelete(originalId);
              
              results.duplicates.deleted++;
              console.log(`Moved duplicate content: "${dup.item.title.substring(0, 30)}..." to deleted (similarity: ${Math.round(dup.similarity * 100)}%)`);
            } catch (err) {
              console.error(`Error moving duplicate content to deleted:`, err);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in duplicate detection process:', error);
  }
  
  console.log('\nDaily content refresh completed:');
  console.log(`- Processed ${results.categories} categories`);
  console.log(`- Generated ${results.generated} new content items`);
  console.log(`- Moved ${results.cleanedUp} published items to deleted`);
  console.log(`- Published ${results.published} draft items`);
  console.log(`- Detected ${results.duplicates.detected} duplicates`);
  console.log(`- Moved ${results.duplicates.deleted} duplicates to deleted`);
  
  return results;
};

// Similarity calculation function
function calculateSimilarity(str1, str2) {
  // If either string is empty, return 0
  if (!str1 || !str2) return 0;
  
  // Get words from each string
  const words1 = str1.split(/\s+/).filter(word => word.length > 3);
  const words2 = str2.split(/\s+/).filter(word => word.length > 3);
  
  // Create sets of words
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  
  // Find intersection
  const intersection = new Set([...set1].filter(word => set2.has(word)));
  
  // Find union
  const union = new Set([...set1, ...set2]);
  
  // Calculate Jaccard similarity
  return intersection.size / union.size;
}

module.exports = {
  initScheduler,
  generateDailyContent,
  recyclePopularContent,
  checkUserStreaks,
  checkExpiredSubscriptions,
  cleanupAndRefreshContent
}; 