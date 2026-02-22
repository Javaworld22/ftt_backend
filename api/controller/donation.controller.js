
/**
 * ============================================================================
 * DONATION CONTROLLER
 * ============================================================================
 *
 * This controller handles all donation-related operations including:
 * - CRUD operations (Create, Read, Update, Delete)
 * - Donation processing and status management
 * - Comprehensive analytics and reporting
 * - Payment processing integration points
 * - Receipt generation triggers
 * - Automatic total calculations
 *
 * @module controllers/donationController
 * @requires models/Donation
 * @requires models/Campaign
 * @requires models/Donor
 * @requires models/Season
 * @requires models/Cycle
 * @requires express-validator
 */

const Donation = require('../models/Donation');
const Campaign = require('../models/Campaign');
const Donor = require('../models/Donor');
const Season = require('../models/Season');
const Cycle = require('../models/Cycle');
const { validationResult } = require('express-validator');

// ============================================================================
// DONATION RETRIEVAL OPERATIONS
// ============================================================================

/**
 * Get all donations with advanced filtering and population
 *
 * @route GET /api/donations
 * @access Public
 *
 * @queryparam {string} campaign - Filter by campaign ID
 * @queryparam {string} donor - Filter by donor ID
 * @queryparam {string} season - Filter by season ID
 * @queryparam {string} cycle - Filter by cycle ID
 * @queryparam {string} status - Filter by donation status
 * @queryparam {string} donationType - Filter by type (one-time, recurring, pledge)
 * @queryparam {string} paymentMethod - Filter by payment method
 * @queryparam {number} minAmount - Minimum donation amount
 * @queryparam {number} maxAmount - Maximum donation amount
 * @queryparam {string} startDate - Filter donations from this date
 * @queryparam {string} endDate - Filter donations until this date
 * @queryparam {boolean} isAnonymous - Filter anonymous donations
 * @queryparam {boolean} receiptSent - Filter by receipt status
 * @queryparam {number} page - Page number (default: 1)
 * @queryparam {number} limit - Items per page (default: 10, max: 100)
 * @queryparam {string} sort - Sort field (default: '-donationDate')
 *
 * @returns {Object} JSON response with donations array and pagination
 *
 * @example
 * GET /api/donations?campaign=xyz&status=completed&page=1&limit=20
 * GET /api/donations?donor=abc&startDate=2024-01-01&endDate=2024-12-31
 */
