/**
 * ============================================================================
 * DONOR CONTROLLER
 * ============================================================================
 *
 * This controller handles all donor-related operations including:
 * - CRUD operations (Create, Read, Update, Delete/Deactivate)
 * - Donor search and filtering
 * - Donation history tracking
 * - Donor analytics and segmentation
 * - Donor engagement metrics
 * - Communication management
 *
 * @module controllers/donorController
 * @requires models/Donor
 * @requires models/Donation
 * @requires express-validator
 */

const Donor = require('../models/Donor');
const Donation = require('../models/Donation');
const Campaign = require('../models/Campaign');
const { validationResult } = require('express-validator');

// ============================================================================
// DONOR RETRIEVAL OPERATIONS
// ============================================================================

/**
 * Get all donors with advanced filtering, search, and pagination
 *
 * @route GET /api/donors
 * @access Public
 *
 * @queryparam {string} search - Full-text search in firstName, lastName, email
 * @queryparam {string} donorType - Filter by donor type (individual, organization, foundation)
 * @queryparam {number} page - Page number for pagination (default: 1)
 * @queryparam {number} limit - Items per page (default: 10, max: 100)
 * @queryparam {string} sort - Sort field (prefix with '-' for descending)
 * @queryparam {boolean} isActive - Filter by active status (default: true)
 * @queryparam {number} minDonated - Minimum total donated amount
 * @queryparam {number} maxDonated - Maximum total donated amount
 * @queryparam {number} minDonations - Minimum number of donations
 * @queryparam {string} tags - Comma-separated list of tags to filter
 * @queryparam {string} city - Filter by city
 * @queryparam {string} state - Filter by state
 * @queryparam {string} country - Filter by country
 *
 * @returns {Object} JSON response with donors array and pagination info
 *
 * @example
 * GET /api/donors?search=john&donorType=individual&page=1&limit=20
 * GET /api/donors?minDonated=1000&sort=-totalDonated
 * GET /api/donors?tags=major-donor,recurring&state=CA
 */
exports.getAllDonors = async (req, res) => {
  try {
    const {
      search,
      donorType,
      page = 1,
      limit = 10,
      sort = '-totalDonated',
      isActive = 'true',
      minDonated,
      maxDonated,
      minDonations,
      tags,
      city,
      state,
      country
    } = req.query;

    // Validate and sanitize pagination parameters
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    // Build query object
    const query = {};

    // Active status filter (default to active donors only)
    if (isActive !== 'all') {
      query.isActive = isActive === 'true';
    }

    // Donor type filter
    if (donorType) {
      const validTypes = ['individual', 'organization', 'foundation'];
      if (validTypes.includes(donorType)) {
        query.donorType = donorType;
      }
    }

    // Full-text search on firstName, lastName, and email
    if (search) {
      query.$text = { $search: search };
    }

    // Total donated range filter
    if (minDonated || maxDonated) {
      query.totalDonated = {};
      if (minDonated) query.totalDonated.$gte = parseFloat(minDonated);
      if (maxDonated) query.totalDonated.$lte = parseFloat(maxDonated);
    }

    // Donation count filter
    if (minDonations) {
      query.donationCount = { $gte: parseInt(minDonations) };
    }

    // Tags filter (match any of the provided tags)
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      query.tags = { $in: tagArray };
    }

    // Address filters
    if (city) {
      query['address.city'] = new RegExp(city, 'i');
    }
    if (state) {
      query['address.state'] = state.toUpperCase();
    }
    if (country) {
      query['address.country'] = new RegExp(country, 'i');
    }

    // Execute query with pagination
    const donors = await Donor.find(query)
      .sort(sort)
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum)
      .select('-__v') // Exclude version key
      .lean()
      .exec();

    // Get total count for pagination
    const count = await Donor.countDocuments(query);

    // Calculate additional metrics
    const totalPages = Math.ceil(count / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    // Calculate aggregate statistics for the filtered donors
    const aggregateStats = donors.length > 0 ? {
      totalDonors: count,
      totalContributed: donors.reduce((sum, d) => sum + (d.totalDonated || 0), 0),
      avgContribution: donors.length > 0
        ? Math.round((donors.reduce((sum, d) => sum + (d.totalDonated || 0), 0) / donors.length) * 100) / 100
        : 0,
      totalDonations: donors.reduce((sum, d) => sum + (d.donationCount || 0), 0)
    } : null;

    res.json({
      success: true,
      data: donors,
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
        donorType: donorType || 'all',
        isActive: isActive !== 'all' ? isActive === 'true' : 'all',
        search: search || null,
        tags: tags || null,
        location: {
          city: city || null,
          state: state || null,
          country: country || null
        },
        sort
      },
      aggregateStats
    });
  } catch (error) {
    console.error('Error in getAllDonors:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve donors',
      message: error.message
    });
  }
};

