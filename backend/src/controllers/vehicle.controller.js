const Vehicle = require("../models/Vehicle");
const Dealership = require("../models/Dealership");
const { logEvent } = require("./logs.controller");
const {
  processSingleVehicle,
  processBulkVehicles,
  validateRequiredFields,
  separateSchemaAndCustomFields,
  validateCompany,
  performBasicValidation,
  processQueueMessages,
} = require("./sqs.controller");

// @desc    Get vehicle stock with pagination and filters
// @route   GET /api/vehicle/stock
// @access  Private (Company Admin/Super Admin)
const getVehicleStock = async (req, res) => {
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

// @desc    Get detailed vehicle information
// @route   GET /api/vehicle/detail/:vehicleId
// @access  Private (Company Admin/Super Admin)
const getVehicleDetail = async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({
      vehicle_stock_id: req.params.vehicleId,
      company_id: req.user.company_id,
      vehicle_type: req.params.vehicleType,
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    res.status(200).json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    console.error("Get vehicle detail error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving vehicle details",
    });
  }
};

// @desc    Create new vehicle stock
// @route   POST /api/vehicle/create-stock
// @access  Private (Company Admin/Super Admin)
const createVehicleStock = async (req, res) => {
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
      // New fields
      odometer_reading,
      purchase_price,
      rego_expiry_date,
      warranty_expiry_date,
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
      // New required fields
      odometer_reading: "Odometer reading",
      purchase_price: "Purchase price",
      rego_expiry_date: "Registration expiry date",
      warranty_expiry_date: "Manufacture warranty expiry date"
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
    const lastVehicle = await Vehicle.findOne({
      company_id: req.user.company_id,
      vehicle_type: vehicle_type,
    })
      .sort({ vehicle_stock_id: -1 })
      .limit(1);

    const nextStockId = lastVehicle ? lastVehicle.vehicle_stock_id + 1 : 1000;

    // Check if VIN or plate number already exists for this company
    const existingVehicle = await Vehicle.findOne({
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
      status: status, // Use the status from frontend directly
      queue_status: "processed",
    };

    // Add odometer data
    if (odometer_reading) {
      vehicleData.vehicle_odometer = [
        {
          reading: parseInt(odometer_reading),
          reading_date: new Date(),
        },
      ];
    }

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

    // Add vehicle registration with expiry dates
    if (rego_expiry_date || warranty_expiry_date) {
      vehicleData.vehicle_registration = [
        {
          license_expiry_date: rego_expiry_date ? new Date(rego_expiry_date) : null,
          wof_cof_expiry_date: warranty_expiry_date ? new Date(warranty_expiry_date) : null,
          registered_in_local: true,
          year_first_registered_local: 0,
          re_registered: false,
          first_registered_year: 0,
          road_user_charges_apply: false,
          outstanding_road_user_charges: false,
          ruc_end_distance: 0,
        },
      ];
    }

    // Add vehicle other details with status and purchase price
    vehicleData.vehicle_other_details = [
      {
        status: status, // Use the status from frontend
        trader_acquisition: "",
        purchase_price: parseFloat(purchase_price) || 0,
        exact_expenses: 0,
        estimated_expenses: 0,
        gst_inclusive: false,
        retail_price: 0,
        sold_price: 0,
        included_in_exports: true,
      },
    ];

    const newVehicle = new Vehicle(vehicleData);
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
        status: status,
      },
    });

    res.status(201).json({
      success: true,
      message: "Vehicle stock created successfully",
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

// @desc    Bulk import vehicles
// @route   POST /api/vehicle/bulk-import
// @access  Private (Company Admin/Super Admin)
const bulkImportVehicles = async (req, res) => {
  try {
    const { vehicles } = req.body;

    if (!Array.isArray(vehicles) || vehicles.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Vehicles array is required and cannot be empty",
      });
    }

    const results = await processBulkVehicles(vehicles, req.user.company_id);

    await logEvent({
      event_type: "vehicle_operation",
      event_action: "bulk_import_initiated",
      event_description: `Bulk import of ${vehicles.length} vehicles initiated`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role,
      metadata: {
        total_vehicles: vehicles.length,
        success_count: results.success_records.length,
        failure_count: results.failure_records.length,
      },
    });

    res.status(200).json({
      success: true,
      message: `Processed ${results.total_processed} vehicles`,
      data: results,
    });
  } catch (error) {
    console.error("Bulk import vehicles error:", error);
    res.status(500).json({
      success: false,
      message: "Error processing bulk import",
    });
  }
};

