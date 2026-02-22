
/**
 * ============================================================================
 * SEASON CONTROLLER
 * ============================================================================
 *
 * This controller handles all season-related operations including:
 * - CRUD operations for campaign seasons
 * - Season analytics and performance tracking
 * - Donation tracking per season
 * - Season lifecycle management
 * - Timeline and milestone tracking
 *
 * Seasons are time-based periods within a campaign (e.g., Spring Season, Fall Season)
 * Used to organize and track donations within specific timeframes of a campaign.
 *
 * @module controllers/seasonController
 * @requires models/Season
 * @requires models/Campaign
 * @requires models/Donation
 * @requires express-validator
 */

const Season = require('../models/Season');
const Campaign = require('../models/Campaign');
const Donation = require('../models/Donation');
const { validationResult } = require('express-validator');

// ============================================================================
// SEASON RETRIEVAL OPERATIONS
// ============================================================================

/**
 * Get all seasons with advanced filtering and campaign population
 *
 * @route GET /api/seasons
 * @access Public
 *
 * @queryparam {string} campaign - Filter by campaign ID
 * @queryparam {string} status - Filter by status (upcoming, active, completed)
 * @queryparam {number} page - Page number (default: 1)
 * @queryparam {number} limit - Items per page (default: 10, max: 100)
 * @queryparam {string} sort - Sort field (default: '-startDate')
 * @queryparam {number} minGoal - Minimum goal amount
 * @queryparam {number} maxGoal - Maximum goal amount
 * @queryparam {string} startDateFrom - Filter seasons starting from this date
 * @queryparam {string} startDateTo - Filter seasons starting before this date
 * @queryparam {boolean} active - Show only currently active seasons
 *
 * @returns {Object} JSON response with seasons array and pagination
 *
 * @example
 * GET /api/seasons?campaign=xyz&status=active
 * GET /api/seasons?active=true&sort=-totalRaised
 */
exports.getAllSeasons = async (req, res) => {
  try {
    const {
      campaign,
      status,
      page = 1,
      limit = 10,
      sort = '-startDate',
      minGoal,
      maxGoal,
      startDateFrom,
      startDateTo,
      active
    } = req.query;

    // Validate and sanitize pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    // Build query object
    const query = {};

    // Campaign filter
    if (campaign) {
      query.campaign = campaign;
    }

    // Status filter
    if (status) {
      const validStatuses = ['upcoming', 'active', 'completed'];
      if (validStatuses.includes(status)) {
        query.status = status;
      }
    }

    // Active seasons filter (currently running)
    if (active === 'true') {
      const now = new Date();
      query.startDate = { $lte: now };
      query.endDate = { $gte: now };
      query.status = 'active';
    }

    // Goal range filter
    if (minGoal || maxGoal) {
      query.goal = {};
      if (minGoal) query.goal.$gte = parseFloat(minGoal);
      if (maxGoal) query.goal.$lte = parseFloat(maxGoal);
    }

    // Start date range filter
    if (startDateFrom || startDateTo) {
      query.startDate = query.startDate || {};
      if (startDateFrom) query.startDate.$gte = new Date(startDateFrom);
      if (startDateTo) query.startDate.$lte = new Date(startDateTo);
    }

    // Execute query with population
    const seasons = await Season.find(query)
      .populate('campaign', 'name status goal totalRaised startDate endDate')
      .sort(sort)
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum)
      .lean()
      .exec();

    // Get total count
    const count = await Season.countDocuments(query);

    // Calculate aggregate statistics
    const aggregateStats = seasons.length > 0 ? {
      totalSeasons: count,
      totalGoal: seasons.reduce((sum, s) => sum + (s.goal || 0), 0),
      totalRaised: seasons.reduce((sum, s) => sum + (s.totalRaised || 0), 0),
      totalDonations: seasons.reduce((sum, s) => sum + (s.donationCount || 0), 0),
      avgProgress: seasons.filter(s => s.goal > 0).length > 0
        ? Math.round(
            (seasons.filter(s => s.goal > 0).reduce((sum, s) =>
              sum + ((s.totalRaised / s.goal) * 100), 0
            ) / seasons.filter(s => s.goal > 0).length) * 100
          ) / 100
        : 0
    } : null;

    // Enhance seasons with calculated fields
    const enhancedSeasons = seasons.map(season => {
      const now = new Date();
      const start = new Date(season.startDate);
      const end = new Date(season.endDate);

      const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      const daysElapsed = Math.max(0, Math.ceil((now - start) / (1000 * 60 * 60 * 24)));
      const daysRemaining = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));

      return {
        ...season,
        metrics: {
          progressPercent: season.goal > 0
            ? Math.round((season.totalRaised / season.goal) * 100 * 100) / 100
            : 0,
          totalDays,
          daysElapsed: Math.min(daysElapsed, totalDays),
          daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
          isActive: now >= start && now <= end && season.status === 'active',
          hasStarted: now >= start,
          hasEnded: now > end
        }
      };
    });

    // Pagination metadata
    const totalPages = Math.ceil(count / limitNum);

    res.json({
      success: true,
      data: enhancedSeasons,
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
        status: status || 'all',
        active: active || null,
        sort
      },
      aggregateStats
    });
  } catch (error) {
    console.error('Error in getAllSeasons:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve seasons',
      message: error.message
    });
  }
};

