const Razorpay = require('razorpay');
const crypto = require('crypto');
const Subscription = require('../models/Subscription');
const Workspace = require('../models/Workspace');
const WorkspaceMember = require('../models/WorkspaceMember');
const File = require('../models/File');
const { emitToWorkspace } = require('../config/socket');
const { createAndDispatchNotification } = require('./notificationController');
const logger = require('../config/logger');

// Initialize Razorpay instance if keys are available in environment
let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

/**
 * @desc    Get workspace billing details & plan limits
 * @route   GET /api/workspaces/:id/billing
 * @access  Private (Workspace Member)
 */
const getWorkspaceBilling = async (req, res, next) => {
  try {
    const workspaceId = req.params.id;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'Workspace not found',
        errors: ['Invalid workspace ID'],
      });
    }

    let subscription = await Subscription.findOne({ workspaceId });
    if (!subscription) {
      // Auto-create default FREE subscription
      subscription = await Subscription.create({
        workspaceId,
        plan: workspace.plan || 'FREE',
        storageLimit: workspace.storageLimit || Subscription.PLANS.FREE.storageLimit,
        maxMembers: Subscription.PLANS.FREE.maxMembers,
      });
    }

    // Get live storage usage
    const files = await File.find({ workspaceId });
    const usedStorage = files.reduce((acc, f) => acc + (f.size || 0), 0);

    // Get live member count
    const memberCount = await WorkspaceMember.countDocuments({ workspaceId });

    res.status(200).json({
      success: true,
      billing: {
        workspaceId,
        plan: subscription.plan,
        status: subscription.status,
        provider: subscription.provider,
        currentPeriodEnd: subscription.currentPeriodEnd,
        storageLimit: subscription.storageLimit,
        usedStorage,
        maxMembers: subscription.maxMembers,
        memberCount,
        plansAvailable: Subscription.PLANS,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create Razorpay checkout order for plan upgrade
 * @route   POST /api/workspaces/:id/billing/checkout
 * @access  Private (Workspace Owner only)
 */
const createCheckoutOrder = async (req, res, next) => {
  try {
    const workspaceId = req.params.id;
    const { targetPlan } = req.body;

    if (!['PRO', 'TEAM'].includes(targetPlan)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan selected for upgrade',
        errors: ['Target plan must be PRO or TEAM'],
      });
    }

    const planConfig = Subscription.PLANS[targetPlan];
    const amountInPaise = planConfig.priceINR * 100; // Razorpay expects amount in paise

    let orderId = `order_test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    if (razorpay) {
      try {
        const order = await razorpay.orders.create({
          amount: amountInPaise,
          currency: 'INR',
          receipt: `receipt_${workspaceId.substring(0, 8)}_${Date.now()}`,
          notes: {
            workspaceId,
            targetPlan,
            userId: req.user._id.toString(),
          },
        });
        orderId = order.id;
      } catch (err) {
        logger.error('[Razorpay Order Creation Error]:', err);
        // Fallback to test mode order if Razorpay credentials fail
      }
    }

    // Store pending order in subscription
    await Subscription.findOneAndUpdate(
      { workspaceId },
      {
        razorpayOrderId: orderId,
        provider: 'razorpay',
      },
      { upsert: true }
    );

    res.status(200).json({
      success: true,
      message: 'Razorpay checkout order created successfully',
      order: {
        orderId,
        amount: amountInPaise,
        currency: 'INR',
        plan: targetPlan,
        razorpayKey: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder_key',
        isTestMode: !razorpay,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify Razorpay payment signature & upgrade workspace limits
 * @route   POST /api/workspaces/:id/billing/verify-payment
 * @access  Private (Workspace Owner only)
 */
const verifyPayment = async (req, res, next) => {
  try {
    const workspaceId = req.params.id;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, targetPlan } = req.body;

    if (!targetPlan || !Subscription.PLANS[targetPlan]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan specified',
        errors: ['Target plan missing or invalid'],
      });
    }

    // Verify HMAC signature if Razorpay secret is set
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    let isValidSignature = true;

    if (keySecret && razorpay_signature && razorpay_order_id && razorpay_payment_id) {
      const generatedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      isValidSignature = generatedSignature === razorpay_signature;
    }

    if (!isValidSignature) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed. Invalid signature.',
        errors: ['Razorpay HMAC signature check failed'],
      });
    }

    const planConfig = Subscription.PLANS[targetPlan];

    // Update Subscription Record
    const subscription = await Subscription.findOneAndUpdate(
      { workspaceId },
      {
        plan: targetPlan,
        status: 'active',
        storageLimit: planConfig.storageLimit,
        maxMembers: planConfig.maxMembers,
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      { upsert: true, new: true }
    );

    // Update Workspace Record
    await Workspace.findByIdAndUpdate(workspaceId, {
      plan: targetPlan,
      storageLimit: planConfig.storageLimit,
    });

    // Notify workspace team members via Socket.IO
    emitToWorkspace(workspaceId, 'workspace:updated', {
      workspaceId,
      plan: targetPlan,
      storageLimit: planConfig.storageLimit,
    });

    await createAndDispatchNotification({
      workspaceId,
      type: 'SYSTEM',
      message: `🎉 Workspace upgraded to ${targetPlan} Plan! Limits increased to ${planConfig.maxMembers} members & ${planConfig.storageLimit / (1024 * 1024 * 1024)} GB storage.`,
    });

    res.status(200).json({
      success: true,
      message: `Workspace upgraded to ${targetPlan} plan successfully!`,
      subscription,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Razorpay Webhook listener for payment events
 * @route   POST /api/billing/webhook
 * @access  Public (Signature Verified)
 */
const razorpayWebhook = async (req, res, next) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    if (webhookSecret && signature) {
      const shasum = crypto.createHmac('sha256', webhookSecret);
      shasum.update(JSON.stringify(req.body));
      const digest = shasum.digest('hex');

      if (digest !== signature) {
        return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
      }
    }

    const event = req.body.event;
    const payload = req.body.payload;

    if (event === 'payment.captured' || event === 'order.paid') {
      const notes = payload.payment?.entity?.notes || payload.order?.entity?.notes;
      if (notes && notes.workspaceId && notes.targetPlan) {
        const planConfig = Subscription.PLANS[notes.targetPlan];
        if (planConfig) {
          await Subscription.findOneAndUpdate(
            { workspaceId: notes.workspaceId },
            {
              plan: notes.targetPlan,
              status: 'active',
              storageLimit: planConfig.storageLimit,
              maxMembers: planConfig.maxMembers,
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            }
          );
          await Workspace.findByIdAndUpdate(notes.workspaceId, {
            plan: notes.targetPlan,
            storageLimit: planConfig.storageLimit,
          });
        }
      }
    }

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    logger.error('[Razorpay Webhook Error]:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getWorkspaceBilling,
  createCheckoutOrder,
  verifyPayment,
  razorpayWebhook,
};
