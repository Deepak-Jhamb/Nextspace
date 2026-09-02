const express = require('express');
const {
  getMessages,
  createMessage,
  updateMessage,
  deleteMessage,
  markChannelRead,
} = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');
const { checkWorkspaceMembership } = require('../middleware/workspaceMiddleware');

const router = express.Router();

router.use(protect);

router.get('/:id/channels/:channelId/messages', checkWorkspaceMembership, getMessages);
router.post('/:id/channels/:channelId/messages', checkWorkspaceMembership, createMessage);
router.patch('/:id/channels/:channelId/messages/:messageId', checkWorkspaceMembership, updateMessage);
router.delete('/:id/channels/:channelId/messages/:messageId', checkWorkspaceMembership, deleteMessage);
router.post('/:id/channels/:channelId/read', checkWorkspaceMembership, markChannelRead);

module.exports = router;
