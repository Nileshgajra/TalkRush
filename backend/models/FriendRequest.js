const mongoose = require('mongoose');

const FriendRequestSchema = new mongoose.Schema(
  {
    fromUserId: {
      type: String,
      required: true,
    },

    toUserId: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  'FriendRequest',
  FriendRequestSchema
);