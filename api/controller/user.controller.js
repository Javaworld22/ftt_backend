
const { _register, _login, _getUserById } = require('../service/user.service');

/**
 * Register a new user
 *
 * @route POST /api/v1/users/register
 * @access Public
 *
 * @bodyparam {string} firstName - First name (required)
 * @bodyparam {string} lastName - Last name (required)
 * @bodyparam {string} email - Email address (required, unique)
 * @bodyparam {string} phone - Phone number (required, unique)
 * @bodyparam {string} password - Password, min 8 chars (required)
 * @bodyparam {string} confirmPassword - Must match password (required)
 */
const register = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, confirmPassword } = req.body;

    // Required field validation
    const requiredFields = { firstName, lastName, email, phone, password, confirmPassword };
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

    // Password match validation
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Passwords do not match',
      });
    }

    // Password length validation
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long',
      });
    }

    // Email format validation
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid email address',
      });
    }

    // Phone format validation
    if (!/^[\d\s\-\+\(\)]{7,20}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number format',
      });
    }

    const result = await _register({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      password,
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Error in register:', error);

    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Registration failed',
      message: error.message,
    });
  }
};

/**
 * Login user with email/phone and password
 *
 * @route POST /api/v1/users/login
 * @access Public
 *
 * @bodyparam {string} identifier - Email or phone number (required)
 * @bodyparam {string} password - Password (required)
 */
const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // Required field validation
    if (!identifier || !identifier.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Email or phone number is required',
      });
    }

    if (!password || !password.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Password is required',
      });
    }

    const result = await _login(identifier.trim(), password);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in login:', error);

    if (error.message === 'Invalid credentials') {
      return res.status(401).json({
        success: false,
        error: 'Invalid email/phone or password',
      });
    }

    if (error.message.includes('deactivated')) {
      return res.status(403).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Login failed',
      message: error.message,
    });
  }
};

/**
 * Get user profile
 *
 * @route GET /api/v1/users/profile/:id
 * @access Private
 */
const getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format',
      });
    }

    const result = await _getUserById(id);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in getUserProfile:', error);

    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve user profile',
      message: error.message,
    });
  }
};

module.exports = {
  register,
  login,
  getUserProfile,
};