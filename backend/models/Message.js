const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema(
  {
    senderId: {
      type: String,
      required: true,
      index: true,
    },

    receiverId: {
      type: String,
      required: true,
      index: true,
    },

    text: {
      type: String,
      default: '',
      trim: true,
    },

    mediaType: {
      type: String,
      enum: ['image', 'video'],
      default: undefined,
    },

    // Storage object key only. Download URLs are generated server-side for
    // authorized chat delivery and are never persisted in MongoDB.
    mediaPath: {
      type: String,
      default: '',
    },

    // Retention fields are optional so pre-retention messages remain readable.
    mediaRetention: {
      type: String,
      enum: ['friend', 'random'],
      default: undefined,
      index: true,
    },

    randomSessionId: {
      type: String,
      default: '',
      index: true,
    },

    // A renewable lease lets cleanup identify random sessions abandoned by a
    // process restart without expiring media from a live pairing.
    randomSessionExpiresAt: {
      type: Date,
      default: undefined,
      index: true,
    },

    randomSessionEnded: {
      type: Boolean,
      default: false,
    },

    mediaDeleted: {
      type: Boolean,
      default: false,
    },

    mediaDeleting: {
      type: Boolean,
      default: false,
    },

    mediaContentType: {
      type: String,
      default: '',
    },

    mediaSize: {
      type: Number,
      default: 0,
    },

    mediaDuration: {
      type: Number,
      default: 0,
    },

    seen: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

MessageSchema.index({
  senderId: 1,
  receiverId: 1,
  createdAt: 1,
});

module.exports = mongoose.model(
  'Message',
  MessageSchema
);
