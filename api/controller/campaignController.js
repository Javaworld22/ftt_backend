/**
 * ============================================================================
 * CAMPAIGN CONTROLLER
 * ============================================================================
 *
 * This controller handles all campaign-related operations including:
 * - CRUD operations (Create, Read, Update, Delete)
 * - Campaign statistics and analytics
 * - Campaign lifecycle management
 * - Donation tracking per campaign
 * - Performance metrics
 *
 * @module controllers/campaignController
 * @requires models/Campaign
 * @requires models/Donation
 * @requires express-validator
 */

const Campaign = require('../models/Campaign');
const Donation = require('../models/Donation');
const { validationResult } = require('express-validator');

// ============================================================================
// CAMPAIGN RETRIEVAL OPERATIONS
// ============================================================================

/**
 * Get all campaigns with advanced filtering, pagination, and search
 *
 * @route GET /api/campaigns
 * @access Public
 *
 * @queryparam {string} status - Filter by campaign status (draft, active, paused, completed, cancelled)
 * @queryparam {string} search - Full-text search in name and description
 * @queryparam {number} page - Page number for pagination (default: 1)
 * @queryparam {number} limit - Items per page (default: 10, max: 100)
 * @queryparam {string} sort - Sort field (prefix with '-' for descending)
 * @queryparam {number} minGoal - Minimum goal amount filter
 * @queryparam {number} maxGoal - Maximum goal amount filter
 * @queryparam {string} startDateFrom - Filter campaigns starting from this date
 * @queryparam {string} startDateTo - Filter campaigns starting before this date
 *
 * @returns {Object} JSON response with campaigns array and pagination info
 *
 * @example
 * GET /api/campaigns?status=active&page=1&limit=10&sort=-startDate
 * GET /api/campaigns?search=scholarship&minGoal=10000
 */
exports.getAllCampaigns = async (req, res) => {
  try {
    const {
      status,
      search,
      page = 1,
      limit = 10,
      sort = '-startDate',
      minGoal,
      maxGoal,
      startDateFrom,
      startDateTo
    } = req.query;

    // Validate and sanitize pagination parameters
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // Max 100 items per page

    // Build query object
    const query = {};

    // Status filter
    if (status) {
      const validStatuses = ['draft', 'active', 'paused', 'completed', 'cancelled'];
      if (validStatuses.includes(status)) {
        query.status = status;
      }
    }

    // Full-text search
    if (search) {
      query.$text = { $search: search };
    }

    // Goal amount range filter
    if (minGoal || maxGoal) {
      query.goal = {};
      if (minGoal) query.goal.$gte = parseFloat(minGoal);
      if (maxGoal) query.goal.$lte = parseFloat(maxGoal);
    }

    // Start date range filter
    if (startDateFrom || startDateTo) {
      query.startDate = {};
      if (startDateFrom) query.startDate.$gte = new Date(startDateFrom);
      if (startDateTo) query.startDate.$lte = new Date(startDateTo);
    }

    // Execute query with pagination
    const campaigns = await Campaign.find(query)
      .sort(sort)
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum)
      .select('-__v') // Exclude version key
      .lean() // Return plain JavaScript objects for better performance
      .exec();

    // Get total count for pagination
    const count = await Campaign.countDocuments(query);

    // Calculate additional metrics
    const totalPages = Math.ceil(count / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    res.json({
      success: true,
      data: campaigns,
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        pages: totalPages,
        hasNextPage,
        hasPrevPage,
        nextPage: hasNextPage ? pageNum + 1 : null,
        prevPage: hasPrevPage ? pageNum - 1 : null
      },
      filters: {
        status: status || 'all',
        search: search || null,
        sort
      }
    });
  } catch (error) {
    console.error('Error in getAllCampaigns:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve campaigns',
      message: error.message
    });
  }
};

/**
 * Get a single campaign by ID with full relationship population
 *
 * @route GET /api/campaigns/:id
 * @access Public
 *
 * @param {string} id - Campaign MongoDB ObjectId
 *
 * @returns {Object} JSON response with campaign details including:
 *   - All campaign fields
 *   - Populated seasons
 *   - Populated cycles
 *   - Calculated progress percentage
 *   - Days remaining until end date
 *
 * @throws {404} Campaign not found
 * @throws {400} Invalid campaign ID format
 *
 * @example
 * GET /api/campaigns/507f1f77bcf86cd799439011
 */
