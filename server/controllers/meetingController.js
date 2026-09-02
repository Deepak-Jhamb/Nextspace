const Meeting = require('../models/Meeting');
const Message = require('../models/Message');
const Channel = require('../models/Channel');
const { emitToWorkspace } = require('../config/socket');
const { createAndDispatchNotification } = require('./notificationController');

/**
 * @desc    Start an instant meeting / call room
 * @route   POST /api/workspaces/:id/meetings/start
 * @access  Private (Workspace Member)
 */
const startMeeting = async (req, res, next) => {
  try {
    const workspaceId = req.params.id;
    const { channelId, title } = req.body;

    const meetingId = `meeting_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const meetingTitle = title && title.trim() ? title.trim() : `${req.user.name}'s Huddle`;

    const meeting = await Meeting.create({
      workspaceId,
      meetingId,
      channelId: channelId || null,
      title: meetingTitle,
      hostId: req.user._id,
      participants: [
        {
          userId: req.user._id,
          joinedAt: new Date(),
        },
      ],
      status: 'ACTIVE',
    });

    let systemMessage = null;
    if (channelId) {
      systemMessage = await Message.create({
        channelId,
        senderId: req.user._id,
        content: `🎥 ${req.user.name} started a live group video call: "${meetingTitle}"`,
        systemType: 'CALL_START',
        meetingId,
      });

      systemMessage = await Message.findById(systemMessage._id).populate('senderId', 'name email avatar');

      emitToWorkspace(workspaceId, 'chat:message:new', {
        channelId,
        message: systemMessage,
      });
    }

    emitToWorkspace(workspaceId, 'call:initiated', {
      meetingId,
      meetingTitle,
      host: { _id: req.user._id, name: req.user.name },
      channelId,
    });

    await createAndDispatchNotification({
      workspaceId,
      type: 'SYSTEM',
      message: `🎥 ${req.user.name} started a video call: "${meetingTitle}"`,
      excludeUserId: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: 'Meeting room created successfully',
      meeting,
      systemMessage,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get active meetings in a workspace
 * @route   GET /api/workspaces/:id/meetings/active
 * @access  Private (Workspace Member)
 */
const getActiveMeetings = async (req, res, next) => {
  try {
    const workspaceId = req.params.id;

    const meetings = await Meeting.find({ workspaceId, status: 'ACTIVE' })
      .populate('hostId', 'name email avatar')
      .populate('participants.userId', 'name email avatar')
      .sort({ startedAt: -1 });

    res.status(200).json({
      success: true,
      count: meetings.length,
      meetings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Join meeting
 * @route   POST /api/workspaces/:id/meetings/:meetingId/join
 * @access  Private (Workspace Member)
 */
const joinMeeting = async (req, res, next) => {
  try {
    const { id: workspaceId, meetingId } = req.params;

    const meeting = await Meeting.findOne({ meetingId, workspaceId, status: 'ACTIVE' });
    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Active meeting not found or call has ended',
      });
    }

    // Add user to participants if not already added
    const existingIndex = meeting.participants.findIndex(
      (p) => p.userId.toString() === req.user._id.toString()
    );

    if (existingIndex === -1) {
      meeting.participants.push({
        userId: req.user._id,
        joinedAt: new Date(),
      });
      await meeting.save();
    }

    const updatedMeeting = await Meeting.findById(meeting._id)
      .populate('hostId', 'name email avatar')
      .populate('participants.userId', 'name email avatar');

    res.status(200).json({
      success: true,
      meeting: updatedMeeting,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    End meeting (Host/Owner/Admin)
 * @route   POST /api/workspaces/:id/meetings/:meetingId/end
 * @access  Private (Host or Owner/Admin)
 */
const endMeeting = async (req, res, next) => {
  try {
    const { id: workspaceId, meetingId } = req.params;

    const meeting = await Meeting.findOne({ meetingId, workspaceId });
    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found',
      });
    }

    const isHost = meeting.hostId.toString() === req.user._id.toString();
    const isAdminOrOwner = ['OWNER', 'ADMIN'].includes(req.workspaceMember.role);

    if (!isHost && !isAdminOrOwner) {
      return res.status(403).json({
        success: false,
        message: 'Only the call host or workspace Owner/Admin can end this call',
      });
    }

    meeting.status = 'ENDED';
    meeting.endedAt = new Date();
    await meeting.save();

    if (meeting.channelId) {
      const endMsg = await Message.create({
        channelId: meeting.channelId,
        senderId: req.user._id,
        content: `⏹ Call ended by ${req.user.name}`,
        systemType: 'CALL_END',
        meetingId,
      });

      const populatedEndMsg = await Message.findById(endMsg._id).populate('senderId', 'name email avatar');

      emitToWorkspace(workspaceId, 'chat:message:new', {
        channelId: meeting.channelId,
        message: populatedEndMsg,
      });
    }

    emitToWorkspace(workspaceId, 'call:ended', { meetingId });

    res.status(200).json({
      success: true,
      message: 'Meeting ended successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  startMeeting,
  getActiveMeetings,
  joinMeeting,
  endMeeting,
};
