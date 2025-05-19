const duplicateDetectorService = require('../services/duplicate-detector.service');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

/**
 * Find potential duplicate content
 */
exports.findDuplicates = catchAsync(async (req, res, next) => {
  const { contentId } = req.params;
  const { categoryId } = req.query;
  
  const duplicates = await duplicateDetectorService.findPotentialDuplicates(contentId, categoryId);
  
  res.status(200).json({
    status: 'success',
    results: duplicates.length,
    data: {
      duplicates
    }
  });
});

/**
 * Mark content as duplicate of another content
 */
exports.markAsDuplicate = catchAsync(async (req, res, next) => {
  const { contentId, originalId } = req.params;
  
  if (contentId === originalId) {
    return next(new AppError('Content cannot be marked as duplicate of itself', 400));
  }
  
  const updatedContent = await duplicateDetectorService.markAsDuplicate(contentId, originalId);
  
  res.status(200).json({
    status: 'success',
    data: {
      content: updatedContent
    }
  });
});

/**
 * Resolve duplicates by keeping the best one and marking others as duplicates
 */
exports.resolveDuplicates = catchAsync(async (req, res, next) => {
  const { contentIds } = req.body;
  
  if (!contentIds || !Array.isArray(contentIds) || contentIds.length < 2) {
    return next(new AppError('At least two content IDs are required', 400));
  }
  
  const result = await duplicateDetectorService.resolveDuplicates(contentIds);
  
  res.status(200).json({
    status: 'success',
    data: result
  });
});
