const Content = require('../models/content.model');
const Category = require('../models/category.model');
const User = require('../models/user.model');
const { SubscriptionPlan, SubscriptionTransaction } = require('../models/subscription.model');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const contentService = require('../services/content.service');
const promptService = require('../services/prompt.service');

// Content moderation
exports.getPendingContent = catchAsync(async (req, res, next) => {
  const { status = 'draft', page = 1, limit = 20, category } = req.query;
  
  // Create filter based on status
  const filter = { status: status || 'draft' };
  
  // Add category filter if provided
  if (category) {
    filter.category = category;
  }
  
  // Calculate pagination
  const skip = (page - 1) * limit;
  
  // Count total documents matching filter
  const total = await Content.countDocuments(filter);
  
  // Get content with pagination
  const pendingContent = await Content.find(filter)
    .populate('category', 'name slug icon')
    .populate('authorId', 'name')
    .sort('-createdAt')
    .skip(skip)
    .limit(parseInt(limit));
  
  res.status(200).json({
    status: 'success',
    results: pendingContent.length,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      limit: parseInt(limit),
    },
    data: {
      content: pendingContent,
    },
  });
});

// Approve or reject content
exports.moderateContent = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { action, notes } = req.body;
  
  if (!['approve', 'reject'].includes(action)) {
    return next(new AppError('Action must be either approve or reject', 400));
  }
  
  const content = await Content.findById(id);
  
  if (!content) {
    return next(new AppError('Content not found', 404));
  }
  
  // Update content status based on action
  content.status = action === 'approve' ? 'published' : 'rejected';
  content.moderatorId = req.user.id;
  content.moderationNotes = notes || null;
  content.hasBeenPublished = action === 'approve' ? true : content.hasBeenPublished;
  content.publishDate = action === 'approve' ? new Date() : null;
  
  await content.save();
  
  // If approving, increment category content count
  if (action === 'approve') {
    await Category.findByIdAndUpdate(content.category, {
      $inc: { contentCount: 1 },
    });
  }
  
  res.status(200).json({
    status: 'success',
    message: `Content ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
    data: {
      content,
    },
  });
});

// Schedule content publication
exports.scheduleContent = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { publishDate } = req.body;
  
  if (!publishDate) {
    return next(new AppError('Publish date is required', 400));
  }
  
  try {
    const scheduledContent = await contentService.scheduleContent(id, new Date(publishDate));
    
    res.status(200).json({
      status: 'success',
      message: 'Content scheduled successfully',
      data: {
        content: scheduledContent,
      },
    });
  } catch (error) {
    return next(new AppError(error.message, error.statusCode || 500));
  }
});

// Analytics: Content Performance
exports.getContentAnalytics = catchAsync(async (req, res, next) => {
  const { timeframe = 'week', category } = req.query;
  
  // Calculate date range based on timeframe
  const today = new Date();
  let startDate = new Date();
  
  switch (timeframe) {
    case 'day':
      startDate.setDate(today.getDate() - 1);
      break;
    case 'week':
      startDate.setDate(today.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(today.getMonth() - 1);
      break;
    case 'year':
      startDate.setFullYear(today.getFullYear() - 1);
      break;
    default:
      startDate.setDate(today.getDate() - 7); // Default to week
  }
  
  // Build the aggregation pipeline
  const pipeline = [
    {
      $match: {
        status: 'published',
        publishDate: { $gte: startDate },
      },
    },
  ];
  
  // Add category filter if provided
  if (category) {
    pipeline[0].$match.category = mongoose.Types.ObjectId(category);
  }
  
  // Add grouping and calculations
  pipeline.push(
    {
      $group: {
        _id: '$category',
        totalViews: { $sum: '$stats.views' },
        totalLikes: { $sum: '$stats.likes' },
        totalDislikes: { $sum: '$stats.dislikes' },
        totalShares: { $sum: '$stats.shares' },
        totalSaves: { $sum: '$stats.saves' },
        contentCount: { $sum: 1 },
        avgRating: {
          $avg: {
            $cond: [
              { $eq: [{ $add: ['$stats.likes', '$stats.dislikes'] }, 0] },
              0,
              { $divide: ['$stats.likes', { $add: ['$stats.likes', '$stats.dislikes'] }] },
            ],
          },
        },
      },
    },
    {
      $lookup: {
        from: 'categories',
        localField: '_id',
        foreignField: '_id',
        as: 'category',
      },
    },
    {
      $unwind: '$category',
    },
    {
      $project: {
        _id: 0,
        category: { name: '$category.name', id: '$category._id', slug: '$category.slug' },
        totalViews: 1,
        totalLikes: 1,
        totalDislikes: 1,
        totalShares: 1,
        totalSaves: 1,
        contentCount: 1,
        engagement: {
          $divide: [
            { $add: ['$totalLikes', '$totalShares', '$totalSaves'] },
            { $cond: [{ $eq: ['$totalViews', 0] }, 1, '$totalViews'] },
          ],
        },
        avgRating: { $multiply: ['$avgRating', 5] }, // Convert to 0-5 scale
      },
    },
    {
      $sort: { 'category.name': 1 },
    }
  );
  
  // Get top performing content
  const topContentPipeline = [
    {
      $match: {
        status: 'published',
        publishDate: { $gte: startDate },
      },
    },
    {
      $addFields: {
        engagementScore: {
          $add: [
            '$stats.views',
            { $multiply: ['$stats.likes', 5] },
            { $multiply: ['$stats.shares', 10] },
            { $multiply: ['$stats.saves', 3] },
          ],
        },
      },
    },
    {
      $sort: { engagementScore: -1 },
    },
    {
      $limit: 10,
    },
    {
      $lookup: {
        from: 'categories',
        localField: 'category',
        foreignField: '_id',
        as: 'category',
      },
    },
    {
      $unwind: '$category',
    },
    {
      $project: {
        _id: 1,
        title: 1,
        category: { name: '$category.name', id: '$category._id' },
        stats: 1,
        engagementScore: 1,
        publishDate: 1,
      },
    },
  ];
  
  const [categoryStats, topContent] = await Promise.all([
    Content.aggregate(pipeline),
    Content.aggregate(topContentPipeline),
  ]);
  
  // Calculate overall stats
  const overallStats = {
    totalContent: categoryStats.reduce((sum, cat) => sum + cat.contentCount, 0),
    totalViews: categoryStats.reduce((sum, cat) => sum + cat.totalViews, 0),
    totalLikes: categoryStats.reduce((sum, cat) => sum + cat.totalLikes, 0),
    totalDislikes: categoryStats.reduce((sum, cat) => sum + cat.totalDislikes, 0),
    totalShares: categoryStats.reduce((sum, cat) => sum + cat.totalShares, 0),
    totalSaves: categoryStats.reduce((sum, cat) => sum + cat.totalSaves, 0),
    avgRating:
      categoryStats.length > 0
        ? categoryStats.reduce((sum, cat) => sum + cat.avgRating, 0) / categoryStats.length
        : 0,
  };
  
  res.status(200).json({
    status: 'success',
    data: {
      timeframe,
      overallStats,
      categoryStats,
      topContent,
    },
  });
});

// Analytics: User Activity
exports.getUserAnalytics = catchAsync(async (req, res, next) => {
  const { timeframe = 'week' } = req.query;
  
  // Calculate date range based on timeframe
  const today = new Date();
  let startDate = new Date();
  
  switch (timeframe) {
    case 'day':
      startDate.setDate(today.getDate() - 1);
      break;
    case 'week':
      startDate.setDate(today.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(today.getMonth() - 1);
      break;
    case 'year':
      startDate.setFullYear(today.getFullYear() - 1);
      break;
    default:
      startDate.setDate(today.getDate() - 7); // Default to week
  }
  
  // Get user stats
  const userStats = await User.aggregate([
    {
      $match: {
        createdAt: { $lte: today },
      },
    },
    {
      $facet: {
        overall: [
          {
            $group: {
              _id: null,
              totalUsers: { $sum: 1 },
              activeUsers: {
                $sum: {
                  $cond: [{ $gte: ['$lastLogin', startDate] }, 1, 0],
                },
              },
              premiumUsers: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $ne: ['$subscription.tier', 'free'] },
                        { $eq: ['$subscription.status', 'active'] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ],
        newUsers: [
          {
            $match: {
              createdAt: { $gte: startDate },
            },
          },
          { $count: 'count' },
        ],
        subscriptionTiers: [
          {
            $group: {
              _id: '$subscription.tier',
              count: { $sum: 1 },
              active: {
                $sum: {
                  $cond: [
                    { $eq: ['$subscription.status', 'active'] },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ],
        usersByStreak: [
          {
            $group: {
              _id: {
                $cond: [
                  { $lte: ['$stats.streak.current', 0] },
                  'Inactive',
                  {
                    $cond: [
                      { $lte: ['$stats.streak.current', 3] },
                      '1-3 days',
                      {
                        $cond: [
                          { $lte: ['$stats.streak.current', 7] },
                          '4-7 days',
                          {
                            $cond: [
                              { $lte: ['$stats.streak.current', 14] },
                              '8-14 days',
                              '15+ days',
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ],
      },
    },
  ]);
  
  // Format the results
  const result = {
    timeframe,
    overall: userStats[0].overall[0] || {
      totalUsers: 0,
      activeUsers: 0,
      premiumUsers: 0,
    },
    newUsers: userStats[0].newUsers[0]?.count || 0,
    subscriptionTiers: userStats[0].subscriptionTiers,
    usersByStreak: userStats[0].usersByStreak,
  };
  
  // Add retention rate (activeUsers / totalUsers)
  result.overall.retentionRate =
    result.overall.totalUsers > 0
      ? (result.overall.activeUsers / result.overall.totalUsers) * 100
      : 0;
  
  // Add conversion rate (premiumUsers / totalUsers)
  result.overall.conversionRate =
    result.overall.totalUsers > 0
      ? (result.overall.premiumUsers / result.overall.totalUsers) * 100
      : 0;
  
  res.status(200).json({
    status: 'success',
    data: result,
  });
});

// Generate content with AI for admin dashboard
exports.generateContent = catchAsync(async (req, res, next) => {
  const { categoryIds, contentType = 'hack', count = 1 } = req.body;
  
  if (!categoryIds || !Array.isArray(categoryIds) || categoryIds.length === 0) {
    return next(new AppError('Please provide at least one category ID', 400));
  }

  // Verify OpenAI API is properly configured
  if (!process.env.OPENAI_API_KEY) {
    console.error("CRITICAL ERROR: OPENAI_API_KEY is missing in environment variables");
    return next(new AppError('OpenAI API key is not configured. Please check your environment variables.', 500));
  }
  
  // Limit the count to prevent abuse
  const sanitizedCount = Math.min(Math.max(parseInt(count), 1), 50);
  
  try {
    const generatedContent = [];
    const errors = [];
    
    // Process each category
    for (const categoryId of categoryIds) {
      try {
        // Find the category
        const category = await Category.findById(categoryId);
        if (!category) {
          errors.push(`Category with ID ${categoryId} not found`);
          continue;
        }
        
        console.log(`Generating content for category: ${category.name} (${categoryId})`);
        
        // Generate content for this category using the real OpenAI API
        const contentService = require('../services/content.service');
        const categoryContent = await contentService.generateMultipleContent(
          category,
          req.user,
          contentType,
          Math.ceil(sanitizedCount / categoryIds.length), // Distribute count across categories
          'beginner',
          'gpt-4-turbo-preview' // Force use of specific model
        );
        
        console.log(`Generated ${categoryContent.length} content items for ${category.name}`);
        generatedContent.push(...categoryContent);
      } catch (err) {
        console.error(`Error generating content for category ${categoryId}:`, err);
        errors.push(`Error generating content for category ${categoryId}: ${err.message}`);
      }
    }
    
    if (generatedContent.length === 0) {
      return next(new AppError(`Failed to generate content: ${errors.join('; ')}`, 500));
    }
    
    res.status(201).json({
      status: 'success',
      data: {
        content: generatedContent,
        generated: generatedContent.length,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    console.error("Content generation failed:", error);
    return next(new AppError(`Content generation failed: ${error.message}`, 500));
  }
});

// Test OpenAI API connection
exports.testOpenAIConnection = catchAsync(async (req, res, next) => {
  try {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        status: 'fail',
        message: 'OpenAI API key is not configured in environment variables'
      });
    }
    
    // Initialize OpenAI
    const OpenAI = require('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 30000,
      maxRetries: 1,
    });
    
    // Make a simple test request
    const startTime = Date.now();
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Return the text 'OpenAI API is working correctly!' without any additional text." }
      ],
      max_tokens: 20
    });
    
    const responseTime = Date.now() - startTime;
    const responseText = completion.choices[0].message.content.trim();
    
    res.status(200).json({
      status: 'success',
      data: {
        message: 'OpenAI API test successful',
        response: responseText,
        responseTime: `${responseTime}ms`,
        apiKeyConfigured: true,
        model: "gpt-4-turbo-preview"
      }
    });
  } catch (error) {
    console.error('OpenAI API test error:', error);
    
    res.status(500).json({
      status: 'fail',
      message: `OpenAI API test failed: ${error.message}`,
      error: {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    });
  }
});

// User Management (Admin Only)
exports.getAllUsers = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;
  
  // Build filter
  const filter = {};
  
  // Get total count for pagination
  const total = await User.countDocuments(filter);
  
  // Get users with Google auth information included
  const users = await User.find(filter)
    .select('-password -__v')
    .sort('-createdAt')
    .skip(skip)
    .limit(limit);
  
  res.status(200).json({
    status: 'success',
    results: users.length,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
    },
    data: {
      users,
    },
  });
});

// ... (other user management functions)

// New controller function for seeding prompts
exports.seedPromptsFromFile = catchAsync(async (req, res, next) => {
  const result = await promptService.seedPromptsFromDefaultFile();
  
  res.status(200).json({
    status: 'success',
    message: 'Successfully seeded prompts from defaultprompts.txt',
    data: result,
  });
});

// Create content
exports.createContent = catchAsync(async (req, res, next) => {
  // Get content data from request body
  const contentData = { ...req.body };
  
  // Add user reference if not provided
  if (!contentData.authorId) {
    contentData.authorId = req.user._id;
  }
  
  // Create new content
  const newContent = await Content.create(contentData);
  
  // If creation is successful, return the new content
  res.status(201).json({
    status: 'success',
    data: {
      content: newContent
    }
  });
});

// Delete content
exports.deleteContent = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  const content = await Content.findById(id);
  
  if (!content) {
    return next(new AppError('Content not found', 404));
  }
  
  await Content.findByIdAndDelete(id);
  
  res.status(200).json({
    status: 'success',
    message: 'Content deleted successfully'
  });
});

// Move published content to deleted status
exports.movePublishedToDeleted = catchAsync(async (req, res, next) => {
  const { categoryId, count = 10 } = req.body;
  
  if (!categoryId) {
    return next(new AppError('Category ID is required', 400));
  }
  
  // Check if the category exists
  const category = await Category.findById(categoryId);
  if (!category) {
    return next(new AppError(`Category with ID ${categoryId} not found`, 404));
  }
  
  try {
    // Use the contentService to move published content to deleted
    const result = await contentService.movePublishedToDeleted(categoryId, parseInt(count));
    
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    console.error(`Error moving published content to deleted for category ${categoryId}:`, error);
    return next(new AppError(`Failed to move published content: ${error.message}`, 500));
  }
});

// Bulk publish content items from draft to published status
exports.bulkPublishContent = catchAsync(async (req, res, next) => {
  const { contentIds } = req.body;
  
  if (!contentIds || !Array.isArray(contentIds) || contentIds.length === 0) {
    return next(new AppError('Please provide an array of content IDs to publish', 400));
  }
  
  // Current date for publication timestamp
  const now = new Date();
  
  // Track successfully updated items
  let totalUpdated = 0;
  
  // Process each content ID
  for (const contentId of contentIds) {
    try {
      // Find and update only if status is 'draft'
      const content = await Content.findOneAndUpdate(
        { 
          _id: contentId,
          status: 'draft' // Only update draft items
        },
        {
          status: 'published',
          publishDate: now,
          hasBeenPublished: true,
          moderatorId: req.user._id
        },
        {
          new: true,
          runValidators: true
        }
      );
      
      if (content) {
        totalUpdated++;
      }
    } catch (err) {
      console.error(`Error updating content ${contentId}:`, err);
      // Continue with other items
    }
  }
  
  res.status(200).json({
    status: 'success',
    message: `Successfully published ${totalUpdated} out of ${contentIds.length} items`,
    data: {
      totalUpdated
    }
  });
});

// Cleanup duplicate content - keep one from each duplicate group and move others to deleted
exports.cleanupDuplicateContent = catchAsync(async (req, res, next) => {
  // Only admin can perform this operation
  if (req.user.role !== 'admin') {
    return next(new AppError('Only admin can perform this operation', 403));
  }

  // First, find content with similar body text - this will mark them as duplicates
  // But only do this for content not already marked as duplicate
  console.log('Detecting content with similar body text...');
  const allContent = await Content.find({ isDuplicate: { $ne: true } }).sort('-createdAt');
  
  // Group by category to compare only contents within same category
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
  
  // For each category, compare bodies to find duplicates
  let newDuplicatesFound = 0;
  for (const categoryId in contentByCategory) {
    const categoryItems = contentByCategory[categoryId];
    
    // Skip if less than 2 items in category
    if (categoryItems.length < 2) continue;
    
    // Compare each item with others in same category
    for (let i = 0; i < categoryItems.length; i++) {
      const itemA = categoryItems[i];
      // Skip if already marked as duplicate
      if (itemA.isDuplicate) continue;
      
      const bodyA = (itemA.body || '').trim().toLowerCase();
      if (!bodyA) continue;
      
      for (let j = i + 1; j < categoryItems.length; j++) {
        const itemB = categoryItems[j];
        // Skip if already marked as duplicate
        if (itemB.isDuplicate) continue;
        
        const bodyB = (itemB.body || '').trim().toLowerCase();
        if (!bodyB) continue;
        
        // Simple similarity check - can be improved with more sophisticated algorithms
        const similarity = calculateSimilarity(bodyA, bodyB);
        
        // If similarity is high, mark newer one as duplicate
        if (similarity > 0.8) { // 80% similarity threshold
          const newerItem = new Date(itemA.createdAt) > new Date(itemB.createdAt) ? itemA : itemB;
          
          await Content.findByIdAndUpdate(newerItem._id, {
            isDuplicate: true,
            originalContentId: newerItem._id === itemA._id ? itemB._id : itemA._id
          });
          
          console.log(`Marked content "${newerItem.title}" (ID: ${newerItem._id}) as duplicate based on body similarity (${Math.round(similarity * 100)}%)`);
          newDuplicatesFound++;
          break; // Continue with next item
        }
      }
    }
  }
  
  console.log(`Detected ${newDuplicatesFound} new duplicates based on body similarity`);

  // Now continue with existing duplicate cleanup process
  // Find all content marked as duplicates
  const duplicateContents = await Content.find({ isDuplicate: true })
    .populate('category', 'name slug icon color')
    .sort('-createdAt');

  console.log(`Found ${duplicateContents.length} items marked as duplicates`);
  
  // Group by title (case insensitive)
  const titleGroups = {};
  
  duplicateContents.forEach(item => {
    if (!item.title) return;
    
    const normalizedTitle = item.title.toLowerCase();
    if (!titleGroups[normalizedTitle]) {
      titleGroups[normalizedTitle] = [];
    }
    titleGroups[normalizedTitle].push(item);
  });
  
  // Process each group - keep the first item and move others to deleted
  let keptCount = 0;
  let deletedCount = 0;
  let publishedCount = 0;
  
  // Track categories that had published content deleted to replace them
  const affectedPublishedCategories = new Set();
  
  for (const title in titleGroups) {
    const group = titleGroups[title];
    
    if (group.length <= 1) {
      // Only one item, nothing to do
      keptCount++;
      continue;
    }
    
    // Keep the first item (newest or with most interactions)
    // You can customize this logic - currently keeping the first item in the array
    // which is sorted by creation date (newest first)
    const keepItem = group[0];
    keptCount++;
    
    // Move others to deleted
    for (let i = 1; i < group.length; i++) {
      const deleteItem = group[i];
      
      // Check if the item to be deleted is in published status
      const isPublished = deleteItem.status === 'published';
      
      // Save category ID for later use (only if it was published)
      if (isPublished && deleteItem.category) {
        const categoryId = typeof deleteItem.category === 'object' ? 
          deleteItem.category._id : deleteItem.category;
        affectedPublishedCategories.add(categoryId.toString());
      }
      
      // Properly move to DeletedContent collection
      try {
        // Convert to plain object
        const contentData = deleteItem.toObject();
        
        // Save original ID and remove _id to avoid duplicate key error
        const originalId = contentData._id;
        delete contentData._id;
        
        // Change status to a valid enum value for DeletedContent model
        // 'deleted' is not a valid status in DeletedContent model
        if (contentData.status === 'deleted') {
          contentData.status = 'archived'; // Use 'archived' instead
        }
        
        // Add deletion metadata
        contentData.deletedAt = new Date();
        contentData.originalContentId = originalId;
        contentData.reason = 'duplicate';
        
        // Create entry in DeletedContent collection
        const DeletedContent = require('../models/deletedContent.model');
        await DeletedContent.create(contentData);
        
        // Delete the original content
        await Content.findByIdAndDelete(deleteItem._id);
        
        console.log(`Moved duplicate content ${originalId} (${deleteItem.title}) to DeletedContent (status: ${deleteItem.status})`);
        deletedCount++;
      } catch (err) {
        console.error(`Error moving duplicate content to DeletedContent: ${err.message}`);
      }
    }
  }
  
  // For each affected category WHERE PUBLISHED CONTENT WAS DELETED, randomly publish a draft item
  const now = new Date();
  for (const categoryId of affectedPublishedCategories) {
    try {
      // Find draft items in this category
      const draftItems = await Content.find({
        category: categoryId,
        status: 'draft'
      });
      
      if (draftItems.length > 0) {
        // Select a random draft item
        const randomIndex = Math.floor(Math.random() * draftItems.length);
        const itemToPublish = draftItems[randomIndex];
        
        // Publish the item
        await Content.findByIdAndUpdate(itemToPublish._id, {
          status: 'published',
          publishDate: now,
          hasBeenPublished: true
        });
        
        console.log(`Published draft item ${itemToPublish._id} (${itemToPublish.title}) from category ${categoryId} to replace a deleted published duplicate`);
        publishedCount++;
      } else {
        console.log(`No draft items found in category ${categoryId} to publish as replacement`);
      }
    } catch (err) {
      console.error(`Error publishing draft item for category ${categoryId}:`, err);
    }
  }
  
  res.status(200).json({
    status: 'success',
    message: `Processed duplicate content: kept ${keptCount}, moved ${deletedCount} to deleted, published ${publishedCount} draft items as replacements`,
    data: {
      totalProcessed: duplicateContents.length,
      newDuplicatesFound,
      keptCount,
      deletedCount,
      publishedCount
    }
  });
});

// Similarity calculation function - Jaccard similarity index
// A simple but effective way to measure text similarity
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

module.exports = { ...exports }; // Ensure all exports are correctly bundled if not already structured this way 