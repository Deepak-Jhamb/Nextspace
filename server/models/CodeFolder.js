const mongoose = require('mongoose');

const codeFolderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Folder name is required'],
      trim: true,
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CodeFolder',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

codeFolderSchema.index({ workspaceId: 1, parentId: 1 });

module.exports = mongoose.model('CodeFolder', codeFolderSchema);
