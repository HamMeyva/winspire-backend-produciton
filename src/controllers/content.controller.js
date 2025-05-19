const mongoose = require('mongoose');
const Content = require('../models/content.model');
const Category = require('../models/category.model');
const User = require('../models/user.model');
const DeletedContent = require('../models/deletedContent.model');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const contentService = require('../services/content.service');
const schedulerService = require('../services/scheduler.service');

// Get content types
exports.getContentTypes = catchAsync(async (req, res) => {
  // Get the content types from the model's schema
  const contentTypes = Content.schema.path('contentType').enumValues;
  
  res.status(200).json({
    status: 'success',
    data: contentTypes
  });
});

// Get all content with pagination and filtering
exports.getAllContent = catchAsync(async (req, res, next) => {
  const { 
    page = 1, 
    limit = 10, 
    status, 
    category, 
    contentType, 
    difficulty,
    search,
    pool,
    isDuplicate
  } = req.query;
  
  // Build query filter
  const filter = {};
  
  // Only admins and content creators can see non-published content
  if (['admin', 'content-creator', 'moderator'].includes(req.user.role)) {
    if (status) filter.status = status;
  } else {
    filter.status = 'published';
  }
  
  // Add other filters if provided
  if (category) filter.category = category;
  if (contentType) filter.contentType = contentType;
  if (difficulty) filter.difficulty = difficulty;
  if (pool) filter.pool = pool;
  
  // Add duplicate filter if provided
  if (isDuplicate !== undefined) {
    console.log('Received isDuplicate param:', isDuplicate, 'type:', typeof isDuplicate);
    
    // Convert string representation to boolean if needed
    let isDuplicateBool;
    if (typeof isDuplicate === 'string') {
      isDuplicateBool = isDuplicate.toLowerCase() === 'true';
    } else {
      isDuplicateBool = Boolean(isDuplicate);
    }
    
    // Verify duplicate content exists
    const duplicateCount = await Content.countDocuments({ isDuplicate: true });
    const nonDuplicateCount = await Content.countDocuments({ isDuplicate: false });
    const undefinedDuplicateCount = await Content.countDocuments({ isDuplicate: { $exists: false } });
    
    console.log('DUPLICATE STATS:');
    console.log(`- isDuplicate=true: ${duplicateCount} documents`);
    console.log(`- isDuplicate=false: ${nonDuplicateCount} documents`);
    console.log(`- isDuplicate undefined: ${undefinedDuplicateCount} documents`);
    console.log(`- Processed isDuplicateBool value: ${isDuplicateBool} (${typeof isDuplicateBool})`);
    
    // Apply the filter, considering undefined cases
    if (isDuplicateBool) {
      // Looking for duplicates - only include where isDuplicate is true
      filter.isDuplicate = true;
      console.log('Setting filter.isDuplicate = true to show only duplicates');
    } else {
      // Looking for non-duplicates - include both false and undefined
      filter.$or = [
        { isDuplicate: false },
        { isDuplicate: { $exists: false } }
      ];
      console.log('Setting filter.$or to show only non-duplicates (false or undefined)');
    }
    
    console.log(`Filtering for ${isDuplicateBool ? 'duplicate' : 'non-duplicate'} content ONLY.`);
    console.log(`Modified filter:`, JSON.stringify(filter, null, 2));
  }
  
  // Add search filter if provided
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { summary: { $regex: search, $options: 'i' } },
      { body: { $regex: search, $options: 'i' } },
      { tags: { $regex: search, $options: 'i' } }
    ];
  }
  
  console.log('Content filter query:', JSON.stringify(filter, null, 2));
  
  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  // Count total matching documents
  const total = await Content.countDocuments(filter);
  
  // Get content with pagination
  const content = await Content.find(filter)
    .populate('category', 'name slug icon color')
    .populate('authorId', 'name')
    .sort('-createdAt')
    .skip(skip)
    .limit(parseInt(limit));
    
  // Process content to include formatted creation dates in the response
  const contentWithDates = content.map(item => {
    const contentObj = item.toObject();
    // Add formatted creation date for admin panel display
    contentObj.formattedCreatedAt = item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Unknown';
    return contentObj;
  });
  
  res.status(200).json({
    status: 'success',
    results: contentWithDates.length,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      limit: parseInt(limit),
    },
    data: {
      content: contentWithDates,
    },
  });
});

// Get daily content for user
exports.getDailyContent = catchAsync(async (req, res, next) => {
  const user = req.user;
  const { category, contentType = 'hack' } = req.query;
  let query = { status: 'published' };
  
  // Apply category filter if provided
  if (category) {
    const categoryDoc = await Category.findOne({ slug: category, active: true });
    if (!categoryDoc) {
      return next(new AppError('Category not found', 404));
    }
    query.category = categoryDoc._id;
  }
  
  // Apply content type filter
  if (contentType) {
    query.contentType = contentType;
  }
  
  // Apply premium content filter based on subscription
  if (user.subscription.tier === 'free') {
    query.premium = false;
  }
  
  // Get today's date range (start and end of day)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Find content published today or recycled for today
  query.publishDate = { $gte: today, $lt: tomorrow };
  
  // Get content for user with limit based on subscription tier
  let limit = 5; // Default for free tier
  
  if (user.subscription.tier === 'basic') limit = 10;
  else if (user.subscription.tier === 'premium') limit = 20;
  else if (user.subscription.tier === 'enterprise') limit = 100;
  
  const content = await Content.find(query)
    .populate('category', 'name slug icon color')
    .populate('authorId', 'name')
    .sort('-publishDate')
    .limit(limit);
  
  // If not enough content, add some fresh content that hasn't been used recently
  if (content.length < limit) {
    const remainingCount = limit - content.length;
    
    // Get user's previously viewed content IDs to exclude
    const viewedContentIds = user.progress.completedContent.map(id => id.toString());
    
    // Find content that hasn't been shown recently, prioritizing by pool
    const pools = ['highly_liked', 'accepted', 'regular'];
    let freshContent = [];
    
    for (const pool of pools) {
      if (freshContent.length >= remainingCount) break;
      
      const poolQuery = {
        status: 'published',
        _id: { $nin: [...viewedContentIds, ...content.map(c => c._id)] },
        pool,
      };
      
      // Apply category and contentType filters
      if (category) poolQuery.category = query.category;
      if (contentType) poolQuery.contentType = contentType;
      
      // Apply premium filter based on subscription
      if (user.subscription.tier === 'free') {
        poolQuery.premium = false;
      }
      
      // Get content from this pool
      const poolContent = await Content.find(poolQuery)
        .populate('category', 'name slug icon color')
        .populate('authorId', 'name')
        .sort({ usageCount: 1, lastUsedDate: 1 }) // Prioritize least used content
        .limit(remainingCount - freshContent.length);
      
      freshContent.push(...poolContent);
    }
    
    // Update usage tracking for the fresh content
    const now = new Date();
    await Promise.all(freshContent.map(item => 
      Content.findByIdAndUpdate(item._id, {
        $inc: { usageCount: 1 },
        lastUsedDate: now
      })
    ));
    
    // Combine fresh and current content
    content.push(...freshContent);
  }
  
  res.status(200).json({
    status: 'success',
    results: content.length,
    data: {
      content,
    },
  });
});

