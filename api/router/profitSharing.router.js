const express = require('express');
const router = express.Router();
const {
  executeProfitSharing,
  simulateProfitSharing,
  getProfitSharingSummary,
  getCampaignProfitStats,
  checkSeasonEligibility,
  getEligibleDonors,
  calculateProfit,
  getProfitSharingConfig,
} = require('../controller/profitSharing.controller');

// ============================================================================
// PROFIT SHARING ROUTES
// ============================================================================

/**
 * @route GET /api/v1/profit-sharing/config
 * @desc Get profit sharing configuration
 * @access Public
 */
router.get('/config', getProfitSharingConfig);

/**
 * @route POST /api/v1/profit-sharing/calculate
 * @desc Calculate profit distribution for a given amount
 * @access Private
 */
router.post('/calculate', calculateProfit);

/**
 * @route GET /api/v1/profit-sharing/eligibility/:seasonId
 * @desc Check if a season is eligible for profit sharing
 * @access Private
 */
router.get('/eligibility/:seasonId', checkSeasonEligibility);

/**
 * @route GET /api/v1/profit-sharing/donors/:seasonId
 * @desc Get eligible donors for profit sharing
 * @access Private
 */
router.get('/donors/:seasonId', getEligibleDonors);

/**
 * @route POST /api/v1/profit-sharing/simulate/:seasonId
 * @desc Simulate profit sharing for a season (preview without execution)
 * @access Private
 */
router.post('/simulate/:seasonId', simulateProfitSharing);

/**
 * @route POST /api/v1/profit-sharing/execute/:seasonId
 * @desc Execute profit sharing for a season
 * @access Private
 */
router.post('/execute/:seasonId', executeProfitSharing);

/**
 * @route POST /api/v1/profit-sharing/summary
 * @desc Get profit sharing summary for multiple seasons
 * @access Private
 */
router.post('/summary', getProfitSharingSummary);

/**
 * @route GET /api/v1/profit-sharing/campaigns/:campaignId/stats
 * @desc Get campaign profit statistics
 * @access Private
 */
router.get('/campaigns/:campaignId/stats', getCampaignProfitStats);

module.exports = router;