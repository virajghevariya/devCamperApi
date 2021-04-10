const crypto = require('crypto');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const sendEmail = require('../utils/sendEmail');
const User = require('../models/User');


// @desc        Register User
// @route       POST /api/v1/auth/register
// @Access      Public

exports.register = asyncHandler(async (req, res, next) => {
    const { name, email,role, password } = req.body;

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

exports.login = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    // Validatin email & password
    if (!email || !password) {
        return next(new ErrorResponse('Please provide email and password', 400));
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
        return next(new ErrorResponse('Invalid credential', 401));
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
        return next(new ErrorResponse('Invalid credential', 401));
    }

    sendTokenResponse(user, 200, res);
});


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

// @desc        update user name and email
// @route       PUT /api/v1/auth/updatedetails
// @Access      Private
exports.updateDetails = asyncHandler(async (req, res, next) => {
    const fieldToUpdate = {
        name : req.body.name,
        email: req.body.email
    }

    const user = await User.findByIdAndUpdate(req.user.id, fieldToUpdate, {
        new: true,
        runValidators: true
    });

    res.status(200).json({
        success: true,
        data: user
    });
});

// @desc        Update user password
// @route       PUT /api/v1/auth/updatepassword
// @Access      Private
exports.updatePassword = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user.id).select('+password');

    // Check current Password
    if(!(await user.matchPassword(req.body.currentPassword))) {
        return next(ErrorResponse('Password is incorrect', 401))
    }

    user.password = req.body.newPassword;
    await user.save(); 

    sendTokenResponse(user, 200, res);
});

// @desc        forgot password
// @route       POST /api/v1/auth/forgotpassword
// @Access      Public
exports.forgotPassword = asyncHandler(async (req, res, next) => {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
        return next(new ErrorResponse('There is no user with that email', 404));
    }

    const resetToken = user.getResetPasswordToken();

    await user.save({ validateBeforeSave: false });

    // Create resetUrl
    const resetUrl = `${req.protocol}://${req.get('host')}/api/v1/auth/resetpassword/${resetToken}`;

    const message = `You received this email because you (or someone else) has requested reset of password. please make a put request to: \n\n ${resetUrl}`;

    try {
        await sendEmail({
            email: user.email,
            subject: 'Password reset token',
            message
        });

        res.status(200).json({ success: true, msg: 'Email sent' });
    } catch (err) {
        console.log(err);

        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save({ validateBeforeSave: false });

        return next(new ErrorResponse('Email could not be sent', 500));
    }

    console.log(resetToken);
    res.status(200).json({
        success: true,
        data: user
    });
});

// @desc        Reset password
// @route       PUT /api/v1/auth/resetpassword/:resettoken
// @Access      Public
exports.resetPassword = asyncHandler(async (req, res, next) => {
    // Get hashed token
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.resettoken).digest('hex');
    const user = await User.findOne({
        resetPasswordToken,
        // resetPasswordExpire: { $gt: Date.now() }
    });


    if (!user) {
        return next(new ErrorResponse('Invalid token', 400));
    }

    // Set  new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

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