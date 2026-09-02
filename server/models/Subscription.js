const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      unique: true,
    },
    plan: {
      type: String,
      enum: ['FREE', 'PRO', 'TEAM'],
      default: 'FREE',
    },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'past_due'],
      default: 'active',
    },
    provider: {
      type: String,
      default: 'razorpay',
    },
    providerSubscriptionId: {
      type: String,
      default: null,
    },
    razorpayOrderId: {
      type: String,
      default: null,
    },
    razorpayPaymentId: {
      type: String,
      default: null,
    },
    razorpaySignature: {
      type: String,
      default: null,
    },
    currentPeriodEnd: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },
    storageLimit: {
      type: Number,
      default: 1073741824, // 1 GB
    },
    maxMembers: {
      type: Number,
      default: 5,
    },
  },
  {
    timestamps: true,
  }
);

// Plan constants helper
subscriptionSchema.statics.PLANS = {
  FREE: {
    name: 'FREE',
    priceINR: 0,
    priceUSD: 0,
    storageLimit: 1073741824, // 1 GB
    maxMembers: 5,
    maxFileSize: 26214400, // 25 MB
  },
  PRO: {
    name: 'PRO',
    priceINR: 1499,
    priceUSD: 19,
    storageLimit: 107374182400, // 100 GB
    maxMembers: 20,
    maxFileSize: 524288000, // 500 MB
  },
  TEAM: {
    name: 'TEAM',
    priceINR: 3999,
    priceUSD: 49,
    storageLimit: 536870912000, // 500 GB
    maxMembers: 100,
    maxFileSize: 2147483648, // 2 GB
  },
};

module.exports = mongoose.model('Subscription', subscriptionSchema);
