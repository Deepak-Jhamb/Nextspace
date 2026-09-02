const Channel = require('../models/Channel');
const Message = require('../models/Message');
const ChannelReadState = require('../models/ChannelReadState');
const { emitToWorkspace } = require('../config/socket');

/**
 * Auto-ensure #general channel exists for workspace
 */
const ensureGeneralChannel = async (workspaceId, userId) => {
  let general = await Channel.findOne({ workspaceId, name: 'general' });
  if (!general) {
    general = await Channel.create({
      workspaceId,
      name: 'general',
      type: 'public',
      description: 'General discussion channel for all team members',
      createdBy: userId,
    });
  }
  return general;
};

/**
 * @desc    Get all channels in a workspace with unread indicators
 * @route   GET /api/workspaces/:id/channels
 * @access  Private (Workspace Member)
 */
const getChannels = async (req, res, next) => {
  try {
    const workspaceId = req.params.id;
    const userId = req.user._id;

    // Ensure general channel exists
    await ensureGeneralChannel(workspaceId, userId);

    const channels = await Channel.find({ workspaceId }).sort({ name: 1 });

    // Fetch read states for current user
    const readStates = await ChannelReadState.find({
      userId,
      channelId: { $in: channels.map((c) => c._id) },
    });

    const readStateMap = new Map();
    readStates.forEach((rs) => readStateMap.set(rs.channelId.toString(), rs.lastReadAt));

    // Calculate unread count per channel
    const channelsWithUnread = await Promise.all(
      channels.map(async (c) => {
        const lastRead = readStateMap.get(c._id.toString()) || new Date(0);
        const unreadCount = await Message.countDocuments({
          channelId: c._id,
          createdAt: { $gt: lastRead },
          senderId: { $ne: userId },
        });

        return {
          ...c.toObject(),
          unreadCount,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: channelsWithUnread.length,
      channels: channelsWithUnread,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new channel in workspace
 * @route   POST /api/workspaces/:id/channels
 * @access  Private (Workspace Member)
 */
const createChannel = async (req, res, next) => {
  try {
    const workspaceId = req.params.id;
    const { name, type, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Channel name is required',
      });
    }

    const sanitizedName = name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    const existing = await Channel.findOne({ workspaceId, name: sanitizedName });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Channel #${sanitizedName} already exists in this workspace`,
      });
    }

    const channel = await Channel.create({
      workspaceId,
      name: sanitizedName,
      type: type === 'private' ? 'private' : 'public',
      description: description ? description.trim() : '',
      createdBy: req.user._id,
      members: [req.user._id],
    });

    emitToWorkspace(workspaceId, 'channel:created', { channel });

    res.status(201).json({
      success: true,
      message: `Channel #${sanitizedName} created successfully`,
      channel,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete channel
 * @route   DELETE /api/workspaces/:id/channels/:channelId
 * @access  Private (Workspace Member / Owner / Admin / Creator)
 */
const deleteChannel = async (req, res, next) => {
  try {
    const { id: workspaceId, channelId } = req.params;

    const channel = await Channel.findOne({ _id: channelId, workspaceId });
    if (!channel) {
      return res.status(404).json({
        success: false,
        message: 'Channel not found in this workspace',
      });
    }

    if (channel.name === 'general') {
      return res.status(400).json({
        success: false,
        message: 'The #general channel cannot be deleted',
      });
    }

    const isCreator = channel.createdBy.toString() === req.user._id.toString();
    const isAdminOrOwner = ['OWNER', 'ADMIN'].includes(req.workspaceMember.role);

    if (!isCreator && !isAdminOrOwner) {
      return res.status(403).json({
        success: false,
        message: 'Only the channel creator or a workspace Owner/Admin can delete this channel',
      });
    }

    await Channel.findByIdAndDelete(channelId);
    await Message.deleteMany({ channelId });
    await ChannelReadState.deleteMany({ channelId });

    emitToWorkspace(workspaceId, 'channel:deleted', { channelId });

    res.status(200).json({
      success: true,
      message: `Channel #${channel.name} deleted successfully`,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getChannels,
  createChannel,
  deleteChannel,
  ensureGeneralChannel,
};