/**
 * Get a single donor by ID with comprehensive details
 *
 * @route GET /api/donors/:id
 * @access Public
 *
 * @param {string} id - Donor MongoDB ObjectId
 *
 * @returns {Object} JSON response with donor details including:
 *   - All donor fields
 *   - Engagement metrics (first/last donation, average donation, etc.)
 *   - Donor lifetime value
 *   - Donor segment classification
 *   - Recent donation summary
 *
 * @throws {404} Donor not found
 * @throws {400} Invalid donor ID format
 *
 * @example
 * GET /api/donors/507f1f77bcf86cd799439011
 */
exports.getDonor = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid donor ID format'
      });
    }

    // Find donor
    const donor = await Donor.findById(id).lean();

    if (!donor) {
      return res.status(404).json({
        success: false,
        error: 'Donor not found',
        requestedId: id
      });
    }

    // Get donation statistics for this donor
    const donationStats = await Donation.aggregate([
      {
        $match: {
          donor: donor._id,
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
          firstDonation: { $min: '$donationDate' },
          lastDonation: { $max: '$donationDate' },
          campaigns: { $addToSet: '$campaign' }
        }
      }
    ]);

    const stats = donationStats[0] || {
      totalAmount: 0,
      count: 0,
      avgDonation: 0,
      maxDonation: 0,
      minDonation: 0,
      firstDonation: null,
      lastDonation: null,
      campaigns: []
    };

    // Calculate engagement metrics
    const now = new Date();
    const daysSinceLastDonation = stats.lastDonation
      ? Math.floor((now - new Date(stats.lastDonation)) / (1000 * 60 * 60 * 24))
      : null;

    const daysSinceFirstDonation = stats.firstDonation
      ? Math.floor((now - new Date(stats.firstDonation)) / (1000 * 60 * 60 * 24))
      : null;

    // Calculate donor lifetime (in days)
    const donorLifetimeDays = stats.firstDonation && stats.lastDonation
      ? Math.floor((new Date(stats.lastDonation) - new Date(stats.firstDonation)) / (1000 * 60 * 60 * 24))
      : 0;

    // Donor classification
    const classification = classifyDonor(donor, stats);

    // Get recent donations (last 5)
    const recentDonations = await Donation.find({
      donor: donor._id,
      status: 'completed'
    })
      .sort('-donationDate')
      .limit(5)
      .select('amount donationDate campaign paymentMethod')
      .populate('campaign', 'name')
      .lean();

    // Count donations by type
    const donationsByType = await Donation.aggregate([
      {
        $match: {
          donor: donor._id,
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

    // Enriched donor object
    const enrichedDonor = {
      ...donor,
      metrics: {
        totalDonated: stats.totalAmount,
        donationCount: stats.count,
        avgDonation: Math.round((stats.avgDonation || 0) * 100) / 100,
        maxDonation: stats.maxDonation,
        minDonation: stats.minDonation,
        firstDonationDate: stats.firstDonation,
        lastDonationDate: stats.lastDonation,
        daysSinceLastDonation,
        daysSinceFirstDonation,
        donorLifetimeDays,
        uniqueCampaigns: stats.campaigns.length,
        donationFrequency: donorLifetimeDays > 0 && stats.count > 1
          ? Math.round((stats.count / donorLifetimeDays) * 365 * 100) / 100 // Donations per year
          : 0
      },
      classification,
      engagement: {
        status: daysSinceLastDonation === null ? 'never-donated' :
                daysSinceLastDonation <= 90 ? 'active' :
                daysSinceLastDonation <= 365 ? 'at-risk' : 'lapsed',
        recency: daysSinceLastDonation,
        frequency: stats.count,
        monetary: stats.totalAmount
      },
      recentDonations: recentDonations.map(d => ({
        amount: d.amount,
        date: d.donationDate,
        campaign: d.campaign?.name || 'Unknown',
        paymentMethod: d.paymentMethod
      })),
      donationTypeBreakdown: donationsByType.map(dt => ({
        type: dt._id,
        count: dt.count,
        total: Math.round(dt.total * 100) / 100,
        percentage: stats.totalAmount > 0
          ? Math.round((dt.total / stats.totalAmount) * 100 * 100) / 100
          : 0
      }))
    };

    res.json({
      success: true,
      data: enrichedDonor
    });
  } catch (error) {
    console.error('Error in getDonor:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve donor',
      message: error.message
    });
  }
};

/**
 * Helper function to classify donors based on their giving patterns
 *
 * @param {Object} donor - Donor document
 * @param {Object} stats - Donation statistics
 * @returns {Object} Classification object
 */
function classifyDonor(donor, stats) {
  const classifications = [];
  const totalDonated = stats.totalAmount || 0;
  const donationCount = stats.count || 0;
  const avgDonation = stats.avgDonation || 0;

  // Major donor classification
  if (totalDonated >= 10000) {
    classifications.push('major-donor');
  } else if (totalDonated >= 5000) {
    classifications.push('mid-level-donor');
  } else if (totalDonated >= 1000) {
    classifications.push('sustaining-donor');
  }

  // Frequency classification
  if (donationCount >= 12) {
    classifications.push('frequent-donor');
  } else if (donationCount >= 5) {
    classifications.push('regular-donor');
  } else if (donationCount === 1) {
    classifications.push('first-time-donor');
  }

  // Average gift size
  if (avgDonation >= 1000) {
    classifications.push('high-value-donor');
  } else if (avgDonation >= 500) {
    classifications.push('mid-value-donor');
  }

  // Donor type based
  if (donor.donorType === 'foundation') {
    classifications.push('institutional-donor');
  } else if (donor.donorType === 'organization') {
    classifications.push('corporate-donor');
  }

  return {
    primary: classifications[0] || 'new-donor',
    all: classifications,
    tier: totalDonated >= 10000 ? 'platinum' :
          totalDonated >= 5000 ? 'gold' :
          totalDonated >= 1000 ? 'silver' : 'bronze'
  };
}

// ============================================================================
// DONOR CREATION AND MODIFICATION
// ============================================================================

/**
 * Create a new donor with comprehensive validation
 *
 * @route POST /api/donors
 * @access Public/Admin
 *
 * @bodyparam {string} firstName - First name (required, max 100 chars)
 * @bodyparam {string} lastName - Last name (required, max 100 chars)
 * @bodyparam {string} email - Email address (required, unique, validated)
 * @bodyparam {string} phone - Phone number (optional, validated format)
 * @bodyparam {Object} address - Address object (optional)
 * @bodyparam {string} donorType - Type: individual, organization, foundation (default: individual)
 * @bodyparam {Array} tags - Array of tags for categorization (optional)
 *
 * @returns {Object} JSON response with created donor
 *
 * @throws {400} Validation errors
 * @throws {409} Email already exists
 *
 * @example
 * POST /api/donors
 * {
 *   "firstName": "John",
 *   "lastName": "Doe",
 *   "email": "john.doe@example.com",
 *   "phone": "+1-555-0123",
 *   "donorType": "individual",
 *   "address": {
 *     "street": "123 Main St",
 *     "city": "New York",
 *     "state": "NY",
 *     "zipCode": "10001",
 *     "country": "USA"
 *   },
 *   "tags": ["newsletter-subscriber", "event-attendee"]
 * }
 */
exports.createDonor = async (req, res) => {
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
      firstName,
      lastName,
      email,
      phone,
      address,
      donorType,
      tags
    } = req.body;

    // Check for duplicate email (case-insensitive)
    const existingDonor = await Donor.findOne({
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    });

    if (existingDonor) {
      return res.status(409).json({
        success: false,
        error: 'A donor with this email already exists',
        existingDonor: {
          id: existingDonor._id,
          fullName: existingDonor.fullName,
          email: existingDonor.email,
          isActive: existingDonor.isActive,
          totalDonated: existingDonor.totalDonated
        },
        suggestion: existingDonor.isActive
          ? 'This donor is already in your system. Consider updating their information instead.'
          : 'This donor was previously deactivated. Consider reactivating them instead.'
      });
    }

    // Validate phone number format if provided
    if (phone && !phone.match(/^[\d\s\-\+\(\)]+$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number format',
        hint: 'Phone should only contain numbers, spaces, +, -, (, )'
      });
    }

    // Normalize and validate address data
    const normalizedAddress = address ? {
      street: address.street?.trim(),
      city: address.city?.trim(),
      state: address.state?.trim()?.toUpperCase(),
      zipCode: address.zipCode?.trim(),
      country: address.country?.trim() || 'USA'
    } : undefined;

    // Create donor
    const donor = await Donor.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim(),
      address: normalizedAddress,
      donorType: donorType || 'individual',
      tags: tags || [],
      isActive: true,
      totalDonated: 0,
      donationCount: 0
    });

    // Auto-add tag based on donor type
    if (donorType === 'organization' && !donor.tags.includes('corporate')) {
      donor.tags.push('corporate');
    } else if (donorType === 'foundation' && !donor.tags.includes('institutional')) {
      donor.tags.push('institutional');
    }

    if (donor.tags.length > 0) {
      await donor.save();
    }

    res.status(201).json({
      success: true,
      message: 'Donor created successfully',
      data: donor,
      metadata: {
        createdAt: donor.createdAt,
        initialClassification: 'new-donor',
        nextSteps: [
          'Add donor to mailing list',
          'Send welcome email',
          'Consider assigning to donor relations team'
        ]
      }
    });
  } catch (error) {
    console.error('Error in createDonor:', error);

    // Handle duplicate key error (backup check)
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'Email already exists',
        field: Object.keys(error.keyPattern)[0]
      });
    }

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
      error: 'Failed to create donor',
      message: error.message
    });
  }
};

