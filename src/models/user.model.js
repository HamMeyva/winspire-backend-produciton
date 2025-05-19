const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: [validator.isEmail, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [function() { return !this.googleId; }, 'Password is required if not using Google authentication'],
      minlength: 8,
      select: false, // Don't include password in query results by default
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    // Google Authentication Fields
    googleId: {
      type: String,
      unique: true,
      sparse: true
    },
    googlePicture: {
      type: String,
      default: null
    },
    emailVerified: {
      type: Boolean,
      default: false
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'moderator', 'content-creator'],
      default: 'user',
    },
    avatar: {
      type: String,
      default: null,
    },
    active: {
      type: Boolean,
      default: true,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    verificationToken: String,
    verificationExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    lastLogin: Date,
    subscription: {
      tier: {
        type: String,
        enum: ['free', 'basic', 'premium', 'enterprise'],
        default: 'free',
      },
      status: {
        type: String,
        enum: ['active', 'cancelled', 'expired', 'trial', 'none'],
        default: 'none',
      },
      startDate: {
        type: Date,
        default: null,
      },
      endDate: {
        type: Date,
        default: null,
      },
      stripeCustomerId: String,
      stripeSubscriptionId: String,
      paymentMethod: {
        type: String,
        enum: ['card', 'paypal', 'apple-pay', 'google-pay', 'none'],
        default: 'none',
      },
      cancellationReason: String,
    },
    preferences: {
      theme: {
        type: String,
        enum: ['light', 'dark', 'system'],
        default: 'system',
      },
      notifications: {
        email: {
          type: Boolean,
          default: true,
        },
        push: {
          type: Boolean,
          default: true,
        },
      },
      contentPreferences: {
        categories: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
          },
        ],
        difficulty: {
          type: String,
          enum: ['beginner', 'intermediate', 'advanced', 'all'],
          default: 'all',
        },
      },
    },
    deviceTokens: [
      {
        token: String,
        platform: {
          type: String,
          enum: ['ios', 'android', 'web'],
        },
        lastUsed: Date,
      },
    ],
    stats: {
      totalContentViewed: {
        type: Number,
        default: 0,
      },
      totalLikes: {
        type: Number,
        default: 0,
      },
      totalDislikes: {
        type: Number,
        default: 0,
      },
      streak: {
        current: {
          type: Number,
          default: 0,
        },
        longest: {
          type: Number,
          default: 0,
        },
        lastActivity: Date,
      },
      categoriesExplored: {
        type: Number,
        default: 0,
      },
    },
    progress: {
      completedContent: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Content',
        },
      ],
      savedContent: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Content',
        },
      ],
      categoryProgress: [
        {
          category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
          },
          contentViewed: {
            type: Number,
            default: 0,
          },
          lastViewedAt: Date,
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ 'subscription.tier': 1, 'subscription.status': 1 });
userSchema.index({ 'stats.streak.current': -1 });
userSchema.index({ createdAt: -1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function (next) {
  // Only hash the password if it's modified or new
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost factor of 12
    this.password = await bcrypt.hash(this.password, 12);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Method to update streak
userSchema.methods.updateStreak = function () {
  const now = new Date();
  const lastActivity = this.stats.streak.lastActivity;
  
  if (!lastActivity) {
    // First activity
    this.stats.streak.current = 1;
    this.stats.streak.longest = 1;
  } else {
    // Check if last activity was yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (lastActivity.toDateString() === yesterday.toDateString()) {
      // Continue streak
      this.stats.streak.current += 1;
      
      // Update longest streak if current is greater
      if (this.stats.streak.current > this.stats.streak.longest) {
        this.stats.streak.longest = this.stats.streak.current;
      }
    } else if (lastActivity.toDateString() === now.toDateString()) {
      // Already logged in today, no streak change
      return;
    } else {
      // Streak broken
      this.stats.streak.current = 1;
    }
  }
  
  // Update last activity
  this.stats.streak.lastActivity = now;
};

const User = mongoose.model('User', userSchema);

module.exports = User; 