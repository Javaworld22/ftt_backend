/**
 * ============================================================================
 * PROFIT SHARING CLASS
 * ============================================================================
 *
 * This class handles the profit sharing mechanism for seasons:
 * - Randomly selects 2 eligible donors when season reaches goal
 * - Eligibility: Donors must have donated at least 5 times
 * - Profit calculation: totalRaised × 1.8 × 0.1 × 0.44 × 0.63
 * - Distribution: Split between 2 vendors (agents and stakeholders)
 *
 * AGENTS BREAKDOWN (50% of profit):
 * - Freelancing Agent: 39.49%
 * - Corporate Agent: 30.50%
 * - Major Agent: $10,000 per $1,000,000 raised
 * - Miscellaneous: Remainder
 *
 * STAKEHOLDERS BREAKDOWN (50% of profit):
 * - R1: 5%
 * - PB: 15%
 * - SF: 20%
 * - BMG: 60%
 *
 * @class ProfitSharing
 * @requires models/Season
 * @requires models/Donor
 * @requires models/Donation
 * @requires models/ProfitDistribution (to be created)
 */

const Season = require('../models/Season');
const Donor = require('../models/Donor');
const Donation = require('../models/Donation');
const mongoose = require('mongoose');

class ProfitSharing {
  /**
   * Profit calculation multipliers (applied sequentially)
   * Formula: totalRaised × 1.8 × 0.1 × 0.44 × 0.63
   */
  static MULTIPLIERS = {
    INITIAL: 1.8,      // 180% of total raised
    FIRST: 0.1,        // 10% of result
    SECOND: 0.44,      // 44% of result
    FINAL: 0.63        // 63% of result
  };

  /**
   * Final multiplier (product of all multipliers)
   * 1.8 × 0.1 × 0.44 × 0.63 = 0.049896 (~4.99% of total raised)
   */
  static FINAL_MULTIPLIER =
    ProfitSharing.MULTIPLIERS.INITIAL *
    ProfitSharing.MULTIPLIERS.FIRST *
    ProfitSharing.MULTIPLIERS.SECOND *
    ProfitSharing.MULTIPLIERS.FINAL;

  /**
   * Minimum donations required for donor eligibility
   */
  static MIN_DONATIONS = 5;

  /**
   * Number of donors to select for profit sharing
   */
  static SELECTED_DONORS_COUNT = 2;

  /**
   * Vendor distribution (50-50 split between agents and stakeholders)
   */
  static VENDOR_SPLIT = {
    AGENTS: 0.5,        // 50% to agents
    STAKEHOLDERS: 0.5   // 50% to stakeholders
  };

  /**
   * Agent distribution percentages (from 50% agents share)
   */
  static AGENT_DISTRIBUTION = {
    FREELANCING: 0.3949,    // 39.49%
    CORPORATE: 0.3050,      // 30.50%
    MAJOR_PER_MILLION: 10000, // $10,000 per $1,000,000 raised
    // MISCELLANEOUS: remainder after above allocations
  };

  /**
   * Stakeholder distribution percentages (from 50% stakeholders share)
   */
  static STAKEHOLDER_DISTRIBUTION = {
    R1: 0.05,    // 5%
    PB: 0.15,    // 15%
    SF: 0.20,    // 20%
    BMG: 0.60    // 60%
  };

  /**
   * Check if a season is eligible for profit sharing
   *
   * @param {Object} season - Season document
   * @returns {Object} Eligibility result with details
   */
  static checkSeasonEligibility(season) {
    const result = {
      isEligible: false,
      reason: null,
      details: {}
    };

    // Check if season exists
    if (!season) {
      result.reason = 'Season not found';
      return result;
    }

    // Check if season has a goal
    if (!season.goal || season.goal <= 0) {
      result.reason = 'Season has no goal set';
      result.details = { goal: season.goal };
      return result;
    }

    // Check if season goal is reached
    const isGoalReached = season.totalRaised >= season.goal;
    if (!isGoalReached) {
      result.reason = 'Season goal not yet reached';
      result.details = {
        goal: season.goal,
        raised: season.totalRaised,
        remaining: season.goal - season.totalRaised,
        progressPercent: Math.round((season.totalRaised / season.goal) * 100 * 100) / 100
      };
      return result;
    }

    // Check if season is completed or active
    if (season.status !== 'completed' && season.status !== 'active') {
      result.reason = `Season status is '${season.status}' (must be 'active' or 'completed')`;
      result.details = { status: season.status };
      return result;
    }

    // All checks passed
    result.isEligible = true;
    result.reason = 'Season is eligible for profit sharing';
    result.details = {
      goal: season.goal,
      raised: season.totalRaised,
      progressPercent: 100,
      status: season.status
    };

    return result;
  }

