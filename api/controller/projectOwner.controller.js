const ProjectOwner = require('../models/ProjectOwner');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'ftt_secret_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// ============================================================================
// PROJECT OWNER LOGIN
// ============================================================================

/**
 * Login a project owner
 *
 * @route POST /api/v1/project-owners/login
 * @access Public
 *
 * @bodyparam {string} email    - Registered email address
 * @bodyparam {string} password - Account password
 */
exports.loginProjectOwner = async (req, res) => {
  try {
    const { email, password } = req.body;

    // ── Required field check ─────────────────────────────────────────────────
    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Email is required',
      });
    }

    if (!password || !password.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Password is required',
      });
    }

    // ── Find project owner and include password field ─────────────────────────
    const projectOwner = await ProjectOwner.findOne({
      email: email.trim().toLowerCase(),
    }).select('+password');

    if (!projectOwner) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // ── Account active check ─────────────────────────────────────────────────
    if (!projectOwner.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account is deactivated. Please contact support.',
      });
    }

    // ── Password comparison ──────────────────────────────────────────────────
    const isMatch = await projectOwner.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // ── Generate JWT ─────────────────────────────────────────────────────────
    const token = jwt.sign(
      { id: projectOwner._id, role: 'project_owner' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Remove password from response
    const ownerData = projectOwner.toObject();
    delete ownerData.password;

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      data: ownerData,
    });
  } catch (error) {
    console.error('Error in loginProjectOwner:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      message: error.message,
    });
  }
};

// ============================================================================
// PROJECT OWNER REGISTRATION
// ============================================================================

/**
 * Register a new project owner
 *
 * @route POST /api/v1/project-owners/register
 * @access Public
 *
 * @bodyparam {string} name            - Full name (required)
 * @bodyparam {string} email           - Email address (required, unique)
 * @bodyparam {string} password        - Password, min 8 chars (required)
 * @bodyparam {string} confirmPassword - Must match password (required)
 * @bodyparam {string} phone           - Phone number (required)
 * @bodyparam {string} organization    - Organization name (required)
 * @bodyparam {string} nin             - National Identification Number, 11 digits (required, unique)
 */
exports.registerProjectOwner = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      confirmPassword,
      phone,
      organization,
      nin,
    } = req.body;

    // ── Required field check ─────────────────────────────────────────────────
    const requiredFields = {
      name,
      email,
      password,
      confirmPassword,
      phone,
      organization,
      nin,
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([, value]) => !value || String(value).trim() === '')
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        missingFields,
      });
    }

    // ── Password match check ─────────────────────────────────────────────────
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Passwords do not match',
      });
    }

    // ── Password strength check ──────────────────────────────────────────────
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long',
      });
    }

    // ── NIN format check (11 digits) ─────────────────────────────────────────
    if (!/^\d{11}$/.test(nin.trim())) {
      return res.status(400).json({
        success: false,
        error: 'NIN must be exactly 11 digits',
      });
    }

    // ── Phone format check ───────────────────────────────────────────────────
    if (!/^[\d\s\-\+\(\)]{7,20}$/.test(phone.trim())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number format',
      });
    }

    // ── Duplicate email check ────────────────────────────────────────────────
    const existingEmail = await ProjectOwner.findOne({
      email: email.trim().toLowerCase(),
    });

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        error: 'A project owner with this email already exists',
      });
    }

    // ── Duplicate NIN check ──────────────────────────────────────────────────
    const existingNin = await ProjectOwner.findOne({ nin: nin.trim() });

    if (existingNin) {
      return res.status(409).json({
        success: false,
        error: 'A project owner with this NIN already exists',
      });
    }

    // ── Create project owner (password hashed by pre-save hook) ──────────────
    const projectOwner = await ProjectOwner.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      phone: phone.trim(),
      organization: organization.trim(),
      nin: nin.trim(),
    });

    // Remove password from response
    const ownerData = projectOwner.toObject();
    delete ownerData.password;

    res.status(201).json({
      success: true,
      message: 'Project owner registered successfully',
      data: ownerData,
    });
  } catch (error) {
    console.error('Error in registerProjectOwner:', error);

    // Mongoose duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        success: false,
        error: `A project owner with this ${field} already exists`,
        field,
      });
    }

    // Mongoose validation error
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err) => ({
        field: err.path,
        message: err.message,
      }));
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Registration failed',
      message: error.message,
    });
  }
};

// ============================================================================
// GET ALL PROJECT OWNERS
// ============================================================================

/**
 * Get all project owners with pagination
 *
 * @route GET /api/v1/project-owners
 * @access Admin
 */
exports.getAllProjectOwners = async (req, res) => {
  try {
    const { page = 1, limit = 10, isActive, search } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    const query = {};

    if (isActive !== undefined && isActive !== 'all') {
      query.isActive = isActive === 'true';
    }

    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { phone: new RegExp(search, 'i') },
        { organization: new RegExp(search, 'i') },
      ];
    }

    const projectOwners = await ProjectOwner.find(query)
      .select('-password')
      .sort('-createdAt')
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum)
      .lean();

    const count = await ProjectOwner.countDocuments(query);

    res.json({
      success: true,
      data: projectOwners,
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(count / limitNum),
      },
    });
  } catch (error) {
    console.error('Error in getAllProjectOwners:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve project owners',
      message: error.message,
    });
  }
};

// ============================================================================
// GET SINGLE PROJECT OWNER
// ============================================================================

/**
 * Get a single project owner by ID
 *
 * @route GET /api/v1/project-owners/:id
 * @access Admin
 */
exports.getProjectOwner = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid project owner ID format',
      });
    }

    const projectOwner = await ProjectOwner.findById(id)
      .select('-password')
      .lean();

    if (!projectOwner) {
      return res.status(404).json({
        success: false,
        error: 'Project owner not found',
      });
    }

    res.json({
      success: true,
      data: projectOwner,
    });
  } catch (error) {
    console.error('Error in getProjectOwner:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve project owner',
      message: error.message,
    });
  }
};
