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
      required: true,
      trim: true,
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