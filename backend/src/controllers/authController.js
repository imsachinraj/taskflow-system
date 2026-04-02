const { validationResult } = require('express-validator');
const User = require('../models/User');
const { generateTokenPair, verifyRefreshToken } = require('../utils/jwt');
const { successResponse, createdResponse, errorResponse } = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware/errorMiddleware');
const logger = require('../utils/logger');

/**
 * @desc    Register a new user
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
const register = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(res, 'Validation failed', 422, errors.array());
  }

  const { name, email, password } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return errorResponse(res, 'An account with this email already exists.', 409);
  }

  const user = await User.create({ name, email, password });
  const { accessToken, refreshToken } = generateTokenPair(user._id);

  // Store hashed refresh token
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  logger.info(`New user registered: ${user.email}`);

  return createdResponse(
    res,
    {
      user: user.toPublicProfile(),
      accessToken,
      refreshToken,
    },
    'Account created successfully'
  );
});

/**
 * @desc    Login user
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(res, 'Validation failed', 422, errors.array());
  }

  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password +refreshToken');
  if (!user || !(await user.comparePassword(password))) {
    return errorResponse(res, 'Invalid email or password.', 401);
  }

  if (!user.isActive) {
    return errorResponse(res, 'Your account has been deactivated. Contact support.', 403);
  }

  const { accessToken, refreshToken } = generateTokenPair(user._id);

  user.refreshToken = refreshToken;
  user.lastSeen = new Date();
  await user.save({ validateBeforeSave: false });

  logger.info(`User logged in: ${user.email}`);

  return successResponse(
    res,
    {
      user: user.toPublicProfile(),
      accessToken,
      refreshToken,
    },
    'Logged in successfully'
  );
});

/**
 * @desc    Refresh access token
 * @route   POST /api/v1/auth/refresh
 * @access  Public (requires refresh token)
 */
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;

  if (!token) {
    return errorResponse(res, 'Refresh token is required.', 401);
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    return errorResponse(res, 'Invalid or expired refresh token.', 401);
  }

  const user = await User.findById(decoded.id).select('+refreshToken');
  if (!user || user.refreshToken !== token) {
    return errorResponse(res, 'Refresh token is no longer valid.', 401);
  }

  const { accessToken, refreshToken: newRefreshToken } = generateTokenPair(user._id);
  user.refreshToken = newRefreshToken;
  await user.save({ validateBeforeSave: false });

  return successResponse(res, { accessToken, refreshToken: newRefreshToken }, 'Token refreshed');
});

/**
 * @desc    Logout user
 * @route   POST /api/v1/auth/logout
 * @access  Protected
 */
const logout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
  return successResponse(res, null, 'Logged out successfully');
});

/**
 * @desc    Get current user
 * @route   GET /api/v1/auth/me
 * @access  Protected
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('teams', 'name slug');
  return successResponse(res, { user: user.toPublicProfile() });
});

module.exports = { register, login, refreshToken, logout, getMe };
