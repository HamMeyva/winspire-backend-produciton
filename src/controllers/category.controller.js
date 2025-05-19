const Category = require('../models/category.model');
const Content = require('../models/content.model');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

// Get all categories (public)
exports.getAllCategories = catchAsync(async (req, res, next) => {
  const filter = { active: true };
  
  const categories = await Category.find(filter)
    .sort('priority name')
    .select('name description icon color slug contentCount contentType');
  
  res.status(200).json({
    status: 'success',
    results: categories.length,
    data: {
      categories,
    },
  });
});

// Get single category by slug or ID
exports.getCategory = catchAsync(async (req, res, next) => {
  const { slug } = req.params;
  
  // Check if parameter is ObjectId or slug
  const isObjectId = slug.match(/^[0-9a-fA-F]{24}$/);
  
  // Build query based on parameter type
  const query = isObjectId ? { _id: slug } : { slug };
  
  const category = await Category.findOne(query);
  
  if (!category) {
    return next(new AppError('Category not found', 404));
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      category,
    },
  });
});

// Create category (admin only)
exports.createCategory = catchAsync(async (req, res, next) => {
  try {
    // Debug contentType
    console.log('DEBUG [BACKEND_CREATE] Received data:', req.body);
    console.log('DEBUG [BACKEND_CREATE] contentType in request:', req.body.contentType);
    
    // Prepare the category data with fallback for createdBy
    const createdBy = req.user?.id || process.env.ADMIN_USER_ID;
    
    // Check if we have a valid creator ID
    if (!createdBy) {
      return next(new AppError('No valid user ID available for category creation', 500));
    }
    
    // Prepare data for category creation
    const categoryData = {
      name: req.body.name,
      description: req.body.description || `Category for ${req.body.name}`,
      icon: req.body.icon || 'default',
      color: req.body.color || '#3498db',
      slug: req.body.slug || req.body.name.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, '-'),
      priority: req.body.priority || 0,
      active: req.body.active !== undefined ? req.body.active : true,
      prompt: req.body.prompt || null,
      singlePrompt: req.body.singlePrompt || null,
      multiplePrompt: req.body.multiplePrompt || null,
      promptType: req.body.promptType || 'single',
      defaultNumToGenerate: 1, // Always generate exactly one content item when creating a category
      contentType: req.body.contentType || 'hack',
      createdBy: createdBy
    };
    
    console.log('DEBUG [BACKEND_CREATE] Final category data:', categoryData);
    console.log('DEBUG [BACKEND_CREATE] contentType being saved:', categoryData.contentType);
    
    const newCategory = await Category.create(categoryData);
    
    console.log('DEBUG [BACKEND_CREATE] Created category:', {
      name: newCategory.name,
      contentType: newCategory.contentType
    });
    
    res.status(201).json({
      status: 'success',
      data: {
        category: newCategory,
      },
    });
  } catch (error) {
    console.error('Error creating category:', error);
    
    // Handle duplicate key error (most commonly the name or slug)
    if (error.code === 11000) {
      return next(new AppError('A category with this name or slug already exists', 400));
    }
    
    return next(new AppError(`Error creating category: ${error.message}`, 500));
  }
});

// Update category (admin only)
exports.updateCategory = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  // Include all updatable fields
  const updateData = {
    name: req.body.name,
    description: req.body.description,
    icon: req.body.icon,
    color: req.body.color,
    priority: req.body.priority,
    active: req.body.active,
    prompt: req.body.prompt,
    singlePrompt: req.body.singlePrompt,
    multiplePrompt: req.body.multiplePrompt,
    promptType: req.body.promptType,
    defaultNumToGenerate: req.body.defaultNumToGenerate,
    contentType: req.body.contentType
  };
  
  // Debug contentType
  console.log('DEBUG [BACKEND_UPDATE] Received data:', req.body);
  console.log('DEBUG [BACKEND_UPDATE] contentType in request:', req.body.contentType);
  
  // Explicitly handle contentType update
  if (req.body.contentType) {
    // Force set it to ensure it gets updated
    updateData.contentType = req.body.contentType;
    console.log('DEBUG [BACKEND_UPDATE] Setting contentType to:', updateData.contentType);
  }
  
  // Remove undefined fields
  Object.keys(updateData).forEach(key => {
    if (updateData[key] === undefined) {
      delete updateData[key];
    }
  });
  
  console.log('DEBUG [BACKEND_UPDATE] Final update data:', updateData);

  // Use Model.findOneAndUpdate directly with $set to force updates
  const updatedCategory = await Category.findOneAndUpdate(
    { _id: id },
    { $set: updateData },
    {
      new: true,
      runValidators: true,
    }
  );
  
  if (!updatedCategory) {
    return next(new AppError('Category not found', 404));
  }
  
  console.log('DEBUG [BACKEND_UPDATE] Updated category:', {
    name: updatedCategory.name,
    contentType: updatedCategory.contentType
  });
  
  res.status(200).json({
    status: 'success',
    data: {
      category: updatedCategory,
    },
  });
});

