const express = require('express');
const router = express.Router();

const {
  getAllSeasons,
  getSeason,
  createSeason,
  updateSeason,
  deleteSeason,
  getSeasonStats,
  compareSeasons,
} = require('../controller/season.controller');

// Static routes must come before /:id to avoid conflicts
router.get('/compare', compareSeasons);

// Collection routes
router.route('/')
  .get(getAllSeasons)
  .post(createSeason);

// Single resource routes
router.route('/:id')
  .get(getSeason)
  .put(updateSeason)
  .delete(deleteSeason);

// Nested routes
router.get('/:id/stats', getSeasonStats);

module.exports = router;
