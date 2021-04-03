const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const User = require('../models/User');

// @desc        Register User
// @route       POST /api/v1/auth/register
// @Access      Public

exports.register = asyncHandler( async (req, res, next) => {
    const { name, email, role, password } = req.body;

    // Create User
    const user = await User.create({
        name,
        email,
        role,
        password
    });

    sendTokenResponse(user, 200, res);
});

// @desc        Login User
// @route       POST /api/v1/auth/login
// @Access      Public

exports.login = asyncHandler( async (req, res, next) => {
    const { email, password } = req.body;

    // Validatin email & password
    if(!email || !password) {
        return next(new ErrorResponse('Please provide email and password', 400));
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if(!user) {
        return next(new ErrorResponse('Invalid credential', 401));
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if(!isMatch) {
        return next(new ErrorResponse('Invalid credential', 401));
    }

    sendTokenResponse(user, 200, res);
});

// Get token from model & create cookie & send response
const sendTokenResponse = (user, statusCode, res) => {
    // Create Token
    const token = user.getSignedJwtToken();
    const options = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
        httpOnly: true
    };

    if (process.env.NODE_ENV === 'production') {
        options.secure = true;
    }
    res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
        success: true,
        token
    });
}

// @desc        Get current logged in user
// @route       POST /api/v1/auth/me
// @Access      Private
exports.getMe = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user.id);

    res.status(200).json({
        success: true,
        data: user
    });
});