// Get single content by ID
exports.getContent = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const user = req.user;
  
  const content = await Content.findById(id)
    .populate('category', 'name slug icon color')
    .populate('authorId', 'name');
  
  if (!content) {
    return next(new AppError('Content not found', 404));
  }
  
  // Check if premium content is accessible to user
  if (content.premium && user.subscription.tier === 'free') {
    return next(new AppError('Premium content requires subscription', 403));
  }
  
  // Increment view count
  content.stats.views += 1;
  
  // Mark content as published when viewed on mobile
  // This is crucial for the daily content generation process
  // to correctly identify which content has been shown to users
  content.hasBeenPublished = true;
  
  console.log(`Content ${id} marked as published (hasBeenPublished=true) after being viewed`);
  
  await content.save({ validateBeforeSave: false });
  
  // Update user stats and progress
  user.stats.totalContentViewed += 1;
  
  // Add to completed content if not already there
  if (!user.progress.completedContent.includes(content._id)) {
    user.progress.completedContent.push(content._id);
  }
  
  // Update category progress
  const categoryIndex = user.progress.categoryProgress.findIndex(
    cp => cp.category.toString() === content.category._id.toString()
  );
  
  if (categoryIndex !== -1) {
    user.progress.categoryProgress[categoryIndex].contentViewed += 1;
    user.progress.categoryProgress[categoryIndex].lastViewedAt = Date.now();
  } else {
    user.progress.categoryProgress.push({
      category: content.category._id,
      contentViewed: 1,
      lastViewedAt: Date.now(),
    });
    
    // Increment categories explored if this is first content in category
    user.stats.categoriesExplored += 1;
  }
  
  await user.save({ validateBeforeSave: false });
  
  res.status(200).json({
    status: 'success',
    data: {
      content,
    },
  });
});

// Rate content (like/dislike)
exports.rateContent = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { rating } = req.body;
  const user = req.user;
  
  if (rating !== 'like' && rating !== 'dislike') {
    return next(new AppError('Rating must be like or dislike', 400));
  }
  
  const content = await Content.findById(id);
  
  if (!content) {
    return next(new AppError('Content not found', 404));
  }
  
  // Update content stats
  if (rating === 'like') {
    content.stats.likes += 1;
    user.stats.totalLikes += 1;
  } else {
    content.stats.dislikes += 1;
    user.stats.totalDislikes += 1;
  }
  
  // Update content pool based on new ratings
  content.updatePool();
  
  await content.save({ validateBeforeSave: false });
  await user.save({ validateBeforeSave: false });
  
  res.status(200).json({
    status: 'success',
    data: {
      rating: rating,
      likes: content.stats.likes,
      dislikes: content.stats.dislikes,
      pool: content.pool
    },
  });
});

// Save content to user's library
exports.saveContent = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const user = req.user;
  
  const content = await Content.findById(id);
  
  if (!content) {
    return next(new AppError('Content not found', 404));
  }
  
  // Check if already saved
  if (user.progress.savedContent.includes(content._id)) {
    return next(new AppError('Content already saved', 400));
  }
  
  // Add to saved content
  user.progress.savedContent.push(content._id);
  await user.save({ validateBeforeSave: false });
  
  // Increment save count on content
  content.stats.saves += 1;
  await content.save({ validateBeforeSave: false });
  
  res.status(200).json({
    status: 'success',
    message: 'Content saved successfully',
  });
});

// Remove saved content from user's library
exports.unsaveContent = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const user = req.user;
  
  // Remove from saved content
  user.progress.savedContent = user.progress.savedContent.filter(
    contentId => contentId.toString() !== id
  );
  await user.save({ validateBeforeSave: false });
  
  res.status(200).json({
    status: 'success',
    message: 'Content removed from saved items',
  });
});

// Get user's saved content
exports.getSavedContent = catchAsync(async (req, res, next) => {
  const user = req.user;
  
  const savedContent = await Content.find({
    _id: { $in: user.progress.savedContent },
  })
    .populate('category', 'name slug icon color')
    .populate('authorId', 'name')
    .sort('-updatedAt');
  
  res.status(200).json({
    status: 'success',
    results: savedContent.length,
    data: {
      content: savedContent,
    },
  });
});

// Share content (track share count)
exports.shareContent = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  const content = await Content.findById(id);
  
  if (!content) {
    return next(new AppError('Content not found', 404));
  }
  
  // Increment share count
  content.stats.shares += 1;
  await content.save({ validateBeforeSave: false });
  
  res.status(200).json({
    status: 'success',
    message: 'Share count updated',
    data: {
      shares: content.stats.shares,
    },
  });
});

