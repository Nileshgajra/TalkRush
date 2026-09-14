const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    age: {
      type: Number,
      required: true,
    },

    gender: {
      type: String,
      required: true,
      enum: ['Male', 'Female'],
    },

    pushToken: {
      type: String,
      default: '',
    },

    // =========================
    // FRIENDS
    // =========================

    friends: [
      {
        type: String,
      },
    ],

    blockedUsers: [
  {
    type: String,
     },
    ],

    // =========================
    // FRIEND REQUESTS
    // =========================

    friendRequests: [
      {
        from: {
          type: String,
          required: true,
        },

        status: {
          type: String,
          enum: ['pending', 'accepted', 'rejected'],
          default: 'pending',
        },
      },
    ],

    // =========================
    // BLOCKED USERS
    // =========================

    blockedUsers: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('User', UserSchema);
