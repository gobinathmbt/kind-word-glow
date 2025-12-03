const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getPublicPaymentSettings, getGoogleMapsApiKey } = require('../controllers/paymentSettings.controller');

// Public payment settings route (for company users to get publishable keys)
router.get('/public', protect, getPublicPaymentSettings);

// Truly public route for Google Maps API key (no auth required - for registration page)
router.get('/google-maps-key', getGoogleMapsApiKey);

module.exports = router;