// @desc    Update vehicle
// @route   PUT /api/vehicle/:id
// @access  Private (Company Admin/Super Admin)
const updateVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findOneAndUpdate(
      { _id: req.params.id, company_id: req.user.company_id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    res.status(200).json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    console.error("Update vehicle error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating vehicle",
    });
  }
};

// @desc    Delete vehicle
// @route   DELETE /api/vehicle/:id
// @access  Private (Company Admin/Super Admin)
const deleteVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findOneAndDelete({
      _id: req.params.id,
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
      message: "Vehicle deleted successfully",
    });
  } catch (error) {
    console.error("Delete vehicle error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting vehicle",
    });
  }
};

// @desc    Receive vehicle data from external sources
// @route   POST /api/vehicle/receive
// @access  Public (External systems)
const receiveVehicleData = async (req, res) => {
  try {
    const requestData = req.body;

    // Check if it's a single vehicle or bulk vehicles
    if (Array.isArray(requestData)) {
      // Bulk processing
      if (requestData.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Vehicle array cannot be empty",
        });
      }

      // Extract company_id from first vehicle (assuming all vehicles are for same company)
      const companyId = requestData[0].company_id;
      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "company_id is required for all vehicles",
        });
      }

      // Validate company
      const companyValidation = await validateCompany(companyId);
      if (!companyValidation.valid) {
        return res.status(400).json({
          success: false,
          message: companyValidation.error,
        });
      }

      // Process each vehicle to ensure schema compliance
      const processedVehicles = requestData.map((vehicle) => {
        const { schemaFields } = separateSchemaAndCustomFields(vehicle);
        return schemaFields;
      });

      console.log(`🔄 Processing bulk vehicles for company: ${companyId}`);
      const results = await processBulkVehicles(processedVehicles, companyId);

      res.status(200).json({
        success: true,
        message: `Processed ${results.total_processed} vehicles`,
        data: {
          total_processed: results.total_processed,
          success_count: results.success_records.length,
          failure_count: results.failure_records.length,
          queue_ids: results.queue_ids,
          success_records: results.success_records,
          failure_records: results.failure_records,
        },
      });
    } else {
      // Single vehicle processing
      if (!requestData.company_id) {
        return res.status(400).json({
          success: false,
          message: "company_id is required",
        });
      }

      if (!requestData.vehicle_type) {
        return res.status(400).json({
          success: false,
          message: "vehicle_type is required (inspection or tradein)",
        });
      }

      if (!requestData.vehicle_stock_id) {
        return res.status(400).json({
          success: false,
          message: "vehicle_stock_id is required",
        });
      }

      // Validate company
      const companyValidation = await validateCompany(requestData.company_id);
      if (!companyValidation.valid) {
        return res.status(400).json({
          success: false,
          message: companyValidation.error,
        });
      }

      // Handle dealership_id logic
      const dealershipResult = await handleDealershipId(
        requestData,
        requestData.company_id
      );
      if (!dealershipResult.success) {
        return res.status(400).json({
          success: false,
          message: dealershipResult.message,
        });
      }

      // Set the dealership_id if it was determined
      if (dealershipResult.dealership_id && !requestData.dealership_id) {
        requestData.dealership_id = dealershipResult.dealership_id;
      }

      console.log(
        `🔍 Processing single vehicle: ${requestData.vehicle_stock_id} - ${requestData.vehicle_type} for company: ${requestData.company_id}`
      );

      // Ensure schema compliance before processing
      const { schemaFields } = separateSchemaAndCustomFields(requestData);

      // Perform basic validation first
      const validation = await performBasicValidation(schemaFields);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.error,
          data: {
            vehicle_stock_id: requestData.vehicle_stock_id,
          },
        });
      }

      const result = await processSingleVehicle(schemaFields);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.exists
            ? "Vehicle data updated and queued for processing"
            : "Vehicle data received and queued for processing",
          data: {
            vehicle_stock_id: result.vehicle_stock_id,
            queue_id: result.queue_id,
            exists: result.exists,
          },
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error,
          data: {
            vehicle_stock_id: result.vehicle_stock_id,
          },
        });
      }
    }
  } catch (error) {
    console.error("Receive vehicle data error:", error);
    res.status(500).json({
      success: false,
      message: "Error processing vehicle data",
      error: error.message,
    });
  }
};

