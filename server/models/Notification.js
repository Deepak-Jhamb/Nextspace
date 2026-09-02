const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    type: {
      type: String,
      enum: ['FILE_UPLOAD', 'FILE_DELETE', 'INVITATION', 'ROLE_CHANGE', 'SYSTEM'],
      default: 'SYSTEM',
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ userId: 1, workspaceId: 1, read: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