/**
 * Update an existing donor
 *
 * @route PUT /api/donors/:id
 * @access Public/Admin
 *
 * @param {string} id - Donor MongoDB ObjectId
 * @bodyparam Any donor field to update (except protected fields)
 *
 * @returns {Object} JSON response with updated donor
 *
 * @throws {400} Validation errors
 * @throws {404} Donor not found
 * @throws {409} Email already in use by another donor
 *
 * @example
 * PUT /api/donors/507f1f77bcf86cd799439011
 * {
 *   "phone": "+1-555-9999",
 *   "tags": ["major-donor", "recurring-donor"],
 *   "address": {
 *     "city": "Los Angeles",
 *     "state": "CA"
 *   }
 * }
 */
exports.updateDonor = async (req, res) => {
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
        error: 'Invalid donor ID format'
      });
    }

    // Get existing donor
    const existingDonor = await Donor.findById(id);
    if (!existingDonor) {
      return res.status(404).json({
        success: false,
        error: 'Donor not found',
        requestedId: id
      });
    }

    // Prevent manual modification of calculated fields
    const protectedFields = ['totalDonated', 'donationCount', 'createdAt', 'updatedAt'];
    const attemptedProtectedUpdates = protectedFields.filter(field => req.body[field] !== undefined);

    if (attemptedProtectedUpdates.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot manually update calculated fields',
        protectedFields: attemptedProtectedUpdates,
        message: 'These fields are automatically calculated based on donations'
      });
    }

    // If email is being updated, check for duplicates
    if (req.body.email && req.body.email.toLowerCase() !== existingDonor.email.toLowerCase()) {
      const duplicateEmail = await Donor.findOne({
        email: { $regex: new RegExp(`^${req.body.email}$`, 'i') },
        _id: { $ne: id }
      });

      if (duplicateEmail) {
        return res.status(409).json({
          success: false,
          error: 'Email already in use by another donor',
          existingDonor: {
            id: duplicateEmail._id,
            fullName: duplicateEmail.fullName
          }
        });
      }
    }

    // Track what fields are being updated
    const updatedFields = Object.keys(req.body);
    const warnings = [];

    // Warning if deactivating a donor with recent donations
    if (req.body.isActive === false && existingDonor.isActive) {
      // Check for recent donations (last 90 days)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const recentDonations = await Donation.countDocuments({
        donor: id,
        donationDate: { $gte: ninetyDaysAgo }
      });

      if (recentDonations > 0) {
        warnings.push(`Deactivating donor with ${recentDonations} donation(s) in the last 90 days`);
      }
    }

    // Normalize address data if being updated
    if (req.body.address) {
      req.body.address = {
        ...existingDonor.address,
        ...req.body.address,
        state: req.body.address.state?.toUpperCase() || existingDonor.address?.state,
        country: req.body.address.country || existingDonor.address?.country || 'USA'
      };
    }

    // Update donor
    const donor = await Donor.findByIdAndUpdate(
      id,
      req.body,
      {
        new: true,
        runValidators: true,
        context: 'query'
      }
    );

    res.json({
      success: true,
      message: 'Donor updated successfully',
      data: donor,
      metadata: {
        updatedFields,
        updatedAt: donor.updatedAt,
        previousEmail: existingDonor.email !== donor.email ? existingDonor.email : undefined,
        statusChange: existingDonor.isActive !== donor.isActive
          ? { from: existingDonor.isActive, to: donor.isActive }
          : undefined
      },
      warnings: warnings.length > 0 ? warnings : undefined
    });
  } catch (error) {
    console.error('Error in updateDonor:', error);

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
      error: 'Failed to update donor',
      message: error.message
    });
  }
};