// Helper function to handle dealership_id logic
const handleDealershipId = async (vehicleData, companyId) => {
  try {
    // If dealership_id is already provided, return success
    if (vehicleData.dealership_id) {
      const existingDealerships = await Dealership.find({
        company_id: companyId,
        is_active: true,
      }).select("dealership_id dealership_name");

      // Check if the provided dealership_id exists and is valid
      const isValidDealership = existingDealerships.some(
        (dealership) => dealership.dealership_id === vehicleData.dealership_id
      );

      if (isValidDealership) {
        return {
          success: true,
          dealership_id: vehicleData.dealership_id,
          message: "Dealership is valid",
        };
      } else {
        return {
          success: false,
          dealership_id: vehicleData.dealership_id,
          message:
            "Dealership is invalid - provided dealership_id does not exist or is not active for this company",
          available_dealerships: existingDealerships,
        };
      }
    }

    // Check existing dealerships for the company
    const existingDealerships = await Dealership.find({
      company_id: companyId,
      is_active: true,
    }).select("dealership_id dealership_name");

    const dealershipCount = existingDealerships.length;

    if (dealershipCount === 0) {
      // No dealerships found, leave it empty
      return {
        success: true,
        dealership_id: null,
      };
    } else if (dealershipCount === 1) {
      // Exactly one dealership found, use it
      return {
        success: true,
        dealership_id: existingDealerships[0].dealership_id,
      };
    } else {
      // Multiple dealerships found, require explicit dealership_id
      const dealershipList = existingDealerships
        .map((d) => `${d.dealership_id} (${d.dealership_name})`)
        .join(", ");

      return {
        success: false,
        message: `Multiple dealerships found for this company. Please provide dealership_id. Available dealerships: ${dealershipList}`,
      };
    }
  } catch (error) {
    console.error("Error handling dealership_id:", error);
    return {
      success: false,
      message: "Error checking dealership information",
    };
  }
};

