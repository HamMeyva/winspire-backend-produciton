const fs = require('fs');
const path = require('path');
const Category = require('../models/category.model');
const AppError = require('../utils/appError');

// Helper to normalize category names for matching
const normalizeCategoryName = (name) => {
  if (!name) return '';
  return name.trim().toLowerCase().replace(/&/g, 'and');
};

/**
 * Parses the defaultprompts.txt file and extracts prompt information.
 */
const parseDefaultPromptsFile = async () => {
  const filePath = path.join(__dirname, '../../defaultprompts.txt');
  let fileContent;
  try {
    fileContent = fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.error('Error reading defaultprompts.txt:', error);
    throw new AppError('Could not read defaultprompts.txt', 500);
  }

  const lines = fileContent.split(/\r?\n/);
  const parsedPrompts = [];
  let currentCategoryGroup = '';
  let currentSubCategory = '';
  let isInsidePromptBlock = false;
  let currentPromptText = [];
  let currentPromptTitle = '';

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine.length === 0) {
      if (isInsidePromptBlock && currentPromptText.length > 0 && currentSubCategory) {
        // End of a prompt block by blank line
        parsedPrompts.push({
          categoryName: currentSubCategory,
          promptTitle: currentPromptTitle,
          promptText: currentPromptText.join('\n').trim(),
        });
        currentPromptText = [];
        isInsidePromptBlock = false;
        currentPromptTitle = '';
      }
      continue;
    }

    if (trimmedLine.startsWith('Kategoriler') || trimmedLine.startsWith('Tips') || trimmedLine.startsWith('Hacks')) {
      currentCategoryGroup = trimmedLine;
      isInsidePromptBlock = false;
      continue;
    }

    if (trimmedLine.startsWith('Alt Kategoriler')) {
      isInsidePromptBlock = false;
      continue;
    }

    // Attempt to identify a sub-category line (heuristic)
    // This is tricky because sub-category lines don't have a fixed prefix.
    // We check if it's NOT a prompt title and if we are not in a prompt block yet.
    if (!isInsidePromptBlock && !trimmedLine.includes(' - Tekli Prompt') && !trimmedLine.includes(' - Çoklu Prompt')) {
        // This could be a sub-category name or a continuation of a previous category name
        // For simplicity, if the next line is a prompt, we consider this the category
        const nextLineIndex = lines.indexOf(line) + 1;
        if (nextLineIndex < lines.length) {
            const nextLine = lines[nextLineIndex].trim();
            if (nextLine.includes(' - Tekli Prompt') || nextLine.includes(' - Çoklu Prompt')) {
                 if (currentSubCategory && isInsidePromptBlock && currentPromptText.length > 0) {
                    // Save previous prompt before switching category
                    parsedPrompts.push({
                        categoryName: currentSubCategory,
                        promptTitle: currentPromptTitle,
                        promptText: currentPromptText.join('\n').trim(),
                    });
                    currentPromptText = [];
                    currentPromptTitle = '';
                }
                currentSubCategory = trimmedLine; // Assume this is the category for the upcoming prompt
                isInsidePromptBlock = false; // Reset for the new prompt
            }
        }
    }
    
    if (trimmedLine.includes(' - Tekli Prompt') || trimmedLine.includes(' - Çoklu Prompt')) {
      if (isInsidePromptBlock && currentPromptText.length > 0 && currentSubCategory) {
        // Save previous prompt if any before starting a new one
        parsedPrompts.push({
          categoryName: currentSubCategory,
          promptTitle: currentPromptTitle,
          promptText: currentPromptText.join('\n').trim(),
        });
      }
      isInsidePromptBlock = true;
      currentPromptTitle = trimmedLine;
      currentPromptText = [];
      // Extract category from title if not already set by a preceding line
      const categoryMatch = trimmedLine.match(/^(.*?)\s*-\s*(Tekli|Çoklu) Prompt/);
      if (categoryMatch && categoryMatch[1]) {
        if (!currentSubCategory || normalizeCategoryName(currentSubCategory) !== normalizeCategoryName(categoryMatch[1])){
             // If the prompt title implies a different category than what we thought currentSubCategory was
             // or if currentSubCategory wasn't set confidently by a preceding category line.
            currentSubCategory = categoryMatch[1].trim();
        }
      }
      continue;
    }

    if (isInsidePromptBlock) {
      currentPromptText.push(line); // Keep original spacing within prompt
    }
  }

  // Add any lingering prompt at the end of the file
  if (isInsidePromptBlock && currentPromptText.length > 0 && currentSubCategory) {
    parsedPrompts.push({
      categoryName: currentSubCategory,
      promptTitle: currentPromptTitle,
      promptText: currentPromptText.join('\n').trim(),
    });
  }
  return parsedPrompts;
};