/**
 * Delete (deactivate) a donor - SOFT DELETE
 *
 * This performs a soft delete by setting isActive to false.
 * The donor record and donation history are preserved.
 *
 * @route DELETE /api/donors/:id
 * @access Admin
 *
 * @param {string} id - Donor MongoDB ObjectId
 *
 * @returns {Object} JSON response confirming deactivation
 *
 * @throws {404} Donor not found
 *
 * @example
 * DELETE /api/donors/507f1f77bcf86cd799439011
 */
exports.deleteDonor = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid donor ID format'
      });
    }

    // Find donor first
    const donor = await Donor.findById(id);

    if (!donor) {
      return res.status(404).json({
        success: false,
        error: 'Donor not found',
        requestedId: id
      });
    }

    // Check if already deactivated
    if (!donor.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Donor is already deactivated',
        donorDetails: {
          id: donor._id,
          fullName: donor.fullName,
          email: donor.email,
          deactivatedAt: donor.updatedAt
        },
        suggestion: 'Use PUT /api/donors/:id with {"isActive": true} to reactivate'
      });
    }

    // Get donor's donation summary before deactivating
    const donationSummary = await Donation.aggregate([
      {
        $match: { donor: donor._id }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          total: { $sum: '$amount' }
        }
      }
    ]);

    // Check for pending donations
    const pendingDonation = donationSummary.find(d => d._id === 'pending');
    const warnings = [];

    if (pendingDonation) {
      warnings.push(`Donor has ${pendingDonation.count} pending donation(s) totaling $${pendingDonation.total}`);
    }

    // Soft delete - set isActive to false
    donor.isActive = false;
    await donor.save();

    res.json({
      success: true,
      message: 'Donor deactivated successfully',
      data: {
        id: donor._id,
        fullName: donor.fullName,
        email: donor.email,
        isActive: donor.isActive,
        deactivatedAt: donor.updatedAt
      },
      donationHistory: {
        totalDonated: donor.totalDonated,
        donationCount: donor.donationCount,
        breakdown: donationSummary
      },
      warnings: warnings.length > 0 ? warnings : undefined,
      note: 'This is a soft delete. Donor data and donation history are preserved. To reactivate, update isActive to true.'
    });
  } catch (error) {
    console.error('Error in deleteDonor:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to deactivate donor',
      message: error.message
    });
  }
};

