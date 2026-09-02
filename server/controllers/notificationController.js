const Notification = require('../models/Notification');
const WorkspaceMember = require('../models/WorkspaceMember');
const { emitToWorkspace } = require('../config/socket');

/**
 * Helper: Creates notification documents for target users and emits real-time Socket.IO event
 */
const createAndDispatchNotification = async ({ workspaceId, type, message, excludeUserId = null }) => {
  try {
    // Find workspace members
    const members = await WorkspaceMember.find({ workspaceId });
    const targetUserIds = members
      .map((m) => m.userId.toString())
      .filter((id) => !excludeUserId || id !== excludeUserId.toString());

    if (targetUserIds.length === 0) return;

    // Create notification documents for all target users
    const notificationsToCreate = targetUserIds.map((userId) => ({
      userId,
      workspaceId,
      type,
      message,
      read: false,
    }));

    const createdDocs = await Notification.insertMany(notificationsToCreate);

    // Emit Socket.IO event to workspace room
    emitToWorkspace(workspaceId, 'notification:new', {
      workspaceId,
      type,
      message,
      createdAt: new Date(),
    });

    return createdDocs;
  } catch (error) {
    console.error('[Notification Dispatch Error]:', error.message);
  }
};

/**
 * @desc    Get user notifications
 * @route   GET /api/notifications
 * @access  Private
 */
const getNotifications = async (req, res, next) => {
  try {
    const { workspaceId } = req.query;

    let filter = { userId: req.user._id };
    if (workspaceId) {
      filter.workspaceId = workspaceId;
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      userId: req.user._id,
      read: false,
      ...(workspaceId && { workspaceId }),
    });

    res.status(200).json({
      success: true,
      unreadCount,
      count: notifications.length,
      notifications,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark single notification as read
 * @route   PATCH /api/notifications/:id/read
 * @access  Private
 */
const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    notification.read = true;
    await notification.save();

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      notification,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark all notifications as read for user
 * @route   PATCH /api/notifications/read-all
 * @access  Private
 */
const markAllAsRead = async (req, res, next) => {
  try {
    const { workspaceId } = req.body;

    let filter = { userId: req.user._id, read: false };
    if (workspaceId) {
      filter.workspaceId = workspaceId;
    }

    await Notification.updateMany(filter, { read: true });

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAndDispatchNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
};
