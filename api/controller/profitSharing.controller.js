const ProfitSharing = require('../profit_sharing/profit.sharing');

/**
 * Execute profit sharing for a season
 *
 * @route POST /api/v1/profit-sharing/execute/:seasonId
 * @access Private
 */
exports.executeProfitSharing = async (req, res) => {
  try {
    const { seasonId } = req.params;

    if (!seasonId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid season ID format',
      });
    }

    const result = await ProfitSharing.executeProfitSharing(seasonId);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error executing profit sharing:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute profit sharing',
      message: error.message,
    });
  }
};

/**
 * Simulate profit sharing for a season (preview without execution)
 *
 * @route POST /api/v1/profit-sharing/simulate/:seasonId
 * @access Private
 */
exports.simulateProfitSharing = async (req, res) => {
  try {
    const { seasonId } = req.params;

    if (!seasonId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid season ID format',
      });
    }

    const result = await ProfitSharing.simulateProfitSharing(seasonId);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error simulating profit sharing:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to simulate profit sharing',
      message: error.message,
    });
  }
};

/**
 * Get profit sharing summary for multiple seasons
 *
 * @route POST /api/v1/profit-sharing/summary
 * @access Private
 */
exports.getProfitSharingSummary = async (req, res) => {
  try {
    const { seasonIds } = req.body;

    if (!seasonIds || !Array.isArray(seasonIds) || seasonIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Season IDs array is required',
      });
    }

    // Validate all season IDs
    for (const seasonId of seasonIds) {
      if (!seasonId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({
          success: false,
          error: `Invalid season ID format: ${seasonId}`,
        });
      }
    }

    const result = await ProfitSharing.getProfitSharingSummary(seasonIds);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error getting profit sharing summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get profit sharing summary',
      message: error.message,
    });
  }
};

/**
 * Get campaign profit statistics
 *
 * @route GET /api/v1/profit-sharing/campaigns/:campaignId/stats
 * @access Private
 */
exports.getCampaignProfitStats = async (req, res) => {
  try {
    const { campaignId } = req.params;

    if (!campaignId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid campaign ID format',
      });
    }

    const result = await ProfitSharing.getCampaignProfitStats(campaignId);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error getting campaign profit stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get campaign profit stats',
      message: error.message,
    });
  }
};

/**
 * Check season eligibility for profit sharing
 *
 * @route GET /api/v1/profit-sharing/eligibility/:seasonId
 * @access Private
 */
exports.checkSeasonEligibility = async (req, res) => {
  try {
    const { seasonId } = req.params;

    if (!seasonId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid season ID format',
      });
    }

    const Season = require('../models/Season');
    const season = await Season.findById(seasonId).lean();

    if (!season) {
      return res.status(404).json({
        success: false,
        error: 'Season not found',
      });
    }

    const eligibility = ProfitSharing.checkSeasonEligibility(season);
    res.status(200).json({
      success: true,
      data: {
        seasonId,
        seasonName: season.name,
        eligibility,
      },
    });
  } catch (error) {
    console.error('Error checking season eligibility:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check season eligibility',
      message: error.message,
    });
  }
};

/**
 * Get eligible donors for profit sharing
 *
 * @route GET /api/v1/profit-sharing/donors/:seasonId
 * @access Private
 */
exports.getEligibleDonors = async (req, res) => {
  try {
    const { seasonId } = req.params;

    if (!seasonId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid season ID format',
      });
    }

    const eligibleDonors = await ProfitSharing.getEligibleDonors(seasonId);
    res.status(200).json({
      success: true,
      data: {
        seasonId,
        totalEligibleDonors: eligibleDonors.length,
        minimumDonationsRequired: ProfitSharing.MIN_DONATIONS,
        eligibleDonors,
      },
    });
  } catch (error) {
    console.error('Error getting eligible donors:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get eligible donors',
      message: error.message,
    });
  }
};

/**
 * Calculate profit for a given amount
 *
 * @route POST /api/v1/profit-sharing/calculate
 * @access Private
 */
exports.calculateProfit = async (req, res) => {
  try {
    const { totalRaised } = req.body;

    if (typeof totalRaised !== 'number' || totalRaised < 0) {
      return res.status(400).json({
        success: false,
        error: 'Total raised must be a positive number',
      });
    }

    const profitCalculation = ProfitSharing.calculateProfit(totalRaised);
    const vendorDistribution = ProfitSharing.distributeToVendors(profitCalculation.finalProfit);

    res.status(200).json({
      success: true,
      data: {
        input: { totalRaised },
        profitCalculation,
        vendorDistribution,
        breakdown: {
          agents: vendorDistribution.vendors.agents,
          stakeholders: vendorDistribution.vendors.stakeholders,
        },
      },
    });
  } catch (error) {
    console.error('Error calculating profit:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate profit',
      message: error.message,
    });
  }
};

/**
 * Get profit sharing configuration
 *
 * @route GET /api/v1/profit-sharing/config
 * @access Public
 */
exports.getProfitSharingConfig = async (req, res) => {
  try {
    const config = {
      multipliers: ProfitSharing.MULTIPLIERS,
      finalMultiplier: ProfitSharing.FINAL_MULTIPLIER,
      effectiveRate: `${Math.round(ProfitSharing.FINAL_MULTIPLIER * 10000) / 100}%`,
      minDonations: ProfitSharing.MIN_DONATIONS,
      selectedDonorsCount: ProfitSharing.SELECTED_DONORS_COUNT,
      vendorSplit: {
        agents: `${ProfitSharing.VENDOR_SPLIT.AGENTS * 100}%`,
        stakeholders: `${ProfitSharing.VENDOR_SPLIT.STAKEHOLDERS * 100}%`,
      },
      agentDistribution: {
        freelancing: `${ProfitSharing.AGENT_DISTRIBUTION.FREELANCING * 100}%`,
        corporate: `${ProfitSharing.AGENT_DISTRIBUTION.CORPORATE * 100}%`,
        major: `${ProfitSharing.AGENT_DISTRIBUTION.MAJOR * 100}%`,
      },
      stakeholderDistribution: {
        r1: `${ProfitSharing.STAKEHOLDER_DISTRIBUTION.R1 * 100}%`,
        pb: `${ProfitSharing.STAKEHOLDER_DISTRIBUTION.PB * 100}%`,
        sf: `${ProfitSharing.STAKEHOLDER_DISTRIBUTION.SF * 100}%`,
        bmg: `${ProfitSharing.STAKEHOLDER_DISTRIBUTION.BMG * 100}%`,
        new: `${ProfitSharing.STAKEHOLDER_DISTRIBUTION.NEW * 100}%`,
      },
    };

    res.status(200).json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Error getting profit sharing config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get profit sharing configuration',
      message: error.message,
    });
  }
};