  /**
   * Get eligible donors for a season
   * Donors must have donated at least MIN_DONATIONS times
   *
   * @param {string} seasonId - Season MongoDB ObjectId
   * @returns {Array} Array of eligible donor objects with donation counts
   */
  static async getEligibleDonors(seasonId) {
    try {
      // Aggregate donations by donor for this season
      const donorStats = await Donation.aggregate([
        {
          $match: {
            season: mongoose.Types.ObjectId(seasonId),
            status: 'completed'
          }
        },
        {
          $group: {
            _id: '$donor',
            donationCount: { $sum: 1 },
            totalContributed: { $sum: '$amount' },
            firstDonation: { $min: '$donationDate' },
            lastDonation: { $max: '$donationDate' }
          }
        },
        {
          $match: {
            donationCount: { $gte: ProfitSharing.MIN_DONATIONS }
          }
        },
        {
          $lookup: {
            from: 'donors',
            localField: '_id',
            foreignField: '_id',
            as: 'donorInfo'
          }
        },
        {
          $unwind: '$donorInfo'
        },
        {
          $match: {
            'donorInfo.isActive': true
          }
        },
        {
          $project: {
            donorId: '$_id',
            donor: {
              id: '$donorInfo._id',
              firstName: '$donorInfo.firstName',
              lastName: '$donorInfo.lastName',
              email: '$donorInfo.email',
              donorType: '$donorInfo.donorType'
            },
            donationCount: 1,
            totalContributed: 1,
            firstDonation: 1,
            lastDonation: 1
          }
        }
      ]);

      return donorStats;
    } catch (error) {
      console.error('Error getting eligible donors:', error);
      throw error;
    }
  }

  /**
   * Randomly select donors from eligible pool
   * Uses Fisher-Yates shuffle for fair random selection
   *
   * @param {Array} eligibleDonors - Array of eligible donor objects
   * @param {number} count - Number of donors to select
   * @returns {Array} Array of selected donors
   */
  static selectRandomDonors(eligibleDonors, count = ProfitSharing.SELECTED_DONORS_COUNT) {
    if (eligibleDonors.length === 0) {
      return [];
    }

    // If we have fewer eligible donors than needed, return all
    if (eligibleDonors.length <= count) {
      return [...eligibleDonors];
    }

    // Fisher-Yates shuffle algorithm
    const shuffled = [...eligibleDonors];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Return first 'count' donors
    return shuffled.slice(0, count);
  }

  /**
   * Calculate profit amount based on season's total raised
   * Formula: totalRaised × 1.8 × 0.1 × 0.44 × 0.63
   *
   * @param {number} totalRaised - Season's total amount raised
   * @returns {Object} Profit calculation breakdown
   */
  static calculateProfit(totalRaised) {
    const step1 = totalRaised * ProfitSharing.MULTIPLIERS.INITIAL;
    const step2 = step1 * ProfitSharing.MULTIPLIERS.FIRST;
    const step3 = step2 * ProfitSharing.MULTIPLIERS.SECOND;
    const finalProfit = step3 * ProfitSharing.MULTIPLIERS.FINAL;

    return {
      totalRaised,
      calculations: {
        step1: {
          formula: `${totalRaised} × ${ProfitSharing.MULTIPLIERS.INITIAL}`,
          result: Math.round(step1 * 100) / 100
        },
        step2: {
          formula: `${Math.round(step1 * 100) / 100} × ${ProfitSharing.MULTIPLIERS.FIRST}`,
          result: Math.round(step2 * 100) / 100
        },
        step3: {
          formula: `${Math.round(step2 * 100) / 100} × ${ProfitSharing.MULTIPLIERS.SECOND}`,
          result: Math.round(step3 * 100) / 100
        },
        step4: {
          formula: `${Math.round(step3 * 100) / 100} × ${ProfitSharing.MULTIPLIERS.FINAL}`,
          result: Math.round(finalProfit * 100) / 100
        }
      },
      finalProfit: Math.round(finalProfit * 100) / 100,
      effectiveRate: `${Math.round(ProfitSharing.FINAL_MULTIPLIER * 10000) / 100}%`
    };
  }