const processQueueManually = async (req, res) => {
  try {
    console.log("📋 Manual queue processing initiated by:", req.user.email);

    const result = await processQueueMessages();

    if (result.success) {
      res.status(200).json({
        success: true,
        message: `Queue processing completed`,
        data: {
          processed: result.processed,
          failed: result.failed,
          total: result.total || result.processed + result.failed,
          results: result.results || [],
        },
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Queue processing failed",
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Manual queue processing error:", error);
    res.status(500).json({
      success: false,
      message: "Error processing queue manually",
    });
  }
};

// @desc    Update vehicle overview section
// @route   PUT /api/vehicle/:id/overview
// @access  Private (Company Admin/Super Admin)
const updateVehicleOverview = async (req, res) => {
  try {
    const vehicle = await Vehicle.findOneAndUpdate(
      { _id: req.params.id, company_id: req.user.company_id, vehicle_type: req.params.vehicleType, },
      {
        make: req.body.make,
        model: req.body.model,
        variant: req.body.variant,
        year: req.body.year,
        vin: req.body.vin,
        plate_no: req.body.plate_no,
        chassis_no: req.body.chassis_no,
        body_style: req.body.body_style,
        vehicle_category: req.body.vehicle_category,
      },
      { new: true, runValidators: true }
    );

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    res.status(200).json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    console.error("Update vehicle overview error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating vehicle overview",
    });
  }
};

// @desc    Update vehicle general info section
// @route   PUT /api/vehicle/:id/general-info
// @access  Private (Company Admin/Super Admin)
const updateVehicleGeneralInfo = async (req, res) => {
  try {
    const vehicle = await Vehicle.findOneAndUpdate(
      { _id: req.params.id, company_id: req.user.company_id, vehicle_type: req.params.vehicleType, },
      { vehicle_other_details: req.body.vehicle_other_details },
      { new: true, runValidators: true }
    );

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    res.status(200).json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    console.error("Update vehicle general info error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating vehicle general info",
    });
  }
};

// @desc    Update vehicle source section
// @route   PUT /api/vehicle/:id/source
// @access  Private (Company Admin/Super Admin)
const updateVehicleSource = async (req, res) => {
  try {
    const vehicle = await Vehicle.findOneAndUpdate(
      { _id: req.params.id, company_id: req.user.company_id, vehicle_type: req.params.vehicleType, },
      { vehicle_source: req.body.vehicle_source },
      { new: true, runValidators: true }
    );

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    res.status(200).json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    console.error("Update vehicle source error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating vehicle source",
    });
  }
};

// @desc    Update vehicle registration section
// @route   PUT /api/vehicle/:id/registration
// @access  Private (Company Admin/Super Admin)
const updateVehicleRegistration = async (req, res) => {
  try {
    const vehicle = await Vehicle.findOneAndUpdate(
      { _id: req.params.id, company_id: req.user.company_id, vehicle_type: req.params.vehicleType, },
      { vehicle_registration: req.body.vehicle_registration },
      { new: true, runValidators: true }
    );

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    res.status(200).json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    console.error("Update vehicle registration error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating vehicle registration",
    });
  }
};

// @desc    Update vehicle import section
// @route   PUT /api/vehicle/:id/import
// @access  Private (Company Admin/Super Admin)
const updateVehicleImport = async (req, res) => {
  try {
    const vehicle = await Vehicle.findOneAndUpdate(
      { _id: req.params.id, company_id: req.user.company_id, vehicle_type: req.params.vehicleType, },
      { vehicle_import_details: req.body.vehicle_import_details },
      { new: true, runValidators: true }
    );

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    res.status(200).json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    console.error("Update vehicle import error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating vehicle import details",
    });
  }
};

// @desc    Update vehicle engine section
// @route   PUT /api/vehicle/:id/engine
// @access  Private (Company Admin/Super Admin)
const updateVehicleEngine = async (req, res) => {
  try {
    const vehicle = await Vehicle.findOneAndUpdate(
      { _id: req.params.id, company_id: req.user.company_id, vehicle_type: req.params.vehicleType, },
      { vehicle_eng_transmission: req.body.vehicle_eng_transmission },
      { new: true, runValidators: true }
    );

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    res.status(200).json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    console.error("Update vehicle engine error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating vehicle engine details",
    });
  }
};

// @desc    Update vehicle specifications section
// @route   PUT /api/vehicle/:id/specifications
// @access  Private (Company Admin/Super Admin)
const updateVehicleSpecifications = async (req, res) => {
  try {
    const vehicle = await Vehicle.findOneAndUpdate(
      { _id: req.params.id, company_id: req.user.company_id, vehicle_type: req.params.vehicleType, },
      { vehicle_specifications: req.body.vehicle_specifications },
      { new: true, runValidators: true }
    );

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    res.status(200).json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    console.error("Update vehicle specifications error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating vehicle specifications",
    });
  }
};

// @desc    Update vehicle safety features section
// @route   PUT /api/vehicle/:id/safety
// @access  Private (Company Admin/Super Admin)
const updateVehicleSafetyFeatures = async (req, res) => {
  try {
    const vehicle = await Vehicle.findOneAndUpdate(
      { _id: req.params.id, company_id: req.user.company_id, vehicle_type: req.params.vehicleType, },
      { vehicle_safety_features: req.body.vehicle_safety_features },
      { new: true, runValidators: true }
    );

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    res.status(200).json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    console.error("Update vehicle safety features error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating vehicle safety features",
    });
  }
};

