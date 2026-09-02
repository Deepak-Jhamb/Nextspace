const express = require('express');
const {
  uploadFile,
  getFiles,
  downloadFile,
  deleteFile,
  getStorageUsage,
} = require('../controllers/fileController');
const { protect } = require('../middleware/authMiddleware');
const { checkWorkspaceMembership } = require('../middleware/workspaceMiddleware');
const { upload, checkStorageQuota } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.use(protect);

// Upload file route (with multer + storage quota check middleware)
router.post(
  '/:id/files/upload',
  checkWorkspaceMembership,
  upload.single('file'),
  checkStorageQuota,
  uploadFile
);

// File management routes
router.get('/:id/files', checkWorkspaceMembership, getFiles);
router.get('/:id/files/:fileId/download', checkWorkspaceMembership, downloadFile);
router.delete('/:id/files/:fileId', checkWorkspaceMembership, deleteFile);
router.get('/:id/storage-usage', checkWorkspaceMembership, getStorageUsage);

module.exports = router;