// Generate AI content
exports.generateContent = async (req, res, next) => {
  try {
    const { category, contentType, count = 10, difficulty = 'beginner', model = 'gpt-4-turbo-preview' } = req.body;
    
    if (!category) {
      return res.status(400).json({
        status: 'fail',
        message: 'Category is required'
      });
    }
    
    const Category = require('../models/category.model');
    const foundCategory = await Category.findById(category);
    
    if (!foundCategory) {
      return res.status(404).json({
        status: 'fail',
        message: 'Category not found'
      });
    }
    
    const contentService = require('../services/content.service');
    const generatedContent = await contentService.generateMultipleContent(
      foundCategory,
      req.user,
      contentType,
      count,
      difficulty,
      model
    );
    
    // Mark that manual generation has been done for today
    schedulerService.setManualGenerationDone();
    
    res.status(201).json({
      status: 'success',
      results: generatedContent.length,
      data: {
        content: generatedContent
      }
    });
  } catch (error) {
    next(error);
  }
};

// Generate multiple content items
exports.generateMultipleContent = async (req, res, next) => {
  try {
    const { categoryId, contentType, count, difficulty, model } = req.body;
    
    if (!categoryId) {
      return next(new AppError('Category ID is required', 400));
    }
    
    // Retrieve full category object
    const category = await Category.findById(categoryId);
    
    if (!category) {
      return next(new AppError('Category not found', 404));
    }
    
    // Use category's contentType if not explicitly provided
    // This makes the contentType in the request optional
    const effectiveContentType = contentType || category.contentType || 'hack';
    
    console.log(`Using content type: ${effectiveContentType} for category: ${category.name}`);
    
    // Use category's defaultNumToGenerate if count not provided
    const effectiveCount = count || category.defaultNumToGenerate || 5;
    
    // Log the model being used
    const effectiveModel = model || 'gpt-4o';
    console.log(`Making OpenAI API call with model: ${effectiveModel}`);
    
    const user = req.user;
    if (!user) {
      return next(new AppError('Authentication required', 401));
    }
    
    try {
      const contentService = require('../services/content.service');
      const generatedContent = await contentService.generateMultipleContent(
        category,
        user,
        effectiveContentType,
        effectiveCount,
        difficulty || 'beginner',
        effectiveModel // Pass the model parameter
      );
      
      res.status(201).json({
        status: 'success',
        results: generatedContent.length,
        data: {
          content: generatedContent
        }
      });
    } catch (genError) {
      console.error('Error in content generation service:', genError);
      return next(new AppError(`Generation service error: ${genError.message}`, 500));
    }
  } catch (error) {
    console.error('Error in content generation controller:', error);
    return next(new AppError(`Failed to generate content: ${error.message}`, 500));
  }
};

// Add an endpoint for retrieving content by pool
exports.getContentByPool = catchAsync(async (req, res, next) => {
  const { pool = 'regular', category, contentType } = req.query;
  
  const query = { pool };
  
  if (category) {
    query.category = category;
  }
  
  if (contentType) {
    query.contentType = contentType;
  }
  
  const content = await Content.find(query)
    .populate('category', 'name slug icon color')
    .populate('authorId', 'name')
    .sort('-createdAt')
    .limit(100);
  
  res.status(200).json({
    status: 'success',
    success: true,
    results: content.length,
    data: {
      content,
    },
  });
});

// Rewrite content (make it unique)
exports.rewriteContent = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { model = 'gpt-4-turbo-preview' } = req.body;
  
  // Find the content to rewrite
  const content = await Content.findById(id);
  
  if (!content) {
    return next(new AppError('Content not found', 404));
  }
  
  try {
    // Get the content service
    const contentService = require('../services/content.service');
    
    // Create a custom rewrite prompt
    const rewritePrompt = `
You are a content rewriting assistant. Take the following content and rewrite it completely 
to make it unique while preserving the core information and value. Use different wording, 
structure, and examples, but maintain the same overall message and advice.

Original Content:
Title: ${content.title}
Body: ${content.body}

Rewrite this content to be completely unique. Return your response as valid JSON with 
title, body, and summary fields.
`;
    
    // Generate new content based on the old one
    const newContent = await contentService.generateWithAI(
      content.category, // Pass the category for context
      null, // No specific topic
      content.difficulty, // Keep same difficulty
      rewritePrompt, // Custom rewrite prompt
      model // Use the specified model
    );
    
    // Update the content with new version
    content.title = newContent.title;
    content.body = newContent.body;
    content.summary = newContent.summary;
    content.updatedAt = Date.now();
    content.lastRewriteDate = Date.now();
    
    // If tags were generated, use them, otherwise keep existing
    if (newContent.tags && newContent.tags.length > 0) {
      content.tags = newContent.tags;
    }
    
    // Save the updated content
    await content.save();
    
    res.status(200).json({
      status: 'success',
      message: 'Content rewritten successfully',
      data: {
        content
      }
    });
  } catch (error) {
    console.error('Error rewriting content:', error);
    return next(new AppError(`Failed to rewrite content: ${error.message}`, 500));
  }
});

