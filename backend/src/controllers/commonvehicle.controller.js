// Company DB models - accessed via req.getModel()
// const Vehicle = require("../models/Vehicle"); // Now using req.getModel('Vehicle')
// const AdvertiseVehicle = require("../models/AdvertiseVehicle"); // Now using req.getModel('AdvertiseVehicle')
// const MasterVehicle = require("../models/MasterVehicle"); // Now using req.getModel('MasterVehicle')

const { logEvent } = require("./logs.controller");
const { logActivity } = require("./vehicleActivityLog.controller");
const ActivityLoggingService = require("../services/activityLogging.service");

// Helper function to get the correct model based on vehicle type
const getVehicleModel = (vehicleType, req) => {
  switch (vehicleType) {
    case "advertisement":
      return req.getModel('AdvertiseVehicle');
    case "master":
      return req.getModel('MasterVehicle');
    case "inspection":
    case "tradein":
    default:
      return req.getModel('Vehicle');
  }
};

// @desc    Update dealership for single or multiple vehicles
// @route   PUT /api/common-vehicle/update-dealership
// @access  Private (Company Admin/Super Admin)
const updateVehicleDealership = async (req, res) => {
  try {
    const { vehicleIds, dealershipId, vehicleType } = req.body;

    if (!vehicleIds || !Array.isArray(vehicleIds) || vehicleIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Vehicle IDs array is required",
      });
    }

    if (!dealershipId) {
      return res.status(400).json({
        success: false,
        message: "Dealership ID is required",
      });
    }

    if (!vehicleType) {
      return res.status(400).json({
        success: false,
        message: "Vehicle type is required",
      });
    }

    // Get the correct model based on vehicle type
    const VehicleModel = getVehicleModel(vehicleType, req);

    // Update dealership for all vehicles
    const result = await VehicleModel.updateMany(
      {
        _id: { $in: vehicleIds },
        company_id: req.user.company_id,
      },
      {
        dealership_id: dealershipId,
        updated_at: new Date(),
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No vehicles found or updated",
      });
    }

    // Log the event
    await logEvent({
      event_type: "vehicle_operation",
      event_action: "bulk_dealership_update",
      event_description: `Updated dealership for ${result.modifiedCount} vehicles to ${dealershipId}`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role,
      metadata: {
        vehicle_ids: vehicleIds,
        dealership_id: dealershipId,
        vehicle_type: vehicleType,
        updated_count: result.modifiedCount,
      },
    });

    res.status(200).json({
      success: true,
      message: `Successfully updated dealership for ${result.modifiedCount} vehicles`,
      data: {
        updated_count: result.modifiedCount,
      },
    });
  } catch (error) {
    console.error("Update vehicle dealership error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating vehicle dealership",
    });
  }
};

// @desc    Get vehicles for bulk operations with pagination and filters
// @route   GET /api/common-vehicle/bulk-operations
// @access  Private (Company Admin/Super Admin)
const getVehiclesForBulkOperations = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      vehicle_type,
      status,
      dealership_id,
    } = req.query;

    const skip = (page - 1) * limit;
    const numericLimit = parseInt(limit);
    const numericPage = parseInt(page);

    // Validate vehicle type
    if (!vehicle_type) {
      return res.status(400).json({
        success: false,
        message: "Vehicle type is required",
      });
    }

    // Get the correct model based on vehicle type
    const VehicleModel = getVehicleModel(vehicle_type, req);

    // Build filter with company_id first for index usage
    let filter = {
      company_id: req.user.company_id,
      vehicle_type: vehicle_type,
    };

    // Handle dealership-based access for non-primary company_super_admin
    if (
      !req.user.is_primary_admin &&
      req.user.dealership_ids &&
      req.user.dealership_ids.length > 0
    ) {
      const dealershipObjectIds = req.user.dealership_ids.map((dealer) =>
        typeof dealer === "object" ? dealer._id : dealer
      );
      filter.dealership_id = { $in: dealershipObjectIds };
    }

    if (dealership_id && dealership_id !== "all") {
      filter.dealership_id = dealership_id;
    }

    if (status && status !== "all") {
      filter.status = status;
    }

    // Use text search if available, otherwise use regex fallback
    if (search) {
      if (search.trim().length > 0) {
        filter.$text = { $search: search };
      }
    }

    // Define the fields to return
    const fields = {
      vehicle_stock_id: 1,
      make: 1,
      model: 1,
      year: 1,
      variant: 1,
      plate_no: 1,
      vin: 1,
      vehicle_type: 1,
      status: 1,
      dealership_id: 1,
      vehicle_hero_image: 1,
      created_at: 1,
    };

    // Use parallel execution for count and data retrieval
    const [vehicles, total] = await Promise.all([
      VehicleModel.find(filter, fields)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(numericLimit)
        .lean(),
      VehicleModel.countDocuments(filter),
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
    console.error("Get vehicles for bulk operations error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving vehicles for bulk operations",
    });
  }
};