// ============================================================================
// DONOR ANALYTICS AND HISTORY
// ============================================================================

/**
 * Get comprehensive donation history for a donor
 *
 * @route GET /api/donors/:id/history
 * @access Public
 *
 * @param {string} id - Donor MongoDB ObjectId
 * @queryparam {number} page - Page number (default: 1)
 * @queryparam {number} limit - Items per page (default: 10)
 * @queryparam {string} status - Filter by donation status
 * @queryparam {string} campaign - Filter by campaign ID
 * @queryparam {string} sort - Sort order (default: '-donationDate')
 * @queryparam {string} startDate - Filter donations from this date
 * @queryparam {string} endDate - Filter donations until this date
 *
 * @returns {Object} Donor details with paginated donation history and analytics
 *
 * @throws {404} Donor not found
 *
 * @example
 * GET /api/donors/507f1f77bcf86cd799439011/history?page=1&limit=20
 * GET /api/donors/507f1f77bcf86cd799439011/history?status=completed&campaign=xyz
 */
exports.getDonorHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      page = 1,
      limit = 10,
      status,
      campaign,
      sort = '-donationDate',
      startDate,
      endDate
    } = req.query;

    // Validate donor exists
    const donor = await Donor.findById(id);

    if (!donor) {
      return res.status(404).json({
        success: false,
        error: 'Donor not found',
        requestedId: id
      });
    }

    // Build donation query
    const donationQuery = { donor: donor._id };

    if (status) donationQuery.status = status;
    if (campaign) donationQuery.campaign = campaign;

    // Date range filter
    if (startDate || endDate) {
      donationQuery.donationDate = {};
      if (startDate) donationQuery.donationDate.$gte = new Date(startDate);
      if (endDate) donationQuery.donationDate.$lte = new Date(endDate);
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    // Get donations
    const donations = await Donation.find(donationQuery)
      .populate('campaign', 'name status')
      .populate('season', 'name')
      .populate('cycle', 'name cycleNumber')
      .sort(sort)
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum)
      .lean();

    const count = await Donation.countDocuments(donationQuery);

    // Get comprehensive statistics
    const stats = await Donation.aggregate([
      { $match: { donor: donor._id, status: 'completed' } },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
          avgDonation: { $avg: '$amount' },
          maxDonation: { $max: '$amount' },
          minDonation: { $min: '$amount' },
          firstDonation: { $min: '$donationDate' },
          lastDonation: { $max: '$donationDate' }
        }
      }
    ]);

    const donationStats = stats[0] || {
      totalAmount: 0,
      count: 0,
      avgDonation: 0,
      maxDonation: 0,
      minDonation: 0,
      firstDonation: null,
      lastDonation: null
    };

    // Get donations by year
    const donationsByYear = await Donation.aggregate([
      { $match: { donor: donor._id, status: 'completed' } },
      {
        $group: {
          _id: { $year: '$donationDate' },
          count: { $sum: 1 },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    // Get donations by campaign
    const donationsByCampaign = await Donation.aggregate([
      { $match: { donor: donor._id, status: 'completed' } },
      {
        $group: {
          _id: '$campaign',
          count: { $sum: 1 },
          total: { $sum: '$amount' },
          lastDonation: { $max: '$donationDate' }
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

    // Get donations by payment method
    const donationsByPaymentMethod = await Donation.aggregate([
      { $match: { donor: donor._id, status: 'completed' } },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Calculate giving consistency (donations per month since first donation)
    const monthsSinceFirst = donationStats.firstDonation
      ? Math.max(1, Math.ceil((new Date() - new Date(donationStats.firstDonation)) / (1000 * 60 * 60 * 24 * 30)))
      : 0;

    const givingConsistency = monthsSinceFirst > 0
      ? Math.round((donationStats.count / monthsSinceFirst) * 100) / 100
      : 0;

    res.json({
      success: true,
      data: {
        donor: {
          id: donor._id,
          fullName: donor.fullName,
          email: donor.email,
          donorType: donor.donorType,
          isActive: donor.isActive,
          totalDonated: donor.totalDonated,
          donationCount: donor.donationCount,
          tags: donor.tags
        },
        donations,
        statistics: {
          lifetime: {
            totalAmount: donationStats.totalAmount,
            donationCount: donationStats.count,
            avgDonation: Math.round((donationStats.avgDonation || 0) * 100) / 100,
            maxDonation: donationStats.maxDonation,
            minDonation: donationStats.minDonation,
            firstDonation: donationStats.firstDonation,
            lastDonation: donationStats.lastDonation
          },
          engagement: {
            daysSinceFirst: donationStats.firstDonation
              ? Math.floor((new Date() - new Date(donationStats.firstDonation)) / (1000 * 60 * 60 * 24))
              : null,
            daysSinceLast: donationStats.lastDonation
              ? Math.floor((new Date() - new Date(donationStats.lastDonation)) / (1000 * 60 * 60 * 24))
              : null,
            givingConsistency, // Donations per month
            averageGap: donationStats.count > 1 && donationStats.firstDonation && donationStats.lastDonation
              ? Math.round((new Date(donationStats.lastDonation) - new Date(donationStats.firstDonation)) / (1000 * 60 * 60 * 24) / (donationStats.count - 1))
              : null
          },
          breakdown: {
            byYear: donationsByYear.map(y => ({
              year: y._id,
              count: y.count,
              total: Math.round(y.total * 100) / 100
            })),
            byCampaign: donationsByCampaign.map(c => ({
              campaign: {
                id: c.campaignInfo._id,
                name: c.campaignInfo.name
              },
              count: c.count,
              total: Math.round(c.total * 100) / 100,
              lastDonation: c.lastDonation
            })),
            byPaymentMethod: donationsByPaymentMethod.map(pm => ({
              method: pm._id,
              count: pm.count,
              total: Math.round(pm.total * 100) / 100,
              percentage: donationStats.totalAmount > 0
                ? Math.round((pm.total / donationStats.totalAmount) * 100 * 100) / 100
                : 0
            }))
          }
        }
      },
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(count / limitNum),
        hasNextPage: pageNum < Math.ceil(count / limitNum),
        hasPrevPage: pageNum > 1
      },
      filters: {
        status: status || 'all',
        campaign: campaign || 'all',
        dateRange: {
          start: startDate || null,
          end: endDate || null
        },
        sort
      }
    });
  } catch (error) {
    console.error('Error in getDonorHistory:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve donor history',
      message: error.message
    });
  }
};

// ============================================================================
// ADDITIONAL DONOR OPERATIONS
// ============================================================================

/**
 * Get donor segments based on RFM analysis
 * (Recency, Frequency, Monetary)
 *
 * @route GET /api/donors/segments
 * @access Admin
 */
exports.getDonorSegments = async (req, res) => {
  try {
    const now = new Date();
    const donors = await Donor.find({ isActive: true }).lean();

    const segments = {
      champions: [],      // High frequency, high monetary, recent
      loyalists: [],      // High frequency, recent
      potentialLoyalists: [], // Medium frequency, recent
      recentDonors: [],   // Low frequency, very recent
      promising: [],      // Medium monetary, medium frequency
      needsAttention: [],  // High monetary, low frequency, not recent
      atRisk: [],         // Good history, not recent
      hibernating: [],    // Low frequency, not recent
      lost: []           // Not donated in over a year
    };

    for (const donor of donors) {
      const donationStats = await Donation.aggregate([
        { $match: { donor: donor._id, status: 'completed' } },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 },
            lastDonation: { $max: '$donationDate' }
          }
        }
      ]);

      if (donationStats.length === 0) continue;

      const stats = donationStats[0];
      const daysSinceLast = Math.floor((now - new Date(stats.lastDonation)) / (1000 * 60 * 60 * 24));

      const donorInfo = {
        id: donor._id,
        fullName: `${donor.firstName} ${donor.lastName}`,
        email: donor.email,
        totalDonated: stats.totalAmount,
        donationCount: stats.count,
        daysSinceLast,
        lastDonation: stats.lastDonation
      };

      // Segment classification logic
      if (stats.count >= 5 && stats.totalAmount >= 1000 && daysSinceLast <= 90) {
        segments.champions.push(donorInfo);
      } else if (stats.count >= 5 && daysSinceLast <= 180) {
        segments.loyalists.push(donorInfo);
      } else if (stats.count >= 3 && daysSinceLast <= 90) {
        segments.potentialLoyalists.push(donorInfo);
      } else if (stats.count <= 2 && daysSinceLast <= 30) {
        segments.recentDonors.push(donorInfo);
      } else if (stats.totalAmount >= 500 && stats.count >= 2 && daysSinceLast <= 180) {
        segments.promising.push(donorInfo);
      } else if (stats.totalAmount >= 1000 && stats.count <= 3 && daysSinceLast > 180) {
        segments.needsAttention.push(donorInfo);
      } else if (stats.count >= 3 && daysSinceLast > 180 && daysSinceLast <= 365) {
        segments.atRisk.push(donorInfo);
      } else if (daysSinceLast > 365 && daysSinceLast <= 730) {
        segments.hibernating.push(donorInfo);
      } else if (daysSinceLast > 730) {
        segments.lost.push(donorInfo);
      }
    }

    res.json({
      success: true,
      data: {
        segments,
        summary: {
          champions: segments.champions.length,
          loyalists: segments.loyalists.length,
          potentialLoyalists: segments.potentialLoyalists.length,
          recentDonors: segments.recentDonors.length,
          promising: segments.promising.length,
          needsAttention: segments.needsAttention.length,
          atRisk: segments.atRisk.length,
          hibernating: segments.hibernating.length,
          lost: segments.lost.length,
          total: donors.length
        }
      },
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in getDonorSegments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate donor segments',
      message: error.message
    });
  }
};

/**
 * Merge duplicate donors
 *
 * @route POST /api/donors/merge
 * @access Admin
 */
exports.mergeDonors = async (req, res) => {
  try {
    const { primaryDonorId, duplicateDonorId } = req.body;

    if (!primaryDonorId || !duplicateDonorId) {
      return res.status(400).json({
        success: false,
        error: 'Both primaryDonorId and duplicateDonorId are required'
      });
    }

    if (primaryDonorId === duplicateDonorId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot merge a donor with itself'
      });
    }

    const [primaryDonor, duplicateDonor] = await Promise.all([
      Donor.findById(primaryDonorId),
      Donor.findById(duplicateDonorId)
    ]);

    if (!primaryDonor || !duplicateDonor) {
      return res.status(404).json({
        success: false,
        error: 'One or both donors not found'
      });
    }

    // Transfer all donations from duplicate to primary
    const updateResult = await Donation.updateMany(
      { donor: duplicateDonor._id },
      { $set: { donor: primaryDonor._id } }
    );

    // Merge tags (unique)
    const mergedTags = [...new Set([...primaryDonor.tags, ...duplicateDonor.tags])];

    // Update primary donor
    primaryDonor.tags = mergedTags;

    // Optionally merge phone numbers if primary doesn't have one
    if (!primaryDonor.phone && duplicateDonor.phone) {
      primaryDonor.phone = duplicateDonor.phone;
    }

    // Save primary and deactivate duplicate
    await primaryDonor.save();
    duplicateDonor.isActive = false;
    await duplicateDonor.save();

    // Recalculate totals will happen automatically via donation hooks

    res.json({
      success: true,
      message: 'Donors merged successfully',
      data: {
        primaryDonor: {
          id: primaryDonor._id,
          fullName: primaryDonor.fullName,
          email: primaryDonor.email
        },
        duplicateDonor: {
          id: duplicateDonor._id,
          fullName: duplicateDonor.fullName,
          email: duplicateDonor.email,
          status: 'deactivated'
        },
        donationsTransferred: updateResult.modifiedCount,
        mergedTags
      }
    });
  } catch (error) {
    console.error('Error in mergeDonors:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to merge donors',
      message: error.message
    });
  }
};