/**
 * Get a single season by ID with comprehensive details
 *
 * @route GET /api/seasons/:id
 * @access Public
 *
 * @param {string} id - Season MongoDB ObjectId
 *
 * @returns {Object} JSON response with season details including:
 *   - All season fields
 *   - Populated campaign
 *   - Timeline analysis
 *   - Performance metrics
 *   - Recent donations
 *   - Comparison to campaign
 *
 * @throws {404} Season not found
 * @throws {400} Invalid season ID format
 *
 * @example
 * GET /api/seasons/507f1f77bcf86cd799439011
 */
exports.getSeason = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid season ID format'
      });
    }

    // Find season with full population
    const season = await Season.findById(id)
      .populate({
        path: 'campaign',
        select: 'name description goal totalRaised donationCount status startDate endDate'
      })
      .lean();

    if (!season) {
      return res.status(404).json({
        success: false,
        error: 'Season not found',
        requestedId: id
      });
    }

    // Calculate timeline metrics
    const now = new Date();
    const startDate = new Date(season.startDate);
    const endDate = new Date(season.endDate);

    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const daysElapsed = Math.max(0, Math.ceil((now - startDate) / (1000 * 60 * 60 * 24)));
    const daysRemaining = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));

    const hasStarted = now >= startDate;
    const hasEnded = now > endDate;
    const isActive = hasStarted && !hasEnded && season.status === 'active';

    const timeElapsedPercent = totalDays > 0
      ? Math.round((Math.min(daysElapsed, totalDays) / totalDays) * 100 * 100) / 100
      : 0;

    // Calculate progress metrics
    const progressPercent = season.goal > 0
      ? Math.round((season.totalRaised / season.goal) * 100 * 100) / 100
      : 0;

    const amountRemaining = Math.max(0, (season.goal || 0) - season.totalRaised);
    const isGoalReached = season.totalRaised >= (season.goal || 0);

    // Performance metrics
    const avgPerDay = daysElapsed > 0
      ? Math.round((season.totalRaised / daysElapsed) * 100) / 100
      : 0;

    const requiredDailyAvg = daysRemaining > 0
      ? Math.round((amountRemaining / daysRemaining) * 100) / 100
      : 0;

    const onTrack = timeElapsedPercent > 0
      ? progressPercent >= timeElapsedPercent
      : true;

    // Get recent donations for this season
    const recentDonations = await Donation.find({
      season: season._id,
      status: 'completed'
    })
      .sort('-donationDate')
      .limit(10)
      .select('amount donationDate donor')
      .populate('donor', 'firstName lastName email')
      .lean();

    // Get donation statistics
    const donationStats = await Donation.aggregate([
      {
        $match: {
          season: season._id,
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          avgDonation: { $avg: '$amount' },
          maxDonation: { $max: '$amount' },
          minDonation: { $min: '$amount' },
          uniqueDonors: { $addToSet: '$donor' }
        }
      }
    ]);

    const stats = donationStats[0] || {
      avgDonation: 0,
      maxDonation: 0,
      minDonation: 0,
      uniqueDonors: []
    };

    // Compare to campaign totals
    const campaignComparison = season.campaign ? {
      seasonPercentOfCampaignGoal: season.campaign.goal > 0
        ? Math.round(((season.goal || 0) / season.campaign.goal) * 100 * 100) / 100
        : 0,
      seasonPercentOfCampaignRaised: season.campaign.totalRaised > 0
        ? Math.round((season.totalRaised / season.campaign.totalRaised) * 100 * 100) / 100
        : 0,
      seasonDonationPercent: season.campaign.donationCount > 0
        ? Math.round((season.donationCount / season.campaign.donationCount) * 100 * 100) / 100
        : 0
    } : null;

    // Enriched season object
    const enrichedSeason = {
      ...season,
      timeline: {
        totalDays,
        daysElapsed: Math.min(daysElapsed, totalDays),
        daysRemaining: hasEnded ? 0 : daysRemaining,
        timeElapsedPercent,
        hasStarted,
        hasEnded,
        isActive
      },
      progress: {
        percent: progressPercent,
        amountRaised: season.totalRaised,
        amountRemaining,
        isGoalReached,
        percentageLabel: `${progressPercent}%`
      },
      performance: {
        averagePerDay: avgPerDay,
        requiredDailyAverage: requiredDailyAvg,
        onTrackToMeetGoal: onTrack,
        paceStatus: onTrack ? 'ahead' : 'behind',
        daysToGoalAtCurrentPace: avgPerDay > 0 && !isGoalReached
          ? Math.ceil(amountRemaining / avgPerDay)
          : null
      },
      donationMetrics: {
        count: season.donationCount,
        avgDonation: Math.round((stats.avgDonation || 0) * 100) / 100,
        maxDonation: stats.maxDonation,
        minDonation: stats.minDonation,
        uniqueDonors: stats.uniqueDonors.length
      },
      recentActivity: recentDonations.map(d => ({
        amount: d.amount,
        date: d.donationDate,
        donor: d.donor ? {
          fullName: `${d.donor.firstName} ${d.donor.lastName}`,
          email: d.donor.email
        } : 'Anonymous'
      })),
      campaignComparison
    };

    res.json({
      success: true,
      data: enrichedSeason
    });
  } catch (error) {
    console.error('Error in getSeason:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve season',
      message: error.message
    });
  }
};

