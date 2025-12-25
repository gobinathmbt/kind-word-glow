const MasterVehicle = require("../models/MasterVehicle");
const { logEvent } = require("./logs.controller");
const { logActivity } = require("./vehicleActivityLog.controller");
const ActivityLoggingService = require("../services/activityLogging.service");

// @desc    Get all master vehicles
// @route   GET /api/mastervehicle
// @access  Private (Company Admin/Super Admin)
const getMasterVehicles = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search, dealership, deleted_only } = req.query;
    const skip = (page - 1) * limit;
    const numericLimit = parseInt(limit);
    const numericPage = parseInt(page);

    // Build filter with company_id first for index usage
    let filter = { company_id: req.user.company_id, vehicle_type: 'master' };

    // Handle soft delete filter
    if (deleted_only === 'true') {
      filter.isActive = false;
    } else {
      // Show active vehicles (isActive: true OR isActive field doesn't exist)
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { isActive: true },
          { isActive: { $exists: false } }
        ]
      });
    }

    // Handle dealership-based access for non-primary company_super_admin
    if (!req.user.is_primary_admin &&
      req.user.dealership_ids && req.user.dealership_ids.length > 0) {

      // Extract dealership ObjectIds from the user's dealership_ids array
      const dealershipObjectIds = req.user.dealership_ids.map(dealer => dealer._id);

      // Add dealership filter to only show vehicles from authorized dealerships
      filter.dealership_id = { $in: dealershipObjectIds };
    }

    // Apply dealership filter if specified
    if (dealership && dealership !== 'all') {
      filter.dealership_id = dealership;
    }

    if (status && status !== "all") {
      filter.status = status;
    }

    if (search) {
      filter.$and = filter.$and || [];

      // Build search conditions
      const searchConditions = [
        { make: { $regex: search, $options: "i" } },
        { model: { $regex: search, $options: "i" } },
        { variant: { $regex: search, $options: "i" } },
        { plate_no: { $regex: search, $options: "i" } },
        { vin: { $regex: search, $options: "i" } },
      ];

      // Only add vehicle_stock_id and year search if the search term is numeric
      if (!isNaN(search) && search.trim() !== '') {
        searchConditions.push({ vehicle_stock_id: parseInt(search) });
        searchConditions.push({ year: parseInt(search) });
      }

      filter.$and.push({ $or: searchConditions });
    }

    // Define the projection to include necessary fields including VIN, mileage, license expiry
    const projection = {
      _id: 1,
      vehicle_stock_id: 1,
      vehicle_type: 1,
      vehicle_hero_image: 1,
      vin: 1,
      plate_no: 1,
      make: 1,
      model: 1,
      year: 1,
      variant: 1,
      body_style: 1,
      dealership_id: 1,
      status: 1,
      // Get latest odometer reading
      "vehicle_odometer": {
        $slice: 1 // Get only the first (latest) entry
      },
      // Get latest registration details
      "vehicle_registration": {
        $slice: 1 // Get only the first (latest) entry
      },
    };

    // Use parallel execution for count, data retrieval, and status counts
    const [masterVehicles, total, statusCounts] = await Promise.all([
      MasterVehicle.find(filter, projection)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(numericLimit)
        .lean(), // Use lean for faster queries
      MasterVehicle.countDocuments(filter),
      // Aggregate to get status counts
      MasterVehicle.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Transform vehicles data to flatten nested arrays and add computed fields
    const transformedVehicles = masterVehicles.map((vehicle) => {
      // Get latest odometer reading (mileage)
      const latestOdometer = vehicle.vehicle_odometer?.[0]?.reading || null;

      // Get latest license expiry date
      const latestRegistration = vehicle.vehicle_registration?.[0];
      const licenseExpiryDate = latestRegistration?.license_expiry_date || null;

      return {
        _id: vehicle._id,
        vehicle_stock_id: vehicle.vehicle_stock_id,
        vehicle_type: vehicle.vehicle_type,
        vehicle_hero_image: vehicle.vehicle_hero_image,
        vin: vehicle.vin,
        plate_no: vehicle.plate_no,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        variant: vehicle.variant,
        body_style: vehicle.body_style,
        dealership_id: vehicle.dealership_id,
        status: vehicle.status,
        latest_odometer: latestOdometer,
        license_expiry_date: licenseExpiryDate,
      };
    });

    // Transform status counts into an object
    const statusCountsObject = statusCounts.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: transformedVehicles,
      total,
      statusCounts: statusCountsObject,
      pagination: {
        current_page: numericPage,
        total_pages: Math.ceil(total / numericLimit),
        total_records: total,
        per_page: numericLimit,
      },
    });
  } catch (error) {
    console.error("Get master vehicles error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving master vehicles",
    });
  }
};

