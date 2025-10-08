const AdVehicle = require('../models/AdvertiseVehicle');
const { logEvent } = require('./logs.controller');

// @desc    Get all advertisement vehicles
// @route   GET /api/adpublishing
// @access  Private (Company Admin/Super Admin)
const getAdVehicles = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const skip = (page - 1) * limit;
    const numericLimit = parseInt(limit);
    const numericPage = parseInt(page);

    // Build filter with company_id first for index usage
    let filter = {
      company_id: req.user.company_id,
      vehicle_type: 'advertisement'
    };

    // Handle dealership-based access for non-primary company_super_admin
    if (!req.user.is_primary_admin &&
      req.user.dealership_ids && req.user.dealership_ids.length > 0) {

      // Extract dealership ObjectIds from the user's dealership_ids array
      const dealershipObjectIds = req.user.dealership_ids.map(dealer => dealer._id);

      // Add dealership filter to only show vehicles from authorized dealerships
      filter.dealership_id = { $in: dealershipObjectIds };
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { make: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } },
        { plate_no: { $regex: search, $options: 'i' } },
        { vin: { $regex: search, $options: 'i' } }
      ];
    }

    // Use parallel execution for count and data retrieval
    const [adVehicles, total] = await Promise.all([
      AdVehicle.find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(numericLimit)
        .lean(), // Use lean for faster queries
      AdVehicle.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: adVehicles,
      total,
      pagination: {
        current_page: numericPage,
        total_pages: Math.ceil(total / numericLimit),
        total_records: total,
        per_page: numericLimit
      }
    });

  } catch (error) {
    console.error('Get ad vehicles error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving advertisement vehicles'
    });
  }
};

// @desc    Get single advertisement vehicle
// @route   GET /api/adpublishing/:id
// @access  Private (Company Admin/Super Admin)
const getAdVehicle = async (req, res) => {
  try {
    const adVehicle = await AdVehicle.findOne({
      vehicle_stock_id: req.params.id,
      company_id: req.user.company_id,
      vehicle_type: 'advertisement'
    });

    if (!adVehicle) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement vehicle not found'
      });
    }

    res.status(200).json({
      success: true,
      data: adVehicle
    });

  } catch (error) {
    console.error('Get ad vehicle error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving advertisement vehicle'
    });
  }
};

// @desc    Create advertisement vehicle
// @route   POST /api/adpublishing
// @access  Private (Company Admin/Super Admin)
const createAdVehicle = async (req, res) => {
  try {
    const {
      dealership,
      status,
      purchase_type,
      make,
      model,
      variant,
      body_style,
      vin,
      vehicle_type,
      plate_no,
      supplier,
      purchase_date,
      purchase_notes,
      year,
      vehicle_hero_image,
    } = req.body;

    // Validate required fields
    const requiredFields = {
      make: "Make",
      model: "Model",
      year: "Year",
      vin: "VIN",
      plate_no: "Registration number",
      dealership: "Dealership",
      status: "Status",
      purchase_type: "Purchase type"
    };

    const missingFields = [];
    for (const [field, name] of Object.entries(requiredFields)) {
      if (!req.body[field]) {
        missingFields.push(name);
      }
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    // Generate new vehicle stock ID
    const lastVehicle = await AdVehicle.findOne({
      company_id: req.user.company_id,
      vehicle_type: vehicle_type,
    })
      .sort({ vehicle_stock_id: -1 })
      .limit(1);

    const nextStockId = lastVehicle ? lastVehicle.vehicle_stock_id + 1 : 1;

    // Check if VIN or plate number already exists for this company
    const existingVehicle = await AdVehicle.findOne({
      company_id: req.user.company_id,
      $or: [{ vin }, { plate_no }],
    });

    if (existingVehicle) {
      return res.status(400).json({
        success: false,
        message:
          existingVehicle.vin === vin
            ? "A vehicle with this VIN already exists"
            : "A vehicle with this registration number already exists",
      });
    }

    // Create vehicle data
    const vehicleData = {
      vehicle_stock_id: nextStockId,
      company_id: req.user.company_id,
      dealership_id: dealership,
      vehicle_type: vehicle_type || "tradein",
      vehicle_hero_image: vehicle_hero_image || "https://via.placeholder.com/400x300",
      vin,
      plate_no,
      make,
      model,
      year: parseInt(year),
      chassis_no: vin,
      variant,
      body_style,
      status: "pending",
      queue_status: "processed",
    };

    // Add vehicle source information
    if (supplier || purchase_date || purchase_type || purchase_notes) {
      vehicleData.vehicle_source = [
        {
          supplier,
          purchase_date: purchase_date ? new Date(purchase_date) : null,
          purchase_type,
          purchase_notes,
        },
      ];
    }

    // Add vehicle other details with status
    vehicleData.vehicle_other_details = [
      {
        status,
        trader_acquisition: dealership,
        purchase_price: 0,
        exact_expenses: 0,
        estimated_expenses: 0,
        gst_inclusive: false,
        retail_price: 0,
        sold_price: 0,
        included_in_exports: true,
      },
    ];

    const newVehicle = new AdVehicle(vehicleData);
    await newVehicle.save();

    // Log the event
    await logEvent({
      event_type: "vehicle_operation",
      event_action: "vehicle_stock_created",
      event_description: `New vehicle stock created: ${make} ${model} (${year})`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role,
      metadata: {
        vehicle_stock_id: nextStockId,
        make,
        model,
        year,
        vin,
        plate_no,
        vehicle_type: vehicle_type,
      },
    });

    res.status(201).json({
      success: true,
      message: "AdVehicle stock created successfully",
      data: newVehicle,
    });
  } catch (error) {
    console.error("Create vehicle stock error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating vehicle stock",
    });
  }
};