// Create season
exports.createSeason = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const season = await Season.create(req.body);
    await season.populate('campaign', 'name');

    res.status(201).json({
      success: true,
      data: season
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Update season
exports.updateSeason = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const season = await Season.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('campaign', 'name');

    if (!season) {
      return res.status(404).json({
        success: false,
        error: 'Season not found'
      });
    }

    res.json({
      success: true,
      data: season
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Delete season
exports.deleteSeason = async (req, res) => {
  try {
    const season = await Season.findByIdAndDelete(req.params.id);

    if (!season) {
      return res.status(404).json({
        success: false,
        error: 'Season not found'
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

// Get season statistics
exports.getSeasonStats = async (req, res) => {
  try {
    const season = await Season.findById(req.params.id).populate('campaign');

    if (!season) {
      return res.status(404).json({
        success: false,
        error: 'Season not found'
      });
    }

    const Donation = require('../models/Donation');

    const stats = await Donation.aggregate([
      {
        $match: {
          season: season._id,
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
          avgDonation: { $avg: '$amount' }
        }
      }
    ]);

    const progressPercent = season.goal > 0
      ? (season.totalRaised / season.goal) * 100
      : 0;

    res.json({
      success: true,
      data: {
        season: {
          id: season._id,
          name: season.name,
          campaign: season.campaign,
          goal: season.goal,
          totalRaised: season.totalRaised,
          donationCount: season.donationCount,
          progressPercent: progressPercent.toFixed(2),
          status: season.status
        },
        statistics: stats[0] || {
          totalAmount: 0,
          count: 0,
          avgDonation: 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================================================
// SEASON CREATION AND MODIFICATION
// ============================================================================

/**
 * Create a new season with validation
 *
 * @route POST /api/seasons
 * @access Admin
 */
exports.createSeason = async (req, res) => {
  try {
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

    const { name, campaign, description, startDate, endDate, goal, status } = req.body;

    // Verify campaign exists
    const campaignDoc = await Campaign.findById(campaign);
    if (!campaignDoc) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
        campaignId: campaign
      });
    }

    // Validate dates are within campaign dates
    const seasonStart = new Date(startDate);
    const seasonEnd = new Date(endDate);
    const campaignStart = new Date(campaignDoc.startDate);
    const campaignEnd = new Date(campaignDoc.endDate);

    if (seasonStart < campaignStart || seasonEnd > campaignEnd) {
      return res.status(400).json({
        success: false,
        error: 'Season dates must fall within campaign dates',
        seasonDates: { start: startDate, end: endDate },
        campaignDates: {
          start: campaignDoc.startDate,
          end: campaignDoc.endDate
        }
      });
    }

    // Check for overlapping seasons in the same campaign
    const overlappingSeasons = await Season.find({
      campaign: campaign,
      $or: [
        {
          startDate: { $lte: seasonEnd },
          endDate: { $gte: seasonStart }
        }
      ]
    });

    const warnings = [];
    if (overlappingSeasons.length > 0) {
      warnings.push(`This season overlaps with ${overlappingSeasons.length} existing season(s)`);
    }

    // Create season
    const season = await Season.create({
      name: name.trim(),
      campaign,
      description: description?.trim(),
      startDate: seasonStart,
      endDate: seasonEnd,
      goal: goal || undefined,
      status: status || 'upcoming',
      totalRaised: 0,
      donationCount: 0
    });

    await season.populate('campaign', 'name goal');

    const totalDays = Math.ceil((seasonEnd - seasonStart) / (1000 * 60 * 60 * 24));

    res.status(201).json({
      success: true,
      message: 'Season created successfully',
      data: season,
      metadata: {
        durationDays: totalDays,
        createdAt: season.createdAt,
        overlappingSeasons: overlappingSeasons.length
      },
      warnings: warnings.length > 0 ? warnings : undefined
    });
  } catch (error) {
    console.error('Error in createSeason:', error);

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
      error: 'Failed to create season',
      message: error.message
    });
  }
};

/**
 * Update an existing season
 *
 * @route PUT /api/seasons/:id
 * @access Admin
 */
exports.updateSeason = async (req, res) => {
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
        error: 'Invalid season ID format'
      });
    }

    const existingSeason = await Season.findById(id);
    if (!existingSeason) {
      return res.status(404).json({
        success: false,
        error: 'Season not found',
        requestedId: id
      });
    }

    // Prevent manual modification of calculated fields
    const protectedFields = ['totalRaised', 'donationCount', 'createdAt', 'updatedAt'];
    const attemptedProtectedUpdates = protectedFields.filter(field => req.body[field] !== undefined);

    if (attemptedProtectedUpdates.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot manually update calculated fields',
        protectedFields: attemptedProtectedUpdates,
        message: 'These fields are automatically calculated based on donations'
      });
    }

    const warnings = [];

    // Validate date changes if campaign is being changed or dates are being updated
    if (req.body.startDate || req.body.endDate || req.body.campaign) {
      const campaignId = req.body.campaign || existingSeason.campaign;
      const campaignDoc = await Campaign.findById(campaignId);

      if (!campaignDoc) {
        return res.status(404).json({
          success: false,
          error: 'Campaign not found'
        });
      }

      const newStart = req.body.startDate ? new Date(req.body.startDate) : existingSeason.startDate;
      const newEnd = req.body.endDate ? new Date(req.body.endDate) : existingSeason.endDate;

      if (newStart < campaignDoc.startDate || newEnd > campaignDoc.endDate) {
        return res.status(400).json({
          success: false,
          error: 'Season dates must fall within campaign dates',
          seasonDates: { start: newStart, end: newEnd },
          campaignDates: {
            start: campaignDoc.startDate,
            end: campaignDoc.endDate
          }
        });
      }

      // Warn if changing dates on season with donations
      if (existingSeason.donationCount > 0) {
        warnings.push('Changing dates on a season with existing donations');
      }
    }

    const updatedFields = Object.keys(req.body);

    const season = await Season.findByIdAndUpdate(
      id,
      req.body,
      {
        new: true,
        runValidators: true,
        context: 'query'
      }
    ).populate('campaign', 'name goal');

    res.json({
      success: true,
      message: 'Season updated successfully',
      data: season,
      metadata: {
        updatedFields,
        updatedAt: season.updatedAt,
        previousStatus: existingSeason.status,
        currentStatus: season.status
      },
      warnings: warnings.length > 0 ? warnings : undefined
    });
  } catch (error) {
    console.error('Error in updateSeason:', error);

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
      error: 'Failed to update season',
      message: error.message
    });
  }
};

/**
 * Delete a season
 *
 * @route DELETE /api/seasons/:id
 * @access Admin
 */
exports.deleteSeason = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid season ID format'
      });
    }

    const season = await Season.findById(id);

    if (!season) {
      return res.status(404).json({
        success: false,
        error: 'Season not found',
        requestedId: id
      });
    }

    const warnings = [];

    // Check for donations in this season
    const donationsCount = await Donation.countDocuments({ season: season._id });

    if (donationsCount > 0) {
      warnings.push(`Season has ${donationsCount} associated donation(s). These will no longer be linked to a season.`);
    }

    const deletedInfo = {
      id: season._id,
      name: season.name,
      campaign: season.campaign,
      totalRaised: season.totalRaised,
      donationCount: season.donationCount,
      startDate: season.startDate,
      endDate: season.endDate
    };

    await Season.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Season deleted successfully',
      deletedSeason: deletedInfo,
      warnings: warnings.length > 0 ? warnings : undefined,
      note: donationsCount > 0
        ? 'Existing donations are preserved but season reference is removed'
        : 'Season had no associated donations'
    });
  } catch (error) {
    console.error('Error in deleteSeason:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete season',
      message: error.message
    });
  }
};

