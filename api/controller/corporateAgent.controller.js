const CorporateAgent = require('../models/CorporateAgent');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'ftt_secret_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// ============================================================================
// CORPORATE AGENT LOGIN
// ============================================================================

/**
 * Login a corporate agent
 *
 * @route POST /api/v1/corporate-agents/login
 * @access Public
 *
 * @bodyparam {string} email    - Registered email address
 * @bodyparam {string} password - Account password
 */
exports.loginCorporateAgent = async (req, res) => {
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

    // ── Find corporate agent and include password field ──────────────────────
    const corporateAgent = await CorporateAgent.findOne({
      email: email.trim().toLowerCase(),
    }).select('+password');

    if (!corporateAgent) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // ── Account active check ─────────────────────────────────────────────────
    if (!corporateAgent.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account is deactivated. Please contact support.',
      });
    }

    // ── Password comparison ──────────────────────────────────────────────────
    const isMatch = await corporateAgent.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // ── Generate JWT ─────────────────────────────────────────────────────────
    const token = jwt.sign(
      { id: corporateAgent._id, role: 'corporate_agent' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Remove password from response
    const agentData = corporateAgent.toObject();
    delete agentData.password;

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      data: agentData,
    });
  } catch (error) {
    console.error('Error in loginCorporateAgent:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      message: error.message,
    });
  }
};

// ============================================================================
// CORPORATE AGENT REGISTRATION
// ============================================================================

/**
 * Register a new corporate agent
 *
 * @route POST /api/v1/corporate-agents/register
 * @access Public
 *
 * @bodyparam {string} name            - Corporate / company name (required)
 * @bodyparam {string} email           - Corporate email address (required, unique)
 * @bodyparam {string} password        - Password, min 8 chars (required)
 * @bodyparam {string} confirmPassword - Must match password (required)
 * @bodyparam {string} phone           - Contact phone number (required)
 * @bodyparam {string} houseAddress    - Registered / residential address (required)
 * @bodyparam {string} officeAddress   - Corporate office address (required)
 * @bodyparam {string} cac             - CAC registration number (required, unique)
 * @bodyparam {string} nin             - NIN of authorised representative, 11 digits (required, unique)
 */
exports.registerCorporateAgent = async (req, res) => {
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
    const existingEmail = await CorporateAgent.findOne({
      email: email.trim().toLowerCase(),
    });

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        error: 'A corporate agent with this email already exists',
      });
    }

    // ── Duplicate CAC check ──────────────────────────────────────────────────
    const existingCac = await CorporateAgent.findOne({
      cac: cac.trim().toUpperCase(),
    });

    if (existingCac) {
      return res.status(409).json({
        success: false,
        error: 'A corporate agent with this CAC number already exists',
      });
    }

    // ── Duplicate NIN check ──────────────────────────────────────────────────
    const existingNin = await CorporateAgent.findOne({ nin: nin.trim() });

    if (existingNin) {
      return res.status(409).json({
        success: false,
        error: 'A corporate agent with this NIN already exists',
      });
    }

    // ── Create corporate agent (password hashed by pre-save hook) ────────────
    const corporateAgent = await CorporateAgent.create({
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
    const agentData = corporateAgent.toObject();
    delete agentData.password;

    res.status(201).json({
      success: true,
      message: 'Corporate agent registered successfully',
      data: agentData,
    });
  } catch (error) {
    console.error('Error in registerCorporateAgent:', error);

    // Mongoose duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        success: false,
        error: `A corporate agent with this ${field} already exists`,
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
// GET ALL CORPORATE AGENTS
// ============================================================================

/**
 * Get all corporate agents with pagination
 *
 * @route GET /api/v1/corporate-agents
 * @access Admin
 */
exports.getAllCorporateAgents = async (req, res) => {
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

    const corporateAgents = await CorporateAgent.find(query)
      .select('-password')
      .sort('-createdAt')
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum)
      .lean();

    const count = await CorporateAgent.countDocuments(query);

    res.json({
      success: true,
      data: corporateAgents,
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(count / limitNum),
      },
    });
  } catch (error) {
    console.error('Error in getAllCorporateAgents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve corporate agents',
      message: error.message,
    });
  }
};

// ============================================================================
// GET SINGLE CORPORATE AGENT
// ============================================================================

/**
 * Get a single corporate agent by ID
 *
 * @route GET /api/v1/corporate-agents/:id
 * @access Admin
 */
exports.getCorporateAgent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid corporate agent ID format',
      });
    }

    const corporateAgent = await CorporateAgent.findById(id)
      .select('-password')
      .lean();

    if (!corporateAgent) {
      return res.status(404).json({
        success: false,
        error: 'Corporate agent not found',
      });
    }

    res.json({
      success: true,
      data: corporateAgent,
    });
  } catch (error) {
    console.error('Error in getCorporateAgent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve corporate agent',
      message: error.message,
    });
  }
};