// @desc    Get pricing ready vehicles from both Vehicle and MasterVehicle schemas
// @route   GET /api/common-vehicle/pricing-ready
// @access  Private (Company Admin/Super Admin)
const getPricingReadyVehicles = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      dealership,
      vehicle_type,
      deleted_only,
    } = req.query;

    const skip = (page - 1) * limit;
    const numericLimit = parseInt(limit);
    const numericPage = parseInt(page);

    // Build filter with company_id
    let filter = {
      company_id: req.user.company_id,
      is_pricing_ready: true,
    };

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

    // Handle dealership-based access
    if (
      !req.user.is_primary_admin &&
      req.user.dealership_ids &&
      req.user.dealership_ids.length > 0
    ) {
      const dealershipObjectIds = req.user.dealership_ids.map((dealer) =>
        typeof dealer === "object" ? dealer._id : dealer
      );
      filter.dealership_id = { $in: dealershipObjectIds };
    }

    // Apply dealership filter if specified
    if (dealership && dealership !== "all") {
      filter.dealership_id = dealership;
    }

    if (status && status !== "all") {
      filter.status = status;
    }

    // Apply vehicle type filter if specified
    if (vehicle_type && vehicle_type !== "all") {
      filter.vehicle_type = vehicle_type;
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

    // Define fields to return - updated to match tradein structure
    const projection = {
      vehicle_stock_id: 1,
      make: 1,
      model: 1,
      year: 1,
      variant: 1,
      plate_no: 1,
      vin: 1,
      vehicle_type: 1,
      status: 1,
      dealership_id: 1,
      vehicle_hero_image: 1,
      is_pricing_ready: 1,
      cost_details: 1,
      created_at: 1,
      dealership_id: 1,
        "vehicle_other_details": {
        $slice: 1 // Get only the first (latest) entry
      },
      // Get latest odometer reading
      "vehicle_odometer": {
        $slice: 1 // Get only the first (latest) entry
      },
      // Get latest registration details
      "vehicle_registration": {
        $slice: 1 // Get only the first (latest) entry
      },
      vehicle_source: { $arrayElemAt: ["$vehicle_source", 0] }, // Get first element from vehicle_source array
    };

    // Fetch from both Vehicle and MasterVehicle collections
    const Vehicle = req.getModel('Vehicle');
    const MasterVehicle = req.getModel('MasterVehicle');
    
    const [vehicleResults, masterVehicleResults, vehicleCount, masterVehicleCount] = await Promise.all([
      Vehicle.find(filter, projection)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(numericLimit)
        .lean(),
      MasterVehicle.find(filter, projection)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(numericLimit)
        .lean(),
      Vehicle.countDocuments(filter),
      MasterVehicle.countDocuments(filter),
    ]);

    // Process results to extract purchase_type and add odometer/registration details
    const processResults = (results) => {
      return results.map(vehicle => {
        // Get latest odometer reading
        const latestOdometer = vehicle.vehicle_odometer?.[0]?.reading || null;

        // Get latest license expiry date
        const latestRegistration = vehicle.vehicle_registration?.[0];
        const licenseExpiryDate = latestRegistration?.license_expiry_date || null;

        const processedVehicle = {
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
          dealership_id: vehicle.dealership_id,
          status: vehicle.status,
          is_pricing_ready: vehicle.is_pricing_ready,
          cost_details: vehicle.cost_details,
          created_at: vehicle.created_at,
          latest_odometer: latestOdometer,
          license_expiry_date: licenseExpiryDate,
        };

        // Add purchase_type from vehicle_source if available
        if (vehicle.vehicle_source) {
          processedVehicle.purchase_type = vehicle.vehicle_source.purchase_type;
        } else {
          processedVehicle.purchase_type = null;
        }

        return processedVehicle;
      });
    };

    const processedVehicleResults = processResults(vehicleResults);
    const processedMasterVehicleResults = processResults(masterVehicleResults);

    // Combine results and sort by created_at
    const combinedResults = [...processedVehicleResults, ...processedMasterVehicleResults]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, numericLimit);

    const total = vehicleCount + masterVehicleCount;

    res.status(200).json({
      success: true,
      data: combinedResults,
      total,
      pagination: {
        current_page: numericPage,
        total_pages: Math.ceil(total / numericLimit),
        total_records: total,
        per_page: numericLimit,
      },
    });
  } catch (error) {
    console.error("Get pricing ready vehicles error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving pricing ready vehicles",
    });
  }
};