exports.getAllDonations = async (req, res) => {
  try {
    const {
      campaign,
      donor,
      season,
      cycle,
      status,
      donationType,
      paymentMethod,
      minAmount,
      maxAmount,
      startDate,
      endDate,
      isAnonymous,
      receiptSent,
      page = 1,
      limit = 10,
      sort = '-donationDate'
    } = req.query;

    // Validate and sanitize pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    // Build query object
    const query = {};

    // Reference filters
    if (campaign) query.campaign = campaign;
    if (donor) query.donor = donor;
    if (season) query.season = season;
    if (cycle) query.cycle = cycle;

    // Status and type filters
    if (status) {
      const validStatuses = ['pending', 'completed', 'failed', 'refunded', 'cancelled'];
      if (validStatuses.includes(status)) {
        query.status = status;
      }
    }

    if (donationType) {
      const validTypes = ['one-time', 'recurring', 'pledge'];
      if (validTypes.includes(donationType)) {
        query.donationType = donationType;
      }
    }

    if (paymentMethod) {
      const validMethods = ['credit_card', 'debit_card', 'bank_transfer', 'cash', 'check', 'paypal', 'other'];
      if (validMethods.includes(paymentMethod)) {
        query.paymentMethod = paymentMethod;
      }
    }

    // Amount range filter
    if (minAmount || maxAmount) {
      query.amount = {};
      if (minAmount) query.amount.$gte = parseFloat(minAmount);
      if (maxAmount) query.amount.$lte = parseFloat(maxAmount);
    }

    // Date range filter
    if (startDate || endDate) {
      query.donationDate = {};
      if (startDate) query.donationDate.$gte = new Date(startDate);
      if (endDate) query.donationDate.$lte = new Date(endDate);
    }

    // Boolean filters
    if (isAnonymous !== undefined) {
      query.isAnonymous = isAnonymous === 'true';
    }

    if (receiptSent !== undefined) {
      query.receiptSent = receiptSent === 'true';
    }

    // Execute query with full population
    const donations = await Donation.find(query)
      .populate('campaign', 'name status goal totalRaised')
      .populate('donor', 'firstName lastName email donorType isActive')
      .populate('season', 'name startDate endDate')
      .populate('cycle', 'name cycleNumber startDate endDate')
      .sort(sort)
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum)
      .lean()
      .exec();

    // Get total count
    const count = await Donation.countDocuments(query);

    // Calculate aggregate statistics for filtered donations
    const aggregateStats = await Donation.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          avgAmount: { $avg: '$amount' },
          maxAmount: { $max: '$amount' },
          minAmount: { $min: '$amount' },
          completedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          pendingCount: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          }
        }
      }
    ]);

    const stats = aggregateStats[0] || {
      totalAmount: 0,
      avgAmount: 0,
      maxAmount: 0,
      minAmount: 0,
      completedCount: 0,
      pendingCount: 0
    };

    // Pagination metadata
    const totalPages = Math.ceil(count / limitNum);

    res.json({
      success: true,
      data: donations,
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        pages: totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
        nextPage: pageNum < totalPages ? pageNum + 1 : null,
        prevPage: pageNum > 1 ? pageNum - 1 : null
      },
      filters: {
        campaign: campaign || null,
        donor: donor || null,
        season: season || null,
        cycle: cycle || null,
        status: status || 'all',
        donationType: donationType || 'all',
        paymentMethod: paymentMethod || 'all',
        dateRange: {
          start: startDate || null,
          end: endDate || null
        },
        sort
      },
      aggregateStats: {
        totalAmount: Math.round(stats.totalAmount * 100) / 100,
        avgAmount: Math.round(stats.avgAmount * 100) / 100,
        maxAmount: stats.maxAmount,
        minAmount: stats.minAmount,
        completedCount: stats.completedCount,
        pendingCount: stats.pendingCount,
        completionRate: count > 0
          ? Math.round((stats.completedCount / count) * 100 * 100) / 100
          : 0
      }
    });
  } catch (error) {
    console.error('Error in getAllDonations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve donations',
      message: error.message
    });
  }
};

/**
 * Get a single donation by ID with complete details
 *
 * @route GET /api/donations/:id
 * @access Public
 *
 * @param {string} id - Donation MongoDB ObjectId
 *
 * @returns {Object} JSON response with full donation details including:
 *   - All donation fields
 *   - Populated campaign with progress
 *   - Populated donor with giving history summary
 *   - Populated season and cycle
 *   - Related donations (same donor, same campaign)
 *   - Payment processing details
 *
 * @throws {404} Donation not found
 * @throws {400} Invalid donation ID format
 *
 * @example
 * GET /api/donations/507f1f77bcf86cd799439011
 */
