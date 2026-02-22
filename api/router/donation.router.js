const express = require('express');
const router = express.Router();

const {
  getAllDonations,
  getDonation,
  createDonation,
  updateDonation,
  deleteDonation,
  processDonation,
  getDonationAnalytics,
  markReceiptSent,
  refundDonation,
} = require('../controller/donation.controller');

// Analytics route must come before /:id to avoid conflict
router.get('/analytics', getDonationAnalytics);

// Collection routes
router.route('/')
  .get(getAllDonations)
  .post(createDonation);

// Single resource routes
router.route('/:id')
  .get(getDonation)
  .put(updateDonation)
  .delete(deleteDonation);

// Action routes
router.patch('/:id/process', processDonation);
router.patch('/:id/receipt', markReceiptSent);
router.patch('/:id/refund', refundDonation);

module.exports = router;