/**
 * Seeds prompts from the defaultprompts.txt file into the Category collection.
 */
exports.seedPromptsFromDefaultFile = async () => {
  const parsedPrompts = await parseDefaultPromptsFile();
  if (!parsedPrompts.length) {
    console.warn('No prompts found in defaultprompts.txt or parsing failed.');
    return { createdCategories: 0, updatedCategories: 0, newPrompts: 0, errors: ['No prompts parsed'] };
  }

  let updatedCategoriesCount = 0;
  let newPromptsCount = 0;
  const errors = [];
  let createdCategoriesCount = 0;
  const adminUserId = process.env.ADMIN_USER_ID; // Assuming you have a default admin user ID for creation

  const allCategories = await Category.find({});
  const categoryMap = new Map();
  allCategories.forEach(cat => categoryMap.set(normalizeCategoryName(cat.name), cat));

  for (const parsedPrompt of parsedPrompts) {
    const normalizedPromptCategoryName = normalizeCategoryName(parsedPrompt.categoryName);
    let dbCategory = categoryMap.get(normalizedPromptCategoryName);

    if (!dbCategory) {
      // Category not found - try to create it
      try {
        console.log(`Category "${parsedPrompt.categoryName}" not found. Attempting to create.`);
        const slug = parsedPrompt.categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50);
        dbCategory = new Category({
          name: parsedPrompt.categoryName.trim(),
          slug: slug, // Generate a basic slug
          description: `Category for ${parsedPrompt.categoryName.trim()}`, // Basic description
          icon: 'default', // Default icon
          color: '#cccccc', // Default color
          active: true,
          prompt: null, // Will be updated below
          singlePrompt: null,
          multiplePrompt: null,
          promptType: 'single',
          defaultNumToGenerate: 1,
          createdBy: adminUserId, // Assign to admin or a default creator ID
        });

        if (!adminUserId) {
          console.warn('ADMIN_USER_ID not set in environment, category will be created without an owner.');
          // Optionally remove the createdBy field or handle differently
          delete dbCategory.createdBy;
        }

        await dbCategory.save();
        categoryMap.set(normalizedPromptCategoryName, dbCategory); // Add to map for subsequent lookups
        createdCategoriesCount++;
        console.log(`Successfully created category "${dbCategory.name}"`);
      } catch (createError) {
        errors.push(`Failed to create missing category "${parsedPrompt.categoryName}": ${createError.message}`);
        continue; // Skip processing this prompt if category creation failed
      }
    }

    let promptType = null;
    let defaultNumToGenerate = 1;

    if (parsedPrompt.promptTitle.includes(' - Tekli Prompt')) {
      promptType = 'single';
    } else if (parsedPrompt.promptTitle.includes(' - Çoklu Prompt')) {
      promptType = 'multiple';
      const countMatch = parsedPrompt.promptTitle.match(/\((\d+)\s*adet\)/);
      if (countMatch && countMatch[1]) {
        defaultNumToGenerate = parseInt(countMatch[1], 10);
      }
    }

    // Update specific prompt field based on type and also legacy prompt field
    const updateData = {
      promptType: promptType,
      defaultNumToGenerate: defaultNumToGenerate,
      // Legacy prompt field - keep for backward compatibility
      prompt: parsedPrompt.promptText
    };

    // Also set the type-specific prompt field
    if (promptType === 'single') {
      updateData.singlePrompt = parsedPrompt.promptText;
    } else if (promptType === 'multiple') {
      updateData.multiplePrompt = parsedPrompt.promptText;
    }

    if (dbCategory.prompt !== parsedPrompt.promptText || 
        dbCategory.promptType !== promptType ||
        (promptType === 'single' && dbCategory.singlePrompt !== parsedPrompt.promptText) ||
        (promptType === 'multiple' && dbCategory.multiplePrompt !== parsedPrompt.promptText) ||
        dbCategory.defaultNumToGenerate !== defaultNumToGenerate) {
      
      try {
        // Update category with prompt information
        await Category.updateOne(
          { _id: dbCategory._id },
          { $set: updateData }
        );
        
        updatedCategoriesCount++;
        newPromptsCount++;
        console.log(`Updated category "${dbCategory.name}" with ${promptType} prompt.`);
      } catch (updateError) {
        errors.push(`Failed to update prompt for "${dbCategory.name}": ${updateError.message}`);
      }
    }
  }

  return {
    createdCategories: createdCategoriesCount,
    updatedCategories: updatedCategoriesCount,
    newPrompts: newPromptsCount,
    errors: errors.length ? errors : null
  };
};