// @desc    Get single master vehicle
// @route   GET /api/mastervehicle/:id
// @access  Private (Company Admin/Super Admin)
const getMasterVehicle = async (req, res) => {
  try {
    const masterVehicle = await MasterVehicle.findOne({
      vehicle_stock_id: req.params.id,
      company_id: req.user.company_id,
      vehicle_type: 'master'
    });

    if (!masterVehicle) {
      return res.status(404).json({
        success: false,
        message: "Master vehicle not found",
      });
    }

    res.status(200).json({
      success: true,
      data: masterVehicle,
    });
  } catch (error) {
    console.error("Get master vehicle error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving master vehicle",
    });
  }
};

// @desc    Create master vehicle
// @route   POST /api/mastervehicle
// @access  Private (Company Admin/Super Admin)
const createMasterVehicle = async (req, res) => {
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
      purchase_type: "Purchase type",
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
    const lastVehicle = await MasterVehicle.findOne({
      company_id: req.user.company_id,
      vehicle_type: vehicle_type,
    })
      .sort({ vehicle_stock_id: -1 })
      .limit(1);

    const nextStockId = lastVehicle ? lastVehicle.vehicle_stock_id + 1 : 1;

    // Check if VIN or plate number already exists for this company
    const existingVehicle = await MasterVehicle.findOne({
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
      vehicle_hero_image:
        vehicle_hero_image || "https://via.placeholder.com/400x300",
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
      isActive: true, // Set as active by default
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

    const newVehicle = new MasterVehicle(vehicleData);
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

    // Activity Stream Log
    await logActivity({
      company_id: req.user.company_id,
      vehicle_stock_id: nextStockId,
      vehicle_type: 'master',
      module_name: 'Master Vehicle',
      action: 'create',
      user_id: req.user.id,
      changes: calculateChanges({}, vehicleData),
      metadata: {
        vehicle_stock_id: nextStockId,
        make,
        model,
        year
      }
    });

    res.status(201).json({
      success: true,
      message: "MasterVehicle stock created successfully",
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

// @desc    Update master vehicle
// @route   PUT /api/mastervehicle/:id
// @access  Private (Company Admin/Super Admin)
// @desc    Update master vehicle
// @route   PUT /api/mastervehicle/:id
// @access  Private (Company Admin/Super Admin)
const updateMasterVehicle = async (req, res) => {
  try {
    const masterVehicle = await MasterVehicle.findOne({
      _id: req.params.id,
      company_id: req.user.company_id,
    });

    if (!masterVehicle) {
      return res.status(404).json({
        success: false,
        message: "Master vehicle not found",
      });
    }

    const oldVehicle = masterVehicle.toObject();

    // Special handling for vehicle_odometer to preserve _id
    if (req.body.vehicle_odometer && Array.isArray(req.body.vehicle_odometer)) {
      masterVehicle.vehicle_odometer = req.body.vehicle_odometer.map((entry) => ({
        ...entry, // Preserves _id if it exists
        reading: Number(entry.reading),
        reading_date: entry.reading_date ? new Date(entry.reading_date) : new Date(),
        odometerCertified: entry.odometerCertified || false,
        odometerStatus: entry.odometerStatus || "",
        created_at: entry.created_at ? new Date(entry.created_at) : new Date(),
      }));
      // Remove from req.body so it doesn't get overwritten by set()
      delete req.body.vehicle_odometer;
    }

    // Apply updates
    masterVehicle.set(req.body);
    await masterVehicle.save();

    // Log activity using centralized service
    await ActivityLoggingService.logVehicleUpdate({
      oldData: oldVehicle,
      newData: masterVehicle.toObject(),
      req,
      vehicle: masterVehicle,
      options: {
        vehicleType: 'master'
      }
    });

    await logEvent({
      event_type: "master_vehicle",
      event_action: "master_vehicle_updated",
      event_description: `Master vehicle updated: ${masterVehicle.make} ${masterVehicle.model}`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role,
      metadata: { vehicle_stock_id: masterVehicle.vehicle_stock_id },
    });

    res.status(200).json({
      success: true,
      data: masterVehicle,
      message: "Master vehicle updated successfully",
    });
  } catch (error) {
    console.error("Update master vehicle error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating master vehicle",
    });
  }
};

// @desc    Delete master vehicle
// @route   DELETE /api/mastervehicle/:id
// @access  Private (Company Admin/Super Admin)
const deleteMasterVehicle = async (req, res) => {
  try {
    const masterVehicle = await MasterVehicle.findOneAndDelete({
      vehicle_stock_id: req.params.id,
      company_id: req.user.company_id,
    });

    if (!masterVehicle) {
      return res.status(404).json({
        success: false,
        message: "Master vehicle not found",
      });
    }

    await logEvent({
      event_type: "master_vehicle",
      event_action: "master_vehicle_deleted",
      event_description: `Master vehicle deleted: ${masterVehicle.make} ${masterVehicle.model}`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role,
      metadata: { vehicle_stock_id: masterVehicle.vehicle_stock_id },
    });

    res.status(200).json({
      success: true,
      message: "Master vehicle deleted successfully",
    });
  } catch (error) {
    console.error("Delete master vehicle error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting master vehicle",
    });
  }
};

// @desc    Get master vehicle attachments
// @route   GET /api/mastervehicle/:id/attachments
// @access  Private (Company Admin/Super Admin)
const getMasterVehicleAttachments = async (req, res) => {
  try {
    const vehicle = await MasterVehicle.findOne({
      _id: req.params.id,
      company_id: req.user.company_id,
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Master vehicle not found",
      });
    }

    res.status(200).json({
      success: true,
      data: vehicle.vehicle_attachments || [],
    });
  } catch (error) {
    console.error("Get master vehicle attachments error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving master vehicle attachments",
    });
  }
};

// @desc    Upload master vehicle attachment
// @route   POST /api/mastervehicle/:id/attachments
// @access  Private (Company Admin/Super Admin)
const uploadMasterVehicleAttachment = async (req, res) => {
  try {
    const vehicle = await MasterVehicle.findOne({
      _id: req.params.id,
      company_id: req.user.company_id,
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Master vehicle not found",
      });
    }

    // Add the new attachment
    vehicle.vehicle_attachments = vehicle.vehicle_attachments || [];
    vehicle.vehicle_attachments.push(req.body);

    await vehicle.save();

    // Log Activity
    const attachmentType = req.body.type || 'file';
    const fileName = req.body.filename || req.body.original_filename || 'Unknown file';

    await logActivity({
      company_id: req.user.company_id,
      vehicle_stock_id: vehicle.vehicle_stock_id,
      vehicle_type: 'master',
      module_name: 'Vehicle Attachments',
      action: 'create',
      user_id: req.user.id,
      changes: [{
        field: `${attachmentType}_attachment`,
        old_value: null,
        new_value: fileName,
        action_type: 'add'
      }],
      metadata: {
        attachment_type: attachmentType,
        file_name: fileName,
        file_size: req.body.size
      }
    });

    res.status(200).json({
      success: true,
      data: vehicle.vehicle_attachments,
    });
  } catch (error) {
    console.error("Upload master vehicle attachment error:", error);
    res.status(500).json({
      success: false,
      message: "Error uploading master vehicle attachment",
    });
  }
};

