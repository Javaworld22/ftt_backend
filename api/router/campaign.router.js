const express = require('express');
const router = express.Router();

const {
  getAllCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  getCampaignStats,
  getCampaignDonations,
  getTopDonors,
  updateCampaignStatus,
} = require('../controller/campaignController');

// Collection routes
router.route('/')
  .get(getAllCampaigns)
  .post(createCampaign);

// Sub-resource routes (must be before /:id to avoid conflicts)
// None needed here

// Single resource routes
router.route('/:id')
  .get(getCampaign)
  .put(updateCampaign)
  .delete(deleteCampaign);

// Nested / action routes
router.get('/:id/stats', getCampaignStats);
router.get('/:id/donations', getCampaignDonations);
router.get('/:id/top-donors', getTopDonors);
router.patch('/:id/status', updateCampaignStatus);

module.exports = router;