/**
 * Generate content based on category prompt settings
 * @param {Object} category - Category document with prompt settings
 * @param {Number} count - Number of items to generate (defaults to category.defaultNumToGenerate)
 * @param {String} contentType - Type of content to generate (hack, tip, hack2, tip2)
 * @returns {Object} Instructions for content generation
 */
exports.generatePromptForContent = async (category, count = 1, contentType = 'hack') => {
  if (!category) {
    throw new AppError('Category is required for prompt generation', 400);
  }
  
  // Log what's coming in
  console.log(`Prompt service called for category: ${category.name}, contentType: ${contentType}, count: ${count}`);
  
  // Ensure we're using the correct content type - priority to passed parameter, then category setting
  let effectiveContentType = contentType;
  if (!effectiveContentType && category.contentType) {
    effectiveContentType = category.contentType;
    console.log(`Using category's contentType: ${effectiveContentType}`);
  } else if (!effectiveContentType) {
    effectiveContentType = 'hack'; // Default fallback
    console.log(`No content type specified, using default: ${effectiveContentType}`);
  }

  // Always use single prompt and replace {numToGenerate} variable with the count
  let promptText = null;
  const numToGenerate = count || category.defaultNumToGenerate || 1;

  // Use the category's singlePrompt if available
  if (category.singlePrompt) {
    promptText = category.singlePrompt;
    console.log('Using single prompt from category');
  } 
  // Fall back to legacy prompt field if type-specific prompts don't exist
  else if (category.prompt) {
    promptText = category.prompt;
    console.log('Using legacy prompt from category');
  }
  // If no prompts are available, generate a fallback
  else {
    promptText = getFallbackPromptForContentType(category, effectiveContentType);
    console.log('No prompts found in category, using generated fallback prompt');
  }

  // Replace the numToGenerate variable in the prompt if it exists
  if (promptText && promptText.includes('{numToGenerate}')) {
    promptText = promptText.replace(/\{numToGenerate\}/g, numToGenerate);
    console.log(`Replaced {numToGenerate} with ${numToGenerate} in prompt`);
  } else {
    // If the variable isn't in the prompt, append instructions for generating multiple items
    if (numToGenerate > 1) {
      promptText += `\n\nIMPORTANT: Generate ${numToGenerate} different items, each with its own unique title, body, and summary. Format the response as a JSON array with ${numToGenerate} objects.`;
      console.log(`Added instructions to generate ${numToGenerate} items to prompt`);
    }
  }

  return {
    promptText,
    isSingle: true, // Always use single mode now
    count: numToGenerate,
    contentType: effectiveContentType
  };
};

/**
 * Infer content type from category name or other attributes
 * @param {Object} category - Category object
 * @returns {String} Content type (hack, tip, hack2, tip2)
 */
function inferContentTypeFromCategory(category) {
  const name = category.name.toLowerCase();
  
  // Check for specific naming patterns to identify content types
  if (name.includes('relationship') || 
      name.includes('dating') || 
      name.includes('finance') || 
      name.includes('mindset') || 
      name.includes('social') || 
      name.includes('fitness')) {
    return 'tip';
  }
  
  if (name.includes('career') || 
      name.includes('productivity') || 
      name.includes('problem') || 
      name.includes('creative') || 
      name.includes('psychology')) {
    return 'tip2';
  }
  
  if (name.includes('tinder') || 
      name.includes('travel') || 
      name.includes('mind')) {
    return 'hack2';
  }
  
  // Default to regular hacks for anything else
  if (name.includes('money') || 
      name.includes('power') || 
      name.includes('survival') || 
      name.includes('trend')) {
    return 'hack';
  }
  
  return 'hack'; // Default fallback
}