exports.getCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid campaign ID format'
      });
    }

    // Find campaign and populate relationships
    const campaign = await Campaign.findById(id)
      .populate({
        path: 'seasons',
        select: 'name startDate endDate goal totalRaised status',
        options: { sort: { startDate: -1 } }
      })
      .populate({
        path: 'cycles',
        select: 'name cycleNumber startDate endDate goal totalRaised status',
        options: { sort: { cycleNumber: 1 } }
      })
      .lean();

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
        requestedId: id
      });
    }

    // Calculate additional metrics
    const now = new Date();
    const endDate = new Date(campaign.endDate);
    const startDate = new Date(campaign.startDate);

    // Progress percentage
    const progressPercent = campaign.goal > 0
      ? Math.round((campaign.totalRaised / campaign.goal) * 100 * 100) / 100
      : 0;

    // Days remaining
    const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
    const hasStarted = now >= startDate;
    const hasEnded = now > endDate;

    // Campaign duration
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const daysElapsed = hasStarted
      ? Math.ceil((now - startDate) / (1000 * 60 * 60 * 24))
      : 0;

    // Average donation amount
    const avgDonation = campaign.donationCount > 0
      ? Math.round((campaign.totalRaised / campaign.donationCount) * 100) / 100
      : 0;

    // Amount remaining to reach goal
    const amountRemaining = Math.max(0, campaign.goal - campaign.totalRaised);

    // Enriched campaign object
    const enrichedCampaign = {
      ...campaign,
      metrics: {
        progressPercent,
        daysRemaining: hasEnded ? 0 : Math.max(0, daysRemaining),
        daysElapsed: Math.min(daysElapsed, totalDays),
        totalDays,
        hasStarted,
        hasEnded,
        isActive: hasStarted && !hasEnded && campaign.status === 'active',
        avgDonation,
        amountRemaining,
        percentageOfTimeElapsed: totalDays > 0
          ? Math.round((daysElapsed / totalDays) * 100 * 100) / 100
          : 0
      },
      summary: {
        totalSeasons: campaign.seasons?.length || 0,
        totalCycles: campaign.cycles?.length || 0
      }
    };

    res.json({
      success: true,
      data: enrichedCampaign
    });
  } catch (error) {
    console.error('Error in getCampaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve campaign',
      message: error.message
    });
  }
};

// ============================================================================
// CAMPAIGN CREATION AND MODIFICATION
// ============================================================================

/**
 * Create a new campaign
 *
 * @route POST /api/campaigns
 * @access Public/Admin (depends on your auth setup)
 *
 * @bodyparam {string} name - Campaign name (required, max 200 chars)
 * @bodyparam {string} description - Campaign description (max 2000 chars)
 * @bodyparam {number} goal - Fundraising goal amount (required, min 0)
 * @bodyparam {Date} startDate - Campaign start date (required)
 * @bodyparam {Date} endDate - Campaign end date (required, must be after startDate)
 * @bodyparam {string} status - Campaign status (draft, active, paused, completed, cancelled)
 *
 * @returns {Object} JSON response with created campaign
 *
 * @throws {400} Validation errors
 * @throws {409} Campaign with same name already exists (optional check)
 *
 * @example
 * POST /api/campaigns
 * {
 *   "name": "Summer Scholarship Fund",
 *   "description": "Supporting students...",
 *   "goal": 50000,
 *   "startDate": "2024-06-01",
 *   "endDate": "2024-08-31",
 *   "status": "draft"
 * }
 */
