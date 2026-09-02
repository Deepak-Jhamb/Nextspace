const express = require('express');
const { getChannels, createChannel, deleteChannel } = require('../controllers/channelController');
const { protect } = require('../middleware/authMiddleware');
const { checkWorkspaceMembership } = require('../middleware/workspaceMiddleware');

const router = express.Router();

router.use(protect);

router.get('/:id/channels', checkWorkspaceMembership, getChannels);
router.post('/:id/channels', checkWorkspaceMembership, createChannel);
router.delete('/:id/channels/:channelId', checkWorkspaceMembership, deleteChannel);

module.exports = router;
