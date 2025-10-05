// routes/auth.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const AuthMiddleware = require('../middleware/auth');
const ValidationMiddleware = require('../middleware/validation');
const ErrorHandler = require('../middleware/errorHandler');
const Response = require('../utils/response');
const Email = require('../utils/email');
const logger = require('../utils/logger');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/register',
  ValidationMiddleware.validateBody('user.register'),
  ErrorHandler.catchAsync(async (req, res) => {
    const { name, email, password, examType, grade, country } = req.validatedBody;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return Response.sendError(res, 'User already exists with this email', 'USER_EXISTS', null, 409);
    }

    // Create new user
    const user = await User.create({
      name,
      email,
      password,
      examType,
      grade,
      country,
      preferences: {
        notifications: true,
        darkMode: false,
        language: 'en'
      }
    });

    // Generate verification code
    const verificationCode = Email.generateVerificationCode();
    user.verificationCode = verificationCode;
    user.verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await user.save();

    // Send welcome email with verification code
    await Email.sendWelcomeEmail(user);
    await Email.sendVerificationEmail(user, verificationCode);

    // Generate tokens
    const token = AuthMiddleware.generateToken(user);
    const refreshToken = AuthMiddleware.generateRefreshToken(user);

    // Store refresh token
    user.refreshTokens = user.refreshTokens || [];
    user.refreshTokens.push({
      token: refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    });
    await user.save();

    logger.info('User registered successfully', { userId: user._id, email });

    Response.sendSuccess(res, {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        examType: user.examType,
        grade: user.grade,
        country: user.country,
        isEmailVerified: user.isEmailVerified,
        preferences: user.preferences
      },
      token,
      refreshToken
    }, 'Registration successful. Please check your email for verification.');
  })
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  ValidationMiddleware.validateBody('user.login'),
  AuthMiddleware.rateLimitByUser(5), // 5 login attempts per minute
  ErrorHandler.catchAsync(async (req, res) => {
    const { email, password } = req.validatedBody;

    // Find user by email
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return Response.sendError(res, 'Invalid email or password', 'INVALID_CREDENTIALS', null, 401);
    }

    // Check if account is active
    if (user.status !== 'active') {
      return Response.sendError(res, 'Account is not active', 'ACCOUNT_INACTIVE', null, 403);
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      logger.warn('Failed login attempt', { email, userId: user._id });
      return Response.sendError(res, 'Invalid email or password', 'INVALID_CREDENTIALS', null, 401);
    }

    // Generate tokens
    const token = AuthMiddleware.generateToken(user);
    const refreshToken = AuthMiddleware.generateRefreshToken(user);

    // Store refresh token
    user.refreshTokens = user.refreshTokens || [];
    user.refreshTokens.push({
      token: refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    });

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    logger.info('User logged in successfully', { userId: user._id, email });

    Response.sendSuccess(res, {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        examType: user.examType,
        grade: user.grade,
        country: user.country,
        isEmailVerified: user.isEmailVerified,
        preferences: user.preferences,
        lastLogin: user.lastLogin
      },
      token,
      refreshToken
    }, 'Login successful');
  })
);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh access token
 * @access  Public
 */
router.post(
  '/refresh-token',
  ErrorHandler.catchAsync(async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return Response.sendError(res, 'Refresh token is required', 'REFRESH_TOKEN_REQUIRED', null, 400);
    }

    // Verify refresh token
    const user = await AuthMiddleware.verifyRefreshToken(refreshToken);

    // Check if refresh token exists in user's tokens
    const tokenExists = user.refreshTokens?.some(
      token => token.token === refreshToken && token.expiresAt > new Date()
    );

    if (!tokenExists) {
      return Response.sendError(res, 'Invalid refresh token', 'INVALID_REFRESH_TOKEN', null, 401);
    }

    // Generate new tokens
    const newToken = AuthMiddleware.generateToken(user);
    const newRefreshToken = AuthMiddleware.generateRefreshToken(user);

    // Remove old refresh token and add new one
    user.refreshTokens = user.refreshTokens.filter(token => token.token !== refreshToken);
    user.refreshTokens.push({
      token: newRefreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    });
    await user.save();

    logger.debug('Token refreshed successfully', { userId: user._id });

    Response.sendSuccess(res, {
      token: newToken,
      refreshToken: newRefreshToken
    }, 'Token refreshed successfully');
  })
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post(
  '/logout',
  AuthMiddleware.authenticate,
  ErrorHandler.catchAsync(async (req, res) => {
    await AuthMiddleware.logout(req, res);
  })
);

/**
 * @route   POST /api/auth/logout-all
 * @desc    Logout from all devices
 * @access  Private
 */
router.post(
  '/logout-all',
  AuthMiddleware.authenticate,
  ErrorHandler.catchAsync(async (req, res) => {
    // Clear all refresh tokens
    req.user.refreshTokens = [];
    await req.user.save();

    // Clear cache
    AuthMiddleware.logout(req, res);
  })
);

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email address
 * @access  Public
 */
