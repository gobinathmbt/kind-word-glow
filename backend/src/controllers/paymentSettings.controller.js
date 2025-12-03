const MasterAdmin = require('../models/MasterAdmin');
const { logEvent } = require('./logs.controller');

// @desc    Get payment settings
// @route   GET /api/master/payment-settings
// @access  Private (Master Admin only)
const getPaymentSettings = async (req, res) => {
  try {
    // Get the first (and should be only) master admin
    const masterAdmin = await MasterAdmin.findOne();
    
    if (!masterAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Master admin not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: masterAdmin.payment_settings || {}
    });
  } catch (error) {
    console.error('Get payment settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment settings'
    });
  }
};

// @desc    Update payment settings
// @route   PUT /api/master/payment-settings
// @access  Private (Master Admin only)
const updatePaymentSettings = async (req, res) => {
  try {
    const {
      stripe_secret_key,
      stripe_publishable_key,
      paypal_client_id,
      paypal_client_secret,
      razorpay_key_id,
      razorpay_key_secret,
      google_maps_api_key
    } = req.body;

    // Get the first (and should be only) master admin
    const masterAdmin = await MasterAdmin.findOne();
    
    if (!masterAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Master admin not found'
      });
    }

    // Initialize payment_settings if it doesn't exist
    if (!masterAdmin.payment_settings) {
      masterAdmin.payment_settings = {};
    }
    
    // Update only provided fields
    if (stripe_secret_key !== undefined) masterAdmin.payment_settings.stripe_secret_key = stripe_secret_key;
    if (stripe_publishable_key !== undefined) masterAdmin.payment_settings.stripe_publishable_key = stripe_publishable_key;
    if (paypal_client_id !== undefined) masterAdmin.payment_settings.paypal_client_id = paypal_client_id;
    if (paypal_client_secret !== undefined) masterAdmin.payment_settings.paypal_client_secret = paypal_client_secret;
    if (razorpay_key_id !== undefined) masterAdmin.payment_settings.razorpay_key_id = razorpay_key_id;
    if (razorpay_key_secret !== undefined) masterAdmin.payment_settings.razorpay_key_secret = razorpay_key_secret;
    if (google_maps_api_key !== undefined) masterAdmin.payment_settings.google_maps_api_key = google_maps_api_key;
    
    masterAdmin.updated_at = new Date();
    await masterAdmin.save();

    await logEvent({
      event_type: 'system_operation',
      event_action: 'payment_settings_updated',
      event_description: 'Payment gateway settings updated by master admin',
      user_id: req.user.id,
      user_role: req.user.role,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      metadata: {
        updated_fields: Object.keys(req.body)
      }
    });

    res.status(200).json({
      success: true,
      message: 'Payment settings updated successfully',
      data: masterAdmin.payment_settings
    });
  } catch (error) {
    console.error('Update payment settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating payment settings'
    });
  }
};

// @desc    Get public payment settings (for company users)
// @route   GET /api/payment-settings/public
// @access  Private (Any authenticated user)
const getPublicPaymentSettings = async (req, res) => {
  try {
    const masterAdmin = await MasterAdmin.findOne();
    
    if (!masterAdmin || !masterAdmin.payment_settings) {
      return res.status(200).json({
        success: true,
        data: {
          stripe_publishable_key: '',
          paypal_client_id: '',
          razorpay_key_id: '',
          google_maps_api_key: ''
        }
      });
    }
    
    // Return only publishable/public keys (not secret keys)
    res.status(200).json({
      success: true,
      data: {
        stripe_publishable_key: masterAdmin.payment_settings.stripe_publishable_key || '',
        paypal_client_id: masterAdmin.payment_settings.paypal_client_id || '',
        razorpay_key_id: masterAdmin.payment_settings.razorpay_key_id || '',
        google_maps_api_key: masterAdmin.payment_settings.google_maps_api_key || ''
      }
    });
  } catch (error) {
    console.error('Get public payment settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment settings'
    });
  }
};

// @desc    Get Google Maps API key (truly public - no auth required)
// @route   GET /api/payment-settings/google-maps-key
// @access  Public
const getGoogleMapsApiKey = async (req, res) => {
  try {
    const masterAdmin = await MasterAdmin.findOne();
    
    res.status(200).json({
      success: true,
      data: {
        google_maps_api_key: masterAdmin?.payment_settings?.google_maps_api_key || ''
      }
    });
  } catch (error) {
    console.error('Get Google Maps API key error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching Google Maps API key'
    });
  }
};

module.exports = {
  getPaymentSettings,
  updatePaymentSettings,
  getPublicPaymentSettings,
  getGoogleMapsApiKey
};