// Get content by category ID
exports.getContentByCategory = catchAsync(async (req, res, next) => {
  const { categoryId } = req.params;
  const { contentType, limit = 50, status = 'published' } = req.query;
  
  // Log the request details to debug the issue
  console.log(`API.getContentByCategory - Request params:`, {
    categoryId,
    contentType,
    limit,
    status,
    requestQuery: req.query
  });
  
  // Build filter
  const filter = {
    category: categoryId
  };
  
  // API'yi düzeltmek için status parametresini özel işleyelim
  // Eğer status=draft ise, mobil uygulama için hem draft hem de published gösterelim
  if (status === 'draft') {
    // Mobil uygulama 'draft' istiyor, ancak hem draft hem de published gösterelim
    filter.status = { $in: ['draft', 'published'] };
    console.log('API.getContentByCategory - MOBILE FIX: Showing both draft and published content');
  } else {
    // Normal davranış - status parametresini aynen kullan
    filter.status = status;
  }
  
  // İçerik tipi filtresi için gelişmiş mantık ekleyelim
  if (contentType) {
    // Tutarsızlıkları gidermek için benzer içerik tiplerini birleştirelim
    if (contentType === 'tip' || contentType === 'tip2') {
      // 'tip/tip2' için tüm benzer içerik tiplerini göster
      filter.contentType = { $in: ['tip', 'hack', 'tip2', 'hack2'] };
      console.log(`API.getContentByCategory - CONTENT FIX: Showing all tip/hack variations for ${contentType}`);
    } else if (contentType === 'hack' || contentType === 'hack2') {
      // 'hack/hack2' için tüm benzer içerik tiplerini göster
      filter.contentType = { $in: ['hack', 'tip', 'hack2', 'tip2'] };
      console.log(`API.getContentByCategory - CONTENT FIX: Showing all hack/tip variations for ${contentType}`);
    } else if (contentType === 'quote' || contentType === 'quote2') {
      // 'quote/quote2' için tüm quote varyasyonlarını göster
      filter.contentType = { $in: ['quote', 'quote2'] };
      console.log(`API.getContentByCategory - CONTENT FIX: Showing all quote variations for ${contentType}`);
    } else {
      // Diğer türler için normal filtreleme
      filter.contentType = contentType;
    }
  }
  
  // Count ALL content for this category (without status filter) for debugging
  const totalInCategory = await Content.countDocuments({ category: categoryId });
  const publishedInCategory = await Content.countDocuments({ category: categoryId, status: 'published' });
  
  // Log filter and counts for debugging
  console.log(`API.getContentByCategory - Counts:`, {
    totalInCategory,
    publishedInCategory,
    filter
  });

  // Find content matching the filter - BUT REMOVE LIMIT TEMPORARILY for debugging purposes
  const content = await Content.find(filter)
    .sort('-publishDate')
    .select('title body summary category contentType status difficulty tags pool stats hasBeenPublished publishDate');
  
  // Log detailed results
  console.log(`API.getContentByCategory - Found ${content.length} content items with filter:`, JSON.stringify(filter));
  
  // Add hasBeenPublished stats for diagnosis 
  const hasBeenPublishedCount = content.filter(item => item.hasBeenPublished).length;
  console.log(`API.getContentByCategory - Items with hasBeenPublished=true: ${hasBeenPublishedCount}`);
  
  // Limit results for actual response to avoid performance issues
  const limitedContent = content.slice(0, parseInt(limit));
  
  // Return empty array instead of 404 when no content found
  res.status(200).json({
    status: 'success',
    results: limitedContent.length,
    debug: {
      totalInCategory,
      publishedInCategory,
      hasBeenPublishedCount,
      totalMatching: content.length
    },
    data: {
      content: limitedContent
    }
  });
});

// Get all deleted content with pagination
exports.getDeletedContent = catchAsync(async (req, res, next) => {
  // Parse query parameters
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;
  
  console.log('Deleted content request params:', req.query);
  
  // Build base query
  let queryConditions = {};
  
  // Apply search filter if provided
  if (req.query.search) {
    queryConditions.title = { $regex: req.query.search, $options: 'i' };
  }
  
  // Apply category filter if provided
  if (req.query.category) {
    queryConditions.category = req.query.category;
  }
  
  // Apply contentType filter if provided
  if (req.query.contentType) {
    queryConditions.contentType = req.query.contentType;
  }
  
  // Apply difficulty filter if provided
  if (req.query.difficulty) {
    queryConditions.difficulty = req.query.difficulty;
  }
  
  // Apply reason filter if provided
  if (req.query.reason) {
    // Debug log filtrelenen reason değerini yazdır
    console.log(`Filtering by reason: "${req.query.reason}"`);
    
    // Exact match yerine case-insensitive regex kullan
    queryConditions.reason = { $regex: new RegExp(`^${req.query.reason}$`, 'i') }; 
  }
  
  console.log('Query conditions:', JSON.stringify(queryConditions, null, 2));
  
  // Toplam kayıtları kontrol et (filtresiz)
  const allRecords = await DeletedContent.find({});
  console.log(`Total records in DeletedContent: ${allRecords.length}`);
  
  // Kaç duplicate var kontrol et
  const duplicateCount = await DeletedContent.countDocuments({ reason: 'duplicate' });
  console.log(`Records with reason='duplicate': ${duplicateCount}`);
  
  // Count total matching documents for pagination
  const totalCount = await DeletedContent.countDocuments(queryConditions);
  console.log(`Found ${totalCount} deleted content items matching query`);
  
  // Default sort by deletedAt (newest first)
  let sortOption = { deletedAt: -1 };
  
  // Apply pagination and populate category
  const content = await DeletedContent.find(queryConditions)
    .skip(skip)
    .limit(limit)
    .sort(sortOption)
    .populate('category', 'name');
  
  console.log(`Retrieved ${content.length} deleted content items after pagination`);
  
  // Format content for response
  const formattedContent = content.map(item => {
    const formattedItem = item.toObject();
    
    // Add action summary if not present
    if (!formattedItem.actionSummary) {
      const likeCount = formattedItem.likeCount || 0;
      const dislikeCount = formattedItem.dislikeCount || 0;
      const maybeCount = formattedItem.maybeCount || 0;
      formattedItem.actionSummary = `${likeCount}/${dislikeCount}/${maybeCount}`;
    }
    
    return formattedItem;
  });
  
  // Standardize response format to match other API endpoints
  res.status(200).json({
    status: 'success',
    success: true,
    data: {
      content: formattedContent,
      totalCount,
      page,
      limit,
      results: formattedContent.length
    }
  });
});

