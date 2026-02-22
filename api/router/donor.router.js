const express = require('express');
const router = express.Router();

const {
  getAllDonors,
  getDonor,
  createDonor,
  updateDonor,
  deleteDonor,
  getDonorHistory,
  getDonorSegments,
  mergeDonors,
  getDonorRetention,
  reactivateDonor,
  getDonorCommunications,
} = require('../controller/donor.controller');

// Static routes must come before /:id to avoid conflicts
router.get('/segments', getDonorSegments);
router.get('/retention', getDonorRetention);
router.post('/merge', mergeDonors);

// Collection routes
router.route('/')
  .get(getAllDonors)
  .post(createDonor);

// Single resource routes
router.route('/:id')
  .get(getDonor)
  .put(updateDonor)
  .delete(deleteDonor);

// Nested / action routes
router.get('/:id/history', getDonorHistory);
router.get('/:id/communications', getDonorCommunications);
router.patch('/:id/reactivate', reactivateDonor);

module.exports = router;