exports.getDonation = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid donation ID format'
      });
    }

    // Find donation with full population
    const donation = await Donation.findById(id)
      .populate({
        path: 'campaign',
        select: 'name description goal totalRaised status startDate endDate'
      })
      .populate({
        path: 'donor',
        select: 'firstName lastName email phone donorType totalDonated donationCount isActive'
      })
      .populate({
        path: 'season',
        select: 'name startDate endDate goal totalRaised status'
      })
      .populate({
        path: 'cycle',
        select: 'name cycleNumber startDate endDate goal totalRaised status'
      })
      .lean();

    if (!donation) {
      return res.status(404).json({
        success: false,
        error: 'Donation not found',
        requestedId: id
      });
    }

    // Get donor's other donations to same campaign
    const relatedDonations = await Donation.find({
      donor: donation.donor._id,
      campaign: donation.campaign._id,
      _id: { $ne: donation._id },
      status: 'completed'
    })
      .select('amount donationDate status')
      .sort('-donationDate')
      .limit(5)
      .lean();

    // Calculate campaign progress at time of donation
    const campaignProgressAtDonation = donation.campaign.goal > 0
      ? Math.round(((donation.campaign.totalRaised - donation.amount) / donation.campaign.goal) * 100 * 100) / 100
      : 0;

    const campaignCurrentProgress = donation.campaign.goal > 0
      ? Math.round((donation.campaign.totalRaised / donation.campaign.goal) * 100 * 100) / 100
      : 0;

    // Calculate donation impact
    const donationImpact = donation.campaign.totalRaised > 0
      ? Math.round((donation.amount / donation.campaign.totalRaised) * 100 * 100) / 100
      : 0;

    // Days since donation
    const daysSinceDonation = Math.floor(
      (new Date() - new Date(donation.donationDate)) / (1000 * 60 * 60 * 24)
    );

    // Enriched donation object
    const enrichedDonation = {
      ...donation,
      analysis: {
        daysSinceDonation,
        donationImpact: `${donationImpact}% of campaign total`,
        campaignProgressBefore: `${campaignProgressAtDonation}%`,
        campaignProgressAfter: `${campaignCurrentProgress}%`,
        progressContribution: `+${Math.round((donation.amount / donation.campaign.goal) * 100 * 100) / 100}%`,
        donorGivingPattern: {
          totalToCampaign: relatedDonations.reduce((sum, d) => sum + d.amount, 0) + donation.amount,
          donationsToCampaign: relatedDonations.length + 1,
          averageDonationToCampaign: relatedDonations.length > 0
            ? Math.round(((relatedDonations.reduce((sum, d) => sum + d.amount, 0) + donation.amount) / (relatedDonations.length + 1)) * 100) / 100
            : donation.amount
        }
      },
      relatedDonations: relatedDonations.map(d => ({
        amount: d.amount,
        date: d.donationDate,
        status: d.status
      })),
      paymentStatus: {
        status: donation.status,
        transactionId: donation.transactionId || null,
        paymentMethod: donation.paymentMethod,
        receiptStatus: donation.receiptSent ? 'sent' : 'pending',
        receiptSentDate: donation.receiptSentDate || null
      }
    };

    res.json({
      success: true,
      data: enrichedDonation
    });
  } catch (error) {
    console.error('Error in getDonation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve donation',
      message: error.message
    });
  }
};

// ============================================================================
// DONATION CREATION AND MODIFICATION
// ============================================================================

/**
 * Create a new donation with validation and relationship verification
 *
 * @route POST /api/donations
 * @access Public
 *
 * @bodyparam {string} campaign - Campaign ID (required)
 * @bodyparam {string} donor - Donor ID (required)
 * @bodyparam {string} season - Season ID (optional)
 * @bodyparam {string} cycle - Cycle ID (optional)
 * @bodyparam {number} amount - Donation amount (required, min: 0.01)
 * @bodyparam {string} currency - Currency code (default: USD)
 * @bodyparam {string} donationType - Type: one-time, recurring, pledge
 * @bodyparam {string} paymentMethod - Payment method (required)
 * @bodyparam {string} transactionId - External transaction ID (optional)
 * @bodyparam {string} status - Status (default: pending)
 * @bodyparam {Date} donationDate - Date of donation (default: now)
 * @bodyparam {string} notes - Additional notes (optional)
 * @bodyparam {boolean} isAnonymous - Anonymous donation flag (default: false)
 *
 * @returns {Object} JSON response with created donation
 *
 * @throws {400} Validation errors
 * @throws {404} Campaign or Donor not found
 * @throws {409} Season/Cycle doesn't belong to campaign
 *
 * @example
 * POST /api/donations
 * {
 *   "campaign": "507f1f77bcf86cd799439011",
 *   "donor": "507f1f77bcf86cd799439012",
 *   "amount": 500.00,
 *   "paymentMethod": "credit_card",
 *   "donationType": "one-time"
 * }
 */
