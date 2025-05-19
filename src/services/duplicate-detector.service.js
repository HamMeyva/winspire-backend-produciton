const Content = require('../models/content.model');

/**
 * Service for detecting and handling duplicate content
 */
const duplicateDetectorService = {
  /**
   * Check for duplicates based on title similarity
   * @param {String} contentId - ID of the content to check against other content
   * @param {String} categoryId - Optional category ID to limit search scope
   * @returns {Promise<Array>} Array of potential duplicate content items
   */
  findPotentialDuplicates: async (contentId, categoryId = null) => {
    // Get the target content
    const targetContent = await Content.findById(contentId);
    if (!targetContent) {
      throw new Error('Content not found');
    }

    // Build the filter for finding similar content
    const filter = {
      _id: { $ne: contentId }, // Exclude the current content
      status: { $ne: 'deleted' }, // Exclude already deleted content
    };

    // If category is provided, limit search to that category
    if (categoryId) {
      filter.category = categoryId;
    }

    // Get all potential content to compare against
    const allContent = await Content.find(filter);
    
    // Calculate title similarity and filter potential duplicates
    const potentialDuplicates = allContent.filter(content => {
      // Simple case-insensitive substring matching for title
      const titleSimilarity = calculateTitleSimilarity(targetContent.title, content.title);
      return titleSimilarity > 0.8; // 80% similarity threshold
    });

    // Calculate content similarity for potential title duplicates
    const detailedDuplicates = potentialDuplicates.map(content => {
      // Calculate content body similarity
      const bodySimilarity = calculateContentSimilarity(targetContent.body, content.body);
      
      return {
        _id: content._id,
        title: content.title,
        body: content.body,
        status: content.status,
        category: content.category,
        titleSimilarity: calculateTitleSimilarity(targetContent.title, content.title),
        bodySimilarity,
        overallSimilarity: (calculateTitleSimilarity(targetContent.title, content.title) * 0.4) + (bodySimilarity * 0.6)
      };
    });

    // Sort by overall similarity (descending)
    return detailedDuplicates.sort((a, b) => b.overallSimilarity - a.overallSimilarity);
  },

  /**
   * Mark content as duplicate and move to deleted status
   * @param {String} contentId - ID of the content to mark as duplicate
   * @param {String} originalContentId - ID of the original content that this duplicates
   * @returns {Promise<Object>} The updated content
   */
  markAsDuplicate: async (contentId, originalContentId) => {
    // Find the content to be marked as duplicate
    const content = await Content.findById(contentId);
    if (!content) return null;
    
    // Make sure original content exists
    if (originalContentId) {
      const originalContent = await Content.findById(originalContentId);
      if (!originalContent) {
        console.error(`Original content ID ${originalContentId} not found for duplicate marking`);
        originalContentId = null;
      }
    }
    
    // Convert to plain object
    const contentData = content.toObject();
    const originalId = contentData._id;
    delete contentData._id; // remove to avoid duplicate key error
    
    const DeletedContent = require('../models/deletedContent.model');
    
    // Add metadata
    contentData.deletedAt = new Date();
    contentData.originalContentId = originalId;
    contentData.reason = 'duplicate'; // Set reason as 'duplicate'
    
    // Add reference to the original content if it exists
    if (!contentData.metadata) contentData.metadata = {};
    if (originalContentId) {
      contentData.metadata.duplicateOf = originalContentId;
    }
    
    // Create a record in DeletedContent collection
    await DeletedContent.create(contentData);
    
    // Remove original content
    await content.deleteOne();
    
    console.log(`Content ${contentId} marked as duplicate` + 
              (originalContentId ? ` of ${originalContentId}` : '') + 
              ` and moved to DeletedContent`);
    
    return content;
  },

  /**
   * Keep higher quality content and mark others as duplicates
   * @param {Array} contentIds - Array of content IDs, sorted by quality (best first)
   * @returns {Promise<Object>} Summary of operation
   */
  resolveDuplicates: async (contentIds) => {
    if (!contentIds || contentIds.length < 2) {
      throw new Error('At least two content IDs are required');
    }

    // Keep the first content (best quality) and mark others as duplicates
    const keepContentId = contentIds[0];
    const duplicateContentIds = contentIds.slice(1);

    // Mark each duplicate
    const results = await Promise.all(
      duplicateContentIds.map(async (duplicateId) => {
        return await duplicateDetectorService.markAsDuplicate(duplicateId, keepContentId);
      })
    );

    return {
      keptContent: keepContentId,
      markedAsDuplicates: results.map(content => content._id)
    };
  }
};

