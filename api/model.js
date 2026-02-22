const { mongoose } = require("mongoose");
const schema = mongoose.Schema;

const ProjectOwnerSchema = new schema({
  //mongoose.Schema.ObjectI
  fullname: String,
  phoneNumber: String,
  email: { type: String, trim: true, index: true, unique: true, sparse: true },
  organization: String,
  password: String,
  confirmPassword: String,
}, {
  timestamps: true
});

const CampaignSchema = new schema({
  // Campaign Configuration
  name: {
    type: String,
    required: true,
    default: "Naira Donation Campaign"
  },
  description: String,
  // Goals Configuration
  season_goal: {
    type: Number,
    required: true,
    default: 18000000 // 18 million Naira
  },
  cycle_goal: {
    type: Number,
    required: true,
    default: 180000000 // 180 million Naira
  },
  min_donation: {
    type: Number,
    required: true,
    default: 100 // 100 Naira
  },
  seasons_per_cycle: {
    type: Number,
    default: 10
  },

  // Current State
  current_season: {
    type: Number,
    default: 1,
    min: 1
  },
  current_cycle: {
    type: Number,
    default: 1,
    min: 1
  },
  season_total: {
    type: Number,
    default: 0
  },

  all_time_total: {
    type: Number,
    default: 0
  },
  // Status and Metadata
  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'archived'],
    default: 'active'
  },
  // Timestamps
  start_date: {
    type: Date,
    default: Date.now
  },
  current_season_start_date: {
    type: Date,
    default: Date.now
  },
  current_cycle_start_date: {
    type: Date,
    default: Date.now
  },
  // History Tracking
  completed_seasons: [{
    season_number: Number,
    cycle_number: Number,
    total_amount: Number,
    start_date: Date,
    end_date: Date,
    donor_count: Number,
    average_donation: Number
  }],

  // Statistics
  statistics: {
    total_donations: {
      type: Number,
      default: 0
    },
    total_donors: {
      type: Number,
      default: 0
    },
    average_donation_amount: {
      type: Number,
      default: 0
    },
    largest_donation: {
      amount: Number,
      donor_id: mongoose.Schema.Types.ObjectId,
      date: Date
    },
    donation_frequency: {
      daily: Number,
      weekly: Number,
      monthly: Number
    }
  },
})

const DonorSchema = new schema({
  // Personal Information
  first_name: {
    type: String,
    required: true,
    trim: true
  },
  last_name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    trim: true
  },

  // Address Information
  address: {
    street: String,
    city: String,
    state: String,
    country: {
      type: String,
      default: 'Nigeria'
    },
    postal_code: String
  },

  // Donor Preferences
  preferences: {
    receive_receipts: {
      type: Boolean,
      default: true
    },
    receive_updates: {
      type: Boolean,
      default: true
    },
    anonymous_donation: {
      type: Boolean,
      default: false
    },
    preferred_communication: {
      type: String,
      enum: ['email', 'sms', 'both', 'none'],
      default: 'email'
    }
  },


  // Donation Statistics
  donation_stats: {
    total_donated: {
      type: Number,
      default: 0
    },
    donation_count: {
      type: Number,
      default: 0
    },
    first_donation_date: Date,
    last_donation_date: Date,
    average_donation: {
      type: Number,
      default: 0
    },
    largest_donation: {
      amount: Number,
      date: Date,
      campaign_id: mongoose.Schema.Types.ObjectId
    },
    seasons_participated: [Number],
    cycles_participated: [Number]
  },
  // Verification Status
  verification_status: {
    type: String,
    enum: ['unverified', 'email_verified', 'phone_verified', 'fully_verified'],
    default: 'unverified'
  },
  email_verified: {
    type: Boolean,
    default: false
  },
  phone_verified: {
    type: Boolean,
    default: false
  },
  // Security
  verification_token: String,
  verification_token_expires: Date,

  // Metadata
  source: {
    type: String,
    enum: ['web', 'mobile', 'bank_transfer', 'ussd', 'other'],
    default: 'web'
  },
  referral_code: String,
  referred_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Donor'
  },

  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'blocked', 'deleted'],
    default: 'active'
  }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});





const ProjectOwner = mongoose.model("ProjectOwner", ProjectOwnerSchema);

module.exports = {
  ProjectOwner
};