  /**
   * Calculate agent distribution breakdown
   *
   * @param {number} agentsShare - Total amount for agents (50% of profit)
   * @param {number} totalRaised - Season's total raised (for major agent calculation)
   * @returns {Object} Detailed agent distribution
   */
  static calculateAgentDistribution(agentsShare, totalRaised) {
    // Calculate major agent share based on millions raised
    const millionsRaised = totalRaised / 1000000;
    const majorAgentShare = millionsRaised * ProfitSharing.AGENT_DISTRIBUTION.MAJOR_PER_MILLION;

    // Calculate freelancing and corporate shares
    const freelancingShare = agentsShare * ProfitSharing.AGENT_DISTRIBUTION.FREELANCING;
    const corporateShare = agentsShare * ProfitSharing.AGENT_DISTRIBUTION.CORPORATE;

    // Miscellaneous gets the remainder
    const allocatedTotal = freelancingShare + corporateShare + majorAgentShare;
    const miscellaneousShare = Math.max(0, agentsShare - allocatedTotal);

    // Calculate percentages of total agents share
    const calculatePercentage = (amount) => agentsShare > 0
      ? Math.round((amount / agentsShare) * 100 * 100) / 100
      : 0;

    return {
      total: Math.round(agentsShare * 100) / 100,
      breakdown: {
        freelancing: {
          amount: Math.round(freelancingShare * 100) / 100,
          percentage: 39.49,
          description: 'Freelancing Agent'
        },
        corporate: {
          amount: Math.round(corporateShare * 100) / 100,
          percentage: 30.50,
          description: 'Corporate Agent'
        },
        major: {
          amount: Math.round(majorAgentShare * 100) / 100,
          percentage: calculatePercentage(majorAgentShare),
          description: 'Major Agent',
          calculation: {
            millionsRaised: Math.round(millionsRaised * 100) / 100,
            ratePerMillion: ProfitSharing.AGENT_DISTRIBUTION.MAJOR_PER_MILLION,
            formula: `${Math.round(millionsRaised * 100) / 100} × $${ProfitSharing.AGENT_DISTRIBUTION.MAJOR_PER_MILLION.toLocaleString()}`
          }
        },
        miscellaneous: {
          amount: Math.round(miscellaneousShare * 100) / 100,
          percentage: calculatePercentage(miscellaneousShare),
          description: 'Miscellaneous'
        }
      },
      verification: {
        totalAllocated: Math.round((freelancingShare + corporateShare + majorAgentShare + miscellaneousShare) * 100) / 100,
        matches: Math.abs(agentsShare - (freelancingShare + corporateShare + majorAgentShare + miscellaneousShare)) < 0.01
      }
    };
  }

  /**
   * Calculate stakeholder distribution breakdown
   *
   * @param {number} stakeholdersShare - Total amount for stakeholders (50% of profit)
   * @returns {Object} Detailed stakeholder distribution
   */
  static calculateStakeholderDistribution(stakeholdersShare) {
    const r1Share = stakeholdersShare * ProfitSharing.STAKEHOLDER_DISTRIBUTION.R1;
    const pbShare = stakeholdersShare * ProfitSharing.STAKEHOLDER_DISTRIBUTION.PB;
    const sfShare = stakeholdersShare * ProfitSharing.STAKEHOLDER_DISTRIBUTION.SF;
    const bmgShare = stakeholdersShare * ProfitSharing.STAKEHOLDER_DISTRIBUTION.BMG;

    return {
      total: Math.round(stakeholdersShare * 100) / 100,
      breakdown: {
        r1: {
          amount: Math.round(r1Share * 100) / 100,
          percentage: 5,
          description: 'R1'
        },
        pb: {
          amount: Math.round(pbShare * 100) / 100,
          percentage: 15,
          description: 'PB'
        },
        sf: {
          amount: Math.round(sfShare * 100) / 100,
          percentage: 20,
          description: 'SF'
        },
        bmg: {
          amount: Math.round(bmgShare * 100) / 100,
          percentage: 60,
          description: 'BMG'
        }
      },
      verification: {
        totalAllocated: Math.round((r1Share + pbShare + sfShare + bmgShare) * 100) / 100,
        matches: Math.abs(stakeholdersShare - (r1Share + pbShare + sfShare + bmgShare)) < 0.01
      }
    };
  }

