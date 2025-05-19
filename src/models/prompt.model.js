const mongoose = require('mongoose');
const slugify = require('slugify');

const promptTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A prompt template must have a name'],
      trim: true,
      unique: true,
    },
    slug: {
      type: String,
      unique: true,
    },
    contentType: {
      type: String,
      required: [true, 'A prompt template must have a content type'],
      enum: ['hack', 'tip', 'hack2', 'tip2', 'quote', 'trend'],
    },
    category: {
      type: mongoose.Schema.ObjectId,
      ref: 'Category',
      required: [true, 'A prompt template must belong to a category'],
    },
    categoryName: {
      type: String,
      required: [true, 'Category name is required'],
    },
    // Whether this is for generating a single item or multiple items
    isSingle: {
      type: Boolean,
      default: true,
    },
    // The actual prompt text
    promptText: {
      type: String,
      required: [true, 'Prompt text is required'],
    },
    description: {
      type: String,
      trim: true,
    },
    // Who created this prompt
    createdBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    },
    // Who last updated this prompt
    updatedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    },
    // Is this prompt active for use
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Create slug from name
promptTemplateSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// Create index for efficient lookups
promptTemplateSchema.index({ contentType: 1, category: 1 });
promptTemplateSchema.index({ slug: 1 });
promptTemplateSchema.index({ isActive: 1 });

const PromptTemplate = mongoose.model('PromptTemplate', promptTemplateSchema);

module.exports = PromptTemplate; 