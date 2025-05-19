const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    icon: {
      type: String, // URL to icon image
      default: null,
    },
    color: {
      type: String, // Hex color code
      default: '#3498db',
    },
    active: {
      type: Boolean,
      default: true,
    },
    priority: {
      type: Number,
      default: 0, // Used for sorting/displaying categories
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    contentCount: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isParent: {
      type: Boolean,
      default: true,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    subCategories: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
    }],
    isFeatured: {
      type: Boolean,
      default: false,
    },
    lastGenerated: {
      type: Date,
    },
    prompt: {
      type: String,
      trim: true,
      default: null,
    },
    singlePrompt: {
      type: String,
      trim: true,
      default: null,
    },
    multiplePrompt: {
      type: String,
      trim: true,
      default: null,
    },
    promptType: {
      type: String,
      enum: ['single', 'multiple', null],
      default: 'single',
    },
    defaultNumToGenerate: {
      type: Number,
      default: 1,
    },
    contentType: {
      type: String,
      enum: ['hack', 'hack2', 'tip', 'tip2'],
      default: 'hack',
    },
    pools: {
      regular: {
        type: Number,
        default: 0,
      },
      accepted: {
        type: Number,
        default: 0,
      },
      highly_liked: {
        type: Number,
        default: 0,
      },
      disliked: {
        type: Number,
        default: 0,
      },
      premium: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
categorySchema.index({ name: 1 });
categorySchema.index({ slug: 1 });
categorySchema.index({ active: 1, priority: 1 });

// Pre-save hook to generate slug if not provided
categorySchema.pre('save', function (next) {
  if (!this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/g, '-');
  }
  next();
});

const Category = mongoose.model('Category', categorySchema);

module.exports = Category; 