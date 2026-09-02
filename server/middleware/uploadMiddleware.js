const multer = require('multer');
const File = require('../models/File');
const Workspace = require('../models/Workspace');
const Subscription = require('../models/Subscription');

// Configure Multer memory storage
const storage = multer.memoryStorage();

// Max upload buffer limit (up to 500 MB per request)
const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024,
  },
});

/**
 * Middleware: Enforces storage quota & tier whitelist rules BEFORE file processing
 */
const checkStorageQuota = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
        errors: ['Missing file input'],
      });
    }

    const workspace = req.workspace;
    if (!workspace) {
      return res.status(400).json({
        success: false,
        message: 'Workspace context missing',
        errors: ['Invalid workspace context'],
      });
    }

    let subscription = await Subscription.findOne({ workspaceId: workspace._id });
    const plan = subscription ? subscription.plan : workspace.plan || 'FREE';
    const planConfig = Subscription.PLANS[plan] || Subscription.PLANS.FREE;

    const incomingFileSize = req.file.size || 0;
    const maxAllowedSingleFileSize = planConfig.maxFileSize || 26214400; // 25 MB for FREE

    // 1. Single File Size Tier Enforcement
    if (incomingFileSize > maxAllowedSingleFileSize) {
      const maxMB = (maxAllowedSingleFileSize / (1024 * 1024)).toFixed(0);
      return res.status(400).json({
        success: false,
        message: `File size exceeds the single-file limit for your ${plan} plan (${maxMB} MB max). Please upgrade to PRO or TEAM for larger file uploads.`,
        errors: ['File size limit exceeded for current plan tier.'],
      });
    }

    // 2. File Type Whitelist Enforcement for FREE Plan
    if (plan === 'FREE') {
      const allowedMimePrefixes = [
        'image/',
        'application/pdf',
        'text/',
        'application/zip',
        'application/x-zip-compressed',
        'application/msword',
        'application/vnd.openxmlformats-officedocument',
      ];

      const isAllowed = allowedMimePrefixes.some((mime) => req.file.mimetype.startsWith(mime));

      if (!isAllowed) {
        return res.status(400).json({
          success: false,
          message: `File type '${req.file.mimetype}' is restricted on the FREE plan. Upgrade to PRO to upload executable, video, or custom binary files.`,
          errors: ['File type restricted on Free tier.'],
        });
      }
    }

    // 3. Workspace Aggregate Storage Quota Enforcement
    const storageLimit = subscription ? subscription.storageLimit : workspace.storageLimit || 1073741824;

    const aggregateResult = await File.aggregate([
      { $match: { workspaceId: workspace._id } },
      { $group: { _id: null, totalSize: { $sum: '$size' } } },
    ]);

    const currentTotalUsed = aggregateResult.length > 0 ? aggregateResult[0].totalSize : 0;
    const projectedUsage = currentTotalUsed + incomingFileSize;

    if (projectedUsage > storageLimit) {
      const formatMB = (bytes) => (bytes / (1024 * 1024)).toFixed(1);
      const limitFormatted = formatMB(storageLimit);
      const usedFormatted = formatMB(currentTotalUsed);

      return res.status(413).json({
        success: false,
        message: `Storage quota exceeded! Your ${plan} workspace storage limit is ${limitFormatted} MB. Currently using ${usedFormatted} MB. Upgrade your plan to increase workspace capacity.`,
        currentUsed: currentTotalUsed,
        storageLimit,
      });
    }

    next();
  } catch (error) {
    console.error('[Storage Quota Check Error]:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to verify workspace storage quota',
      errors: [error.message],
    });
  }
};

module.exports = {
  upload,
  checkStorageQuota,
};
