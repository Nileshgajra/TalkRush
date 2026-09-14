const mongoose = require('mongoose');

const FriendRequestSchema = new mongoose.Schema(
  {
    fromUserId: {
      type: String,
      required: true,
      index: true,
    },

    toUserId: {
      type: String,
      required: true,
      index: true,
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

FriendRequestSchema.index({
  fromUserId: 1,
  toUserId: 1,
});

module.exports = mongoose.model(
  'FriendRequest',
  FriendRequestSchema
);