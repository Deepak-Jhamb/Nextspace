const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Channel',
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      default: '',
    },
    attachments: [
      {
        name: String,
        size: Number,
        mimeType: String,
        url: String,
        supabasePath: String,
      },
    ],
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    systemType: {
      type: String,
      enum: [null, 'CALL_START', 'CALL_END', 'SYSTEM'],
      default: null,
    },
    meetingId: {
      type: String,
      default: null,
    },
    editedAt: {
      type: Date,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ channelId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
