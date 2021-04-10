const path = require('path');
const ErrorResponse = require('../utils/errorResponse');
const Bootcamp = require('../models/Bootcamp');
const geocoder = require('../utils/geocoder');
const asyncHandler = require('../middleware/async');
// const { param } = require('../routes/bootcamps');

// @desc        Get all Bootcamps
// @route       GET /api/v1/bootcamps
// @Access      Public 
exports.getBootcamps = asyncHandler(async (req, res, next) => {
    res.status(200).json(res.advancedResults);

});

// @desc        Get Bootcamps
// @route       GET /api/v1/bootcamps/:id
// @Access      Public 
exports.getBootcamp = asyncHandler(async (req, res, next) => {

    const bootcamp = await Bootcamp.findById(req.params.id);

    if (!bootcamp) {
        return next(new ErrorResponse(`Bootcamp not found with id: ${req.params.id}`, 404));
    }

    res.status(200).json({ success: true, data: bootcamp });


});

// @desc        Create New Bootcamps
// @route       POST /api/v1/bootcamps
// @Access      Private 
exports.createBootcamps = asyncHandler(async (req, res, next) => {

    // Add User to req.body
    req.body.user = req.user.id;

    // Check for published Bootcamp
    const publishedBootcamp = await Bootcamp.findOne({ user: req.user.id });

    // Check user is admin or not & publishedBootcamp is in database or not
    if(publishedBootcamp && req.user.role !== 'admin') {
        return next(new ErrorResponse(`User with ID ${req.user.id}  has already published Bootcamp`, 400));
    }

    const bootcamp = await Bootcamp.create(req.body);

    res.status(201).json({
        success: true,
        data: bootcamp
    });

});

// @desc        Update Bootcamps
// @route       PUT /api/v1/bootcamps/:id
// @Access      Privavte 
exports.updateBootcamps = asyncHandler(async (req, res, next) => {

    let bootcamp = await Bootcamp.findById(req.params.id);

    if (!bootcamp) {
        return next(new ErrorResponse(`Bootcamp not found with id: ${req.params.id}`, 404));
    }

    // Make sure user is owner of Bootcamp
    if(bootcamp.user.toString() !== req.user.id && req.user.role !== 'admin') {
        return next(new ErrorResponse(`User with ID ${req.user.id}  is not authorized to update Bootcamp`, 401));        
    }

    bootcamp = await Bootcamp.findOneAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    res.status(200).json({ success: true, data: bootcamp });


});

// @desc        DELETE Bootcamps
// @route       DELETE /api/v1/bootcamps/:id
// @Access      Privavte 
exports.deleteBootcamps = async (req, res, next) => {

    const bootcamp = await Bootcamp.findById(req.params.id);

    if (!bootcamp) {
        return next(new ErrorResponse(`Bootcamp not found with id: ${req.params.id}`, 404));
    }

    // Make sure user is owner of Bootcamp
    if(bootcamp.user.toString() !== req.user.id && req.user.role !== 'admin') {
        return next(new ErrorResponse(`User with ID ${req.user.id}  is not authorized to delete Bootcamp`, 401));        
    }
        
    bootcamp.remove();

    res.status(200).json({ success: true, data: {} });
};

// @desc        Get bootcamps within radius
// @route       GET/api/v1/bootcamps/radius/:zipcode/:distance
// @Access      Privavte 
exports.getBootcampsInRadius = async (req, res, next) => {
    const { zipcode, distance } = req.params;

    // Get lat/lng from Geocoder
    const loc = await geocoder.geocode(zipcode);
    const lat = loc[0].latitude;
    const lng = loc[0].longitude;

    // Calc radius using radians
    // Divide dist by Earth's radius
    // Earth radius = 3,963 mi / 6,378 km

    const radius = distance / 3963;

    const bootcamps = await Bootcamp.find({
        location: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }
    });

    res.status(200).json({
        success: true,
        count: bootcamps.length,
        data: bootcamps
    });
};


// Photo ----------------------------------------------------------------

// @desc        Upload Photo for Bootcamp
// @route       PUT /api/v1/bootcamps/:id/photo
// @Access      Privavte 
exports.bootcampPhotoUpload = async (req, res, next) => {

    const bootcamp = await Bootcamp.findById(req.params.id);

    if (!bootcamp) {
        return next(new ErrorResponse(`Bootcamp not found with id: ${req.params.id}`, 404));
    }

    // Make sure user is owner of Bootcamp
    if(bootcamp.user.toString() !== req.user.id && req.user.role !== 'admin') {
        return next(new ErrorResponse(`User with ID ${req.user.id}  is not authorized to update Bootcamp`, 401));        
    }

    if (!req.files) {
        return next(new ErrorResponse(`Please upload a files`, 400));
    }

    const file = req.files.file;
    if (!file.mimetype.startsWith('image')) {
        return next(new ErrorResponse(`Please upload an image file`, 400));
    }

    // Check File size
    if (!file.size > process.env.MAX_FILE_UPLOAD) {
        return next(new ErrorResponse(`Please upload an image less than ${process.env.MAX_FILE_UPLOAD}`, 400));
    }

    // Ceate a custome file Name
    file.name = `photo_${bootcamp._id}${path.parse(file.name).ext}`;

    file.mv(`${process.env.FILE_UPLOAD_PATH}/${file.name}`, async err => {
        if(err) {
            return next(new ErrorResponse(`Problem with file upload`, 500));
        }

        await Bootcamp.findByIdAndUpdate(req.params.id, { photo: file.name });

        res.status(200).json({
            success: true,
            data: file.name
        });
    })
};