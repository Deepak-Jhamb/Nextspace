const Folder = require('../models/Folder');
const File = require('../models/File');
const { deleteFromSupabase } = require('../config/supabase');

/**
 * @desc    Create folder in workspace
 * @route   POST /api/workspaces/:id/folders
 * @access  Private (Workspace Member)
 */
const createFolder = async (req, res, next) => {
  try {
    const workspaceId = req.params.id;
    const { name, parentFolderId } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Folder name is required',
      });
    }

    let parentId = null;
    if (parentFolderId && parentFolderId !== 'null' && parentFolderId !== 'root') {
      const parentExists = await Folder.findOne({ _id: parentFolderId, workspaceId });
      if (!parentExists) {
        return res.status(404).json({
          success: false,
          message: 'Parent folder not found in this workspace',
        });
      }
      parentId = parentExists._id;
    }

    const folder = await Folder.create({
      name: name.trim(),
      workspaceId,
      parentFolderId: parentId,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: 'Folder created successfully',
      folder,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get folders in workspace
 * @route   GET /api/workspaces/:id/folders
 * @access  Private (Workspace Member)
 */
const getFolders = async (req, res, next) => {
  try {
    const workspaceId = req.params.id;
    const { parentFolderId } = req.query;

    let filter = { workspaceId };
    if (parentFolderId === 'root' || !parentFolderId || parentFolderId === 'null') {
      filter.parentFolderId = null;
    } else {
      filter.parentFolderId = parentFolderId;
    }

    const folders = await Folder.find(filter)
      .populate('createdBy', 'name email avatar')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: folders.length,
      folders,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Recursive deletion helper for folders, subfolders, and files
 */
const deleteFolderRecursively = async (folderId, workspaceId) => {
  // Delete all files inside this folder
  const files = await File.find({ folderId, workspaceId });
  for (const file of files) {
    await deleteFromSupabase(file.supabasePath);
    await File.findByIdAndDelete(file._id);
  }

  // Find subfolders
  const subfolders = await Folder.find({ parentFolderId: folderId, workspaceId });
  for (const sub of subfolders) {
    await deleteFolderRecursively(sub._id, workspaceId);
  }

  // Delete the folder itself
  await Folder.findByIdAndDelete(folderId);
};

/**
 * @desc    Delete folder and its contents recursively
 * @route   DELETE /api/workspaces/:id/folders/:folderId
 * @access  Private (Workspace Member)
 */
const deleteFolder = async (req, res, next) => {
  try {
    const { id: workspaceId, folderId } = req.params;

    const folder = await Folder.findOne({ _id: folderId, workspaceId });
    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found in this workspace',
      });
    }

    await deleteFolderRecursively(folderId, workspaceId);

    res.status(200).json({
      success: true,
      message: 'Folder and its contents deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createFolder,
  getFolders,
  deleteFolder,
};
