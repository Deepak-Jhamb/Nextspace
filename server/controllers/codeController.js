const CodeFolder = require('../models/CodeFolder');
const CodeFile = require('../models/CodeFile');
const Workspace = require('../models/Workspace');

// @desc    Get all code folders and files for a workspace
// @route   GET /api/workspaces/:workspaceId/code
// @access  Private (Needs Workspace Member Middleware)
exports.getWorkspaceCodeTree = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    // We can assume middleware checks if user is in workspace.
    // To keep it simple, just fetch by workspaceId.
    const folders = await CodeFolder.find({ workspaceId }).sort({ name: 1 });
    const files = await CodeFile.find({ workspaceId }).sort({ name: 1 });

    res.status(200).json({
      success: true,
      data: {
        folders,
        files,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a new code folder
// @route   POST /api/workspaces/:workspaceId/code/folders
exports.createCodeFolder = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { name, parentId } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Folder name is required' });
    }

    const folder = await CodeFolder.create({
      name,
      workspaceId,
      parentId: parentId || null,
    });

    res.status(201).json({ success: true, data: folder });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a code folder (and nested contents ideally, but for MVP just the folder and direct children)
// @route   DELETE /api/workspaces/:workspaceId/code/folders/:folderId
exports.deleteCodeFolder = async (req, res) => {
  try {
    const { workspaceId, folderId } = req.params;

    await CodeFolder.findOneAndDelete({ _id: folderId, workspaceId });
    // In MVP, we should also delete files inside this folder
    await CodeFile.deleteMany({ folderId, workspaceId });
    await CodeFolder.deleteMany({ parentId: folderId, workspaceId });

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a new code file
// @route   POST /api/workspaces/:workspaceId/code/files
exports.createCodeFile = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { name, folderId } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'File name is required' });
    }

    // Determine basic language from extension
    const ext = name.split('.').pop();
    const langMap = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      html: 'html',
      css: 'css',
      json: 'json',
      md: 'markdown',
      py: 'python',
    };
    const language = langMap[ext] || 'plaintext';

    const file = await CodeFile.create({
      name,
      content: '',
      language,
      workspaceId,
      folderId: folderId || null,
    });

    res.status(201).json({ success: true, data: file });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update code file content (autosave)
// @route   PUT /api/workspaces/:workspaceId/code/files/:fileId
exports.updateCodeFileContent = async (req, res) => {
  try {
    const { workspaceId, fileId } = req.params;
    const { content } = req.body;

    const file = await CodeFile.findOneAndUpdate(
      { _id: fileId, workspaceId },
      { content },
      { new: true, runValidators: true }
    );

    if (!file) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    res.status(200).json({ success: true, data: file });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a code file
// @route   DELETE /api/workspaces/:workspaceId/code/files/:fileId
exports.deleteCodeFile = async (req, res) => {
  try {
    const { workspaceId, fileId } = req.params;

    await CodeFile.findOneAndDelete({ _id: fileId, workspaceId });

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
