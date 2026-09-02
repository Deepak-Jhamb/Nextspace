const Message = require('../models/Message');
const Channel = require('../models/Channel');
const ChannelReadState = require('../models/ChannelReadState');
const User = require('../models/User');
const { emitToWorkspace } = require('../config/socket');
const { createAndDispatchNotification } = require('./notificationController');

/**
 * @desc    Get paginated messages in a channel
 * @route   GET /api/workspaces/:id/channels/:channelId/messages
 * @access  Private (Workspace Member)
 */
const getMessages = async (req, res, next) => {
  try {
    const { id: workspaceId, channelId } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const channel = await Channel.findOne({ _id: channelId, workspaceId });
    if (!channel) {
      return res.status(404).json({
        success: false,
        message: 'Channel not found in this workspace',
      });
    }

    const totalMessages = await Message.countDocuments({ channelId });
    const messages = await Message.find({ channelId })
      .populate('senderId', 'name email avatar role')
      .populate({
        path: 'replyTo',
        populate: { path: 'senderId', select: 'name email' },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Return messages in chronological order for UI rendering
    const reversed = messages.reverse();

    res.status(200).json({
      success: true,
      count: reversed.length,
      totalMessages,
      page,
      totalPages: Math.ceil(totalMessages / limit),
      messages: reversed,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Post message to channel
 * @route   POST /api/workspaces/:id/channels/:channelId/messages
 * @access  Private (Workspace Member)
 */
const createMessage = async (req, res, next) => {
  try {
    const { id: workspaceId, channelId } = req.params;
    const { content, attachments, replyTo } = req.body;

    if ((!content || !content.trim()) && (!attachments || attachments.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'Message content or attachments are required',
      });
    }

    const channel = await Channel.findOne({ _id: channelId, workspaceId });
    if (!channel) {
      return res.status(404).json({
        success: false,
        message: 'Channel not found in this workspace',
      });
    }

    let message = await Message.create({
      channelId,
      senderId: req.user._id,
      content: content ? content.trim() : '',
      attachments: attachments || [],
      replyTo: replyTo || null,
    });

    message = await Message.findById(message._id)
      .populate('senderId', 'name email avatar role')
      .populate({
        path: 'replyTo',
        populate: { path: 'senderId', select: 'name email' },
      });

    // Update sender's read state automatically
    await ChannelReadState.findOneAndUpdate(
      { channelId, userId: req.user._id },
      { lastReadAt: new Date(), lastReadMessageId: message._id },
      { upsert: true, new: true }
    );

    // Check for @mentions in content and send notifications
    if (content && content.includes('@')) {
      const mentionMatches = content.match(/@([a-zA-Z0-9_]+)/g);
      if (mentionMatches) {
        for (const mention of mentionMatches) {
          const nameQuery = mention.substring(1);
          const mentionedUser = await User.findOne({
            name: { $regex: new RegExp(`^${nameQuery}`, 'i') },
          });
          if (mentionedUser && mentionedUser._id.toString() !== req.user._id.toString()) {
            await createAndDispatchNotification({
              workspaceId,
              type: 'SYSTEM',
              message: `${req.user.name} mentioned you in #${channel.name}: "${content.substring(0, 50)}"`,
              excludeUserId: req.user._id,
            });
          }
        }
      }
    }

    // Broadcast live chat socket event to workspace room
    emitToWorkspace(workspaceId, 'chat:message:new', {
      channelId,
      message,
    });

    res.status(201).json({
      success: true,
      message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Edit own message
 * @route   PATCH /api/workspaces/:id/channels/:channelId/messages/:messageId
 * @access  Private (Message Sender only)
 */
const updateMessage = async (req, res, next) => {
  try {
    const { id: workspaceId, channelId, messageId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Content cannot be empty',
      });
    }

    const message = await Message.findOne({ _id: messageId, channelId });
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    if (message.senderId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You can only edit your own messages.',
      });
    }

    message.content = content.trim();
    message.editedAt = new Date();
    await message.save();

    const updatedMessage = await Message.findById(messageId)
      .populate('senderId', 'name email avatar role')
      .populate({
        path: 'replyTo',
        populate: { path: 'senderId', select: 'name email' },
      });

    emitToWorkspace(workspaceId, 'chat:message:edited', {
      channelId,
      message: updatedMessage,
    });

    res.status(200).json({
      success: true,
      message: updatedMessage,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete message
 * @route   DELETE /api/workspaces/:id/channels/:channelId/messages/:messageId
 * @access  Private (Sender or Workspace Owner/Admin)
 */
const deleteMessage = async (req, res, next) => {
  try {
    const { id: workspaceId, channelId, messageId } = req.params;

    const message = await Message.findOne({ _id: messageId, channelId });
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    const isSender = message.senderId.toString() === req.user._id.toString();
    const isAdminOrOwner = ['OWNER', 'ADMIN'].includes(req.workspaceMember.role);

    if (!isSender && !isAdminOrOwner) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You can only delete your own messages unless you are an Admin/Owner.',
      });
    }

    await Message.findByIdAndDelete(messageId);

    emitToWorkspace(workspaceId, 'chat:message:deleted', {
      channelId,
      messageId,
    });

    res.status(200).json({
      success: true,
      message: 'Message deleted successfully',
      messageId,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark channel messages as read for user
 * @route   POST /api/workspaces/:id/channels/:channelId/read
 * @access  Private (Workspace Member)
 */
const markChannelRead = async (req, res, next) => {
  try {
    const { id: workspaceId, channelId } = req.params;

    const lastMessage = await Message.findOne({ channelId }).sort({ createdAt: -1 });

    const readState = await ChannelReadState.findOneAndUpdate(
      { channelId, userId: req.user._id },
      {
        lastReadAt: new Date(),
        lastReadMessageId: lastMessage ? lastMessage._id : null,
      },
      { upsert: true, new: true }
    );

    emitToWorkspace(workspaceId, 'message:read', {
      channelId,
      userId: req.user._id,
    });

    res.status(200).json({
      success: true,
      message: 'Channel marked as read',
      readState,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMessages,
  createMessage,
  updateMessage,
  deleteMessage,
  markChannelRead,
};
