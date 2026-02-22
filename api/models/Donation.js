const mongoose = require('mongoose');

const DonationSchema = new mongoose.Schema(
  {
    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      required: [true, 'Campaign reference is required'],
    },
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donor',
      required: [true, 'Donor reference is required'],
    },
    season: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Season',
      default: null,
    },
    cycle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cycle',
      default: null,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
      trim: true,
    },
    donationType: {
      type: String,
      enum: ['one-time', 'recurring', 'pledge'],
      default: 'one-time',
    },
    paymentMethod: {
      type: String,
      enum: ['credit_card', 'debit_card', 'bank_transfer', 'cash', 'check', 'paypal', 'other'],
      required: [true, 'Payment method is required'],
    },
    transactionId: {
      type: String,
      trim: true,
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled'],
      default: 'pending',
    },
    donationDate: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
      default: null,
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    receiptSent: {
      type: Boolean,
      default: false,
    },
    receiptSentDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Post-save hook: update totals on Campaign, Donor, Season, Cycle ──────────
async function recalculateTotals(donation) {
  const Campaign = mongoose.model('Campaign');
  const Donor = mongoose.model('Donor');
  const Season = mongoose.model('Season');
  const Cycle = mongoose.model('Cycle');

  const isCompleted = donation.status === 'completed';

  // Recalculate Campaign totals
  if (donation.campaign) {
    const result = await mongoose.model('Donation').aggregate([
      { $match: { campaign: donation.campaign, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);
    const stats = result[0] || { total: 0, count: 0 };
    await Campaign.findByIdAndUpdate(donation.campaign, {
      totalRaised: stats.total,
      donationCount: stats.count,
    });
  }

  // Recalculate Donor totals
  if (donation.donor) {
    const result = await mongoose.model('Donation').aggregate([
      { $match: { donor: donation.donor, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);
    const stats = result[0] || { total: 0, count: 0 };
    await Donor.findByIdAndUpdate(donation.donor, {
      totalDonated: stats.total,
      donationCount: stats.count,
    });
  }

  // Recalculate Season totals
  if (donation.season) {
    const result = await mongoose.model('Donation').aggregate([
      { $match: { season: donation.season, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);
    const stats = result[0] || { total: 0, count: 0 };
    await Season.findByIdAndUpdate(donation.season, {
      totalRaised: stats.total,
      donationCount: stats.count,
    });
  }

  // Recalculate Cycle totals
  if (donation.cycle) {
    const result = await mongoose.model('Donation').aggregate([
      { $match: { cycle: donation.cycle, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);
    const stats = result[0] || { total: 0, count: 0 };
    await Cycle.findByIdAndUpdate(donation.cycle, {
      totalRaised: stats.total,
      donationCount: stats.count,
    });
  }
}

DonationSchema.post('save', async function () {
  await recalculateTotals(this);
});

DonationSchema.post('findOneAndDelete', async function (doc) {
  if (doc) await recalculateTotals(doc);
});

module.exports = mongoose.model('Donation', DonationSchema);
