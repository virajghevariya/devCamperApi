const express = require('express');
const router = express.Router();
const { getBootcamps,
    getBootcamp,
    createBootcamps,
    updateBootcamps,
    deleteBootcamps,
    getBootcampsInRadius,
    bootcampPhotoUpload
} = require('../controller/bootcamps.js');

const Bootcamp = require('../models/Bootcamp');

// Include Other resources routers
const courseRouter = require('./courses');

const advancedResults = require('../middleware/advancedResults');
const { protect, authorize } = require('../middleware/auth');

// Re-route into the other resource routers
router.use('/:bootcampId/courses', courseRouter);

router.route('/radius/:zipcode/:distance').get(getBootcampsInRadius);

router.route('/:id/photo').put(protect, authorize('publisher', 'admin'), bootcampPhotoUpload);

router.route('/').get(advancedResults(Bootcamp, 'courses'), getBootcamps).post(protect, authorize('publisher', 'admin'), createBootcamps);

router.route('/:id').get(getBootcamp).put(protect, authorize('publisher', 'admin'), updateBootcamps).delete(protect, authorize('publisher', 'admin'), deleteBootcamps);


module.exports = router;