exports.createCampaign = async (req, res) => {
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

    const { name, description, goal, startDate, endDate, status } = req.body;

    // Additional business logic validations
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();

    // Validate date logic
    if (end <= start) {
      return res.status(400).json({
        success: false,
        error: 'End date must be after start date',
        details: {
          startDate: start.toISOString(),
          endDate: end.toISOString()
        }
      });
    }

    // Warn if start date is in the past (but allow it)
    const warnings = [];
    if (start < now && status === 'active') {
      warnings.push('Campaign start date is in the past');
    }

    // Check for duplicate campaign names (optional - remove if not needed)
    const existingCampaign = await Campaign.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    });

    if (existingCampaign) {
      return res.status(409).json({
        success: false,
        error: 'A campaign with this name already exists',
        existingCampaign: {
          id: existingCampaign._id,
          name: existingCampaign.name,
          status: existingCampaign.status
        },
        suggestion: 'Please use a different name or update the existing campaign'
      });
    }

    // Create campaign
    const campaign = await Campaign.create({
      name,
      description,
      goal,
      startDate: start,
      endDate: end,
      status: status || 'draft',
      totalRaised: 0,
      donationCount: 0
    });

    // Calculate initial metrics
    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    res.status(201).json({
      success: true,
      message: 'Campaign created successfully',
      data: campaign,
      metadata: {
        durationDays: totalDays,
        createdAt: campaign.createdAt
      },
      warnings: warnings.length > 0 ? warnings : undefined
    });
  } catch (error) {
    console.error('Error in createCampaign:', error);

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
      error: 'Failed to create campaign',
      message: error.message
    });
  }
};

/**
 * Update an existing campaign
 *
 * @route PUT /api/campaigns/:id
 * @access Public/Admin
 *
 * @param {string} id - Campaign MongoDB ObjectId
 * @bodyparam Any campaign field to update
 *
 * @returns {Object} JSON response with updated campaign
 *
 * @throws {400} Validation errors
 * @throws {404} Campaign not found
 *
 * @example
 * PUT /api/campaigns/507f1f77bcf86cd799439011
 * {
 *   "goal": 75000,
 *   "status": "active"
 * }
 */
exports.updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate request
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

    // Validate ObjectId
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid campaign ID format'
      });
    }

    // Get existing campaign
    const existingCampaign = await Campaign.findById(id);
    if (!existingCampaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
        requestedId: id
      });
    }

    // Check for status transitions that might not be allowed
    const { status, startDate, endDate } = req.body;
    const warnings = [];

    // Business logic: Prevent certain status transitions
    if (status && existingCampaign.status === 'completed' && status !== 'completed') {
      warnings.push('Reopening a completed campaign - ensure this is intentional');
    }

    // Validate date changes
    if (startDate || endDate) {
      const newStart = startDate ? new Date(startDate) : existingCampaign.startDate;
      const newEnd = endDate ? new Date(endDate) : existingCampaign.endDate;

      if (newEnd <= newStart) {
        return res.status(400).json({
          success: false,
          error: 'End date must be after start date',
          dates: {
            startDate: newStart.toISOString(),
            endDate: newEnd.toISOString()
          }
        });
      }

      // Warn if changing dates of an active campaign with donations
      if (existingCampaign.donationCount > 0) {
        warnings.push('Changing dates on a campaign with existing donations');
      }
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

    // Track what fields are being updated
    const updatedFields = Object.keys(req.body);

    // Update campaign
    const campaign = await Campaign.findByIdAndUpdate(
      id,
      req.body,
      {
        new: true, // Return updated document
        runValidators: true, // Run schema validators
        context: 'query' // Needed for some validators
      }
    );

    res.json({
      success: true,
      message: 'Campaign updated successfully',
      data: campaign,
      metadata: {
        updatedFields,
        updatedAt: campaign.updatedAt,
        previousStatus: existingCampaign.status,
        currentStatus: campaign.status
      },
      warnings: warnings.length > 0 ? warnings : undefined
    });
  } catch (error) {
    console.error('Error in updateCampaign:', error);

    // Handle validation errors
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
      error: 'Failed to update campaign',
      message: error.message
    });
  }
};

/**
 * Delete a campaign
 *
 * WARNING: This is a hard delete. Consider implementing soft delete for production.
 *
 * @route DELETE /api/campaigns/:id
 * @access Admin only (recommended)
 *
 * @param {string} id - Campaign MongoDB ObjectId
 *
 * @returns {Object} JSON response confirming deletion
 *
 * @throws {404} Campaign not found
 * @throws {409} Cannot delete campaign with existing donations (safety check)
 *
 * @example
 * DELETE /api/campaigns/507f1f77bcf86cd799439011
 */