// Permanently delete content from the deleted content collection
exports.permanentlyDeleteContent = catchAsync(async (req, res, next) => {
  const deletedContent = await DeletedContent.findByIdAndDelete(req.params.id);
  
  if (!deletedContent) {
    return res.status(404).json({
      status: 'error',
      message: 'Deleted content not found'
    });
  }

  res.status(200).json({
    status: 'success',
    message: 'Content permanently deleted',
    data: null
  });
});

// Restore content from deleted back to main content collection
exports.restoreDeletedContent = catchAsync(async (req, res, next) => {
  const Content = require('../models/content.model');
  
  // Find the deleted content
  const deletedContent = await DeletedContent.findById(req.params.id);
  
  if (!deletedContent) {
    return res.status(404).json({
      status: 'error',
      message: 'Deleted content not found'
    });
  }
  
  // Prepare content object without deleted-specific fields
  const contentData = deletedContent.toObject();
  
  delete contentData.deletedAt;
  delete contentData._id; // Remove _id to allow MongoDB to generate a new one
  delete contentData.__v; // Remove version key
  
  // Create new content document
  const newContent = await Content.create(contentData);
  
  // Delete from deleted collection
  await DeletedContent.findByIdAndDelete(req.params.id);
  
  res.status(200).json({
    status: 'success',
    message: 'Content restored successfully',
    data: {
      content: newContent
    }
  });
});

const UserAction = require('../models/userAction.model');

// Find related content by category, cardIndex, title, and other identifiers
const findRelatedContent = async (category, title, cardIndex) => {
  try {
    // Arama stratejileri:
    // 1. Kategori ve cardIndex ile arama (en güvenilir yöntem)
    // 2. ID ile doğrudan arama
    // 3. Kategori ve başlık ile arama
    // 4. Sadece başlık ile arama
    let content = null;
    let categoryId = null;
    
    console.log(`Searching for content with: category=${category}, title=${title}, cardIndex=${cardIndex}`);
    
    // Find category ID if we have a category name (will be used in multiple strategies)
    if (category) {
      if (mongoose.Types.ObjectId.isValid(category)) {
        categoryId = category;
      } else {
        // Try to find by name or slug
        const categoryDoc = await Category.findOne({ 
          $or: [
            { name: { $regex: new RegExp(category, 'i') } }, // case insensitive
            { slug: { $regex: new RegExp(category.toLowerCase().replace(/\s+/g, '-'), 'i') } }
          ] 
        });
        
        if (categoryDoc) {
          categoryId = categoryDoc._id;
          console.log(`Found category ID: ${categoryId} for category name: ${category}`);
        }
      }
    }
    
    // SPECIAL CASE: If title is the same as categoryId, this means mobile app is sending category ID instead of content ID
    // This is a common error pattern we've observed in the logs
    if (categoryId && title && categoryId.toString() === title.toString()) {
      console.log(`SPECIAL CASE DETECTED: title (${title}) is the same as categoryId, mobile app sent category ID instead of content ID`);
      console.log(`Using cardIndex (${cardIndex}) to find the correct content`);
    }
    
    // 1. KEY STRATEGY: Find by category and cardIndex combination
    // This is most reliable for mobile app where cardIndex represents the position
    if (categoryId && cardIndex !== undefined) {
      // MOBİL UYGULAMA FİKSİ: Log'lardan, içeriğin sadece 'draft' durumunda olduğunu gördük,
      // bu nedenle hem draft hem de published içerikleri arıyoruz
      console.log(`MOBİL UYGULAMA FİKSİ: Draft ve published içeriklerini birlikte arıyoruz`);
      
      // İlk olarak, bu kategoride kaç içerik olduğunu belirleyelim
      const categoryContentCount = await Content.countDocuments({ 
        category: categoryId, 
        status: { $in: ['draft', 'published'] }
      });
      
      console.log(`Kategori ${categoryId} içerisinde ${categoryContentCount} içerik bulundu (draft+published)`);
      
      // Farklı sıralama stratejilerini deneyelim
      const sortOptions = [
        { createdAt: -1 },    // en yeniler önce
        { publishDate: -1 },  // en son yayınlananlar
        { title: 1 }          // alfabetik sıralama
      ];
      
      // Farklı status kombinasyonlarını deneyelim
      const statusOptions = [
        { $in: ['draft', 'published'] }, // Hem draft hem de published
        'draft',                         // Sadece draft
        'published'                      // Sadece published
      ];
      
      // Farklı contentType kombinasyonlarını deneyelim
      const contentTypeOptions = [
        { $in: ['hack', 'tip', 'hack2', 'tip2'] }, // Tüm içerik tipleri
        { $exists: true }                         // Herhangi bir içerik tipi
      ];
      
      // Tüm kombinasyonları deneyelim
      for (const statusFilter of statusOptions) {
        for (const contentTypeFilter of contentTypeOptions) {
          for (const sortOption of sortOptions) {
            // Bu kombinasyon için içerikleri al
            console.log(`İçerik arama kombinasyonu: status=${JSON.stringify(statusFilter)}, sort=${JSON.stringify(sortOption)}`);
            
            const query = {
              category: categoryId,
              status: statusFilter
            };
            
            // Content type filtresini ekle (varsa)
            if (contentTypeFilter) {
              query.contentType = contentTypeFilter;
            }
            
            const categoryContents = await Content.find(query)
              .sort(sortOption)
              .limit(50); // Daha fazla içerik almak için limiti artırdık
            
            console.log(`Bu kombinasyonda ${categoryContents.length} içerik bulundu`);
            
            // Eğer yeterli içerik varsa ve cardIndex geçerliyse
            if (categoryContents && categoryContents.length > cardIndex) {
              content = categoryContents[cardIndex]; // İndeks konumundaki içeriği al
              console.log(`💯 CONTENT BULUNDU (sort: ${JSON.stringify(sortOption)}, status: ${JSON.stringify(statusFilter)}): ${content.title} (${content._id}) - index ${cardIndex}`);
              return content;
            }
          }
        }
      }
      
      // Bu noktaya gelirsek, tüm kombinasyonları denedik ama hiçbir içerik bulamadık
      // Son çare olarak, kategorideki herhangi bir içeriği alalım
      const anyContent = await Content.findOne({ category: categoryId });
      if (anyContent) {
        console.log(`⚠️ FALLBACK: İndeks ${cardIndex} konumunda içerik bulunamadı, ilk mevcut içerik kullanılıyor: ${anyContent.title} (${anyContent._id})`);
        return anyContent;
      } else {
        console.log(`❌ KRİTİK HATA: Kategori ${categoryId} için HİÇBİR içerik bulunamadı! Mobil uygulamada gösterilen içerik veritabanında yok!`);
      }
    }
    
    // 2. Try finding by ID if title is a valid ObjectId
    if (mongoose.Types.ObjectId.isValid(title)) {
      content = await Content.findById(title);
      if (content) {
        console.log(`Found content by ID: ${title}`);
        return content;
      }
    }
    
    // 3. Try finding by exact category and title combination
    if (categoryId) {
      content = await Content.findOne({ 
        category: categoryId,
        $or: [
          { title: title },
          { slug: title }
        ]
      });
      
      if (content) {
        console.log(`Found content by category and title: ${title} in category ${category}`);
        return content;
      }
    }
    
    // 4. Finally, try just by title as a last resort
    content = await Content.findOne({ 
      $or: [
        { title: title },
        { slug: title }
      ]
    });
    
    if (content) {
      console.log(`Found content by title only: ${title}`);
      return content;
    }
    
    console.log(`Could not find content for: category=${category}, title=${title}, cardIndex=${cardIndex}`);
    return null;
  } catch (err) {
    console.error('Error finding content:', err);
    return null;
  }
};

