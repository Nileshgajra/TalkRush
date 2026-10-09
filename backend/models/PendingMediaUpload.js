const mongoose = require('mongoose');

const PendingMediaUploadSchema = new mongoose.Schema(
  {
    mediaPath: {
      type: String,
      required: true,
      unique: true,
    },

    userId: {
      type: String,
      required: true,
      index: true,
    },

    chatType: {
      type: String,
      enum: ['friend', 'random'],
      required: true,
    },

    receiverId: {
      type: String,
      required: true,
    },

    mediaType: {
      type: String,
      enum: ['image', 'video'],
      required: true,
    },

    contentType: {
      type: String,
      required: true,
    },

    size: {
      type: Number,
      required: true,
    },

    duration: {
      type: Number,
      default: 0,
    },

    randomSessionId: {
      type: String,
      default: '',
      index: true,
    },

    createdAt: {
      type: Date,
      required: true,
      default: Date.now,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    sessionEndedAt: {
      type: Date,
      default: undefined,
    },

    finalized: {
      type: Boolean,
      default: false,
      index: true,
    },

    finalizing: {
      type: Boolean,
      default: false,
    },

    finalizingUntil: {
      type: Date,
      default: undefined,
    },

    finalizedAt: {
      type: Date,
      default: undefined,
    },

    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: undefined,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  'PendingMediaUpload',
  PendingMediaUploadSchema
);