exports.createDonation = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors: errors.array().map(err => ({
          field: err.path,
          message: err.msg,
          value: err.value
        }))
      });
    }

    const {
      campaign,
      donor,
      season,
      cycle,
      amount,
      currency,
      donationType,
      paymentMethod,
      transactionId,
      status,
      donationDate,
      notes,
      isAnonymous
    } = req.body;

    // Verify campaign exists and is active
    const campaignDoc = await Campaign.findById(campaign);
    if (!campaignDoc) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
        campaignId: campaign
      });
    }

    if (campaignDoc.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'Cannot create donation for cancelled campaign',
        campaign: {
          id: campaignDoc._id,
          name: campaignDoc.name,
          status: campaignDoc.status
        }
      });
    }

    // Verify donor exists and is active
    const donorDoc = await Donor.findById(donor);
    if (!donorDoc) {
      return res.status(404).json({
        success: false,
        error: 'Donor not found',
        donorId: donor
      });
    }

    if (!donorDoc.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Cannot create donation for inactive donor',
        donor: {
          id: donorDoc._id,
          fullName: donorDoc.fullName,
          isActive: donorDoc.isActive
        },
        suggestion: 'Reactivate the donor first'
      });
    }

    // Verify season belongs to campaign (if provided)
    if (season) {
      const seasonDoc = await Season.findById(season);
      if (!seasonDoc) {
        return res.status(404).json({
          success: false,
          error: 'Season not found',
          seasonId: season
        });
      }

      if (seasonDoc.campaign.toString() !== campaign) {
        return res.status(409).json({
          success: false,
          error: 'Season does not belong to the specified campaign',
          season: {
            id: seasonDoc._id,
            name: seasonDoc.name,
            campaign: seasonDoc.campaign
          },
          requestedCampaign: campaign
        });
      }
    }

    // Verify cycle belongs to campaign (if provided)
    if (cycle) {
      const cycleDoc = await Cycle.findById(cycle);
      if (!cycleDoc) {
        return res.status(404).json({
          success: false,
          error: 'Cycle not found',
          cycleId: cycle
        });
      }

      if (cycleDoc.campaign.toString() !== campaign) {
        return res.status(409).json({
          success: false,
          error: 'Cycle does not belong to the specified campaign',
          cycle: {
            id: cycleDoc._id,
            name: cycleDoc.name,
            cycleNumber: cycleDoc.cycleNumber,
            campaign: cycleDoc.campaign
          },
          requestedCampaign: campaign
        });
      }
    }

    // Validate donation amount is reasonable
    const warnings = [];
    if (amount > 100000) {
      warnings.push('Large donation amount detected - verify before processing');
    }

    if (amount < 1 && paymentMethod !== 'cash') {
      warnings.push('Small donation amount - processing fees may exceed donation value');
    }

    // Create donation
    const donation = await Donation.create({
      campaign,
      donor,
      season: season || undefined,
      cycle: cycle || undefined,
      amount: parseFloat(amount),
      currency: currency || 'USD',
      donationType: donationType || 'one-time',
      paymentMethod,
      transactionId: transactionId || undefined,
      status: status || 'pending',
      donationDate: donationDate || new Date(),
      notes: notes || undefined,
      isAnonymous: isAnonymous || false,
      receiptSent: false
    });

    // Populate references for response
    await donation.populate([
      { path: 'campaign', select: 'name goal totalRaised' },
      { path: 'donor', select: 'firstName lastName email' },
      { path: 'season', select: 'name' },
      { path: 'cycle', select: 'name cycleNumber' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Donation created successfully',
      data: donation,
      metadata: {
        createdAt: donation.createdAt,
        needsProcessing: donation.status === 'pending',
        receiptRequired: !donation.isAnonymous && donation.status === 'completed',
        campaignProgress: campaignDoc.goal > 0
          ? Math.round((campaignDoc.totalRaised / campaignDoc.goal) * 100 * 100) / 100
          : 0
      },
      warnings: warnings.length > 0 ? warnings : undefined,
      nextSteps: donation.status === 'pending' ? [
        'Process payment',
        'Update status to completed',
        'Send receipt to donor'
      ] : donation.status === 'completed' ? [
        'Send thank you email',
        'Update donor acknowledgment'
      ] : []
    });
  } catch (error) {
    console.error('Error in createDonation:', error);

    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors: validationErrors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create donation',
      message: error.message
    });
  }
};