// ============================================================================
// SEASON ANALYTICS
// ============================================================================

/**
 * Get comprehensive season statistics
 *
 * @route GET /api/seasons/:id/stats
 * @access Public
 */
exports.getSeasonStats = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid season ID format'
      });
    }

    const season = await Season.findById(id).populate('campaign');

    if (!season) {
      return res.status(404).json({
        success: false,
        error: 'Season not found',
        requestedId: id
      });
    }

    // Donation statistics
    const donationStats = await Donation.aggregate([
      {
        $match: {
          season: season._id,
          status: 'completed'
        }
      },
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

    const stats = donationStats[0] || {
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

    // Timeline
    const now = new Date();
    const start = new Date(season.startDate);
    const end = new Date(season.endDate);
    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const daysElapsed = Math.max(0, Math.ceil((now - start) / (1000 * 60 * 60 * 24)));
    const daysRemaining = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));

    // Progress
    const progressPercent = season.goal > 0
      ? Math.round((season.totalRaised / season.goal) * 100 * 100) / 100
      : 0;

    const amountRemaining = Math.max(0, (season.goal || 0) - season.totalRaised);

    // Performance
    const avgPerDay = daysElapsed > 0
      ? Math.round((season.totalRaised / daysElapsed) * 100) / 100
      : 0;

    const requiredDailyAvg = daysRemaining > 0
      ? Math.round((amountRemaining / daysRemaining) * 100) / 100
      : 0;

    // Donor analytics
    const donorStats = await Donation.aggregate([
      {
        $match: {
          season: season._id,
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$donor',
          donationCount: { $sum: 1 },
          totalContributed: { $sum: '$amount' }
        }
      },
      {
        $group: {
          _id: null,
          uniqueDonors: { $sum: 1 },
          repeatDonors: {
            $sum: { $cond: [{ $gt: ['$donationCount', 1] }, 1, 0] }
          }
        }
      }
    ]);

    const donors = donorStats[0] || {
      uniqueDonors: 0,
      repeatDonors: 0
    };

    // Payment method breakdown
    const byPaymentMethod = await Donation.aggregate([
      {
        $match: {
          season: season._id,
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { total: -1 } }
    ]);

    // Donation type breakdown
    const byType = await Donation.aggregate([
      {
        $match: {
          season: season._id,
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$donationType',
          count: { $sum: 1 },
          total: { $sum: '$amount' }
        }
      }
    ]);

    // Daily donation trend (last 30 days or season duration, whichever is shorter)
    const daysToShow = Math.min(30, totalDays);
    const trendStartDate = new Date(Math.max(start.getTime(), now.getTime() - (daysToShow * 24 * 60 * 60 * 1000)));

    const dailyTrend = await Donation.aggregate([
      {
        $match: {
          season: season._id,
          status: 'completed',
          donationDate: { $gte: trendStartDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$donationDate' }
          },
          count: { $sum: 1 },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        season: {
          id: season._id,
          name: season.name,
          campaign: season.campaign,
          goal: season.goal,
          totalRaised: season.totalRaised,
          donationCount: season.donationCount,
          status: season.status,
          startDate: season.startDate,
          endDate: season.endDate
        },
        progress: {
          percent: progressPercent,
          amountRaised: season.totalRaised,
          amountRemaining,
          isGoalReached: season.totalRaised >= (season.goal || 0)
        },
        timeline: {
          totalDays,
          daysElapsed: Math.min(daysElapsed, totalDays),
          daysRemaining: now > end ? 0 : daysRemaining,
          timeElapsedPercent: totalDays > 0
            ? Math.round((Math.min(daysElapsed, totalDays) / totalDays) * 100 * 100) / 100
            : 0,
          hasStarted: now >= start,
          hasEnded: now > end,
          isActive: now >= start && now <= end && season.status === 'active'
        },
        donationStatistics: {
          total: stats.totalAmount,
          count: stats.count,
          average: Math.round((stats.avgDonation || 0) * 100) / 100,
          median: Math.round((stats.median || 0) * 100) / 100,
          maximum: stats.maxDonation,
          minimum: stats.minDonation
        },
        donorAnalytics: {
          uniqueDonors: donors.uniqueDonors,
          repeatDonors: donors.repeatDonors,
          newDonors: donors.uniqueDonors - donors.repeatDonors,
          retentionRate: donors.uniqueDonors > 0
            ? Math.round((donors.repeatDonors / donors.uniqueDonors) * 100 * 100) / 100
            : 0
        },
        performance: {
          averagePerDay: avgPerDay,
          requiredDailyAverage: requiredDailyAvg,
          onTrackToMeetGoal: progressPercent >= (totalDays > 0 ? (daysElapsed / totalDays) * 100 : 0)
        },
        breakdown: {
          byPaymentMethod: byPaymentMethod.map(pm => ({
            method: pm._id,
            count: pm.count,
            total: Math.round(pm.total * 100) / 100,
            percentage: season.totalRaised > 0
              ? Math.round((pm.total / season.totalRaised) * 100 * 100) / 100
              : 0
          })),
          byDonationType: byType.map(dt => ({
            type: dt._id,
            count: dt.count,
            total: Math.round(dt.total * 100) / 100,
            percentage: season.totalRaised > 0
              ? Math.round((dt.total / season.totalRaised) * 100 * 100) / 100
              : 0
          }))
        },
        dailyTrend: dailyTrend.map(day => ({
          date: day._id,
          count: day.count,
          total: Math.round(day.total * 100) / 100
        }))
      },
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in getSeasonStats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve season statistics',
      message: error.message
    });
  }
};

// ============================================================================
// ADDITIONAL SEASON OPERATIONS
// ============================================================================

/**
 * Compare multiple seasons
 *
 * @route GET /api/seasons/compare
 * @access Public
 */
exports.compareSeasons = async (req, res) => {
  try {
    const { ids, campaign } = req.query;

    let seasonQuery = {};

    if (ids) {
      const seasonIds = ids.split(',').map(id => id.trim());
      if (seasonIds.length < 2 || seasonIds.length > 10) {
        return res.status(400).json({
          success: false,
          error: 'Please provide between 2 and 10 season IDs',
          example: '/api/seasons/compare?ids=id1,id2,id3'
        });
      }
      seasonQuery._id = { $in: seasonIds };
    } else if (campaign) {
      seasonQuery.campaign = campaign;
    } else {
      return res.status(400).json({
        success: false,
        error: 'Please provide either season IDs or a campaign ID'
      });
    }

    const seasons = await Season.find(seasonQuery)
      .populate('campaign', 'name')
      .lean();

    if (seasons.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No seasons found'
      });
    }

    const comparison = seasons.map(season => ({
      id: season._id,
      name: season.name,
      campaign: season.campaign?.name,
      goal: season.goal,
      totalRaised: season.totalRaised,
      donationCount: season.donationCount,
      progressPercent: season.goal > 0
        ? Math.round((season.totalRaised / season.goal) * 100 * 100) / 100
        : 0,
      avgDonation: season.donationCount > 0
        ? Math.round((season.totalRaised / season.donationCount) * 100) / 100
        : 0,
      startDate: season.startDate,
      endDate: season.endDate,
      status: season.status
    }));

    const summary = {
      totalSeasons: seasons.length,
      combinedGoal: seasons.reduce((sum, s) => sum + (s.goal || 0), 0),
      combinedRaised: seasons.reduce((sum, s) => sum + s.totalRaised, 0),
      combinedDonations: seasons.reduce((sum, s) => sum + s.donationCount, 0),
      bestPerformer: comparison.reduce((max, s) =>
        s.progressPercent > max.progressPercent ? s : max
      ),
      topEarner: comparison.reduce((max, s) =>
        s.totalRaised > max.totalRaised ? s : max
      )
    };

    res.json({
      success: true,
      data: {
        seasons: comparison,
        summary
      }
    });
  } catch (error) {
    console.error('Error in compareSeasons:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to compare seasons',
      message: error.message
    });
  }
};