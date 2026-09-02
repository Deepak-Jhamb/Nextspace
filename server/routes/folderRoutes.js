const express = require('express');
const { createFolder, getFolders, deleteFolder } = require('../controllers/folderController');
const { protect } = require('../middleware/authMiddleware');
const { checkWorkspaceMembership } = require('../middleware/workspaceMiddleware');

const router = express.Router();

router.use(protect);

router.post('/:id/folders', checkWorkspaceMembership, createFolder);
router.get('/:id/folders', checkWorkspaceMembership, getFolders);
router.delete('/:id/folders/:folderId', checkWorkspaceMembership, deleteFolder);

module.exports = router;
