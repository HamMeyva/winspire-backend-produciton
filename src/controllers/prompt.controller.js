const PromptTemplate = require('../models/prompt.model');
const Category = require('../models/category.model');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const fs = require('fs').promises;
const path = require('path');

// Get all prompt templates
exports.getAllPromptTemplates = catchAsync(async (req, res, next) => {
  const { contentType, category, isActive } = req.query;
  
  // Build filter
  const filter = {};
  if (contentType) filter.contentType = contentType;
  if (category) filter.category = category;
  if (isActive !== undefined) filter.isActive = isActive === 'true';
  
  const templates = await PromptTemplate.find(filter)
    .populate('category', 'name slug')
    .populate('createdBy', 'name')
    .sort('-createdAt');
  
  res.status(200).json({
    status: 'success',
    results: templates.length,
    data: {
      templates,
    },
  });
});

// Get prompt template by ID
exports.getPromptTemplate = catchAsync(async (req, res, next) => {
  const template = await PromptTemplate.findById(req.params.id)
    .populate('category', 'name slug')
    .populate('createdBy', 'name')
    .populate('updatedBy', 'name');
  
  if (!template) {
    return next(new AppError('No prompt template found with that ID', 404));
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      template,
    },
  });
});

// Create new prompt template
exports.createPromptTemplate = catchAsync(async (req, res, next) => {
  // Add user as creator
  req.body.createdBy = req.user.id;
  
  // Get category name if not provided
  if (req.body.category && !req.body.categoryName) {
    const category = await Category.findById(req.body.category);
    if (category) {
      req.body.categoryName = category.name;
    }
  }
  
  const newTemplate = await PromptTemplate.create(req.body);
  
  res.status(201).json({
    status: 'success',
    data: {
      template: newTemplate,
    },
  });
});

// Update prompt template
exports.updatePromptTemplate = catchAsync(async (req, res, next) => {
  // Add user as updater
  req.body.updatedBy = req.user.id;
  
  // Get category name if category changed and name not provided
  if (req.body.category && !req.body.categoryName) {
    const category = await Category.findById(req.body.category);
    if (category) {
      req.body.categoryName = category.name;
    }
  }
  
  const template = await PromptTemplate.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).populate('category', 'name slug');
  
  if (!template) {
    return next(new AppError('No prompt template found with that ID', 404));
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      template,
    },
  });
});

// Delete prompt template
exports.deletePromptTemplate = catchAsync(async (req, res, next) => {
  const template = await PromptTemplate.findByIdAndDelete(req.params.id);
  
  if (!template) {
    return next(new AppError('No prompt template found with that ID', 404));
  }
  
  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// Import default prompts from file
exports.importDefaultPrompts = catchAsync(async (req, res, next) => {
  try {
    // Read default prompts from file
    const promptsPath = path.join(__dirname, '../../defaultprompts.txt');
    const promptsContent = await fs.readFile(promptsPath, 'utf8');
    
    // Parse the content to extract categories and prompts
    const categories = {};
    const importedPrompts = [];
    
    // Simple parsing logic - this should be enhanced based on your file format
    const lines = promptsContent.split('\n');
    let currentCategory = null;
    let currentContentType = null;
    let isCollectingPrompt = false;
    let promptName = '';
    let promptText = '';
    let isSingle = true;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines when not collecting prompt text
      if (!isCollectingPrompt && line === '') continue;
      
      // Detect main content type sections
      if (line === 'Hacks' || line === 'Hacks 2' || line === 'Tips' || line === 'Tips 2') {
        currentContentType = line.replace(' ', '').toLowerCase();
        continue;
      }
      
      // Detect category section
      if (line === 'Alt Kategoriler' && currentContentType) {
        // We're in a category section
        continue;
      }
      
      // Detect category name
      if (currentContentType && !isCollectingPrompt && line && line !== 'Promptlar' && !line.includes(' - ')) {
        currentCategory = line;
        continue;
      }
      
      // Detect prompt section
      if (line === 'Promptlar') {
        // We're in a prompt section
        continue;
      }
      
      // Detect prompt name and type
      if (currentCategory && line.includes(' - ') && line.includes('Prompt')) {
        // We found a prompt definition
        if (promptName && promptText) {
          // Save the previous prompt if we were collecting one
          const categoryObj = await ensureCategory(currentCategory);
          const newPrompt = {
            name: promptName,
            category: categoryObj._id,
            categoryName: categoryObj.name,
            contentType: currentContentType,
            isSingle,
            promptText,
            description: `Default ${promptName} for ${currentCategory}`,
            createdBy: req.user.id,
            isActive: true,
          };
          
          try {
            const createdPrompt = await PromptTemplate.create(newPrompt);
            importedPrompts.push(createdPrompt._id);
          } catch (error) {
            console.error(`Error importing prompt ${promptName}:`, error);
          }
        }
        
        // Start new prompt
        const parts = line.split(' - ');
        promptName = parts[0];
        isSingle = parts[1].includes('Tekli');
        isCollectingPrompt = true;
        promptText = '';
        continue;
      }
      
      // Collect prompt text
      if (isCollectingPrompt) {
        if (promptText && line !== '') {
          // Add a newline if we already have text and this isn't an empty line
          promptText += '\n';
        }
        promptText += line;
        
        // Check if we've reached a new prompt definition
        const nextLine = i < lines.length - 1 ? lines[i + 1].trim() : '';
        if (nextLine.includes(' - ') && nextLine.includes('Prompt')) {
          // We've reached the end of this prompt
          isCollectingPrompt = false;
          i--; // Go back one line so we process the next prompt header
        }
      }
    }
    
    // Save the last prompt if there is one
    if (promptName && promptText) {
      const categoryObj = await ensureCategory(currentCategory);
      const newPrompt = {
        name: promptName,
        category: categoryObj._id,
        categoryName: categoryObj.name,
        contentType: currentContentType,
        isSingle,
        promptText,
        description: `Default ${promptName} for ${currentCategory}`,
        createdBy: req.user.id,
        isActive: true,
      };
      
      try {
        const createdPrompt = await PromptTemplate.create(newPrompt);
        importedPrompts.push(createdPrompt._id);
      } catch (error) {
        console.error(`Error importing prompt ${promptName}:`, error);
      }
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        count: importedPrompts.length,
        promptIds: importedPrompts,
      },
    });
  } catch (error) {
    return next(new AppError(`Error importing prompts: ${error.message}`, 500));
  }
});

// Helper function to ensure a category exists
async function ensureCategory(categoryName) {
  // Check if category exists
  let category = await Category.findOne({ name: categoryName });
  
  // Create category if it doesn't exist
  if (!category) {
    const slug = categoryName.toLowerCase().replace(/\s+/g, '-');
    category = await Category.create({
      name: categoryName,
      slug,
      description: `Category for ${categoryName}`,
      active: true,
    });
  }
  
  return category;
} 