/**
 * Calculate similarity between two titles
 * @param {String} title1 - First title
 * @param {String} title2 - Second title
 * @returns {Number} Similarity score (0-1)
 */
function calculateTitleSimilarity(title1, title2) {
  // Normalize titles
  const normalizedTitle1 = title1.toLowerCase().trim();
  const normalizedTitle2 = title2.toLowerCase().trim();

  // Check for exact match
  if (normalizedTitle1 === normalizedTitle2) {
    return 1;
  }

  // Check if one is a substring of the other
  if (normalizedTitle1.includes(normalizedTitle2) || normalizedTitle2.includes(normalizedTitle1)) {
    const lengthRatio = Math.min(normalizedTitle1.length, normalizedTitle2.length) / 
                       Math.max(normalizedTitle1.length, normalizedTitle2.length);
    return 0.8 * lengthRatio;
  }

  // Calculate Levenshtein distance for approximate string matching
  const distance = levenshteinDistance(normalizedTitle1, normalizedTitle2);
  const maxLength = Math.max(normalizedTitle1.length, normalizedTitle2.length);
  
  // Convert distance to similarity (0-1)
  return 1 - (distance / maxLength);
}

/**
 * Calculate similarity between content bodies
 * @param {String} body1 - First content body
 * @param {String} body2 - Second content body
 * @returns {Number} Similarity score (0-1)
 */
function calculateContentSimilarity(body1, body2) {
  // Normalize content bodies
  const normalizedBody1 = body1.toLowerCase().trim();
  const normalizedBody2 = body2.toLowerCase().trim();
  
  // Check for exact match
  if (normalizedBody1 === normalizedBody2) {
    return 1;
  }
  
  // For long texts, use a paragraph comparison approach
  const paragraphs1 = normalizedBody1.split('\n').filter(p => p.trim().length > 0);
  const paragraphs2 = normalizedBody2.split('\n').filter(p => p.trim().length > 0);
  
  // If paragraph count differs greatly, content is likely different
  const paragraphCountRatio = Math.min(paragraphs1.length, paragraphs2.length) / 
                             Math.max(paragraphs1.length, paragraphs2.length);
  
  // Sample paragraph similarity
  let totalSimilarity = 0;
  const sampleSize = Math.min(3, paragraphs1.length, paragraphs2.length);
  
  for (let i = 0; i < sampleSize; i++) {
    // Compare corresponding paragraphs or beginning paragraphs
    const p1 = paragraphs1[i] || '';
    const p2 = paragraphs2[i] || '';
    
    const paragraphSimilarity = 1 - (levenshteinDistance(p1, p2) / Math.max(p1.length, p2.length, 1));
    totalSimilarity += paragraphSimilarity;
  }
  
  // Average similarity across sampled paragraphs, weighted by paragraph count ratio
  return (totalSimilarity / sampleSize) * paragraphCountRatio;
}

/**
 * Calculate Levenshtein distance between two strings
 * @param {String} str1 - First string
 * @param {String} str2 - Second string
 * @returns {Number} Levenshtein distance
 */
function levenshteinDistance(str1, str2) {
  const m = str1.length;
  const n = str2.length;
  
  // Create a matrix of size (m+1) x (n+1)
  const dp = Array(m + 1).fill().map(() => Array(n + 1).fill(0));
  
  // Initialize first column
  for (let i = 0; i <= m; i++) {
    dp[i][0] = i;
  }
  
  // Initialize first row
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }
  
  // Fill the dp matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],     // deletion
          dp[i][j - 1],     // insertion
          dp[i - 1][j - 1]  // substitution
        );
      }
    }
  }
  
  return dp[m][n];
}

module.exports = duplicateDetectorService;
