const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const CorporateAgentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Corporate name is required'],
      trim: true,
      maxlength: [150, 'Name cannot exceed 150 characters'],
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
    officeAddress: {
      type: String,
      required: [true, 'Office address is required'],
      trim: true,
    },
    cac: {
      type: String,
      required: [true, 'CAC registration number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    nin: {
      type: String,
      required: [true, 'NIN is required'],
      unique: true,
      trim: true,
      match: [/^\d{11}$/, 'NIN must be exactly 11 digits'],
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
CorporateAgentSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Instance method to compare passwords
CorporateAgentSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('CorporateAgent', CorporateAgentSchema);
