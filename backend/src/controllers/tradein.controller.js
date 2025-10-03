
const Vehicle = require('../models/Vehicle');
const { logEvent } = require('./logs.controller');

// @desc    Get all trade-ins
// @route   GET /api/tradein
// @access  Private (Company Admin/Super Admin)
const getTadeins = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, vehicle_type, status } = req.query;

    const skip = (page - 1) * limit;
    const numericLimit = parseInt(limit);
    const numericPage = parseInt(page);

    // Build filter with company_id first for index usage
    let filter = { company_id: req.user.company_id };

    // Handle dealership-based access for non-primary company_super_admin
    if (!req.user.is_primary_admin &&
      req.user.dealership_ids && req.user.dealership_ids.length > 0) {

      // Extract dealership ObjectIds from the user's dealership_ids array
      const dealershipObjectIds = req.user.dealership_ids.map(dealer => dealer._id);

      // Add dealership filter to only show vehicles from authorized dealerships
      filter.dealership_id = { $in: dealershipObjectIds };
    }

    if (vehicle_type) {
      filter.vehicle_type = vehicle_type;
    }

    if (status) {
      filter.status = status;
    }

    // Use text search if available, otherwise use regex fallback
    if (search) {
      if (search.trim().length > 0) {
        filter.$text = { $search: search };
      }
    }

    // Define the fields to exclude (from vehicle_category to vehicle_odometer)
    const excludedFields = {
      inspection_result: 0,
      trade_in_result: 0,
      vehicle_other_details: 0,
      vehicle_source: 0,
      vehicle_registration: 0,
      vehicle_import_details: 0,
      vehicle_attachments: 0,
      vehicle_eng_transmission: 0,
      vehicle_specifications: 0,
      vehicle_safety_features: 0,
      vehicle_odometer: 0,
    };

    // Use parallel execution for count and data retrieval
    const [vehicles, total] = await Promise.all([
      Vehicle.find(filter, excludedFields)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(numericLimit)
        .lean(), // Use lean for faster queries
      Vehicle.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: vehicles,
      total,
      pagination: {
        current_page: numericPage,
        total_pages: Math.ceil(total / numericLimit),
        total_records: total,
        per_page: numericLimit,
      },
    });
  } catch (error) {
    console.error("Get vehicle stock error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving vehicle stock",
    });
  }
};

// @desc    Start appraisal for a vehicle
// @route   POST /api/tradein/start/:vehicleId
// @access  Private (Company Admin/Super Admin)
const startAppraisal = async (req, res) => {
  try {
    const vehicle = await Vehicle.findOneAndUpdate(
      {
        vehicle_stock_id: req.params.vehicleId,
        company_id: req.user.company_id,
        vehicle_type: req.params.vehicleType,
      },
      {
        tradein_status: 'in_progress',
        appraisal_started_at: new Date(),
        appraisal_started_by: req.user.id
      },
      { new: true }
    );

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    await logEvent({
      event_type: 'tradein',
      event_action: 'appraisal_started',
      event_description: `Trade-in appraisal started for ${vehicle.make} ${vehicle.model}`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role,
      metadata: { vehicle_stock_id: vehicle.vehicle_stock_id }
    });

    res.status(200).json({
      success: true,
      data: vehicle,
      message: 'Trade-in appraisal started successfully'
    });

  } catch (error) {
    console.error('Start appraisal error:', error);
    res.status(500).json({
      success: false,
      message: 'Error starting appraisal'
    });
  }
};

// @desc    Get single trade-in
// @route   GET /api/tradein/:id
// @access  Private (Company Admin/Super Admin)
const getTradein = async (req, res) => {
  try {
    const tradein = await Vehicle.findOne({
      _id: req.params.id,
      company_id: req.user.company_id,
      vehicle_type: 'tradein'
    });

    if (!tradein) {
      return res.status(404).json({
        success: false,
        message: 'Trade-in not found'
      });
    }

    res.status(200).json({
      success: true,
      data: tradein
    });

  } catch (error) {
    console.error('Get trade-in error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving trade-in'
    });
  }
};

// @desc    Update trade-in
// @route   PUT /api/tradein/:id
// @access  Private (Company Admin/Super Admin)
const updateTradein = async (req, res) => {
  try {
    const tradein = await Vehicle.findOneAndUpdate(
      {
        _id: req.params.id,
        company_id: req.user.company_id,
        vehicle_type: 'tradein'
      },
      req.body,
      { new: true, runValidators: true }
    );

    if (!tradein) {
      return res.status(404).json({
        success: false,
        message: 'Trade-in not found'
      });
    }

    res.status(200).json({
      success: true,
      data: tradein
    });

  } catch (error) {
    console.error('Update trade-in error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating trade-in'
    });
  }
};

