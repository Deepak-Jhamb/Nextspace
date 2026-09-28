const express = require('express');
const {
  getWorkspaceCodeTree,
  createCodeFolder,
  deleteCodeFolder,
  createCodeFile,
  updateCodeFileContent,
  deleteCodeFile,
} = require('../controllers/codeController');
const { protect } = require('../middleware/authMiddleware');
const { requireWorkspaceMember } = require('../middleware/workspaceMiddleware');

// Note: Mounted at /api/workspaces
const router = express.Router();

router.use('/:workspaceId/code', protect, requireWorkspaceMember);

router
  .route('/:workspaceId/code')
  .get(getWorkspaceCodeTree);

router
  .route('/:workspaceId/code/folders')
  .post(createCodeFolder);

router
  .route('/:workspaceId/code/folders/:folderId')
  .delete(deleteCodeFolder);

router
  .route('/:workspaceId/code/files')
  .post(createCodeFile);

router
  .route('/:workspaceId/code/files/:fileId')
  .put(updateCodeFileContent)
  .delete(deleteCodeFile);

module.exports = router;