router.post(
  '/verify-email',
  ErrorHandler.catchAsync(async (req, res) => {
    const { email, code } = req.body;

    if (!email || !code) {
      return Response.sendError(res, 'Email and verification code are required', 'MISSING_FIELDS', null, 400);
    }

    const user = await User.findOne({ 
      email,
      verificationCode: code,
      verificationExpires: { $gt: new Date() }
    });

    if (!user) {
      return Response.sendError(res, 'Invalid or expired verification code', 'INVALID_VERIFICATION_CODE', null, 400);
    }

    // Mark email as verified
    user.isEmailVerified = true;
    user.verificationCode = undefined;
    user.verificationExpires = undefined;
    user.status = 'active';
    await user.save();

    logger.info('Email verified successfully', { userId: user._id, email });

    Response.sendSuccess(res, null, 'Email verified successfully');
  })
);

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend verification email
 * @access  Public
 */
router.post(
  '/resend-verification',
  ErrorHandler.catchAsync(async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return Response.sendError(res, 'Email is required', 'EMAIL_REQUIRED', null, 400);
    }

    const user = await User.findOne({ email });
    if (!user) {
      return Response.sendError(res, 'User not found', 'USER_NOT_FOUND', null, 404);
    }

    if (user.isEmailVerified) {
      return Response.sendError(res, 'Email is already verified', 'EMAIL_ALREADY_VERIFIED', null, 400);
    }

    // Generate new verification code
    const verificationCode = Email.generateVerificationCode();
    user.verificationCode = verificationCode;
    user.verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await user.save();

    // Send verification email
    await Email.sendVerificationEmail(user, verificationCode);

    logger.info('Verification email resent', { userId: user._id, email });

    Response.sendSuccess(res, null, 'Verification email sent successfully');
  })
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post(
  '/forgot-password',
  ErrorHandler.catchAsync(async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return Response.sendError(res, 'Email is required', 'EMAIL_REQUIRED', null, 400);
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal whether email exists or not
      return Response.sendSuccess(res, null, 'If the email exists, a reset link has been sent');
    }

    // Generate reset token
    const resetToken = Email.generateResetToken();
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    // Send password reset email
    await Email.sendPasswordResetEmail(user, resetToken);

    logger.info('Password reset requested', { userId: user._id, email });

    Response.sendSuccess(res, null, 'If the email exists, a reset link has been sent');
  })
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password
 * @access  Public
 */
router.post(
  '/reset-password',
  ValidationMiddleware.validateBody('user.passwordReset'),
  ErrorHandler.catchAsync(async (req, res) => {
    const { token, newPassword } = req.validatedBody;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      return Response.sendError(res, 'Invalid or expired reset token', 'INVALID_RESET_TOKEN', null, 400);
    }

    // Update password
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // Send confirmation email
    await Email.sendEmail(
      user.email,
      'Password Reset Successful - AI Global Tutor',
      'passwordResetSuccess',
      { name: user.name }
    );

    logger.info('Password reset successfully', { userId: user._id });

    Response.sendSuccess(res, null, 'Password reset successfully');
  })
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get(
  '/me',
  AuthMiddleware.authenticate,
  ErrorHandler.catchAsync(async (req, res) => {
    const user = await User.findById(req.user._id)
      .select('-password -refreshTokens -verificationCode -resetPasswordToken');

    Response.sendSuccess(res, { user }, 'Profile retrieved successfully');
  })
);

/**
 * @route   PUT /api/auth/me
 * @desc    Update user profile
 * @access  Private
 */
router.put(
  '/me',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validateBody('user.update'),
  ErrorHandler.catchAsync(async (req, res) => {
    const updates = req.validatedBody;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password -refreshTokens -verificationCode -resetPasswordToken');

    logger.info('User profile updated', { userId: user._id, updates: Object.keys(updates) });

    Response.sendSuccess(res, { user }, 'Profile updated successfully');
  })
);

/**
 * @route   PUT /api/auth/preferences
 * @desc    Update user preferences
 * @access  Private
 */
router.put(
  '/preferences',
  AuthMiddleware.authenticate,
  ErrorHandler.catchAsync(async (req, res) => {
    const { preferences } = req.body;

    if (!preferences || typeof preferences !== 'object') {
      return Response.sendError(res, 'Invalid preferences', 'INVALID_PREFERENCES', null, 400);
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { preferences } },
      { new: true }
    ).select('-password -refreshTokens -verificationCode -resetPasswordToken');

    logger.info('User preferences updated', { userId: user._id, preferences });

    Response.sendSuccess(res, { user }, 'Preferences updated successfully');
  })
);

/**
 * @route   DELETE /api/auth/me
 * @desc    Delete user account
 * @access  Private
 */
router.delete(
  '/me',
  AuthMiddleware.authenticate,
  ErrorHandler.catchAsync(async (req, res) => {
    const user = await User.findById(req.user._id);

    // Soft delete - mark as deleted
    user.status = 'deleted';
    user.deletedAt = new Date();
    user.email = `deleted_${user._id}_${user.email}`; // Anonymize email
    await user.save();

    // Logout user
    await AuthMiddleware.logout(req, res);

    logger.info('User account deleted', { userId: user._id });

    Response.sendSuccess(res, null, 'Account deleted successfully');
  })
);

module.exports = router;