/**
 * Get donor retention analytics
 *
 * @route GET /api/donors/retention
 * @access Admin
 */
exports.getDonorRetention = async (req, res) => {
  try {
    const { year } = req.query;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    // Get all donors who donated in target year
    const startOfYear = new Date(targetYear, 0, 1);
    const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59);

    const donorsInYear = await Donation.distinct('donor', {
      donationDate: { $gte: startOfYear, $lte: endOfYear },
      status: 'completed'
    });

    // Check how many donated in the following year
    const startOfNextYear = new Date(targetYear + 1, 0, 1);
    const endOfNextYear = new Date(targetYear + 1, 11, 31, 23, 59, 59);

    const retainedDonors = await Donation.distinct('donor', {
      donor: { $in: donorsInYear },
      donationDate: { $gte: startOfNextYear, $lte: endOfNextYear },
      status: 'completed'
    });

    const retentionRate = donorsInYear.length > 0
      ? Math.round((retainedDonors.length / donorsInYear.length) * 100 * 100) / 100
      : 0;

    // Get new donors in target year
    const newDonors = [];
    for (const donorId of donorsInYear) {
      const firstDonation = await Donation.findOne({ donor: donorId, status: 'completed' })
        .sort('donationDate')
        .lean();

      if (firstDonation && new Date(firstDonation.donationDate).getFullYear() === targetYear) {
        newDonors.push(donorId);
      }
    }

    res.json({
      success: true,
      data: {
        year: targetYear,
        metrics: {
          totalDonors: donorsInYear.length,
          retainedDonors: retainedDonors.length,
          lostDonors: donorsInYear.length - retainedDonors.length,
          retentionRate,
          newDonors: newDonors.length,
          returningDonors: donorsInYear.length - newDonors.length
        }
      }
    });
  } catch (error) {
    console.error('Error in getDonorRetention:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate donor retention',
      message: error.message
    });
  }
};

