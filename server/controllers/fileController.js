const File = require('../models/File');
const Folder = require('../models/Folder');
const { uploadToSupabase, getSignedDownloadUrl, deleteFromSupabase } = require('../config/supabase');
const { emitToWorkspace } = require('../config/socket');
const { createAndDispatchNotification } = require('./notificationController');

/**
 * @desc    Upload file to workspace
 * @route   POST /api/workspaces/:id/files/upload
 * @access  Private (Workspace Member)
 */
const uploadFile = async (req, res, next) => {
  try {
    const workspaceId = req.params.id;
    const { folderId } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No file buffer provided in request',
      });
    }

    // Verify folder exists if provided
    let targetFolderId = null;
    if (folderId && folderId !== 'null' && folderId !== 'root') {
      const folderExists = await Folder.findOne({ _id: folderId, workspaceId });
      if (!folderExists) {
        return res.status(404).json({
          success: false,
          message: 'Target folder not found in this workspace',
        });
      }
      targetFolderId = folderExists._id;
    }

    // Construct Supabase storage path: workspace-files/workspace_<id>/<timestamp>_<filename>
    const sanitizedFileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const supabasePath = `workspace_${workspaceId}/${Date.now()}_${sanitizedFileName}`;

    // Upload to Supabase Storage
    await uploadToSupabase(file.buffer, file.mimetype, supabasePath);

    // Save metadata record in MongoDB
    const fileRecord = await File.create({
      name: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      workspaceId,
      folderId: targetFolderId,
      uploadedBy: req.user._id,
      supabasePath,
    });

    // Real-Time Socket Event & Notification Dispatch
    emitToWorkspace(workspaceId, 'file:uploaded', {
      file: fileRecord,
      uploadedBy: { _id: req.user._id, name: req.user.name },
    });

    await createAndDispatchNotification({
      workspaceId,
      type: 'FILE_UPLOAD',
      message: `${req.user.name} uploaded new file "${file.originalname}"`,
      excludeUserId: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      file: fileRecord,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get files in a workspace (filterable by folderId)
 * @route   GET /api/workspaces/:id/files
 * @access  Private (Workspace Member)
 */
const getFiles = async (req, res, next) => {
  try {
    const workspaceId = req.params.id;
    const { folderId } = req.query;

    let filter = { workspaceId };
    if (folderId === 'root' || !folderId || folderId === 'null') {
      filter.folderId = null;
    } else {
      filter.folderId = folderId;
    }

    const files = await File.find(filter)
      .populate('uploadedBy', 'name email avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: files.length,
      files,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate signed download URL for file
 * @route   GET /api/workspaces/:id/files/:fileId/download
 * @access  Private (Workspace Member)
 */
const downloadFile = async (req, res, next) => {
  try {
    const { id: workspaceId, fileId } = req.params;

    const fileRecord = await File.findOne({ _id: fileId, workspaceId });
    if (!fileRecord) {
      return res.status(404).json({
        success: false,
        message: 'File not found in this workspace',
      });
    }

    // Generate 1-hour signed URL from Supabase Storage
    const signedUrl = await getSignedDownloadUrl(fileRecord.supabasePath);

    res.status(200).json({
      success: true,
      fileName: fileRecord.name,
      mimeType: fileRecord.mimeType,
      signedUrl,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete file from workspace
 * @route   DELETE /api/workspaces/:id/files/:fileId
 * @access  Private (File Owner OR Workspace OWNER/ADMIN)
 */
const deleteFile = async (req, res, next) => {
  try {
    const { id: workspaceId, fileId } = req.params;

    const fileRecord = await File.findOne({ _id: fileId, workspaceId });
    if (!fileRecord) {
      return res.status(404).json({
        success: false,
        message: 'File not found in this workspace',
      });
    }

    // Check ownership: File uploader OR workspace OWNER/ADMIN
    const isUploader = fileRecord.uploadedBy.toString() === req.user._id.toString();
    const isAdminOrOwner = ['OWNER', 'ADMIN'].includes(req.workspaceMember.role);

    if (!isUploader && !isAdminOrOwner) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You can only delete your own uploaded files unless you are an Admin/Owner.',
      });
    }

    // Delete object from Supabase Storage
    await deleteFromSupabase(fileRecord.supabasePath);

    // Delete metadata record from MongoDB
    await File.findByIdAndDelete(fileId);

    // Real-Time Socket Event & Notification Dispatch
    emitToWorkspace(workspaceId, 'file:deleted', {
      fileId,
      fileName: fileRecord.name,
      deletedBy: { _id: req.user._id, name: req.user.name },
    });

    await createAndDispatchNotification({
      workspaceId,
      type: 'FILE_DELETE',
      message: `${req.user.name} deleted file "${fileRecord.name}"`,
      excludeUserId: req.user._id,
    });

    res.status(200).json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get workspace storage usage statistics
 * @route   GET /api/workspaces/:id/storage-usage
 * @access  Private (Workspace Member)
 */
const getStorageUsage = async (req, res, next) => {
  try {
    const workspaceId = req.params.id;
    const workspace = req.workspace;

    const aggregateResult = await File.aggregate([
      { $match: { workspaceId: workspace._id } },
      { $group: { _id: null, totalSize: { $sum: '$size' }, fileCount: { $sum: 1 } } },
    ]);

    const totalUsed = aggregateResult.length > 0 ? aggregateResult[0].totalSize : 0;
    const fileCount = aggregateResult.length > 0 ? aggregateResult[0].fileCount : 0;
    const storageLimit = workspace.storageLimit || 1073741824; // 1 GB default
    const percentage = Math.min(100, Number(((totalUsed / storageLimit) * 100).toFixed(1)));

    res.status(200).json({
      success: true,
      totalUsed,
      storageLimit,
      percentage,
      fileCount,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadFile,
  getFiles,
  downloadFile,
  deleteFile,
  getStorageUsage,
};
