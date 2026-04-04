const FreelancingAgent = require('../models/FreelancingAgent');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'ftt_secret_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// ============================================================================
// FREELANCING AGENT LOGIN
// ============================================================================

/**
 * Login a freelancing agent
 *
 * @route POST /api/v1/freelancing-agents/login
 * @access Public
 *
 * @bodyparam {string} email    - Registered email address
 * @bodyparam {string} password - Account password
 */
exports.loginFreelancingAgent = async (req, res) => {
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

    // ── Find freelancing agent and include password field ────────────────────
    const freelancingAgent = await FreelancingAgent.findOne({
      email: email.trim().toLowerCase(),
    }).select('+password');

    if (!freelancingAgent) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // ── Account active check ─────────────────────────────────────────────────
    if (!freelancingAgent.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account is deactivated. Please contact support.',
      });
    }

    // ── Password comparison ──────────────────────────────────────────────────
    const isMatch = await freelancingAgent.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // ── Generate JWT ─────────────────────────────────────────────────────────
    const token = jwt.sign(
      { id: freelancingAgent._id, role: 'freelancing_agent' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Remove password from response
    const agentData = freelancingAgent.toObject();
    delete agentData.password;

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      data: agentData,
    });
  } catch (error) {
    console.error('Error in loginFreelancingAgent:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      message: error.message,
    });
  }
};

// ============================================================================
// FREELANCING AGENT REGISTRATION
// ============================================================================

/**
 * Register a new freelancing agent
 *
 * @route POST /api/v1/freelancing-agents/register
 * @access Public
 *
 * @bodyparam {string} name            - Full name (required)
 * @bodyparam {string} email           - Email address (required, unique)
 * @bodyparam {string} password        - Password, min 8 chars (required)
 * @bodyparam {string} confirmPassword - Must match password (required)
 * @bodyparam {string} phone           - Contact phone number (required)
 * @bodyparam {string} houseAddress    - Residential address (required)
 * @bodyparam {string} workAddress     - Work address (optional)
 * @bodyparam {string} profession      - Professional field (required)
 * @bodyparam {Array} skills           - List of skills (optional)
 * @bodyparam {string} experience      - Experience level (required)
 * @bodyparam {string} nin             - NIN, 11 digits (required, unique)
 * @bodyparam {string} bvn             - BVN, 11 digits (optional)
 */
exports.registerFreelancingAgent = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      confirmPassword,
      phone,
      houseAddress,
      workAddress,
      profession,
      skills,
      experience,
      nin,
      bvn,
    } = req.body;

    // ── Required field check ─────────────────────────────────────────────────
    const requiredFields = {
      name,
      email,
      password,
      confirmPassword,
      phone,
      houseAddress,
      profession,
      experience,
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

    // ── BVN format check (11 digits, if provided) ────────────────────────────
    if (bvn && bvn.trim() && !/^\d{11}$/.test(bvn.trim())) {
      return res.status(400).json({
        success: false,
        error: 'BVN must be exactly 11 digits',
      });
    }

    // ── Phone format check ───────────────────────────────────────────────────
    if (!/^[\d\s\-\+\(\)]{7,20}$/.test(phone.trim())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number format',
      });
    }

    // ── Experience level validation ──────────────────────────────────────────
    const validExperienceLevels = ['Entry Level', 'Mid Level', 'Senior Level', 'Expert'];
    if (!validExperienceLevels.includes(experience.trim())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid experience level. Must be one of: ' + validExperienceLevels.join(', '),
      });
    }

    // ── Duplicate email check ────────────────────────────────────────────────
    const existingEmail = await FreelancingAgent.findOne({
      email: email.trim().toLowerCase(),
    });

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        error: 'A freelancing agent with this email already exists',
      });
    }

    // ── Duplicate NIN check ──────────────────────────────────────────────────
    const existingNin = await FreelancingAgent.findOne({ nin: nin.trim() });

    if (existingNin) {
      return res.status(409).json({
        success: false,
        error: 'A freelancing agent with this NIN already exists',
      });
    }

    // ── Duplicate BVN check (if provided) ────────────────────────────────────
    if (bvn && bvn.trim()) {
      const existingBvn = await FreelancingAgent.findOne({ bvn: bvn.trim() });

      if (existingBvn) {
        return res.status(409).json({
          success: false,
          error: 'A freelancing agent with this BVN already exists',
        });
      }
    }

    // ── Create freelancing agent (password hashed by pre-save hook) ──────────
    const freelancingAgent = await FreelancingAgent.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      phone: phone.trim(),
      houseAddress: houseAddress.trim(),
      workAddress: workAddress ? workAddress.trim() : '',
      profession: profession.trim(),
      skills: skills ? skills.map(skill => skill.trim()) : [],
      experience: experience.trim(),
      nin: nin.trim(),
      bvn: bvn ? bvn.trim() : undefined,
    });

    // Remove password from response
    const agentData = freelancingAgent.toObject();
    delete agentData.password;

    res.status(201).json({
      success: true,
      message: 'Freelancing agent registered successfully',
      data: agentData,
    });
  } catch (error) {
    console.error('Error in registerFreelancingAgent:', error);

    // Mongoose duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        success: false,
        error: `A freelancing agent with this ${field} already exists`,
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
// GET ALL FREELANCING AGENTS
// ============================================================================

/**
 * Get all freelancing agents with pagination
 *
 * @route GET /api/v1/freelancing-agents
 * @access Admin
 */
exports.getAllFreelancingAgents = async (req, res) => {
  try {
    const { page = 1, limit = 10, isActive, search, profession, experience } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    const query = {};

    if (isActive !== undefined && isActive !== 'all') {
      query.isActive = isActive === 'true';
    }

    if (profession && profession !== 'all') {
      query.profession = new RegExp(profession, 'i');
    }

    if (experience && experience !== 'all') {
      query.experience = experience;
    }

    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { phone: new RegExp(search, 'i') },
        { profession: new RegExp(search, 'i') },
        { skills: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    const freelancingAgents = await FreelancingAgent.find(query)
      .select('-password')
      .sort('-createdAt')
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum)
      .lean();

    const count = await FreelancingAgent.countDocuments(query);

    res.json({
      success: true,
      data: freelancingAgents,
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(count / limitNum),
      },
    });
  } catch (error) {
    console.error('Error in getAllFreelancingAgents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve freelancing agents',
      message: error.message,
    });
  }
};

// ============================================================================
// GET SINGLE FREELANCING AGENT
// ============================================================================

/**
 * Get a single freelancing agent by ID
 *
 * @route GET /api/v1/freelancing-agents/:id
 * @access Admin
 */
exports.getFreelancingAgent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid freelancing agent ID format',
      });
    }

    const freelancingAgent = await FreelancingAgent.findById(id)
      .select('-password')
      .lean();

    if (!freelancingAgent) {
      return res.status(404).json({
        success: false,
        error: 'Freelancing agent not found',
      });
    }

    res.json({
      success: true,
      data: freelancingAgent,
    });
  } catch (error) {
    console.error('Error in getFreelancingAgent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve freelancing agent',
      message: error.message,
    });
  }
};