// Update donation
exports.updateDonation = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const donation = await Donation.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate([
      { path: 'campaign', select: 'name' },
      { path: 'donor', select: 'firstName lastName email' },
      { path: 'season', select: 'name' },
      { path: 'cycle', select: 'name' }
    ]);

    if (!donation) {
      return res.status(404).json({
        success: false,
        error: 'Donation not found'
      });
    }

    res.json({
      success: true,
      data: donation
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Delete donation
exports.deleteDonation = async (req, res) => {
  try {
    const donation = await Donation.findByIdAndDelete(req.params.id);

    if (!donation) {
      return res.status(404).json({
        success: false,
        error: 'Donation not found'
      });
    }

    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Process donation (update status to completed)
exports.processDonation = async (req, res) => {
  try {
    const { transactionId } = req.body;

    const donation = await Donation.findByIdAndUpdate(
      req.params.id,
      {
        status: 'completed',
        transactionId: transactionId || undefined
      },
      {
        new: true,
        runValidators: true
      }
    ).populate([
      { path: 'campaign', select: 'name' },
      { path: 'donor', select: 'firstName lastName email' }
    ]);

    if (!donation) {
      return res.status(404).json({
        success: false,
        error: 'Donation not found'
      });
    }

    res.json({
      success: true,
      message: 'Donation processed successfully',
      data: donation
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Get donation analytics
exports.getDonationAnalytics = async (req, res) => {
  try {
    const { campaign, startDate, endDate } = req.query;

    const matchQuery = { status: 'completed' };
    if (campaign) matchQuery.campaign = campaign;
    if (startDate || endDate) {
      matchQuery.donationDate = {};
      if (startDate) matchQuery.donationDate.$gte = new Date(startDate);
      if (endDate) matchQuery.donationDate.$lte = new Date(endDate);
    }

    const analytics = await Donation.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
          avgDonation: { $avg: '$amount' },
          maxDonation: { $max: '$amount' },
          minDonation: { $min: '$amount' }
        }
      }
    ]);

    // Donations by payment method
    const byPaymentMethod = await Donation.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { total: -1 } }
    ]);

    // Donations by type
    const byType = await Donation.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$donationType',
          count: { $sum: 1 },
          total: { $sum: '$amount' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        summary: analytics[0] || {
          totalAmount: 0,
          count: 0,
          avgDonation: 0,
          maxDonation: 0,
          minDonation: 0
        },
        byPaymentMethod,
        byType
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Update an existing donation
 *
 * @route PUT /api/donations/:id
 * @access Admin
 */
exports.updateDonation = async (req, res) => {
  try {
    const { id } = req.params;
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors: errors.array().map(err => ({
          field: err.path,
          message: err.msg
        }))
      });
    }

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid donation ID format'
      });
    }

    const existingDonation = await Donation.findById(id);
    if (!existingDonation) {
      return res.status(404).json({
        success: false,
        error: 'Donation not found',
        requestedId: id
      });
    }

    const warnings = [];

    // Warn if changing status from completed
    if (existingDonation.status === 'completed' && req.body.status && req.body.status !== 'completed') {
      warnings.push('Changing status from completed may affect totals - verify this is intentional');
    }

    // Warn if changing amount on completed donation
    if (existingDonation.status === 'completed' && req.body.amount && req.body.amount !== existingDonation.amount) {
      warnings.push('Changing amount on completed donation will trigger total recalculation');
    }

    const updatedFields = Object.keys(req.body);

    const donation = await Donation.findByIdAndUpdate(
      id,
      req.body,
      {
        new: true,
        runValidators: true,
        context: 'query'
      }
    ).populate([
      { path: 'campaign', select: 'name goal totalRaised' },
      { path: 'donor', select: 'firstName lastName email' },
      { path: 'season', select: 'name' },
      { path: 'cycle', select: 'name cycleNumber' }
    ]);

    res.json({
      success: true,
      message: 'Donation updated successfully',
      data: donation,
      metadata: {
        updatedFields,
        updatedAt: donation.updatedAt,
        previousStatus: existingDonation.status,
        currentStatus: donation.status
      },
      warnings: warnings.length > 0 ? warnings : undefined
    });
  } catch (error) {
    console.error('Error in updateDonation:', error);

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors: validationErrors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update donation',
      message: error.message
    });
  }
};