// @desc    Toggle vehicle pricing ready status
// @route   PATCH /api/common-vehicle/pricing-ready/:vehicleId
// @access  Private (Company Admin/Super Admin)
const togglePricingReady = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { vehicle_type, is_pricing_ready } = req.body;

    if (!vehicle_type) {
      return res.status(400).json({
        success: false,
        message: "Vehicle type is required",
      });
    }

    if (typeof is_pricing_ready !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: "is_pricing_ready must be a boolean value",
      });
    }

    // Get the correct model based on vehicle type
    const VehicleModel = getVehicleModel(vehicle_type, req);

    // First get the current vehicle data for activity logging
    const currentVehicle = await VehicleModel.findOne({
      vehicle_stock_id: vehicleId,
      company_id: req.user.company_id,
    });

    if (!currentVehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    // Store old data for comparison
    const oldVehicleData = currentVehicle.toObject();

    // Update the vehicle
    const vehicle = await VehicleModel.findOneAndUpdate(
      {
        vehicle_stock_id: vehicleId,
        company_id: req.user.company_id,
      },
      {
        is_pricing_ready,
        updated_at: new Date(),
      },
      { new: true }
    );

    // Log activity using centralized service
    await ActivityLoggingService.logVehicleUpdate({
      oldData: oldVehicleData,
      newData: vehicle.toObject(),
      req,
      vehicle,
      options: {
        vehicleType: vehicle_type === 'master' ? 'master' : vehicle_type,
        metadata: {
          action_type: is_pricing_ready ? 'enabled' : 'disabled',
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year
        }
      }
    });

    // Log the event
    await logEvent({
      event_type: "vehicle_operation",
      event_action: "pricing_ready_toggle",
      event_description: `Vehicle ${vehicleId} pricing ready status set to ${is_pricing_ready}`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role,
      metadata: {
        vehicle_id: vehicleId,
        vehicle_type,
        is_pricing_ready,
      },
    });

    res.status(200).json({
      success: true,
      message: `Vehicle ${is_pricing_ready ? 'marked as' : 'removed from'} pricing ready`,
      data: vehicle,
    });
  } catch (error) {
    console.error("Toggle pricing ready error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating pricing ready status",
    });
  }
};