  /**
   * Distribute profit between vendors (agents and stakeholders) with detailed breakdown
   *
   * @param {number} totalProfit - Total profit to distribute
   * @param {number} totalRaised - Season's total raised (for major agent calculation)
   * @returns {Object} Vendor distribution breakdown with sub-allocations
   */
  static distributeToVendors(totalProfit, totalRaised) {
    const agentsShare = totalProfit * ProfitSharing.VENDOR_SPLIT.AGENTS;
    const stakeholdersShare = totalProfit * ProfitSharing.VENDOR_SPLIT.STAKEHOLDERS;

    // Get detailed breakdowns
    const agentDistribution = ProfitSharing.calculateAgentDistribution(agentsShare, totalRaised);
    const stakeholderDistribution = ProfitSharing.calculateStakeholderDistribution(stakeholdersShare);

    return {
      totalProfit: Math.round(totalProfit * 100) / 100,
      vendors: {
        agents: {
          total: Math.round(agentsShare * 100) / 100,
          percentage: ProfitSharing.VENDOR_SPLIT.AGENTS * 100,
          distribution: agentDistribution
        },
        stakeholders: {
          total: Math.round(stakeholdersShare * 100) / 100,
          percentage: ProfitSharing.VENDOR_SPLIT.STAKEHOLDERS * 100,
          distribution: stakeholderDistribution
        }
      },
      verification: {
        totalDistributed: Math.round((agentsShare + stakeholdersShare) * 100) / 100,
        matches: Math.abs(totalProfit - (agentsShare + stakeholdersShare)) < 0.01
      },
      summary: {
        // Agent summary
        freelancingAgent: agentDistribution.breakdown.freelancing.amount,
        corporateAgent: agentDistribution.breakdown.corporate.amount,
        majorAgent: agentDistribution.breakdown.major.amount,
        miscellaneous: agentDistribution.breakdown.miscellaneous.amount,
        // Stakeholder summary
        r1: stakeholderDistribution.breakdown.r1.amount,
        pb: stakeholderDistribution.breakdown.pb.amount,
        sf: stakeholderDistribution.breakdown.sf.amount,
        bmg: stakeholderDistribution.breakdown.bmg.amount
      }
    };
  }

  /**
   * Execute complete profit sharing process for a season
   *
   * @param {string} seasonId - Season MongoDB ObjectId
   * @returns {Object} Complete profit sharing result
   */
  static async executeProfitSharing(seasonId) {
    try {
      // Step 1: Get season
      const season = await Season.findById(seasonId)
        .populate('campaign', 'name')
        .lean();

      if (!season) {
        return {
          success: false,
          error: 'Season not found',
          seasonId
        };
      }

      // Step 2: Check eligibility
      const eligibility = ProfitSharing.checkSeasonEligibility(season);
      if (!eligibility.isEligible) {
        return {
          success: false,
          error: eligibility.reason,
          details: eligibility.details,
          season: {
            id: season._id,
            name: season.name,
            campaign: season.campaign?.name
          }
        };
      }

      // Step 3: Get eligible donors
      const eligibleDonors = await ProfitSharing.getEligibleDonors(seasonId);

      if (eligibleDonors.length === 0) {
        return {
          success: false,
          error: 'No eligible donors found',
          message: `No donors have made at least ${ProfitSharing.MIN_DONATIONS} donations to this season`,
          season: {
            id: season._id,
            name: season.name,
            totalDonations: season.donationCount
          }
        };
      }

      if (eligibleDonors.length < ProfitSharing.SELECTED_DONORS_COUNT) {
        return {
          success: false,
          error: 'Insufficient eligible donors',
          message: `Found only ${eligibleDonors.length} eligible donor(s), but ${ProfitSharing.SELECTED_DONORS_COUNT} are required`,
          eligibleDonors: eligibleDonors.map(d => ({
            fullName: `${d.donor.firstName} ${d.donor.lastName}`,
            email: d.donor.email,
            donationCount: d.donationCount
          }))
        };
      }

      // Step 4: Select random donors
      const selectedDonors = ProfitSharing.selectRandomDonors(eligibleDonors);

      // Step 5: Calculate profit
      const profitCalculation = ProfitSharing.calculateProfit(season.totalRaised);

      // Step 6: Distribute to vendors with detailed breakdown
      const vendorDistribution = ProfitSharing.distributeToVendors(
        profitCalculation.finalProfit,
        season.totalRaised
      );

      // Step 7: Prepare result
      const result = {
        success: true,
        message: 'Profit sharing executed successfully',
        season: {
          id: season._id,
          name: season.name,
          campaign: season.campaign?.name || 'Unknown',
          goal: season.goal,
          totalRaised: season.totalRaised,
          donationCount: season.donationCount,
          status: season.status
        },
        eligibility: {
          totalEligibleDonors: eligibleDonors.length,
          minimumDonationsRequired: ProfitSharing.MIN_DONATIONS,
          allEligibleDonors: eligibleDonors.map(d => ({
            fullName: `${d.donor.firstName} ${d.donor.lastName}`,
            email: d.donor.email,
            donationCount: d.donationCount,
            totalContributed: Math.round(d.totalContributed * 100) / 100
          }))
        },
        selectedDonors: selectedDonors.map((d, index) => ({
          rank: index + 1,
          donor: {
            id: d.donor.id,
            fullName: `${d.donor.firstName} ${d.donor.lastName}`,
            email: d.donor.email,
            donorType: d.donor.donorType
          },
          contributions: {
            donationCount: d.donationCount,
            totalContributed: Math.round(d.totalContributed * 100) / 100,
            firstDonation: d.firstDonation,
            lastDonation: d.lastDonation
          }
        })),
        profitCalculation,
        vendorDistribution,
        executedAt: new Date().toISOString()
      };

      return result;
    } catch (error) {
      console.error('Error executing profit sharing:', error);
      return {
        success: false,
        error: 'Failed to execute profit sharing',
        message: error.message
      };
    }
  }