// @desc    Delete master vehicle attachment
// @route   DELETE /api/mastervehicle/:id/attachments/:attachmentId
// @access  Private (Company Admin/Super Admin)
const deleteMasterVehicleAttachment = async (req, res) => {
  try {
    const vehicle = await MasterVehicle.findOne({
      _id: req.params.id,
      company_id: req.user.company_id,
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Master vehicle not found",
      });
    }

    // Find the attachment to be deleted for logging
    const attachmentToDelete = vehicle.vehicle_attachments.find(
      (attachment) => attachment._id.toString() === req.params.attachmentId
    );

    if (!attachmentToDelete) {
      return res.status(404).json({
        success: false,
        message: "Attachment not found",
      });
    }

    // Remove the attachment
    vehicle.vehicle_attachments = vehicle.vehicle_attachments.filter(
      (attachment) => attachment._id.toString() !== req.params.attachmentId
    );

    await vehicle.save();

    // Log Activity
    const attachmentType = attachmentToDelete.type || 'file';
    const fileName = attachmentToDelete.filename || attachmentToDelete.original_filename || 'Unknown file';

    await logActivity({
      company_id: req.user.company_id,
      vehicle_stock_id: vehicle.vehicle_stock_id,
      vehicle_type: 'master',
      module_name: 'Vehicle Attachments',
      action: 'delete',
      user_id: req.user.id,
      changes: [{
        field: `${attachmentType}_attachment`,
        old_value: fileName,
        new_value: null,
        action_type: 'remove'
      }],
      metadata: {
        attachment_type: attachmentType,
        file_name: fileName,
        file_size: attachmentToDelete.size
      }
    });

    res.status(200).json({
      success: true,
      data: vehicle.vehicle_attachments,
    });
  } catch (error) {
    console.error("Delete master vehicle attachment error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting master vehicle attachment",
    });
  }
};

