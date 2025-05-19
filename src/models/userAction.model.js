const mongoose = require('mongoose');

/**
 * User Action Schema for tracking like/dislike/maybe actions on content
 */
const userActionSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true
    },
    title: {
      type: String,
      required: [true, 'Content title/ID is required'],
      trim: true
    },
    cardIndex: {
      type: Number,
      required: [true, 'Card index is required']
    },
    action: {
      type: String,
      required: [true, 'Action type is required'],
      enum: ['like', 'dislike', 'maybe'],
      trim: true
    },
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Content',
      // Not required as we might not have the actual content ID in some cases
    },
    ipAddress: {
      type: String,
      trim: true
    },
    userAgent: {
      type: String,
      trim: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Index for faster lookup
userActionSchema.index({ contentId: 1, action: 1 });
userActionSchema.index({ category: 1, title: 1, cardIndex: 1 });
userActionSchema.index({ action: 1 });

const UserAction = mongoose.model('UserAction', userActionSchema);

module.exports = UserAction;