/**
 * Delete a donation
 *
 * @route DELETE /api/donations/:id
 * @access Admin
 */
exports.deleteDonation = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid donation ID format'
      });
    }

    const donation = await Donation.findById(id);

    if (!donation) {
      return res.status(404).json({
        success: false,
        error: 'Donation not found',
        requestedId: id
      });
    }

    const warnings = [];

    if (donation.status === 'completed') {
      warnings.push('Deleting a completed donation will affect campaign and donor totals');
    }

    if (donation.receiptSent) {
      warnings.push('Receipt was already sent to donor for this donation');
    }

    const deletedInfo = {
      id: donation._id,
      amount: donation.amount,
      donor: donation.donor,
      campaign: donation.campaign,
      status: donation.status,
      donationDate: donation.donationDate
    };

    await Donation.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Donation deleted successfully',
      deletedDonation: deletedInfo,
      warnings: warnings.length > 0 ? warnings : undefined,
      note: 'Totals will be recalculated automatically'
    });
  } catch (error) {
    console.error('Error in deleteDonation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete donation',
      message: error.message
    });
  }
};

// ============================================================================
// DONATION PROCESSING
// ============================================================================

/**
 * Process a donation - mark as completed
 * This triggers automatic total updates across all related entities
 *
 * @route PATCH /api/donations/:id/process
 * @access Admin
 */
exports.processDonation = async (req, res) => {
  try {
    const { id } = req.params;
    const { transactionId, notes } = req.body;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid donation ID format'
      });
    }

    const donation = await Donation.findById(id);

    if (!donation) {
      return res.status(404).json({
        success: false,
        error: 'Donation not found'
      });
    }

    if (donation.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Donation is already processed',
        donation: {
          id: donation._id,
          status: donation.status,
          processedAt: donation.updatedAt,
          transactionId: donation.transactionId
        }
      });
    }

    if (donation.status === 'cancelled' || donation.status === 'refunded') {
      return res.status(400).json({
        success: false,
        error: `Cannot process ${donation.status} donation`,
        suggestion: 'Create a new donation instead'
      });
    }

    const previousStatus = donation.status;

    donation.status = 'completed';
    if (transactionId) donation.transactionId = transactionId;
    if (notes) donation.notes = donation.notes ? `${donation.notes}; ${notes}` : notes;

    await donation.save();

    await donation.populate([
      { path: 'campaign', select: 'name goal totalRaised donationCount' },
      { path: 'donor', select: 'firstName lastName email totalDonated donationCount' }
    ]);

    const updatedCampaign = donation.campaign;
    const updatedDonor = donation.donor;

    res.json({
      success: true,
      message: 'Donation processed successfully',
      data: donation,
      totalsUpdated: {
        campaign: {
          id: updatedCampaign._id,
          name: updatedCampaign.name,
          newTotal: updatedCampaign.totalRaised,
          newCount: updatedCampaign.donationCount,
          progressPercent: updatedCampaign.goal > 0
            ? Math.round((updatedCampaign.totalRaised / updatedCampaign.goal) * 100 * 100) / 100
            : 0
        },
        donor: {
          id: updatedDonor._id,
          fullName: `${updatedDonor.firstName} ${updatedDonor.lastName}`,
          newTotal: updatedDonor.totalDonated,
          newCount: updatedDonor.donationCount
        }
      },
      metadata: {
        previousStatus,
        processedAt: donation.updatedAt,
        transactionId: donation.transactionId || null
      },
      nextSteps: [
        'Send receipt to donor',
        'Send thank you email',
        'Update donor stewardship plan'
      ]
    });
  } catch (error) {
    console.error('Error in processDonation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process donation',
      message: error.message
    });
  }
};


