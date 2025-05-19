const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const User = require('../models/user.model');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

// Generate JWT token
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// Generate refresh token
const signRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  });
};

// Send tokens in response
const createSendTokens = (user, statusCode, req, res) => {
  const token = signToken(user._id);
  const refreshToken = signRefreshToken(user._id);
  
  // Remove password from output
  user.password = undefined;
  
  res.status(statusCode).json({
    status: 'success',
    token,
    refreshToken,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  // Create user with limited fields (prevent role assignment)
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    // Default role is 'user' as specified in schema
  });
  
  // Update last login time
  newUser.lastLogin = Date.now();
  await newUser.save({ validateBeforeSave: false });
  
  // Send tokens
  createSendTokens(newUser, 201, req, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  
  // Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }
  
  // Find user by email and include password field
  const user = await User.findOne({ email }).select('+password');
  
  // Check if user exists and password is correct
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }
  
  // Check if user is active
  if (!user.active) {
    return next(new AppError('Your account is deactivated', 401));
  }
  
  // Update last login time and streak
  user.lastLogin = Date.now();
  user.updateStreak();
  await user.save({ validateBeforeSave: false });
  
  // Send tokens
  createSendTokens(user, 200, req, res);
});

exports.refreshToken = catchAsync(async (req, res, next) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return next(new AppError('Please provide refresh token', 400));
  }
  
  // Verify refresh token
  const decoded = await promisify(jwt.verify)(
    refreshToken,
    process.env.JWT_REFRESH_SECRET
  );
  
  // Find user by ID from decoded token
  const user = await User.findById(decoded.id);
  
  // Check if user exists
  if (!user) {
    return next(new AppError('The user belonging to this token no longer exists', 401));
  }
  
  // Check if user is active
  if (!user.active) {
    return next(new AppError('Your account is deactivated', 401));
  }
  
  // Generate and send new tokens
  createSendTokens(user, 200, req, res);
});

exports.logout = (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Successfully logged out',
  });
};

exports.protect = catchAsync(async (req, res, next) => {
  // Get token from Authorization header
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  
  if (!token) {
    return next(new AppError('You are not logged in. Please log in to access', 401));
  }
  
  try {
    // Verify token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    
    // Find user by ID from decoded token
    const user = await User.findById(decoded.id);
    
    // Check if user exists
    if (!user) {
      return next(new AppError('The user belonging to this token no longer exists', 401));
    }
    
    // Grant access to route
    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error.message);
    return next(new AppError('Invalid token. Please log in again.', 401));
  }
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // Check if user role is in permitted roles
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    
    next();
  };
};

exports.updatePassword = catchAsync(async (req, res, next) => {
  // Get user
  const user = await User.findById(req.user.id).select('+password');
  
  // Check if current password is correct
  if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
    return next(new AppError('Your current password is incorrect', 401));
  }
  
  // Update password
  user.password = req.body.newPassword;
  await user.save();
  
  // Send new tokens
  createSendTokens(user, 200, req, res);
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // Find user by email
  const user = await User.findOne({ email: req.body.email });
  
  if (!user) {
    return next(new AppError('There is no user with that email address', 404));
  }
  
  // Generate random reset token
  const resetToken = Math.random().toString(36).slice(-8);
  
  // Hash and store reset token
  user.passwordResetToken = resetToken;
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  await user.save({ validateBeforeSave: false });
  
  // Send email with reset token (mock implementation)
  // In production, use actual email sending
  console.log(`Password reset token: ${resetToken}`);
  
  res.status(200).json({
    status: 'success',
    message: 'Token sent to email',
  });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // Find user by token
  const user = await User.findOne({
    passwordResetToken: req.body.token,
    passwordResetExpires: { $gt: Date.now() },
  });
  
  // Check if token is valid and not expired
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  
  // Set new password
  user.password = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  
  // Log user in, send tokens
  createSendTokens(user, 200, req, res);
}); 