// Delete category (admin only)
exports.deleteCategory = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  // Check if category has content
  const contentCount = await Content.countDocuments({ category: id });
  
  if (contentCount > 0) {
    // Instead of blocking deletion, move all content to deleted status first
    console.log(`Moving ${contentCount} content items to deleted status before category deletion`);
    
    await Content.updateMany(
      { category: id },
      { 
        $set: { 
          status: 'deleted',
          deletedReason: 'Category deleted',
          deletedAt: new Date()
        } 
      }
    );
    
    console.log(`Successfully moved ${contentCount} content items to deleted status`);
  }
  
  // Now delete the category
  const category = await Category.findByIdAndDelete(id);
  
  if (!category) {
    return next(new AppError('Category not found', 404));
  }
  
  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// Get category statistics
exports.getCategoryStats = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  const category = await Category.findById(id);
  
  if (!category) {
    return next(new AppError('Category not found', 404));
  }
  
  // Get content statistics for this category
  const stats = await Content.aggregate([
    {
      $match: { category: category._id, status: 'published' },
    },
    {
      $group: {
        _id: null,
        totalContent: { $sum: 1 },
        totalViews: { $sum: '$stats.views' },
        totalLikes: { $sum: '$stats.likes' },
        totalDislikes: { $sum: '$stats.dislikes' },
        totalShares: { $sum: '$stats.shares' },
        totalSaves: { $sum: '$stats.saves' },
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
      $project: {
        _id: 0,
        totalContent: 1,
        totalViews: 1,
        totalLikes: 1,
        totalDislikes: 1,
        totalShares: 1,
        totalSaves: 1,
        avgRating: { $multiply: ['$avgRating', 5] }, // Convert to 0-5 rating scale
      },
    },
  ]);
  
  // Get latest content
  const latestContent = await Content.find({ category: category._id, status: 'published' })
    .sort('-publishDate')
    .limit(5)
    .select('title summary publishDate stats');
  
  res.status(200).json({
    status: 'success',
    data: {
      category,
      stats: stats[0] || {
        totalContent: 0,
        totalViews: 0,
        totalLikes: 0,
        totalDislikes: 0,
        totalShares: 0,
        totalSaves: 0,
        avgRating: 0,
      },
      latestContent,
    },
  });
});

// Add this function to get categories with content pool statistics
exports.getCategoriesWithPoolStats = async (req, res, next) => {
  try {
    const promptService = require('../services/prompt.service');
    const Category = require('../models/category.model');
    
    // Get all categories first with all fields including contentType
    const categories = await Category.find({});
    
    // Calculate pool statistics for each category
    const enrichedCategories = await promptService.calculateCategoryPools(categories);
    
    // Log some debug info for contentType values
    console.log('DEBUG [BACKEND_GET_POOLS] Sample contentType values:', 
      enrichedCategories.slice(0, 3).map(cat => ({
        name: cat.name,
        contentType: cat.contentType
      }))
    );
    
    res.status(200).json({
      status: 'success',
      results: enrichedCategories.length,
      data: {
        categories: enrichedCategories
      }
    });
  } catch (err) {
    console.error('Error fetching categories with pool stats:', err);
    next(err);
  }
};

// Add a new function to activate all categories
exports.activateAllCategories = async (req, res, next) => {
  try {
    // Find all inactive categories
    const inactiveCategories = await Category.find({ active: false });
    
    if (inactiveCategories.length === 0) {
      return res.status(200).json({
        status: 'success',
        message: 'No inactive categories found',
        data: { activatedCount: 0 }
      });
    }
    
    // Update all inactive categories to active
    const result = await Category.updateMany(
      { active: false },
      { $set: { active: true } }
    );
    
    return res.status(200).json({
      status: 'success',
      message: `Activated ${result.modifiedCount} categories`,
      data: { activatedCount: result.modifiedCount }
    });
  } catch (error) {
    return next(new AppError(`Error activating categories: ${error.message}`, 500));
  }
};

// Get categories by content type
exports.getCategoriesByContentType = catchAsync(async (req, res, next) => {
  const { contentType } = req.params;
  
  // Validate content type
  const validContentTypes = ['hack', 'hack2', 'tip', 'tip2', 'quote'];
  if (!validContentTypes.includes(contentType)) {
    return next(new AppError('Invalid content type', 400));
  }
  
  // Only filter by contentType, not by active status
  const filter = { 
    contentType: contentType 
  };
  
  console.log(`DEBUG: Getting categories for content type ${contentType} with filter:`, filter);
  
  const categories = await Category.find(filter)
    .sort('priority name')
    .select('name description icon color slug contentCount contentType active');
  
  console.log(`DEBUG: Found ${categories.length} categories for content type ${contentType}`);
  
  res.status(200).json({
    status: 'success',
    results: categories.length,
    data: {
      categories,
    },
  });
}); 