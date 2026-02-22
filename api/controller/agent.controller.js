const Agent = require('../models/Agent');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'ftt_secret_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// ============================================================================
// AGENT LOGIN
// ============================================================================

/**
 * Login an agent
 *
 * @route POST /api/v1/agents/login
 * @access Public
 *
 * @bodyparam {string} email    - Registered email address
 * @bodyparam {string} password - Account password
 */
exports.loginAgent = async (req, res) => {
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

    // ── Find agent and include password field ────────────────────────────────
    const agent = await Agent.findOne({
      email: email.trim().toLowerCase(),
    }).select('+password');

    if (!agent) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // ── Account active check ─────────────────────────────────────────────────
    if (!agent.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account is deactivated. Please contact support.',
      });
    }

    // ── Password comparison ──────────────────────────────────────────────────
    const isMatch = await agent.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // ── Generate JWT ─────────────────────────────────────────────────────────
    const token = jwt.sign(
      { id: agent._id, role: 'agent' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Remove password from response
    const agentData = agent.toObject();
    delete agentData.password;

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      data: agentData,
    });
  } catch (error) {
    console.error('Error in loginAgent:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      message: error.message,
    });
  }
};

// ============================================================================
// AGENT REGISTRATION
// ============================================================================

/**
 * Register a new agent
 *
 * @route POST /api/v1/agents/register
 * @access Public
 *
 * @bodyparam {string} name            - Full name (required)
 * @bodyparam {string} email           - Email address (required, unique)
 * @bodyparam {string} password        - Password, min 8 chars (required)
 * @bodyparam {string} confirmPassword - Must match password (required)
 * @bodyparam {string} phone           - Phone number (required)
 * @bodyparam {string} houseAddress    - Residential address (required)
 * @bodyparam {string} officeAddress   - Office / business address (required)
 * @bodyparam {string} cac             - CAC registration number (required, unique)
 * @bodyparam {string} nin             - National Identification Number, 11 digits (required, unique)
 */
exports.registerAgent = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      confirmPassword,
      phone,
      houseAddress,
      officeAddress,
      cac,
      nin,
    } = req.body;

    // ── Required field check ─────────────────────────────────────────────────
    const requiredFields = {
      name,
      email,
      password,
      confirmPassword,
      phone,
      houseAddress,
      officeAddress,
      cac,
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
    const existingEmail = await Agent.findOne({
      email: email.trim().toLowerCase(),
    });

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        error: 'An agent with this email already exists',
      });
    }

    // ── Duplicate CAC check ──────────────────────────────────────────────────
    const existingCac = await Agent.findOne({
      cac: cac.trim().toUpperCase(),
    });

    if (existingCac) {
      return res.status(409).json({
        success: false,
        error: 'An agent with this CAC number already exists',
      });
    }

    // ── Duplicate NIN check ──────────────────────────────────────────────────
    const existingNin = await Agent.findOne({ nin: nin.trim() });

    if (existingNin) {
      return res.status(409).json({
        success: false,
        error: 'An agent with this NIN already exists',
      });
    }

    // ── Create agent (password is hashed by the pre-save hook) ───────────────
    const agent = await Agent.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      phone: phone.trim(),
      houseAddress: houseAddress.trim(),
      officeAddress: officeAddress.trim(),
      cac: cac.trim().toUpperCase(),
      nin: nin.trim(),
    });

    // Remove password from response
    const agentData = agent.toObject();
    delete agentData.password;

    res.status(201).json({
      success: true,
      message: 'Agent registered successfully',
      data: agentData,
    });
  } catch (error) {
    console.error('Error in registerAgent:', error);

    // Mongoose duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        success: false,
        error: `An agent with this ${field} already exists`,
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
// GET ALL AGENTS
// ============================================================================

/**
 * Get all agents with pagination
 *
 * @route GET /api/v1/agents
 * @access Admin
 */
exports.getAllAgents = async (req, res) => {
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
        { cac: new RegExp(search, 'i') },
      ];
    }

    const agents = await Agent.find(query)
      .select('-password')
      .sort('-createdAt')
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum)
      .lean();

    const count = await Agent.countDocuments(query);

    res.json({
      success: true,
      data: agents,
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(count / limitNum),
      },
    });
  } catch (error) {
    console.error('Error in getAllAgents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve agents',
      message: error.message,
    });
  }
};

// ============================================================================
// GET SINGLE AGENT
// ============================================================================

/**
 * Get a single agent by ID
 *
 * @route GET /api/v1/agents/:id
 * @access Admin
 */
exports.getAgent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid agent ID format',
      });
    }

    const agent = await Agent.findById(id).select('-password').lean();

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found',
      });
    }

    res.json({
      success: true,
      data: agent,
    });
  } catch (error) {
    console.error('Error in getAgent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve agent',
      message: error.message,
    });
  }
};
