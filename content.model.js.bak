const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
    },
    summary: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['draft', 'pending', 'published', 'rejected', 'archived'],
      default: 'draft',
      index: true,
    },
    contentType: {
      type: String,
      enum: ['hack', 'tip', 'hack2', 'tip2', 'quote'],
      default: 'hack',
      index: true,
    },
    tags: [String],
    image: {
      type: String, // URL to image
      default: null,
    },
    source: {
      type: String,
      enum: ['ai', 'human', 'imported'],
      default: 'human',
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    moderatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    moderationNotes: {
      type: String,
      default: null,
    },
    hasBeenPublished: {
      type: Boolean,
      default: false,
    },
    publishDate: {
      type: Date,
      default: null,
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    metadata: {
      type: Map,
      of: String,
      default: () => ({}),
    },
    stats: {
      views: { type: Number, default: 0 },
      saves: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      likes: { type: Number, default: 0 },
      dislikes: { type: Number, default: 0 },
    },
    premium: {
      type: Boolean,
      default: false,
    },
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    timeToComplete: {
      type: Number, // In minutes
      default: 5,
    },
    recycleCount: {
      type: Number,
      default: 0,
    },
    lastRecycleDate: {
      type: Date,
      default: null,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    lastUsedDate: {
      type: Date,
      default: null,
    },
    pool: {
      type: String,
      enum: ['regular', 'accepted', 'highly_liked', 'disliked', 'premium'],
      default: 'regular',
      index: true,
    }
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
contentSchema.index({ category: 1, status: 1, publishDate: -1 });
contentSchema.index({ status: 1, publishDate: -1 });
contentSchema.index({ 'stats.likes': -1, 'stats.views': -1 });
contentSchema.index({ tags: 1 });
contentSchema.index({ premium: 1, status: 1 });
contentSchema.index({ authorId: 1 });
contentSchema.index({ contentType: 1, category: 1, status: 1 });
contentSchema.index({ pool: 1, category: 1, lastUsedDate: 1 });

// Virtual for rating calculated from likes/dislikes
contentSchema.virtual('rating').get(function() {
  const total = this.stats.likes + this.stats.dislikes;
  if (total === 0) return 0;
  return (this.stats.likes / total) * 5; // Scale to 0-5 rating
});

// Method to determine if content should be recycled based on rating and views
contentSchema.methods.shouldRecycle = function() {
  // Only recycle published content
  if (this.status !== 'published') return false;
  
  // If it has a high rating (4+ out of 5) and good view count (100+), it's worth recycling
  const rating = this.rating;
  const views = this.stats.views;
  
  return rating >= 4 && views >= 100;
};

// Method to update content pool based on ratings
contentSchema.methods.updatePool = function() {
  const rating = this.rating;
  const totalRatings = this.stats.likes + this.stats.dislikes;
  
  // Only update pool if content has enough ratings
  if (totalRatings < 10) return;
  
  if (rating >= 4.5) {
    this.pool = 'highly_liked';
  } else if (rating >= 4.0) {
    this.pool = 'accepted';
  } else if (rating <= 2.0) {
    this.pool = 'disliked';
  } else {
    this.pool = 'regular';
  }
};

// Static method to find recyclable content
contentSchema.statics.findRecyclableContent = async function(limit = 10) {
  const minDate = new Date();
  minDate.setDate(minDate.getDate() - 30); // Only recycle content older than 30 days
  
  return this.find({
    status: 'published',
    publishDate: { $lt: minDate },
    'stats.likes': { $gt: 10 },
    'stats.views': { $gt: 100 },
    $expr: { $gt: ['$stats.likes', { $multiply: ['$stats.dislikes', 2] }] }, // Likes at least double dislikes
  })
    .sort({ 'stats.likes': -1, 'stats.views': -1 })
    .limit(limit);
};

// Find content for the app that hasn't been used recently
contentSchema.statics.findFreshContent = async function(category, contentType, count = 10) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Find content that hasn't been used recently (or ever)
  return this.find({
    category: category,
    contentType: contentType,
    status: 'published',
    $or: [
      { lastUsedDate: null },
      { lastUsedDate: { $lt: yesterday } }
    ]
  })
  .sort({ usageCount: 1, lastUsedDate: 1 })
  .limit(count);
};

const Content = mongoose.model('Content', contentSchema);

module.exports = Content; 