exports.deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid campaign ID format'
      });
    }

    // Find campaign first to check if it exists and has related data
    const campaign = await Campaign.findById(id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
        requestedId: id
      });
    }

    // Safety check: Prevent deletion of campaigns with donations
    if (campaign.donationCount > 0) {
      return res.status(409).json({
        success: false,
        error: 'Cannot delete campaign with existing donations',
        campaignDetails: {
          name: campaign.name,
          donationCount: campaign.donationCount,
          totalRaised: campaign.totalRaised
        },
        suggestion: 'Consider changing the campaign status to "cancelled" instead of deleting',
        alternativeEndpoint: `PUT /api/campaigns/${id} with {"status": "cancelled"}`
      });
    }

    // Check for related seasons and cycles
    const Season = require('../models/Season');
    const Cycle = require('../models/Cycle');

    const relatedSeasons = await Season.countDocuments({ campaign: id });
    const relatedCycles = await Cycle.countDocuments({ campaign: id });

    // Store campaign details before deletion
    const deletedCampaignDetails = {
      id: campaign._id,
      name: campaign.name,
      status: campaign.status,
      goal: campaign.goal,
      totalRaised: campaign.totalRaised,
      donationCount: campaign.donationCount,
      relatedSeasons,
      relatedCycles
    };

    // Delete the campaign
    await Campaign.findByIdAndDelete(id);

    // Optionally delete related seasons and cycles
    // Uncomment these if you want cascading deletes
    // await Season.deleteMany({ campaign: id });
    // await Cycle.deleteMany({ campaign: id });

    res.json({
      success: true,
      message: 'Campaign deleted successfully',
      deletedCampaign: deletedCampaignDetails,
      warning: relatedSeasons > 0 || relatedCycles > 0
        ? `This campaign had ${relatedSeasons} seasons and ${relatedCycles} cycles that still exist in the database`
        : undefined
    });
  } catch (error) {
    console.error('Error in deleteCampaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete campaign',
      message: error.message
    });
  }
};

// ============================================================================
// CAMPAIGN ANALYTICS AND STATISTICS
// ============================================================================

/**
 * Get comprehensive campaign statistics and analytics
 *
 * @route GET /api/campaigns/:id/stats
 * @access Public
 *
 * @param {string} id - Campaign MongoDB ObjectId
 *
 * @returns {Object} Comprehensive analytics including:
 *   - Campaign overview
 *   - Donation statistics (total, avg, min, max)
 *   - Progress metrics
 *   - Timeline analysis
 *   - Donor analytics
 *   - Payment method breakdown
 *   - Donation type distribution
 *   - Recent donation trends
 *
 * @throws {404} Campaign not found
 *
 * @example
 * GET /api/campaigns/507f1f77bcf86cd799439011/stats
 */