// @desc    Update advertisement vehicle
// @route   PUT /api/adpublishing/:id
// @access  Private (Company Admin/Super Admin)
const updateAdVehicle = async (req, res) => {
  try {
    const adVehicle = await AdVehicle.findOneAndUpdate(
      {
        vehicle_stock_id: req.params.id,
        company_id: req.user.company_id,
        vehicle_type: 'advertisement'
      },
      req.body,
      { new: true, runValidators: true }
    );

    if (!adVehicle) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement vehicle not found'
      });
    }

    await logEvent({
      event_type: 'ad_publishing',
      event_action: 'ad_vehicle_updated',
      event_description: `Advertisement vehicle updated: ${adVehicle.make} ${adVehicle.model}`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role,
      metadata: { vehicle_stock_id: adVehicle.vehicle_stock_id }
    });

    res.status(200).json({
      success: true,
      data: adVehicle,
      message: 'Advertisement vehicle updated successfully'
    });

  } catch (error) {
    console.error('Update ad vehicle error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating advertisement vehicle'
    });
  }
};

// @desc    Delete advertisement vehicle
// @route   DELETE /api/adpublishing/:id
// @access  Private (Company Admin/Super Admin)
const deleteAdVehicle = async (req, res) => {
  try {
    const adVehicle = await AdVehicle.findOneAndDelete({
      vehicle_stock_id: req.params.id,
      company_id: req.user.company_id,
      vehicle_type: 'advertisement'
    });

    if (!adVehicle) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement vehicle not found'
      });
    }

    await logEvent({
      event_type: 'ad_publishing',
      event_action: 'ad_vehicle_deleted',
      event_description: `Advertisement vehicle deleted: ${adVehicle.make} ${adVehicle.model}`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role,
      metadata: { vehicle_stock_id: adVehicle.vehicle_stock_id }
    });

    res.status(200).json({
      success: true,
      message: 'Advertisement vehicle deleted successfully'
    });

  } catch (error) {
    console.error('Delete ad vehicle error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting advertisement vehicle'
    });
  }
};

// @desc    Publish advertisement
// @route   POST /api/adpublishing/:id/publish
// @access  Private (Company Admin/Super Admin)
const publishAdVehicle = async (req, res) => {
  try {
    const adVehicle = await AdVehicle.findOneAndUpdate(
      {
        vehicle_stock_id: req.params.id,
        company_id: req.user.company_id,
        vehicle_type: 'advertisement'
      },
      {
        status: 'published',
        published_at: new Date(),
        published_by: req.user.id
      },
      { new: true }
    );

    if (!adVehicle) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement vehicle not found'
      });
    }

    await logEvent({
      event_type: 'ad_publishing',
      event_action: 'ad_vehicle_published',
      event_description: `Advertisement published: ${adVehicle.make} ${adVehicle.model}`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role,
      metadata: { vehicle_stock_id: adVehicle.vehicle_stock_id }
    });

    res.status(200).json({
      success: true,
      data: adVehicle,
      message: 'Advertisement published successfully'
    });

  } catch (error) {
    console.error('Publish ad vehicle error:', error);
    res.status(500).json({
      success: false,
      message: 'Error publishing advertisement'
    });
  }
};

module.exports = {
  getAdVehicles,
  getAdVehicle,
  createAdVehicle,
  updateAdVehicle,
  deleteAdVehicle,
  publishAdVehicle
};