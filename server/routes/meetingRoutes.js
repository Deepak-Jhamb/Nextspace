const express = require('express');
const {
  startMeeting,
  getActiveMeetings,
  joinMeeting,
  endMeeting,
} = require('../controllers/meetingController');
const { protect } = require('../middleware/authMiddleware');
const { checkWorkspaceMembership } = require('../middleware/workspaceMiddleware');

const router = express.Router();

router.use(protect);

router.post('/:id/meetings/start', checkWorkspaceMembership, startMeeting);
router.get('/:id/meetings/active', checkWorkspaceMembership, getActiveMeetings);
router.post('/:id/meetings/:meetingId/join', checkWorkspaceMembership, joinMeeting);
router.post('/:id/meetings/:meetingId/end', checkWorkspaceMembership, endMeeting);

module.exports = router;