/**
 * Reactivate a deactivated donor
 *
 * @route PATCH /api/donors/:id/reactivate
 * @access Admin
 */
exports.reactivateDonor = async (req, res) => {
  try {
    const { id } = req.params;

    const donor = await Donor.findById(id);

    if (!donor) {
      return res.status(404).json({
        success: false,
        error: 'Donor not found'
      });
    }

    if (donor.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Donor is already active'
      });
    }

    donor.isActive = true;
    await donor.save();

    res.json({
      success: true,
      message: 'Donor reactivated successfully',
      data: donor
    });
  } catch (error) {
    console.error('Error in reactivateDonor:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reactivate donor',
      message: error.message
    });
  }
};

/**
 * Get donor communication preferences and history
 *
 * @route GET /api/donors/:id/communications
 * @access Admin
 */
exports.getDonorCommunications = async (req, res) => {
  try {
    const { id } = req.params;

    const donor = await Donor.findById(id);

    if (!donor) {
      return res.status(404).json({
        success: false,
        error: 'Donor not found'
      });
    }

    // Get donation receipts sent
    const receipts = await Donation.countDocuments({
      donor: donor._id,
      receiptSent: true
    });

    // Get thank you opportunities (donations without receipts)
    const pendingThanks = await Donation.countDocuments({
      donor: donor._id,
      status: 'completed',
      receiptSent: false
    });

    res.json({
      success: true,
      data: {
        donor: {
          id: donor._id,
          fullName: donor.fullName,
          email: donor.email,
          phone: donor.phone
        },
        communications: {
          receiptsSent: receipts,
          pendingThankYous: pendingThanks,
          preferredContact: donor.phone && donor.email ? 'both' : donor.email ? 'email' : 'mail',
          tags: donor.tags
        },
        recommendations: pendingThanks > 0 ? [
          `Send thank you for ${pendingThanks} recent donation(s)`,
          'Update communication preferences',
          'Schedule follow-up contact'
        ] : [
          'All acknowledgments sent',
          'Consider engagement campaign'
        ]
      }
    });
  } catch (error) {
    console.error('Error in getDonorCommunications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve communications',
      message: error.message
    });
  }
};
