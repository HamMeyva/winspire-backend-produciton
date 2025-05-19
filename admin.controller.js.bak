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
        
        // Generate content for this category
        const categoryContent = await contentService.generateMultipleContent(
          category,
          req.user,
          contentType,
          Math.ceil(sanitizedCount / categoryIds.length) // Distribute count across categories
        );
        
        generatedContent.push(...categoryContent);
      } catch (err) {
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
    return next(new AppError(`Content generation failed: ${error.message}`, 500));
  }
});

// User Management (Admin Only)
exports.getAllUsers = catchAsync(async (req, res, next) => {
  // ... (existing code for getAllUsers)
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

module.exports = { ...exports }; // Ensure all exports are correctly bundled if not already structured this way 