exports.getCampaignStats = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid campaign ID format'
      });
    }

    // Find campaign
    const campaign = await Campaign.findById(id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
        requestedId: id
      });
    }

    // ========================================================================
    // DONATION STATISTICS
    // ========================================================================

    const donationStats = await Donation.aggregate([
      {
        $match: {
          campaign: campaign._id,
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
          medianAmount: { $push: '$amount' } // For median calculation
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
    if (stats.medianAmount && stats.medianAmount.length > 0) {
      const sorted = stats.medianAmount.sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      stats.medianDonation = sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
      delete stats.medianAmount; // Remove the array
    }

    // ========================================================================
    // PROGRESS METRICS
    // ========================================================================

    const progressPercent = campaign.goal > 0
      ? Math.round((campaign.totalRaised / campaign.goal) * 100 * 100) / 100
      : 0;

    const amountRemaining = Math.max(0, campaign.goal - campaign.totalRaised);
    const isGoalReached = campaign.totalRaised >= campaign.goal;

    // ========================================================================
    // TIMELINE ANALYSIS
    // ========================================================================

    const now = new Date();
    const startDate = new Date(campaign.startDate);
    const endDate = new Date(campaign.endDate);

    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const daysElapsed = Math.max(0, Math.ceil((now - startDate) / (1000 * 60 * 60 * 24)));
    const daysRemaining = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));

    const hasStarted = now >= startDate;
    const hasEnded = now > endDate;
    const isActive = hasStarted && !hasEnded && campaign.status === 'active';

    const timeElapsedPercent = totalDays > 0
      ? Math.round((Math.min(daysElapsed, totalDays) / totalDays) * 100 * 100) / 100
      : 0;

    // ========================================================================
    // DONOR ANALYTICS
    // ========================================================================

    const donorStats = await Donation.aggregate([
      {
        $match: {
          campaign: campaign._id,
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
            $sum: {
              $cond: [{ $gt: ['$donationCount', 1] }, 1, 0]
            }
          },
          topDonor: { $max: '$totalContributed' }
        }
      }
    ]);

    const donors = donorStats[0] || {
      uniqueDonors: 0,
      repeatDonors: 0,
      topDonor: 0
    };

    const donorRetentionRate = donors.uniqueDonors > 0
      ? Math.round((donors.repeatDonors / donors.uniqueDonors) * 100 * 100) / 100
      : 0;

    // ========================================================================
    // PAYMENT METHOD BREAKDOWN
    // ========================================================================

    const paymentMethodStats = await Donation.aggregate([
      {
        $match: {
          campaign: campaign._id,
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          total: { $sum: '$amount' },
          average: { $avg: '$amount' }
        }
      },
      {
        $sort: { total: -1 }
      }
    ]);

    // ========================================================================
    // DONATION TYPE DISTRIBUTION
    // ========================================================================

    const donationTypeStats = await Donation.aggregate([
      {
        $match: {
          campaign: campaign._id,
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$donationType',
          count: { $sum: 1 },
          total: { $sum: '$amount' }
        }
      },
      {
        $sort: { total: -1 }
      }
    ]);

    // ========================================================================
    // DONATION TIMELINE (Last 30 days)
    // ========================================================================

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentDonations = await Donation.aggregate([
      {
        $match: {
          campaign: campaign._id,
          status: 'completed',
          donationDate: { $gte: thirtyDaysAgo }
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
      {
        $sort: { _id: 1 }
      }
    ]);

    // ========================================================================
    // PERFORMANCE INDICATORS
    // ========================================================================

    // Average donation per day
    const avgPerDay = daysElapsed > 0
      ? Math.round((campaign.totalRaised / daysElapsed) * 100) / 100
      : 0;

    // Required daily average to meet goal
    const requiredDailyAvg = daysRemaining > 0
      ? Math.round((amountRemaining / daysRemaining) * 100) / 100
      : 0;

    // Pace analysis
    const onTrack = timeElapsedPercent > 0
      ? progressPercent >= timeElapsedPercent
      : true;

    // ========================================================================
    // RESPONSE OBJECT
    // ========================================================================

    res.json({
      success: true,
      data: {
        campaign: {
          id: campaign._id,
          name: campaign.name,
          status: campaign.status,
          goal: campaign.goal,
          totalRaised: campaign.totalRaised,
          donationCount: campaign.donationCount,
          startDate: campaign.startDate,
          endDate: campaign.endDate
        },
        progress: {
          percent: progressPercent,
          amountRaised: campaign.totalRaised,
          amountRemaining,
          isGoalReached,
          percentageLabel: `${progressPercent}%`
        },
        timeline: {
          totalDays,
          daysElapsed: Math.min(daysElapsed, totalDays),
          daysRemaining: hasEnded ? 0 : daysRemaining,
          timeElapsedPercent,
          hasStarted,
          hasEnded,
          isActive
        },
        donationStatistics: {
          total: stats.totalAmount,
          count: stats.count,
          average: Math.round((stats.avgDonation || 0) * 100) / 100,
          median: Math.round((stats.medianDonation || 0) * 100) / 100,
          maximum: stats.maxDonation,
          minimum: stats.minDonation
        },
        donorAnalytics: {
          uniqueDonors: donors.uniqueDonors,
          repeatDonors: donors.repeatDonors,
          newDonors: donors.uniqueDonors - donors.repeatDonors,
          retentionRate: donorRetentionRate,
          largestContribution: donors.topDonor
        },
        performance: {
          averagePerDay: avgPerDay,
          requiredDailyAverage: requiredDailyAvg,
          onTrackToMeetGoal: onTrack,
          paceStatus: onTrack ? 'ahead' : 'behind',
          daysToGoalAtCurrentPace: avgPerDay > 0
            ? Math.ceil(amountRemaining / avgPerDay)
            : null
        },
        breakdown: {
          byPaymentMethod: paymentMethodStats.map(item => ({
            method: item._id,
            count: item.count,
            total: Math.round(item.total * 100) / 100,
            average: Math.round(item.average * 100) / 100,
            percentage: Math.round((item.total / campaign.totalRaised) * 100 * 100) / 100
          })),
          byDonationType: donationTypeStats.map(item => ({
            type: item._id,
            count: item.count,
            total: Math.round(item.total * 100) / 100,
            percentage: Math.round((item.total / campaign.totalRaised) * 100 * 100) / 100
          }))
        },
        recentActivity: {
          last30Days: recentDonations.map(item => ({
            date: item._id,
            count: item.count,
            total: Math.round(item.total * 100) / 100
          })),
          totalLast30Days: recentDonations.reduce((sum, item) => sum + item.total, 0)
        }
      },
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in getCampaignStats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve campaign statistics',
      message: error.message
    });
  }
};

// ============================================================================
// ADDITIONAL CAMPAIGN OPERATIONS
// ============================================================================

/**
 * Get all donations for a specific campaign
 *
 * @route GET /api/campaigns/:id/donations
 * @access Public
 */
exports.getCampaignDonations = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, status, sort = '-donationDate' } = req.query;

    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    const query = { campaign: id };
    if (status) query.status = status;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    const donations = await Donation.find(query)
      .populate('donor', 'firstName lastName email')
      .populate('season', 'name')
      .populate('cycle', 'name')
      .sort(sort)
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum)
      .lean();

    const count = await Donation.countDocuments(query);

    res.json({
      success: true,
      data: { campaign: { id: campaign._id, name: campaign.name }, donations },
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(count / limitNum)
      }
    });
  } catch (error) {
    console.error('Error in getCampaignDonations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve campaign donations',
      message: error.message
    });
  }
};