// ============================================================================
// DONATION ANALYTICS
// ============================================================================

/**
 * Get comprehensive donation analytics
 *
 * @route GET /api/donations/analytics
 * @access Public
 */
exports.getDonationAnalytics = async (req, res) => {
  try {
    const {
      campaign,
      donor,
      startDate,
      endDate,
      status = 'completed'
    } = req.query;

    const matchQuery = {};

    if (status) matchQuery.status = status;
    if (campaign) matchQuery.campaign = mongoose.Types.ObjectId(campaign);
    if (donor) matchQuery.donor = mongoose.Types.ObjectId(donor);

    if (startDate || endDate) {
      matchQuery.donationDate = {};
      if (startDate) matchQuery.donationDate.$gte = new Date(startDate);
      if (endDate) matchQuery.donationDate.$lte = new Date(endDate);
    }

    // Overall summary statistics
    const summary = await Donation.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
          avgDonation: { $avg: '$amount' },
          maxDonation: { $max: '$amount' },
          minDonation: { $min: '$amount' },
          medianCalc: { $push: '$amount' }
        }
      }
    ]);

    const stats = summary[0] || {
      totalAmount: 0,
      count: 0,
      avgDonation: 0,
      maxDonation: 0,
      minDonation: 0
    };

    // Calculate median
    if (stats.medianCalc && stats.medianCalc.length > 0) {
      const sorted = stats.medianCalc.sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      stats.median = sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
      delete stats.medianCalc;
    }

    // By payment method
    const byPaymentMethod = await Donation.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          total: { $sum: '$amount' },
          avg: { $avg: '$amount' }
        }
      },
      { $sort: { total: -1 } }
    ]);

    // By donation type
    const byType = await Donation.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$donationType',
          count: { $sum: 1 },
          total: { $sum: '$amount' },
          avg: { $avg: '$amount' }
        }
      },
      { $sort: { total: -1 } }
    ]);

    // By month (if date range spans multiple months)
    const byMonth = await Donation.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            year: { $year: '$donationDate' },
            month: { $month: '$donationDate' }
          },
          count: { $sum: 1 },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    // By day of week
    const byDayOfWeek = await Donation.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { $dayOfWeek: '$donationDate' },
          count: { $sum: 1 },
          total: { $sum: '$amount' },
          avg: { $avg: '$amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Amount distribution ranges
    const amountRanges = await Donation.aggregate([
      { $match: matchQuery },
      {
        $bucket: {
          groupBy: '$amount',
          boundaries: [0, 50, 100, 250, 500, 1000, 5000, 10000, 50000, 100000, Infinity],
          default: 'Other',
          output: {
            count: { $sum: 1 },
            total: { $sum: '$amount' }
          }
        }
      }
    ]);

    // Top campaigns
    const topCampaigns = await Donation.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$campaign',
          count: { $sum: 1 },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { total: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'campaigns',
          localField: '_id',
          foreignField: '_id',
          as: 'campaignInfo'
        }
      },
      { $unwind: '$campaignInfo' }
    ]);

    // Top donors
    const topDonors = await Donation.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$donor',
          count: { $sum: 1 },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { total: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'donors',
          localField: '_id',
          foreignField: '_id',
          as: 'donorInfo'
        }
      },
      { $unwind: '$donorInfo' }
    ]);

    // Anonymous vs identified
    const anonymousBreakdown = await Donation.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$isAnonymous',
          count: { $sum: 1 },
          total: { $sum: '$amount' }
        }
      }
    ]);

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    res.json({
      success: true,
      data: {
        summary: {
          totalAmount: Math.round(stats.totalAmount * 100) / 100,
          count: stats.count,
          avgDonation: Math.round((stats.avgDonation || 0) * 100) / 100,
          median: Math.round((stats.median || 0) * 100) / 100,
          maxDonation: stats.maxDonation,
          minDonation: stats.minDonation
        },
        breakdown: {
          byPaymentMethod: byPaymentMethod.map(pm => ({
            method: pm._id,
            count: pm.count,
            total: Math.round(pm.total * 100) / 100,
            avg: Math.round(pm.avg * 100) / 100,
            percentage: stats.totalAmount > 0
              ? Math.round((pm.total / stats.totalAmount) * 100 * 100) / 100
              : 0
          })),
          byDonationType: byType.map(dt => ({
            type: dt._id,
            count: dt.count,
            total: Math.round(dt.total * 100) / 100,
            avg: Math.round(dt.avg * 100) / 100,
            percentage: stats.totalAmount > 0
              ? Math.round((dt.total / stats.totalAmount) * 100 * 100) / 100
              : 0
          })),
          byMonth: byMonth.map(m => ({
            year: m._id.year,
            month: m._id.month,
            monthName: new Date(m._id.year, m._id.month - 1).toLocaleString('default', { month: 'long' }),
            count: m.count,
            total: Math.round(m.total * 100) / 100
          })),
          byDayOfWeek: byDayOfWeek.map(d => ({
            day: dayNames[d._id - 1] || 'Unknown',
            dayNumber: d._id,
            count: d.count,
            total: Math.round(d.total * 100) / 100,
            avg: Math.round(d.avg * 100) / 100
          })),
          byAmountRange: amountRanges.map((range, idx) => {
            const boundaries = [0, 50, 100, 250, 500, 1000, 5000, 10000, 50000, 100000];
            return {
              range: idx < boundaries.length - 1
                ? `$${boundaries[idx]} - $${boundaries[idx + 1]}`
                : `$${boundaries[idx]}+`,
              count: range.count,
              total: Math.round(range.total * 100) / 100
            };
          }),
          anonymous: {
            anonymous: anonymousBreakdown.find(a => a._id === true) || { count: 0, total: 0 },
            identified: anonymousBreakdown.find(a => a._id === false) || { count: 0, total: 0 }
          }
        },
        topCampaigns: topCampaigns.map(c => ({
          campaign: {
            id: c.campaignInfo._id,
            name: c.campaignInfo.name
          },
          count: c.count,
          total: Math.round(c.total * 100) / 100
        })),
        topDonors: topDonors.map(d => ({
          donor: {
            id: d.donorInfo._id,
            fullName: `${d.donorInfo.firstName} ${d.donorInfo.lastName}`,
            email: d.donorInfo.email
          },
          count: d.count,
          total: Math.round(d.total * 100) / 100
        }))
      },
      filters: {
        campaign: campaign || 'all',
        donor: donor || 'all',
        status: status,
        dateRange: {
          start: startDate || null,
          end: endDate || null
        }
      },
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in getDonationAnalytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate donation analytics',
      message: error.message
    });
  }
};

