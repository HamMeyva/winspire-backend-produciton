const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    features: [String],
    tier: {
      type: String,
      enum: ['free', 'basic', 'premium', 'enterprise'],
      required: true,
    },
    prices: [
      {
        interval: {
          type: String,
          enum: ['monthly', 'quarterly', 'yearly'],
          required: true,
        },
        amount: {
          type: Number,
          required: true,
        },
        currency: {
          type: String,
          default: 'USD',
        },
        stripePriceId: {
          type: String,
        },
        trialDays: {
          type: Number,
          default: 0,
        },
      },
    ],
    active: {
      type: Boolean,
      default: true,
    },
    metadata: {
      type: Map,
      of: String,
      default: () => ({}),
    },
    limits: {
      dailyContent: {
        type: Number, // Number of content pieces available per day
        default: 5,
      },
      categoryAccess: {
        type: Number, // Number of categories user can access
        default: 5,
      },
      offlineAccess: {
        type: Boolean, // Whether offline access is allowed
        default: false,
      },
      premiumContent: {
        type: Boolean, // Whether premium content is accessible
        default: false,
      },
      aiAssistants: {
        type: Boolean, // Whether AI assistance features are available
        default: false,
      },
      maxDevices: {
        type: Number, // Maximum number of devices
        default: 1,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
subscriptionPlanSchema.index({ tier: 1, active: 1 });
subscriptionPlanSchema.index({ slug: 1 });

const SubscriptionTransaction = mongoose.model(
  'SubscriptionTransaction',
  new mongoose.Schema(
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      planId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SubscriptionPlan',
        required: true,
      },
      status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded', 'disputed'],
        default: 'pending',
      },
      amount: {
        type: Number,
        required: true,
      },
      currency: {
        type: String,
        default: 'USD',
      },
      interval: {
        type: String,
        enum: ['monthly', 'quarterly', 'yearly'],
        required: true,
      },
      startDate: {
        type: Date,
        default: Date.now,
      },
      endDate: {
        type: Date,
        required: true,
      },
      paymentMethod: {
        type: String,
        enum: ['card', 'paypal', 'apple-pay', 'google-pay'],
        required: true,
      },
      paymentDetails: {
        stripeChargeId: String,
        stripeInvoiceId: String,
        stripePaymentIntentId: String,
        last4: String,
        brand: String,
      },
      metadata: {
        type: Map,
        of: String,
        default: () => ({}),
      },
    },
    {
      timestamps: true,
    }
  )
);

// Index for faster queries on transaction history
SubscriptionTransaction.schema.index({ userId: 1, createdAt: -1 });
SubscriptionTransaction.schema.index({ status: 1 });

const SubscriptionPlan = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);

module.exports = {
  SubscriptionPlan,
  SubscriptionTransaction,
}; 