// @desc    Soft delete master vehicle
// @route   PATCH /api/mastervehicle/:id/soft-delete
// @access  Private (Company Admin/Super Admin)
const softDeleteMasterVehicle = async (req, res) => {
  try {
    // First, let's check if the vehicle exists at all
    const existingVehicle = await MasterVehicle.findOne({ _id: req.params.id });
    const vehicle = await MasterVehicle.findOneAndUpdate(
      {
        _id: req.params.id,
        company_id: req.user.company_id,
        $or: [
          { isActive: true },
          { isActive: { $exists: false } } // Handle vehicles without isActive field
        ]
      },
      { isActive: false },
      { new: true }
    );

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Master vehicle not found or already deleted",
      });
    }
    // Log the event
    await logEvent({
      event_type: "vehicle_operation",
      event_action: "master_vehicle_soft_deleted",
      event_description: `Master vehicle soft deleted: ${vehicle.make} ${vehicle.model} (${vehicle.year})`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role,
      metadata: {
        vehicle_stock_id: vehicle.vehicle_stock_id,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        vin: vehicle.vin,
        plate_no: vehicle.plate_no,
        vehicle_type: vehicle.vehicle_type,
      },
    });

    res.status(200).json({
      success: true,
      message: "Master vehicle deleted successfully",
      data: vehicle,
    });
  } catch (error) {
    console.error("Soft delete master vehicle error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting master vehicle",
    });
  }
};

// @desc    Restore master vehicle
// @route   PATCH /api/mastervehicle/:id/restore
// @access  Private (Company Admin/Super Admin)
const restoreMasterVehicle = async (req, res) => {
  try {
    // First, let's check if the vehicle exists and is deleted
    const existingVehicle = await MasterVehicle.findOne({
      _id: req.params.id,
      company_id: req.user.company_id
    });

    const vehicle = await MasterVehicle.findOneAndUpdate(
      {
        _id: req.params.id,
        company_id: req.user.company_id,
        isActive: false,
      },
      { isActive: true },
      { new: true }
    );

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Master vehicle not found or already active",
      });
    }

    // Log the event
    await logEvent({
      event_type: "vehicle_operation",
      event_action: "master_vehicle_restored",
      event_description: `Master vehicle restored: ${vehicle.make} ${vehicle.model} (${vehicle.year})`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role,
      metadata: {
        vehicle_stock_id: vehicle.vehicle_stock_id,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        vin: vehicle.vin,
        plate_no: vehicle.plate_no,
        vehicle_type: vehicle.vehicle_type,
      },
    });

    res.status(200).json({
      success: true,
      message: "Master vehicle restored successfully",
      data: vehicle,
    });
  } catch (error) {
    console.error("Restore master vehicle error:", error);
    res.status(500).json({
      success: false,
      message: "Error restoring master vehicle",
    });
  }
};

module.exports = {
  getMasterVehicles,
  getMasterVehicle,
  createMasterVehicle,
  updateMasterVehicle,
  deleteMasterVehicle,
  softDeleteMasterVehicle,
  restoreMasterVehicle,
  getMasterVehicleAttachments,
  uploadMasterVehicleAttachment,
  deleteMasterVehicleAttachment,
};