// @desc    Update vehicle odometer section
// @route   PUT /api/vehicle/:id/odometer
// @access  Private (Company Admin/Super Admin)
const updateVehicleOdometer = async (req, res) => {
  try {
    const vehicle = await Vehicle.findOneAndUpdate(
      { _id: req.params.id, company_id: req.user.company_id, vehicle_type: req.params.vehicleType, },
      { vehicle_odometer: req.body.vehicle_odometer },
      { new: true, runValidators: true }
    );

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    res.status(200).json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    console.error("Update vehicle odometer error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating vehicle odometer",
    });
  }
};

// @desc    Update vehicle ownership section
// @route   PUT /api/vehicle/:id/ownership
// @access  Private (Company Admin/Super Admin)
const updateVehicleOwnership = async (req, res) => {
  try {
    const vehicle = await Vehicle.findOneAndUpdate(
      { _id: req.params.id, company_id: req.user.company_id, vehicle_type: req.params.vehicleType, },
      { vehicle_ownership: req.body.vehicle_ownership },
      { new: true, runValidators: true }
    );

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    res.status(200).json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    console.error("Update vehicle ownership error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating vehicle ownership",
    });
  }
};

// @desc    Get vehicle attachments
// @route   GET /api/vehicle/:id/attachments
// @access  Private (Company Admin/Super Admin)
const getVehicleAttachments = async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({
      _id: req.params.id,
      company_id: req.user.company_id,
      vehicle_type: req.params.vehicleType,
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
    console.error("Get vehicle attachments error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving vehicle attachments",
    });
  }
};

// @desc    Upload vehicle attachment
// @route   POST /api/vehicle/:id/attachments
// @access  Private (Company Admin/Super Admin)
const uploadVehicleAttachment = async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({
      _id: req.params.id,
      company_id: req.user.company_id,
      vehicle_type: req.params.vehicleType,
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

    res.status(200).json({
      success: true,
      data: vehicle.vehicle_attachments,
    });
  } catch (error) {
    console.error("Upload vehicle attachment error:", error);
    res.status(500).json({
      success: false,
      message: "Error uploading vehicle attachment",
    });
  }
};

// @desc    Delete vehicle attachment
// @route   DELETE /api/vehicle/:id/attachments/:attachmentId
// @access  Private (Company Admin/Super Admin)
const deleteVehicleAttachment = async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({
      _id: req.params.id,
      company_id: req.user.company_id,
      vehicle_type: req.params.vehicleType,
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    // Remove the attachment
    vehicle.vehicle_attachments = vehicle.vehicle_attachments.filter(
      (attachment) => attachment._id.toString() !== req.params.attachmentId
    );

    await vehicle.save();

    res.status(200).json({
      success: true,
      data: vehicle.vehicle_attachments,
    });
  } catch (error) {
    console.error("Delete vehicle attachment error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting vehicle attachment",
    });
  }
};

