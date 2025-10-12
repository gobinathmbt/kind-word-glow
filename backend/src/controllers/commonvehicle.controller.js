const Vehicle = require("../models/Vehicle");
const AdvertiseVehicle = require("../models/AdvertiseVehicle");
const MasterVehicle = require("../models/MasterVehicle");
const { logEvent } = require("./logs.controller");

// Helper function to get the correct model based on vehicle type
const getVehicleModel = (vehicleType) => {
  switch (vehicleType) {
    case "advertisement":
      return AdvertiseVehicle;
    case "master":
      return MasterVehicle;
    case "inspection":
    case "tradein":
    default:
      return Vehicle;
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
    const VehicleModel = getVehicleModel(vehicleType);

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
    const VehicleModel = getVehicleModel(vehicle_type);

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
      dealership_id,
    } = req.query;

    const skip = (page - 1) * limit;
    const numericLimit = parseInt(limit);
    const numericPage = parseInt(page);

    // Build filter with company_id
    let filter = {
      company_id: req.user.company_id,
      is_pricing_ready: true,
    };

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

    if (dealership_id && dealership_id !== "all") {
      filter.dealership_id = dealership_id;
    }

    if (status && status !== "all") {
      filter.status = status;
    }

    // Text search
    if (search && search.trim().length > 0) {
      filter.$text = { $search: search };
    }

    // Define fields to return - added vehicle_source.purchase_type
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
      is_pricing_ready: 1,
      cost_details: 1,
      created_at: 1,
      dealership_id: 1,
        "vehicle_other_details": {
        $slice: 1 // Get only the first (latest) entry
      },
      vehicle_source: { $arrayElemAt: ["$vehicle_source", 0] }, // Get first element from vehicle_source array
    };

    // Fetch from both Vehicle and MasterVehicle collections
    const [vehicleResults, masterVehicleResults, vehicleCount, masterVehicleCount] = await Promise.all([
      Vehicle.find(filter, fields)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(numericLimit)
        .lean(),
      MasterVehicle.find(filter, fields)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(numericLimit)
        .lean(),
      Vehicle.countDocuments(filter),
      MasterVehicle.countDocuments(filter),
    ]);

    // Process results to extract purchase_type and flatten the structure
    const processResults = (results) => {
      return results.map(vehicle => {
        const processedVehicle = { ...vehicle };
        if (vehicle.vehicle_source) {
          processedVehicle.purchase_type = vehicle.vehicle_source.purchase_type;
        } else {
          processedVehicle.purchase_type = null;
        }
        delete processedVehicle.vehicle_source;
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
    const VehicleModel = getVehicleModel(vehicle_type);

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

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

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
    const VehicleModel = getVehicleModel(vehicleType);

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

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

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

module.exports = {
  updateVehicleDealership,
  getVehiclesForBulkOperations,
  getPricingReadyVehicles,
  togglePricingReady,
  saveVehicleCostDetails,
};
