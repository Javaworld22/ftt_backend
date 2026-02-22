const mongoose = require('mongoose');

const CycleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Cycle name is required'],
      trim: true,
    },
    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      required: [true, 'Campaign reference is required'],
    },
    cycleNumber: {
      type: Number,
      required: [true, 'Cycle number is required'],
      min: 1,
    },
    goal: {
      type: Number,
      min: [0, 'Goal must be a positive number'],
    },
    totalRaised: {
      type: Number,
      default: 0,
      min: 0,
    },
    donationCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['upcoming', 'active', 'completed'],
      default: 'upcoming',
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

module.exports = mongoose.model('Cycle', CycleSchema);
