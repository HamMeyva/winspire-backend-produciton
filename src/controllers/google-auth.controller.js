const User = require('../models/user.model');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const jwt = require('jsonwebtoken');

/**
 * Sign JWT token
 * @param {String} id - User ID to include in token
 * @returns {String} Signed JWT token
 */
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

/**
 * Create and send JWT token in response
 * @param {Object} user - User object
 * @param {Number} statusCode - HTTP status code
 * @param {Object} res - Express response object
 */
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

/**
 * Handle Google authentication for mobile app
 */
exports.googleAuth = catchAsync(async (req, res, next) => {
  const { googleId, email, name, picture } = req.body;

  // Validate required fields
  if (!googleId || !email) {
    return next(new AppError('Google ID and email are required', 400));
  }

  // Check if user exists with this Google ID
  let user = await User.findOne({ googleId });

  if (!user) {
    // If user doesn't exist, check if there's a user with the same email
    user = await User.findOne({ email });

    if (user) {
      // Update existing user with Google ID
      user.googleId = googleId;
      user.googlePicture = picture;
      
      // Only update name if it doesn't exist
      if (!user.name) {
        user.name = name;
      }
      
      await user.save({ validateBeforeSave: false });
    } else {
      // Create new user with Google credentials
      user = await User.create({
        name,
        email,
        googleId,
        googlePicture: picture,
        role: 'user',
        // Auto-verified since Google auth means email is verified
        emailVerified: true 
      });
    }
  } else {
    // User exists, update Google picture if provided
    if (picture && user.googlePicture !== picture) {
      user.googlePicture = picture;
      await user.save({ validateBeforeSave: false });
    }
  }

  createSendToken(user, 200, res);
});