// @desc    Save vehicle cost details
// @route   PUT /api/common-vehicle/:vehicleId/:vehicleType/cost-details
// @access  Private (Company Admin/Super Admin)
const saveVehicleCostDetails = async (req, res) => {
  try {
    const { vehicleId, vehicleType } = req.params;
    const { cost_details } = req.body;

    if (!vehicleId || !vehicleType) {
      return res.status(400).json({
        success: false,
        message: "Vehicle ID and vehicle type are required",
      });
    }

    // Get the correct model based on vehicle type
    const VehicleModel = getVehicleModel(vehicleType, req);

    // First get the current vehicle data for activity logging
    const currentVehicle = await VehicleModel.findOne({
      _id: vehicleId,
      company_id: req.user.company_id,
    });

    if (!currentVehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    // Store old data for comparison
    const oldVehicleData = currentVehicle.toObject();

    // Find and update vehicle
    const vehicle = await VehicleModel.findOneAndUpdate(
      {
        _id: vehicleId,
        company_id: req.user.company_id,
      },
      {
        cost_details: cost_details,
        updated_at: new Date(),
      },
      { new: true }
    );

    // Log activity using centralized service
    await ActivityLoggingService.logVehicleUpdate({
      oldData: oldVehicleData,
      newData: vehicle.toObject(),
      req,
      vehicle,
      options: {
        vehicleType: vehicleType === 'master' ? 'master' : vehicleType,
        metadata: {
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          cost_details_updated: true
        }
      }
    });

    // Log the event
    await logEvent({
      event_type: "vehicle_operation",
      event_action: "save_cost_details",
      event_description: `Saved cost details for vehicle ${vehicleId}`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role,
      metadata: {
        vehicle_id: vehicleId,
        vehicle_type: vehicleType,
      },
    });

    res.status(200).json({
      success: true,
      message: "Cost details saved successfully",
      data: vehicle,
    });
  } catch (error) {
    console.error("Save vehicle cost details error:", error);
    res.status(500).json({
      success: false,
      message: "Error saving vehicle cost details",
    });
  }
};

// @desc    Update vehicle pricing information with comprehensive activity logging
// @desc    Update vehicle pricing information with comprehensive activity logging
// @route   PUT /api/common-vehicle/:vehicleId/:vehicleType/pricing
// @access  Private (Company Admin/Super Admin)
const updateVehiclePricing = async (req, res) => {
  try {
    const { vehicleId, vehicleType } = req.params;

    if (!vehicleId || !vehicleType) {
      return res.status(400).json({
        success: false,
        message: "Vehicle ID and vehicle type are required",
      });
    }

    // Get the correct model based on vehicle type
    const VehicleModel = getVehicleModel(vehicleType, req);

    // First get the current vehicle data for activity logging
    const currentVehicle = await VehicleModel.findOne({
      _id: vehicleId,
      company_id: req.user.company_id,
    });

    if (!currentVehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    // Store old data for comparison
    const oldVehicleData = currentVehicle.toObject();

    // IMPORTANT: Extract module_section BEFORE setting req.body
    // This ensures it's preserved for activity logging even if Mongoose strips it
    const moduleSection = req.body?.module_section;

    // Apply updates
    currentVehicle.set(req.body);
    await currentVehicle.save();

    // Ensure req.body still has the module_section for activity logging
    // (in case it was stripped by Mongoose)
    if (moduleSection && !req.body.module_section) {
      req.body.module_section = moduleSection;
    }

    // Log activity using centralized service
    // Ensure vehicle_type is set correctly - use the vehicleType from params for pricing vehicles
    const logVehicleType = vehicleType === 'master' ? 'master' : (vehicleType || currentVehicle.vehicle_type || 'pricing');
    
    await ActivityLoggingService.logVehicleUpdate({
      oldData: oldVehicleData,
      newData: currentVehicle.toObject(),
      req,
      vehicle: {
        ...currentVehicle.toObject(),
        vehicle_type: logVehicleType // Override vehicle_type to ensure correct logging
      },
      options: {
        vehicleType: logVehicleType,
        metadata: {
          make: currentVehicle.make,
          model: currentVehicle.model,
          year: currentVehicle.year
        }
      }
    });

    // Log the event
    await logEvent({
      event_type: "vehicle_operation",
      event_action: "pricing_updated",
      event_description: `Pricing information updated for vehicle ${vehicleId}`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role,
      metadata: {
        vehicle_id: vehicleId,
        vehicle_type: vehicleType,
      },
    });

    res.status(200).json({
      success: true,
      message: "Pricing information updated successfully",
      data: currentVehicle,
    });
  } catch (error) {
    console.error("Update vehicle pricing error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating vehicle pricing information",
    });
  }
};

// @desc    Get pricing vehicle attachments
// @route   GET /api/common-vehicle/:vehicleId/:vehicleType/attachments
// @access  Private (Company Admin/Super Admin)
const getPricingVehicleAttachments = async (req, res) => {
  try {
    const { vehicleId, vehicleType } = req.params;

    // Get the correct model based on vehicle type
    const VehicleModel = getVehicleModel(vehicleType, req);

    const vehicle = await VehicleModel.findOne({
      _id: vehicleId,
      company_id: req.user.company_id,
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    res.status(200).json({
      success: true,
      data: vehicle.vehicle_attachments || [],
    });
  } catch (error) {
    console.error("Get pricing vehicle attachments error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving pricing vehicle attachments",
    });
  }
};

// @desc    Upload pricing vehicle attachment
// @route   POST /api/common-vehicle/:vehicleId/:vehicleType/attachments
// @access  Private (Company Admin/Super Admin)
const uploadPricingVehicleAttachment = async (req, res) => {
  try {
    const { vehicleId, vehicleType } = req.params;

    // Get the correct model based on vehicle type
    const VehicleModel = getVehicleModel(vehicleType, req);

    const vehicle = await VehicleModel.findOne({
      _id: vehicleId,
      company_id: req.user.company_id,
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    // Add the new attachment
    vehicle.vehicle_attachments = vehicle.vehicle_attachments || [];
    vehicle.vehicle_attachments.push(req.body);

    await vehicle.save();

    // Log Activity - exactly like master vehicle
    const attachmentType = req.body.type || 'file';
    const fileName = req.body.filename || req.body.original_filename || 'Unknown file';
    const moduleName = req.body.module_section || 'Vehicle Attachments';

    await logActivity({
      company_id: req.user.company_id,
      vehicle_stock_id: vehicle.vehicle_stock_id,
      vehicle_type: vehicleType === 'master' ? 'master' : vehicleType,
      module_name: moduleName,
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
    console.error("Upload pricing vehicle attachment error:", error);
    res.status(500).json({
      success: false,
      message: "Error uploading pricing vehicle attachment",
    });
  }
};

// @desc    Delete pricing vehicle attachment
// @route   DELETE /api/common-vehicle/:vehicleId/:vehicleType/attachments/:attachmentId
// @access  Private (Company Admin/Super Admin)
const deletePricingVehicleAttachment = async (req, res) => {
  try {
    const { vehicleId, vehicleType, attachmentId } = req.params;

    // Get the correct model based on vehicle type
    const VehicleModel = getVehicleModel(vehicleType, req);

    const vehicle = await VehicleModel.findOne({
      _id: vehicleId,
      company_id: req.user.company_id,
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    // Find the attachment to be deleted for logging
    const attachmentToDelete = vehicle.vehicle_attachments.find(
      (attachment) => attachment._id.toString() === attachmentId
    );

    if (!attachmentToDelete) {
      return res.status(404).json({
        success: false,
        message: "Attachment not found",
      });
    }

    // Remove the attachment
    vehicle.vehicle_attachments = vehicle.vehicle_attachments.filter(
      (attachment) => attachment._id.toString() !== attachmentId
    );

    await vehicle.save();

    // Log Activity - exactly like master vehicle
    const attachmentType = attachmentToDelete.type || 'file';
    const fileName = attachmentToDelete.filename || attachmentToDelete.original_filename || 'Unknown file';
    const moduleName = req.body?.module_section || req.query?.module_section || 'Pricing Attachments';

    await logActivity({
      company_id: req.user.company_id,
      vehicle_stock_id: vehicle.vehicle_stock_id,
      vehicle_type: vehicleType === 'master' ? 'master' : vehicleType,
      module_name: moduleName,
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
    console.error("Delete pricing vehicle attachment error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting pricing vehicle attachment",
    });
  }
};

module.exports = {
  updateVehicleDealership,
  getVehiclesForBulkOperations,
  getPricingReadyVehicles,
  togglePricingReady,
  saveVehicleCostDetails,
  updateVehiclePricing,
  getPricingVehicleAttachments,
  uploadPricingVehicleAttachment,
  deletePricingVehicleAttachment,
};
