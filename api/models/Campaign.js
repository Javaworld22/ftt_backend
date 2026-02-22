const mongoose = require('mongoose');

const CampaignSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Campaign name is required'],
      trim: true,
      maxlength: [200, 'Name cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    goal: {
      type: Number,
      required: [true, 'Goal amount is required'],
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
      enum: ['draft', 'active', 'paused', 'completed', 'cancelled'],
      default: 'draft',
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

// Virtual: populated seasons
CampaignSchema.virtual('seasons', {
  ref: 'Season',
  localField: '_id',
  foreignField: 'campaign',
});

// Virtual: populated cycles
CampaignSchema.virtual('cycles', {
  ref: 'Cycle',
  localField: '_id',
  foreignField: 'campaign',
});

// Text index for full-text search
CampaignSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Campaign', CampaignSchema);