// Additional utility methods

/**
 * Mark receipt as sent
 * @route PATCH /api/donations/:id/receipt
 */
exports.markReceiptSent = async (req, res) => {
  try {
    const { id } = req.params;
    const donation = await Donation.findByIdAndUpdate(
      id,
      {
        receiptSent: true,
        receiptSentDate: new Date()
      },
      { new: true }
    );

    if (!donation) {
      return res.status(404).json({
        success: false,
        error: 'Donation not found'
      });
    }

    res.json({
      success: true,
      message: 'Receipt marked as sent',
      data: {
        id: donation._id,
        receiptSent: donation.receiptSent,
        receiptSentDate: donation.receiptSentDate
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update receipt status',
      message: error.message
    });
  }
};

/**
 * Refund a donation
 * @route PATCH /api/donations/:id/refund
 */
exports.refundDonation = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const donation = await Donation.findById(id);

    if (!donation) {
      return res.status(404).json({
        success: false,
        error: 'Donation not found'
      });
    }

    if (donation.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Can only refund completed donations',
        currentStatus: donation.status
      });
    }

    donation.status = 'refunded';
    if (reason) {
      donation.notes = donation.notes ? `${donation.notes}; REFUND: ${reason}` : `REFUND: ${reason}`;
    }
    await donation.save();

    res.json({
      success: true,
      message: 'Donation refunded successfully',
      data: donation,
      note: 'Totals will be recalculated automatically'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to refund donation',
      message: error.message
    });
  }
};