/**
 * Get top donors for a campaign
 *
 * @route GET /api/campaigns/:id/top-donors
 * @access Public
 */
exports.getTopDonors = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 10 } = req.query;

    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    const topDonors = await Donation.aggregate([
      { $match: { campaign: campaign._id, status: 'completed' } },
      {
        $group: {
          _id: '$donor',
          totalContributed: { $sum: '$amount' },
          donationCount: { $sum: 1 },
          lastDonation: { $max: '$donationDate' }
        }
      },
      { $sort: { totalContributed: -1 } },
      { $limit: parseInt(limit) },
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

    res.json({
      success: true,
      data: {
        campaign: { id: campaign._id, name: campaign.name },
        topDonors: topDonors.map((d, i) => ({
          rank: i + 1,
          donor: {
            id: d.donorInfo._id,
            firstName: d.donorInfo.firstName,
            lastName: d.donorInfo.lastName,
            email: d.donorInfo.email
          },
          totalContributed: d.totalContributed,
          donationCount: d.donationCount,
          percentageOfTotal: campaign.totalRaised > 0
            ? Math.round((d.totalContributed / campaign.totalRaised) * 10000) / 100
            : 0
        }))
      }
    });
  } catch (error) {
    console.error('Error in getTopDonors:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve top donors',
      message: error.message
    });
  }
};

/**
 * Update campaign status
 *
 * @route PATCH /api/campaigns/:id/status
 * @access Admin
 */
exports.updateCampaignStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['draft', 'active', 'paused', 'completed', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status',
        validStatuses
      });
    }

    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    const previousStatus = campaign.status;
    campaign.status = status;
    await campaign.save();

    res.json({
      success: true,
      message: `Campaign status updated to ${status}`,
      data: campaign,
      metadata: { previousStatus, currentStatus: status }
    });
  } catch (error) {
    console.error('Error in updateCampaignStatus:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update campaign status',
      message: error.message
    });
  }
};
