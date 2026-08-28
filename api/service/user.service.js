const User = require('../models/User');
const jwt = require('jsonwebtoken');
const dotenv = require("dotenv");

const env = dotenv.config();

if (!process.env.JWT_KEY) throw new Error('JWT_SECRET is not set');
const JWT_SECRET = process.env.JWT_KEY ;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Register new user
const _register = async (userData) => {
  try {
    const { firstName, lastName, email, phone, password } = userData;

    // Check if user already exists with email or phone
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { phone }]
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        throw new Error('User with this email already exists');
      }
      if (existingUser.phone === phone) {
        throw new Error('User with this phone number already exists');
      }
    }

    // Create new user
    const user = await User.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      phone,
      password,
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    return {
      success: true,
      message: 'User registered successfully',
      data: {
        user: userResponse,
        token
      }
    };
  } catch (error) {
    throw error;
  }
};

// Login user with email/phone and password
const _login = async (identifier, password) => {
  try {
    // Check if identifier is email or phone
    const isEmail = /^\S+@\S+\.\S+$/.test(identifier);
    const query = isEmail
      ? { email: identifier.toLowerCase() }
      : { phone: identifier };

    // Find user and include password
    const user = await User.findOne(query).select('+password');

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('Account is deactivated. Please contact support.');
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    await user.updateLastLogin();

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    return {
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        token
      }
    };
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      throw new Error(`User with this ${field} already exists`);
    }
    throw error;
  }
};

// Get user by ID
const _getUserById = async (userId) => {
  try {
    const user = await User.findById(userId).select('-password');
    if (!user) {
      throw new Error('User not found');
    }
    return {
      success: true,
      data: user
    };
  } catch (error) {
    if (error.name === 'CastError') throw new Error('Invalid user ID');
    throw error;
  }
};

module.exports = {
  _register,
  _login,
  _getUserById
};