// @desc    Complete appraisal
// @route   POST /api/tradein/:id/complete
// @access  Private (Company Admin/Super Admin)
const completeAppraisal = async (req, res) => {
  try {
    const { appraisal_data, market_value, condition_rating } = req.body;

    // Calculate offer value based on market value and condition
    const conditionMultipliers = {
      'excellent': 1.0,
      'good': 0.9,
      'fair': 0.8,
      'poor': 0.6
    };

    const offerValue = market_value * (conditionMultipliers[condition_rating] || 0.8);

    const tradein = await Vehicle.findOneAndUpdate(
      {
        _id: req.params.id,
        company_id: req.user.company_id,
        vehicle_type: 'tradein'
      },
      {
        tradein_status: 'offer_made',
        appraisal_completed_at: new Date(),
        appraisal_completed_by: req.user.id,
        appraisal_data,
        estimated_market_value: market_value,
        condition_rating,
        offer_value: offerValue
      },
      { new: true }
    );

    if (!tradein) {
      return res.status(404).json({
        success: false,
        message: 'Trade-in not found'
      });
    }

    await logEvent({
      event_type: 'tradein',
      event_action: 'appraisal_completed',
      event_description: `Trade-in appraisal completed for ${tradein.make} ${tradein.model} - Offer: $${offerValue}`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role,
      metadata: {
        vehicle_stock_id: tradein.vehicle_stock_id,
        offer_value: offerValue,
        market_value
      }
    });

    res.status(200).json({
      success: true,
      data: tradein,
      message: 'Appraisal completed successfully'
    });

  } catch (error) {
    console.error('Complete appraisal error:', error);
    res.status(500).json({
      success: false,
      message: 'Error completing appraisal'
    });
  }
};

// @desc    Make offer for trade-in
// @route   POST /api/tradein/:id/offer
// @access  Private (Company Admin/Super Admin)
const makeOffer = async (req, res) => {
  try {
    const { offer_value, offer_notes } = req.body;

    const tradein = await Vehicle.findOneAndUpdate(
      {
        _id: req.params.id,
        company_id: req.user.company_id,
        vehicle_type: 'tradein'
      },
      {
        tradein_status: 'offer_made',
        offer_value,
        offer_notes,
        offer_made_at: new Date(),
        offer_made_by: req.user.id
      },
      { new: true }
    );

    if (!tradein) {
      return res.status(404).json({
        success: false,
        message: 'Trade-in not found'
      });
    }

    await logEvent({
      event_type: 'tradein',
      event_action: 'offer_made',
      event_description: `Offer made for ${tradein.make} ${tradein.model} - $${offer_value}`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role,
      metadata: {
        vehicle_stock_id: tradein.vehicle_stock_id,
        offer_value
      }
    });

    res.status(200).json({
      success: true,
      data: tradein,
      message: 'Offer made successfully'
    });

  } catch (error) {
    console.error('Make offer error:', error);
    res.status(500).json({
      success: false,
      message: 'Error making offer'
    });
  }
};

// @desc    Get trade-in report
// @route   GET /api/tradein/:id/report
// @access  Private (Company Admin/Super Admin)
const getTradeinReport = async (req, res) => {
  try {
    const tradein = await Vehicle.findOne({
      _id: req.params.id,
      company_id: req.user.company_id,
      vehicle_type: 'tradein'
    });

    if (!tradein) {
      return res.status(404).json({
        success: false,
        message: 'Trade-in not found'
      });
    }

    // Generate comprehensive report
    const report = {
      vehicle_info: {
        make: tradein.make,
        model: tradein.model,
        year: tradein.year,
        registration: tradein.registration_number,
        vin: tradein.vin_number,
        mileage: tradein.kms_driven
      },
      appraisal_details: {
        started_at: tradein.appraisal_started_at,
        completed_at: tradein.appraisal_completed_at,
        appraiser: tradein.appraisal_completed_by
      },
      valuation: {
        market_value: tradein.estimated_market_value,
        condition_rating: tradein.condition_rating,
        offer_value: tradein.offer_value,
        depreciation_applied: tradein.estimated_market_value - tradein.offer_value
      },
      appraisal_data: tradein.appraisal_data || {},
      status: tradein.tradein_status
    };

    res.status(200).json({
      success: true,
      data: report
    });

  } catch (error) {
    console.error('Get trade-in report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating trade-in report'
    });
  }
};

module.exports = {
  getTadeins,
  startAppraisal,
  getTradein,
  updateTradein,
  completeAppraisal,
  makeOffer,
  getTradeinReport
};
