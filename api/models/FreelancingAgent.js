const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const FreelancingAgentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    houseAddress: {
      type: String,
      required: [true, 'House address is required'],
      trim: true,
    },
    workAddress: {
      type: String,
      required: false,
      trim: true,
      default: '',
    },
    profession: {
      type: String,
      required: [true, 'Profession is required'],
      trim: true,
      maxlength: [100, 'Profession cannot exceed 100 characters'],
    },
    skills: [{
      type: String,
      trim: true,
    }],
    experience: {
      type: String,
      required: [true, 'Experience level is required'],
      enum: ['Entry Level', 'Mid Level', 'Senior Level', 'Expert'],
      default: 'Entry Level',
    },
    nin: {
      type: String,
      required: [true, 'NIN is required'],
      unique: true,
      trim: true,
      match: [/^\d{11}$/, 'NIN must be exactly 11 digits'],
    },
    bvn: {
      type: String,
      required: false,
      trim: true,
      match: [/^\d{11}$/, 'BVN must be exactly 11 digits'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Hash password before saving
FreelancingAgentSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Instance method to compare passwords
FreelancingAgentSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('FreelancingAgent', FreelancingAgentSchema);