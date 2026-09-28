const mongoose = require('mongoose');

const codeFileSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'File name is required'],
      trim: true,
    },
    content: {
      type: String,
      default: '',
    },
    language: {
      type: String,
      default: 'javascript',
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    folderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CodeFolder',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

codeFileSchema.index({ workspaceId: 1, folderId: 1 });

module.exports = mongoose.model('CodeFile', codeFileSchema);
