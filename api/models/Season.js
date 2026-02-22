const mongoose = require('mongoose');

const SeasonSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Season name is required'],
      trim: true,
    },
    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      required: [true, 'Campaign reference is required'],
    },
    description: {
      type: String,
      trim: true,
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
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

module.exports = mongoose.model('Season', SeasonSchema);
