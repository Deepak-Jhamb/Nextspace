const express = require('express');
const {
  getWorkspaceBilling,
  createCheckoutOrder,
  verifyPayment,
  razorpayWebhook,
} = require('../controllers/billingController');
const { protect } = require('../middleware/authMiddleware');
const { checkWorkspaceMembership, checkRole } = require('../middleware/workspaceMiddleware');

const router = express.Router();

// Public Webhook route (must not be guarded by JWT auth)
router.post('/billing/webhook', razorpayWebhook);

// Protected Workspace Billing routes
router.use(protect);

router.get('/workspaces/:id/billing', checkWorkspaceMembership, getWorkspaceBilling);
router.post(
  '/workspaces/:id/billing/checkout',
  checkWorkspaceMembership,
  checkRole(['OWNER']),
  createCheckoutOrder
);
router.post(
  '/workspaces/:id/billing/verify-payment',
  checkWorkspaceMembership,
  checkRole(['OWNER']),
  verifyPayment
);

module.exports = router;
