const express = require('express');
const router = express.Router();
const { register, login, getUserProfile } = require('../controller/user.controller');

// ============================================================================
// USER AUTHENTICATION ROUTES
// ============================================================================

/**
 * @route POST /api/v1/users/register
 * @desc Register a new user
 * @access Public
 */
router.post('/register', register);

/**
 * @route POST /api/v1/users/login
 * @desc Login user with email/phone and password
 * @access Public
 */
router.post('/login', login);

/**
 * @route GET /api/v1/users/profile/:id
 * @desc Get user profile by ID
 * @access Private
 */
router.get('/profile/:id', getUserProfile);

module.exports = router;