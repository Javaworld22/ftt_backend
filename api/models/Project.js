const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Project title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      enum: [
        'education',
        'health',
        'environment',
        'humanitarian',
        'community',
        'religion',
        'arts',
        'technology',
        'sports',
        'other',
      ],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [3000, 'Description cannot exceed 3000 characters'],
    },
    goal: {
      type: Number,
      required: [true, 'Fundraising goal is required'],
      min: [1, 'Goal must be greater than 0'],
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
      enum: ['draft', 'active', 'completed', 'cancelled'],
      default: 'draft',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'createdByModel',
    },
    createdByModel: {
      type: String,
      enum: ['ProjectOwner', 'Agent', 'CorporateAgent'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: progress percentage
ProjectSchema.virtual('progressPercent').get(function () {
  if (!this.goal || this.goal === 0) return 0;
  return Math.round((this.totalRaised / this.goal) * 100 * 100) / 100;
});

// Text index for search
ProjectSchema.index({ title: 'text', description: 'text', category: 'text' });

module.exports = mongoose.model('Project', ProjectSchema);
