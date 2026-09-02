const mongoose = require('mongoose');

const channelReadStateSchema = new mongoose.Schema(
  {
    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Channel',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lastReadAt: {
      type: Date,
      default: Date.now,
    },
    lastReadMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

channelReadStateSchema.index({ channelId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('ChannelReadState', channelReadStateSchema);
