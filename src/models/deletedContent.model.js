const mongoose = require('mongoose');

const deletedContentSchema = new mongoose.Schema(
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
    },
    // Additional field for when the content was deleted
    deletedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    // Reference to the original content ID if needed
    originalContentId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    // Reason for deletion
    reason: {
      type: String,
      enum: ['manual_delete', 'auto_delete', 'duplicate', 'category_deleted', 'other'],
      default: 'manual_delete'
    }
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
deletedContentSchema.index({ category: 1, deletedAt: -1 });
deletedContentSchema.index({ contentType: 1, category: 1 });
deletedContentSchema.index({ authorId: 1 });

const DeletedContent = mongoose.model('DeletedContent', deletedContentSchema);

module.exports = DeletedContent; 