  /**
   * Get profit sharing summary for multiple seasons
   *
   * @param {Array} seasonIds - Array of season IDs
   * @returns {Object} Summary of profit sharing across seasons
   */
  static async getProfitSharingSummary(seasonIds) {
    try {
      const results = await Promise.all(
        seasonIds.map(id => ProfitSharing.executeProfitSharing(id))
      );

      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      const totalProfit = successful.reduce(
        (sum, r) => sum + (r.profitCalculation?.finalProfit || 0),
        0
      );

      const totalToAgents = successful.reduce(
        (sum, r) => sum + (r.vendorDistribution?.vendors.agents.amount || 0),
        0
      );

      const totalToStakeholders = successful.reduce(
        (sum, r) => sum + (r.vendorDistribution?.vendors.stakeholders.amount || 0),
        0
      );

      return {
        summary: {
          totalSeasons: seasonIds.length,
          successful: successful.length,
          failed: failed.length,
          totalProfit: Math.round(totalProfit * 100) / 100,
          totalToAgents: Math.round(totalToAgents * 100) / 100,
          totalToStakeholders: Math.round(totalToStakeholders * 100) / 100
        },
        successfulDistributions: successful,
        failedDistributions: failed.map(f => ({
          seasonId: f.seasonId || f.season?.id,
          error: f.error,
          message: f.message
        }))
      };
    } catch (error) {
      console.error('Error getting profit sharing summary:', error);
      throw error;
    }
  }

  /**
   * Simulate profit sharing without execution
   * Useful for previewing results before actual execution
   *
   * @param {string} seasonId - Season MongoDB ObjectId
   * @returns {Object} Simulated profit sharing result
   */
  static async simulateProfitSharing(seasonId) {
    const result = await ProfitSharing.executeProfitSharing(seasonId);

    if (result.success) {
      result.message = 'Profit sharing simulation completed (not executed)';
      result.isSimulation = true;
    }

    return result;
  }

  /**
   * Get profit sharing statistics for a campaign
   *
   * @param {string} campaignId - Campaign MongoDB ObjectId
   * @returns {Object} Profit sharing statistics
   */
  static async getCampaignProfitStats(campaignId) {
    try {
      const seasons = await Season.find({
        campaign: campaignId,
        status: { $in: ['active', 'completed'] }
      }).lean();

      const eligibleSeasons = seasons.filter(s =>
        ProfitSharing.checkSeasonEligibility(s).isEligible
      );

      const totalPotentialProfit = eligibleSeasons.reduce((sum, s) => {
        const calc = ProfitSharing.calculateProfit(s.totalRaised);
        return sum + calc.finalProfit;
      }, 0);

      return {
        campaign: {
          id: campaignId,
          totalSeasons: seasons.length,
          eligibleSeasons: eligibleSeasons.length
        },
        potentialProfit: {
          total: Math.round(totalPotentialProfit * 100) / 100,
          toAgents: Math.round(totalPotentialProfit * ProfitSharing.VENDOR_SPLIT.AGENTS * 100) / 100,
          toStakeholders: Math.round(totalPotentialProfit * ProfitSharing.VENDOR_SPLIT.STAKEHOLDERS * 100) / 100
        },
        seasonBreakdown: eligibleSeasons.map(s => ({
          id: s._id,
          name: s.name,
          totalRaised: s.totalRaised,
          profit: Math.round(ProfitSharing.calculateProfit(s.totalRaised).finalProfit * 100) / 100
        }))
      };
    } catch (error) {
      console.error('Error getting campaign profit stats:', error);
      throw error;
    }
  }
}

module.exports = ProfitSharing;
