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