// Update content's like/dislike/maybe counts
const updateContentActionCounts = async (content) => {
  if (!content || !content._id) return;
  
  try {
    // Count all actions for this content
    const [likes, dislikes, maybes] = await Promise.all([
      UserAction.countDocuments({ contentId: content._id, action: 'like' }),
      UserAction.countDocuments({ contentId: content._id, action: 'dislike' }),
      UserAction.countDocuments({ contentId: content._id, action: 'maybe' })
    ]);
    
    // Update the content with these counts
    const updatedContent = await Content.findByIdAndUpdate(content._id, {
      $set: {
        likeCount: likes,
        dislikeCount: dislikes,
        maybeCount: maybes,
        // Add a field to show in admin panel
        actionSummary: `${likes}/${dislikes}/${maybes}`,
        // Also update the stats for backward compatibility
        'stats.likes': likes,
        'stats.dislikes': dislikes
      }
    }, { new: true });
    
    console.log(`Updated content ${content._id} (${content.title}) with action counts: ${likes}/${dislikes}/${maybes}`);
    return updatedContent;
  } catch (err) {
    console.error('Error updating content action counts:', err);
    return null;
  }
};

// Update content's like/dislike/maybe counts with direct increment
const incrementContentAction = async (content, action) => {
  if (!content || !content._id) return null;
  
  try {
    // Define update object based on action type
    const updateFields = {};
    
    // Increment specific counter based on action
    if (action === 'like') {
      updateFields.likeCount = 1;
      updateFields['stats.likes'] = 1;
    } else if (action === 'dislike') {
      updateFields.dislikeCount = 1;
      updateFields['stats.dislikes'] = 1;
    } else if (action === 'maybe') {
      updateFields.maybeCount = 1;
    }
    
    // Update the content with incremented count
    const updatedContent = await Content.findByIdAndUpdate(content._id, {
      $inc: updateFields
    }, { new: true });
    
    // Now update the action summary field
    if (updatedContent) {
      const likeCount = updatedContent.likeCount || 0;
      const dislikeCount = updatedContent.dislikeCount || 0;
      const maybeCount = updatedContent.maybeCount || 0;
      
      updatedContent.actionSummary = `${likeCount}/${dislikeCount}/${maybeCount}`;
      await updatedContent.save();
      
      console.log(`Incremented ${action} for content ${content._id} (${content.title}). New counts: ${likeCount}/${dislikeCount}/${maybeCount}`);
    }
    
    return updatedContent;
  } catch (err) {
    console.error(`Error incrementing ${action} count:`, err);
    return null;
  }
};