/**
 * Get fallback prompt for a specific content type
 * @param {Object} category - Category object
 * @param {String} contentType - Type of content
 * @returns {String} Appropriate fallback prompt
 */
function getFallbackPromptForContentType(category, contentType) {
  const typeToCategoryMap = {
    'hack': {
      'dating': 'Dating Hacks',
      'money': 'Money Hacks',
      'power': 'Power Hacks',
      'survival': 'Survival Hacks',
      'trend': 'Trend Hacks',
      'default': 'Life Hacks'
    },
    'hack2': {
      'tinder': 'Tinder Hacks',
      'travel': 'Travel Hacks',
      'mind': 'Mind Hacks',
      'default': 'Advanced Hacks'
    },
    'tip': {
      'dating': 'Dating & Relationships',
      'money': 'Finance & Wealth Building',
      'mindset': 'Mindset & Motivation',
      'social': 'Social Skills',
      'fitness': 'Fitness & Nutrition',
      'default': 'Lifestyle Tips'
    },
    'tip2': {
      'career': 'Career & Leadership',
      'productivity': 'Productivity & Time Management',
      'creative': 'Creative Thinking & Problem-Solving',
      'psychology': 'Psychology & Influence',
      'default': 'Advanced Tips'
    }
  };
  
  // Find the most appropriate category template
  const catName = category.name.toLowerCase();
  let categoryKey = 'default';
  
  const typeMap = typeToCategoryMap[contentType] || typeToCategoryMap.hack;
  
  // Find matching key in the type map
  for (const key in typeMap) {
    if (key !== 'default' && catName.includes(key)) {
      categoryKey = key;
      break;
    }
  }
  
  // Get the mapped category name
  const mappedCategory = typeMap[categoryKey];
  
  // Standard fallback prompts by content type and category
  const fallbackPrompts = {
    'hack': {
      'Dating Hacks': 'Create a practical, actionable dating hack for busy adults that can be implemented quickly. The hack should help improve romantic interactions, attract potential partners, or strengthen existing relationships. Make it specific, ethical, and focused on real personal growth. Format as a catchy title followed by 1-3 paragraphs of clear instructions with real examples.',
      'Money Hacks': 'Create a practical financial life hack that helps people save money, increase income, or manage finances better. The hack should be legal, ethical, and specific enough for immediate implementation. Include a catchy title, followed by clear steps and at least one real-world example.',
      'Power Hacks': 'Create a practical power hack that helps people increase their personal or professional influence ethically. The hack should focus on communication skills, leadership presence, or strategic thinking that enhances one\'s ability to persuade or lead others. Include a catchy title followed by clear implementation steps and a real-world example.',
      'Survival Hacks': 'Create a practical survival hack that could help in emergency situations or difficult circumstances. The hack should use common items in innovative ways or teach a skill that increases chances of survival in challenging situations. Include a compelling title followed by clear instructions and a real-world application.',
      'Trend Hacks': 'Create a practical trend hack that helps people stay ahead of or capitalize on current cultural, tech, or social media trends. The hack should provide actionable ways to identify, understand, or leverage trends for personal or professional advantage. Include a catchy title followed by specific steps and a relevant example.',
      'Life Hacks': 'Create a practical life hack that improves everyday efficiency or solves a common problem. The hack should be actionable, useful, and implementable with minimal resources. Include a catchy title followed by specific steps and expected benefits.'
    },
    'hack2': {
      'Tinder Hacks': 'Create a practical, ethical Tinder hack that helps users improve their profile, increase meaningful matches, or have better conversations on the app. The hack should focus on authentic self-presentation and effective communication. Include a catchy title followed by specific implementation steps and expected results.',
      'Travel Hacks': 'Create a practical travel hack that saves money, time, or enhances the travel experience. The hack should be applicable for most travelers and provide specific, actionable advice. Include a catchy title followed by clear steps and a real-world example of its benefits.',
      'Mind Hacks': 'Create a practical cognitive or psychological hack that helps people improve their mental performance, emotional regulation, or decision-making. The hack should be based on scientific principles and provide actionable steps anyone can implement. Include a catchy title followed by clear instructions and the expected benefits.',
      'Advanced Hacks': 'Create a clever and practical life hack for tech-savvy individuals that solves a modern problem. The hack should be innovative, ethical, and provide a notable improvement to daily life. Include a catchy title followed by detailed implementation steps.'
    },
    'tip': {
      'Dating & Relationships': 'Generate one random and practical dating or relationship tip as a quote inside quotation marks (1–2 sentences) from a book about love, attraction, communication, or relationship dynamics followed by the book title and author.',
      'Finance & Wealth Building': 'Generate one random and practical finance or wealth building tip as a quote inside quotation marks (1–2 sentences) from a book about money management, investing, financial freedom, or personal finance followed by the book title and author.',
      'Mindset & Motivation': 'Generate one random and practical mindset or motivation tip as a quote inside quotation marks (1–2 sentences) from a book about personal power, resilience, goal setting, or self-discipline followed by the book title and author.',
      'Social Skills': 'Generate one random and practical social skills tip as a quote inside quotation marks (1–2 sentences) from a book about communication, charisma, networking, or emotional intelligence followed by the book title and author.',
      'Fitness & Nutrition': 'Generate one random and practical fitness or nutrition tip as a quote inside quotation marks (1–2 sentences) from a book about exercise, healthy habits, diet science, or physical performance followed by the book title and author.',
      'Lifestyle Tips': 'Generate one random and practical lifestyle improvement tip as a quote inside quotation marks (1–2 sentences) from a relevant book, followed by the book title and author.'
    },
    'tip2': {
      'Career & Leadership': 'Generate one random and practical career or leadership tip as a quote inside quotation marks (1–2 sentences) from a book about professional development, management, entrepreneurship or career growth followed by the book title and author.',
      'Productivity & Time Management': 'Generate one random and practical productivity or time management tip as a quote inside quotation marks (1–2 sentences) from a book about efficiency, focus, organization, or work optimization followed by the book title and author.',
      'Creative Thinking & Problem-Solving': 'Generate one random and practical creative thinking or problem-solving tip as a quote inside quotation marks (1–2 sentences) from a book about innovation, lateral thinking, brainstorming, or creative processes followed by the book title and author.',
      'Psychology & Influence': 'Generate one random and practical psychology or influence tip as a quote inside quotation marks (1–2 sentences) from a book about human behavior, persuasion, cognitive biases, or social psychology followed by the book title and author.',
      'Advanced Tips': 'Generate one random and practical self-improvement tip as a quote inside quotation marks (1–2 sentences) from a highly-rated book, followed by the book title and author.'
    }
  };
  
  // Get prompt for the mapped category
  const fallbackPrompt = fallbackPrompts[contentType]?.[mappedCategory] || 
    `Generate useful ${contentType === 'tip' || contentType === 'tip2' ? 'advice' : 'hack'} content for the ${category.name} category. Format as a JSON object with title, summary, body, and tags fields.`;
  
  return fallbackPrompt;
}

/**
 * Helper function to process categories and calculate content pools
 * @param {Array} categories - List of categories
 * @returns {Array} List of categories with pool data
 */
exports.calculateCategoryPools = async (categories) => {
  const Content = require('../models/content.model');
  
  const enrichedCategories = [];
  
  for (const category of categories) {
    // Get content counts by pool for this category
    const pools = await Content.aggregate([
      { $match: { category: category._id } },
      { $group: { 
          _id: '$pool', 
          count: { $sum: 1 } 
        }
      }
    ]);
    
    // Convert to the expected format
    const poolData = {
      regular: 0,
      accepted: 0,
      highly_liked: 0,
      disliked: 0,
      premium: 0
    };
    
    pools.forEach(pool => {
      if (pool._id && poolData.hasOwnProperty(pool._id)) {
        poolData[pool._id] = pool.count;
      }
    });
    
    // Add pool data to category
    enrichedCategories.push({
      ...category.toObject(),
      pools: poolData
    });
  }
  
  return enrichedCategories;
}; 