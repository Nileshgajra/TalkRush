const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema(
  {
    reporterId: {
      type: String,
      required: true,
      index: true,
    },

    reportedUserId: {
      type: String,
      required: true,
      index: true,
    },

    reason: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ['pending', 'reviewed', 'resolved'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

ReportSchema.index({
  reporterId: 1,
  createdAt: -1,
});

ReportSchema.index({
  reportedUserId: 1,
  createdAt: -1,
});

module.exports = mongoose.model(
  'Report',
  ReportSchema
);