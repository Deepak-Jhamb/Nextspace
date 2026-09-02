const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Channel name is required'],
      lowercase: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['public', 'private'],
      default: 'public',
    },
    description: {
      type: String,
      default: '',
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

channelSchema.index({ workspaceId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Channel', channelSchema);