// @desc    Push vehicle or specific stages to workshop
// @route   PUT /api/vehicle/:id/workshop-status
// @access  Private (Company Admin/Super Admin)
const updateVehicleWorkshopStatus = async (req, res) => {
  try {
    const { stages, workshop_action } = req.body;
    console.log('Update request:', { stages, workshop_action });

    const vehicle = await Vehicle.findOne({
      _id: req.params.id,
      company_id: req.user.company_id,
      vehicle_type: req.params.vehicleType,
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    // Handle both inspection and tradein vehicles with stages
    if (["inspection", "tradein"].includes(vehicle.vehicle_type) && stages && Array.isArray(stages)) {

      // Ensure arrays are properly initialized (handle case where they might be false)
      if (!Array.isArray(vehicle.is_workshop)) {
        vehicle.is_workshop = [];
      }
      if (!Array.isArray(vehicle.workshop_progress)) {
        vehicle.workshop_progress = [];
      }
      if (!Array.isArray(vehicle.workshop_report_preparing)) {
        vehicle.workshop_report_preparing = [];
      }
      if (!Array.isArray(vehicle.workshop_report_ready)) {
        vehicle.workshop_report_ready = [];
      }

      console.log('Before update:', {
        is_workshop: vehicle.is_workshop,
        workshop_progress: vehicle.workshop_progress,
        workshop_report_preparing: vehicle.workshop_report_preparing,
        workshop_report_ready: vehicle.workshop_report_ready
      });

      if (workshop_action === 'push') {
        stages.forEach(stageName => {
          console.log(`Processing stage: ${stageName}`);

          // Check if stage already exists in workshop
          const existingWorkshopIndex = vehicle.is_workshop.findIndex(
            item => item.stage_name === stageName
          );
          const existingProgressIndex = vehicle.workshop_progress.findIndex(
            item => item.stage_name === stageName
          );
          const existingPreparingIndex = vehicle.workshop_report_preparing.findIndex(
            item => item.stage_name === stageName
          );
          const existingReadyIndex = vehicle.workshop_report_ready.findIndex(
            item => item.stage_name === stageName
          );

          console.log(`Existing indices for ${stageName}:`, {
            workshop: existingWorkshopIndex,
            progress: existingProgressIndex,
            preparing: existingPreparingIndex,
            ready: existingReadyIndex
          });

          // Handle is_workshop array
          if (existingWorkshopIndex === -1) {
            vehicle.is_workshop.push({
              stage_name: stageName,
              in_workshop: true,
              pushed_at: new Date()
            });
            console.log(`Added new workshop entry for ${stageName}`);
          } else {
            vehicle.is_workshop[existingWorkshopIndex].in_workshop = true;
            vehicle.is_workshop[existingWorkshopIndex].pushed_at = new Date();
            console.log(`Updated existing workshop entry for ${stageName}`);
          }

          // Handle workshop_progress array
          if (existingProgressIndex === -1) {
            vehicle.workshop_progress.push({
              stage_name: stageName,
              progress: "in_progress",
              started_at: new Date()
            });
            console.log(`Added new progress entry for ${stageName}`);
          } else {
            // Only update if not already in progress or completed
            const currentProgress = vehicle.workshop_progress[existingProgressIndex].progress;
            if (currentProgress === "not_processed_yet") {
              vehicle.workshop_progress[existingProgressIndex].progress = "in_progress";
              vehicle.workshop_progress[existingProgressIndex].started_at = new Date();
              console.log(`Updated progress for ${stageName} from ${currentProgress} to in_progress`);
            } else {
              console.log(`Skipped progress update for ${stageName}, current progress: ${currentProgress}`);
            }
          }

          // Handle workshop_report_preparing array
          if (existingPreparingIndex === -1) {
            vehicle.workshop_report_preparing.push({
              stage_name: stageName,
              preparing: false
            });
            console.log(`Added new preparing entry for ${stageName}`);
          } else {
            console.log(`Preparing entry already exists for ${stageName}`);
          }

          // Handle workshop_report_ready array
          if (existingReadyIndex === -1) {
            vehicle.workshop_report_ready.push({
              stage_name: stageName,
              ready: false
            });
            console.log(`Added new ready entry for ${stageName}`);
          } else {
            console.log(`Ready entry already exists for ${stageName}`);
          }
        });
      }
      else if (workshop_action === 'remove') {
        stages.forEach(stageName => {
          console.log(`Removing stage: ${stageName}`);

          // Check if stage is in progress - cannot remove if in progress
          const progressIndex = vehicle.workshop_progress.findIndex(
            item => item.stage_name === stageName
          );

          if (progressIndex !== -1 && vehicle.workshop_progress[progressIndex].progress === "in_progress") {
            console.log(`Cannot remove ${stageName} - stage is in progress`);
            return;
          }

          // Get initial lengths for logging
          const initialWorkshopLength = vehicle.is_workshop.length;
          const initialProgressLength = vehicle.workshop_progress.length;
          const initialPreparingLength = vehicle.workshop_report_preparing.length;
          const initialReadyLength = vehicle.workshop_report_ready.length;

          // Remove from is_workshop array
          vehicle.is_workshop = vehicle.is_workshop.filter(
            item => item.stage_name !== stageName
          );

          // Remove from workshop_progress array (only if not in progress)
          vehicle.workshop_progress = vehicle.workshop_progress.filter(
            item => item.stage_name !== stageName || item.progress === "in_progress"
          );

          // Remove from workshop_report_preparing array
          vehicle.workshop_report_preparing = vehicle.workshop_report_preparing.filter(
            item => item.stage_name !== stageName
          );

          // Remove from workshop_report_ready array
          vehicle.workshop_report_ready = vehicle.workshop_report_ready.filter(
            item => item.stage_name !== stageName
          );

          console.log(`Removed ${stageName}:`, {
            workshop_removed: initialWorkshopLength - vehicle.is_workshop.length,
            progress_removed: initialProgressLength - vehicle.workshop_progress.length,
            preparing_removed: initialPreparingLength - vehicle.workshop_report_preparing.length,
            ready_removed: initialReadyLength - vehicle.workshop_report_ready.length
          });
        });
      }

      console.log('After update:', {
        is_workshop: vehicle.is_workshop,
        workshop_progress: vehicle.workshop_progress,
        workshop_report_preparing: vehicle.workshop_report_preparing,
        workshop_report_ready: vehicle.workshop_report_ready
      });

      // Mark arrays as modified to ensure Mongoose saves them
      vehicle.markModified('is_workshop');
      vehicle.markModified('workshop_progress');
      vehicle.markModified('workshop_report_preparing');
      vehicle.markModified('workshop_report_ready');

    } else {
      // Handle other vehicle types (advertisement, master) with single boolean values
      const { is_workshop, workshop_progress } = req.body;

      vehicle.is_workshop = is_workshop;
      vehicle.workshop_progress = workshop_progress;

      if (!vehicle.workshop_report_preparing) {
        vehicle.workshop_report_preparing = false;
      }
      if (!vehicle.workshop_report_ready) {
        vehicle.workshop_report_ready = false;
      }
    }

    // Save the vehicle with force update
    const savedVehicle = await vehicle.save();
    console.log('Vehicle saved successfully:', savedVehicle._id);

    // Log the event
    await logEvent({
      event_type: "vehicle_operation",
      event_action: ["inspection", "tradein"].includes(vehicle.vehicle_type)
        ? `stages_${workshop_action}_workshop`
        : "vehicle_pushed_to_workshop",
      event_description: `Vehicle/stages ${workshop_action} workshop: ${vehicle.make} ${vehicle.model}`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role,
      metadata: {
        vehicle_stock_id: vehicle.vehicle_stock_id,
        vehicle_type: vehicle.vehicle_type,
        stages: ["inspection", "tradein"].includes(vehicle.vehicle_type) ? stages : null,
        action: workshop_action,
      },
    });

    res.status(200).json({
      success: true,
      data: savedVehicle,
    });
  } catch (error) {
    console.error("Update vehicle workshop status error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating vehicle workshop status",
      error: error.message,
    });
  }
};

module.exports = {
  getVehicleStock,
  getVehicleDetail,
  createVehicleStock,
  bulkImportVehicles,
  updateVehicle,
  deleteVehicle,
  receiveVehicleData,
  processQueueManually,

  // New section update exports
  updateVehicleOverview,
  updateVehicleGeneralInfo,
  updateVehicleSource,
  updateVehicleRegistration,
  updateVehicleImport,
  updateVehicleEngine,
  updateVehicleSpecifications,
  updateVehicleSafetyFeatures,
  updateVehicleOdometer,
  updateVehicleOwnership,
  getVehicleAttachments,
  uploadVehicleAttachment,
  deleteVehicleAttachment,
  updateVehicleWorkshopStatus,
};