// Public endpoint to record user actions (like/dislike/maybe) without authentication
exports.recordUserAction = catchAsync(async (req, res) => {
  const { category, title, cardIndex, action, timestamp } = req.body;
  
  // Simple validation
  if (!category || !title || cardIndex === undefined || !action) {
    return res.status(400).json({
      status: 'fail',
      message: 'Missing required fields: category, title, cardIndex, action'
    });
  }
  
  // Validate action type
  if (!['like', 'dislike', 'maybe'].includes(action)) {
    return res.status(400).json({
      status: 'fail',
      message: 'Action must be one of: like, dislike, maybe'
    });
  }
  
  try {
    // Get IP address and user agent for analytics
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    
    // Log the action to console with clear markers for easier tracking
    console.log(`======== USER ACTION START ========`);
    console.log(`Action Type: ${action.toUpperCase()}`);
    console.log(`Category: ${category}`);
    console.log(`Title/ID: ${title}`);
    console.log(`Card Index: ${cardIndex}`);
    console.log(`IP Address: ${ipAddress}`);
    console.log(`Timestamp: ${timestamp || new Date().toISOString()}`);
    
    // List all available categories for debugging
    console.log('\nAVAILABLE CATEGORIES:');
    const allCategories = await Category.find().select('_id name slug');
    allCategories.forEach(cat => {
      console.log(`- ${cat.name} (${cat._id}) [${cat.slug}]`);
    });
    
    // Try to find the related content with detailed logging
    console.log('\nSEARCHING FOR CONTENT:');
    const content = await findRelatedContent(category, title, cardIndex);
    const contentId = content ? content._id : null;
    
    // Log if we found content or not with more details
    if (content) {
      console.log(`\nCONTENT FOUND:`);
      console.log(`- ID: ${content._id}`);
      console.log(`- Title: ${content.title}`);
      console.log(`- Category: ${content.category}`);
      console.log(`- Current Action Counts: Like=${content.likeCount || 0}, Dislike=${content.dislikeCount || 0}, Maybe=${content.maybeCount || 0}`);
      console.log(`- Current Summary: ${content.actionSummary || '0/0/0'}`);
    } else {
      console.log('\nNO MATCHING CONTENT FOUND IN DATABASE');
      console.log(`- Tried to find content with category=${category}, title=${title}, cardIndex=${cardIndex}`);
    }
    
    // Create a new UserAction in the database
    console.log('\nCREATING USER ACTION RECORD:');
    const userAction = await UserAction.create({
      category,
      title,
      cardIndex,
      action,
      contentId, // May be null if not found
      ipAddress,
      userAgent,
      timestamp: timestamp ? new Date(parseInt(timestamp)) : Date.now()
    });
    console.log(`- Created Action Record: ${userAction._id}`);
    
    // Update content action counts if we have found content
    let updatedContent = null;
    if (content) {
      console.log('\nUPDATING CONTENT ACTION COUNTS:');
      // Increment the specific action counter for immediate feedback
      updatedContent = await incrementContentAction(content, action);
      
      if (updatedContent) {
        console.log(`- Successfully incremented ${action} count`);
        console.log(`- New Action Counts: Like=${updatedContent.likeCount || 0}, Dislike=${updatedContent.dislikeCount || 0}, Maybe=${updatedContent.maybeCount || 0}`);
        console.log(`- New Summary: ${updatedContent.actionSummary || '0/0/0'}`);
      } else {
        console.log('- Incremental update failed, falling back to full count update');
        // Also perform a full count update to ensure consistency
        updatedContent = await updateContentActionCounts(content);
        if (updatedContent) {
          console.log(`- Full action count update successful`);
          console.log(`- Updated Action Counts: Like=${updatedContent.likeCount || 0}, Dislike=${updatedContent.dislikeCount || 0}, Maybe=${updatedContent.maybeCount || 0}`);
          console.log(`- Updated Summary: ${updatedContent.actionSummary || '0/0/0'}`);
        } else {
          console.log('- Full action count update also failed');
        }
      }
    } else {
      console.log('\nSKIPPING CONTENT UPDATE: No content found to update');
    }
    
    console.log(`======== USER ACTION END ========`);
    
    // Return success with content information if available
    return res.status(200).json({
      status: 'success',
      message: `${action} action recorded successfully`,
      data: {
        id: userAction._id,
        category,
        title,
        cardIndex,
        action,
        timestamp: userAction.timestamp,
        contentId: contentId,
        actionSummary: updatedContent ? updatedContent.actionSummary : null
      }
    });
  } catch (error) {
    console.error('Error recording user action:', error);
    console.error(error.stack);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to record user action',
      error: error.message
    });
  }
});

// Create new content
exports.createContent = catchAsync(async (req, res, next) => {
  const contentData = req.body;
  
  // Set author as current user if not specified
  if (!contentData.authorId) {
    contentData.authorId = req.user._id;
  }
  
  const newContent = await Content.create(contentData);
  
  res.status(201).json({
    status: 'success',
    data: {
      content: newContent
    }
  });
});

// Update content
exports.updateContent = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const updateData = req.body;
  
  const content = await Content.findByIdAndUpdate(id, updateData, {
    new: true, // Return updated document
    runValidators: true // Run validators against update
  });
  
  if (!content) {
    return next(new AppError('Content not found', 404));
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      content
    }
  });
});

// Delete content
exports.deleteContent = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { reason = 'manual_delete' } = req.body;
  
  // İçeriği silmeden önce bul
  const content = await Content.findById(id);
  
  if (!content) {
    return next(new AppError('Content not found', 404));
  }
  
  // Check if content should be deleted (moved to DeletedContent)
  // Only delete in case of manual deletion from panel, daily generation, or duplicates
  const isDailyGeneration = reason === 'auto_delete';
  const isManualDelete = reason === 'manual_delete';
  const isDuplicate = reason === 'duplicate';
  
  // Determine if we should perform deletion (move to DeletedContent)
  const shouldMoveToDeleted = isManualDelete || isDailyGeneration || isDuplicate;
  
  if (shouldMoveToDeleted) {
    try {
      // İçeriği düz objeye dönüştür
      const contentData = content.toObject();
      
      // _id'yi kaldır ve orijinal ID'yi saklayalım
      const contentId = contentData._id;
      delete contentData._id;
      
      // Silme tarihini ve sebebini ekle
      contentData.deletedAt = new Date();
      contentData.originalContentId = contentId;
      contentData.reason = reason;
      
      // DeletedContent olarak kaydet
      await DeletedContent.create(contentData);
      
      console.log(`Content ${contentId} moved to DeletedContent with reason: ${reason}`);
      
      // İçeriği content koleksiyonundan sil
      await Content.findByIdAndDelete(id);
    } catch (error) {
      console.error(`Error copying content to DeletedContent: ${error.message}`);
      return next(new AppError('Error during content deletion process', 500));
    }
  } else {
    // For other cases, just mark the content as deleted without moving it
    await Content.findByIdAndUpdate(id, { status: 'deleted' });
    console.log(`Content ${id} marked as deleted but not moved to DeletedContent (reason: ${reason})`);
  }
  
  res.status(204).json({
    status: 'success',
    data: null
  });
});

