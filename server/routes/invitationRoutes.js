const express = require('express');
const { acceptInvitation } = require('../controllers/invitationController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/:token/accept', protect, acceptInvitation);

module.exports = router;