// Publish content
exports.publishContent = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { publishDate } = req.body;
  
  // Set default publish date to now if not provided
  const effectivePublishDate = publishDate ? new Date(publishDate) : new Date();
  
  const content = await Content.findByIdAndUpdate(
    id, 
    { 
      status: 'published',
      publishDate: effectivePublishDate,
      hasBeenPublished: true,
      moderatorId: req.user._id
    },
    {
      new: true,
      runValidators: true
    }
  );
  
  if (!content) {
    return next(new AppError('Content not found', 404));
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      content
    }
  });
});

// Reject content
exports.rejectContent = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { moderationNotes } = req.body;
  
  const content = await Content.findByIdAndUpdate(
    id, 
    { 
      status: 'rejected',
      moderatorId: req.user._id,
      moderationNotes: moderationNotes || 'Content rejected'
    },
    {
      new: true,
      runValidators: true
    }
  );
  
  if (!content) {
    return next(new AppError('Content not found', 404));
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      content
    }
  });
});

// Archive content
exports.archiveContent = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  const content = await Content.findByIdAndUpdate(
    id, 
    { 
      status: 'archived',
      moderatorId: req.user._id
    },
    {
      new: true,
      runValidators: true
    }
  );
  
  if (!content) {
    return next(new AppError('Content not found', 404));
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      content
    }
  });
});

// Mark content as duplicate
exports.markContentAsDuplicate = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { originalContentId } = req.body;
  
  if (!id) {
    return next(new AppError('Content ID is required', 400));
  }
  
  const updatedContent = await contentService.markAsDuplicate(id, originalContentId);
  
  res.status(200).json({
    status: 'success',
    message: 'Content marked as duplicate',
    data: {
      content: updatedContent,
    },
  });
});

// Unmark content as duplicate
exports.unmarkContentAsDuplicate = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  if (!id) {
    return next(new AppError('Content ID is required', 400));
  }
  
  const updatedContent = await contentService.unmarkAsDuplicate(id);
  
  res.status(200).json({
    status: 'success',
    message: 'Content unmarked as duplicate',
    data: {
      content: updatedContent,
    },
  });
});

// Public endpoint to mark prompt as viewed (no authentication required)
exports.markPromptViewedPublic = catchAsync(async (req, res) => {
  const { category, title, cardIndex, viewedTimestamp } = req.body;

  if (!category || !title || cardIndex === undefined) {
    return res.status(400).json({
      status: 'fail',
      message: 'Missing required fields: category, title, cardIndex'
    });
  }

  try {
    // Attempt to locate related content (helper reused from recordUserAction)
    const content = await findRelatedContent(category, title, cardIndex);

    if (content) {
      // Increment view counters for analytics if model supports it
      content.stats.views = (content.stats.views || 0) + 1;
      content.usageCount = (content.usageCount || 0) + 1;
      content.lastUsedDate = new Date(viewedTimestamp || Date.now());
      await content.save();
    }

    return res.status(200).json({
      status: 'success',
      message: 'Prompt view recorded',
      data: {
        category,
        title,
        cardIndex,
        viewedTimestamp: viewedTimestamp || Date.now(),
        contentId: content ? content._id : null
      }
    });
  } catch (error) {
    console.error('Error marking prompt as viewed:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to mark prompt as viewed',
      error: error.message
    });
  }
});

// Public endpoint to mark prompt as expired and move it to DeletedContent (no authentication required)
exports.markPromptExpiredPublic = catchAsync(async (req, res) => {
  const { category, title, cardIndex, expiredTimestamp } = req.body;

  if (!category || !title || cardIndex === undefined) {
    return res.status(400).json({
      status: 'fail',
      message: 'Missing required fields: category, title, cardIndex'
    });
  }

  try {
    // Locate the content
    const content = await findRelatedContent(category, title, cardIndex);

    if (!content) {
      return res.status(404).json({
        status: 'fail',
        message: 'Content not found'
      });
    }

    // Prepare data for DeletedContent
    const contentData = content.toObject();
    const originalId = contentData._id;
    delete contentData._id; // remove to avoid duplicate key error

    const DeletedContent = require('../models/deletedContent.model');

    // Add metadata
    contentData.deletedAt = new Date(expiredTimestamp || Date.now());
    contentData.originalContentId = originalId;
    
    // Set reason as 'auto_delete' since this comes from the daily generation process
    contentData.reason = 'auto_delete';

    // Create a record in DeletedContent collection
    await DeletedContent.create(contentData);

    // Remove original content
    await content.deleteOne();

    return res.status(200).json({
      status: 'success',
      message: 'Prompt marked as expired and moved to deleted',
      data: {
        originalContentId: originalId,
        deletedAt: contentData.deletedAt
      }
    });
  } catch (error) {
    console.error('Error marking prompt as expired:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to mark prompt as expired',
      error: error.message
    });
  }
});

// Manual trigger for daily content refresh - protected admin endpoint
exports.triggerDailyContentRefresh = catchAsync(async (req, res, next) => {
  try {
    // Only allow admins to trigger this
    if (req.user.role !== 'admin') {
      return next(new AppError('Not authorized. Only admins can trigger daily content refresh.', 403));
    }
    
    console.log('Manual trigger of daily content refresh requested by admin:', req.user.name);
    
    // Call the cleanupAndRefreshContent function directly
    const results = await schedulerService.cleanupAndRefreshContent();
    
    // Return results
    res.status(200).json({
      status: 'success',
      message: 'Daily content refresh completed successfully',
      data: {
        categories: results.categories,
        generated: results.generated,
        cleanedUp: results.cleanedUp,
        published: results.published,
        duplicates: results.duplicates || {
          processed: 0,
          deleted: 0
        }
      }
    });
  } catch (error) {
    console.error('Error during manual content refresh:', error);
    return next(new AppError(`Failed to complete daily content refresh: ${error.message}`, 500));
  }
});