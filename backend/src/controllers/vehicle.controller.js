// Company DB models - accessed via req.getModel()
// const Vehicle = require("../models/Vehicle"); // Now using req.getModel('Vehicle')
// const Dealership = require("../models/Dealership"); // Now using req.getModel('Dealership')

const { logEvent } = require("./logs.controller");
const { calculateChanges, logActivity } = require("./vehicleActivityLog.controller");
const ActivityLoggingService = require("../services/activityLogging.service");
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
    const Vehicle = req.getModel('Vehicle');
    const Dealership = req.getModel('Dealership'); // Ensure Dealership model is created on connection
    
    const { page = 1, limit = 20, search, vehicle_type, status, dealership, deleted_only } = req.query;

    const skip = (page - 1) * limit;
    const numericLimit = parseInt(limit);
    const numericPage = parseInt(page);

    // Build filter with company_id first for index usage
    let filter = { company_id: req.user.company_id };

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
    if (
      !req.user.is_primary_admin &&
      req.user.dealership_ids &&
      req.user.dealership_ids.length > 0
    ) {
      // Extract dealership ObjectIds from the user's dealership_ids array
      const dealershipObjectIds = req.user.dealership_ids.map(
        (dealer) => dealer._id
      );

      // Add dealership filter to only show vehicles from authorized dealerships
      filter.dealership_id = { $in: dealershipObjectIds };
    }

    // Apply dealership filter if specified
    if (dealership && dealership !== 'all') {
      filter.dealership_id = dealership;
    }

    if (vehicle_type) {
      filter.vehicle_type = vehicle_type;
    }

    if (status) {
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

    // Use aggregation for better performance with $lookup and no JS looping
    const [transformedVehicles, total, statusCounts] = await Promise.all([
      Vehicle.aggregate([
        { $match: filter },
        { $sort: { created_at: -1 } },
        { $skip: skip },
        { $limit: numericLimit },
        {
          $lookup: {
            from: 'dealerships',
            localField: 'dealership_id',
            foreignField: 'dealership_id',
            as: 'dealership_info'
          }
        },
        {
          $addFields: {
            dealership_info: { $arrayElemAt: ['$dealership_info', 0] },
            latest_odometer: { $arrayElemAt: ['$vehicle_odometer.reading', 0] },
            license_expiry_date: { $arrayElemAt: ['$vehicle_registration.license_expiry_date', 0] },
            inspection_result_data: { $arrayElemAt: ['$inspection_result', 0] }
          }
        },
        {
          $project: {
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
            dealership_id: {
              $cond: {
                if: { $ne: ['$dealership_info', null] },
                then: {
                  _id: '$dealership_info._id',
                  dealership_name: '$dealership_info.dealership_name'
                },
                else: null
              }
            },
            status: 1,
            latest_odometer: { $ifNull: ['$latest_odometer', null] },
            license_expiry_date: { $ifNull: ['$license_expiry_date', null] },
            inspection_result: { $ifNull: ['$inspection_result_data', null] },
            inspection_status: { $ifNull: ['$inspection_result_data.status', 'pending'] },
            inspection_date: { $ifNull: ['$inspection_result_data.inspection_date', null] }
          }
        }
      ]),
      Vehicle.countDocuments(filter),
      Vehicle.aggregate([
        { $match: filter },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ])
    ]);

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
    console.error("Get inspection vehicles error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving inspection vehicles",
    });
  }
};

// @desc    Get detailed vehicle information
// @route   GET /api/vehicle/detail/:vehicleId
// @access  Private (Company Admin/Super Admin)
const getVehicleDetail = async (req, res) => {
  try {
    const Vehicle = req.getModel('Vehicle');
    
    const vehicle = await Vehicle.findOne({
      vehicle_stock_id: req.params.vehicleId,
      company_id: req.user.company_id,
      vehicle_type: req.params.vehicleType,
      // Note: We don't filter by isActive here to allow viewing deleted vehicles
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
    const Vehicle = req.getModel('Vehicle');
    
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
      isActive: true, // Set as active by default
    };

    // Add odometer data
    if (odometer_reading) {
      vehicleData.vehicle_odometer = [
        {
          reading: parseInt(odometer_reading),
          reading_date: new Date(),
          odometerCertified: false,
          odometerStatus: "",
          created_at: new Date(),
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
    const Vehicle = req.getModel('Vehicle');
    
    const { id } = req.params;

    // Find the vehicle first
    const vehicle = await Vehicle.findOne({
      _id: id,
      company_id: req.user.company_id
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    // Capture old state for logging
    const oldVehicle = vehicle.toObject();

    // Handle inspection_result update
    if (req.body.inspection_result) {
      // Ensure inspection_result is an array
      vehicle.inspection_result = vehicle.inspection_result || [];
      const updatedInspectionResult = [...vehicle.inspection_result];

      req.body.inspection_result.forEach(updatedCategory => {
        const existingCategoryIndex = updatedInspectionResult.findIndex(
          cat => cat.category_id === updatedCategory.category_id
        );

        if (existingCategoryIndex !== -1) {
          // Update existing category
          updatedInspectionResult[existingCategoryIndex] = updatedCategory;
        } else {
          // Add new category (if needed)
          updatedInspectionResult.push(updatedCategory);
        }
      });

      vehicle.inspection_result = updatedInspectionResult;
    }

    // Handle trade_in_result update  
    if (req.body.trade_in_result) {
      vehicle.trade_in_result = vehicle.trade_in_result || [];
      const updatedTradeInResult = [...vehicle.trade_in_result];

      req.body.trade_in_result.forEach(updatedCategory => {
        const existingCategoryIndex = updatedTradeInResult.findIndex(
          cat => cat.category_id === updatedCategory.category_id
        );

        if (existingCategoryIndex !== -1) {
          // Update existing category
          updatedTradeInResult[existingCategoryIndex] = updatedCategory;
        } else {
          // Add new category (if needed)
          updatedTradeInResult.push(updatedCategory);
        }
      });

      vehicle.trade_in_result = updatedTradeInResult;
    }

    // Handle general vehicle field updates
    const generalFields = ['make', 'model', 'model_no', 'variant', 'year', 'vin', 'plate_no', 'chassis_no', 'body_style', 'vehicle_category'];
    generalFields.forEach(field => {
      if (req.body[field] !== undefined) {
        vehicle[field] = req.body[field];
      }
    });

    // Save the updated vehicle
    await vehicle.save();

    // Log activity using centralized service
    await ActivityLoggingService.logVehicleUpdate({
      oldData: oldVehicle,
      newData: vehicle.toObject(),
      req,
      vehicle,
      options: {
        vehicleType: vehicle.vehicle_type || 'master'
      }
    });

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
    const Vehicle = req.getModel('Vehicle');
    
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

// @desc    Soft delete vehicle
// @route   PATCH /api/vehicle/:id/:vehicleType/soft-delete
// @access  Private (Company Admin/Super Admin)
const softDeleteVehicle = async (req, res) => {
  try {
    const Vehicle = req.getModel('Vehicle');
    
    // First, let's check if the vehicle exists at all
    const existingVehicle = await Vehicle.findOne({ _id: req.params.id });
    const vehicle = await Vehicle.findOneAndUpdate(
      {
        _id: req.params.id,
        company_id: req.user.company_id,
        // Remove vehicle_type check to be more flexible like master vehicle
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
        message: "Vehicle not found or already deleted",
      });
    }

    // Log the event
    await logEvent({
      event_type: "vehicle_operation",
      event_action: "vehicle_soft_deleted",
      event_description: `Vehicle soft deleted: ${vehicle.make} ${vehicle.model} (${vehicle.year})`,
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
      message: "Vehicle deleted successfully",
      data: vehicle,
    });
  } catch (error) {
    console.error("Soft delete vehicle error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting vehicle",
    });
  }
};

// @desc    Restore vehicle
// @route   PATCH /api/vehicle/:id/:vehicleType/restore
// @access  Private (Company Admin/Super Admin)
const restoreVehicle = async (req, res) => {
  try {
    const Vehicle = req.getModel('Vehicle');
    
    // First, let's check if the vehicle exists and is deleted
    const existingVehicle = await Vehicle.findOne({
      _id: req.params.id,
      company_id: req.user.company_id
    });

    const vehicle = await Vehicle.findOneAndUpdate(
      {
        _id: req.params.id,
        company_id: req.user.company_id,
        // Remove vehicle_type check to be more flexible like master vehicle
        isActive: false,
      },
      { isActive: true },
      { new: true }
    );

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found or already active",
      });
    }

    // Log the event
    await logEvent({
      event_type: "vehicle_operation",
      event_action: "vehicle_restored",
      event_description: `Vehicle restored: ${vehicle.make} ${vehicle.model} (${vehicle.year})`,
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
      message: "Vehicle restored successfully",
      data: vehicle,
    });
  } catch (error) {
    console.error("Restore vehicle error:", error);
    res.status(500).json({
      success: false,
      message: "Error restoring vehicle",
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
      const Dealership = req.getModel('Dealership');
      const dealershipResult = await handleDealershipId(
        requestData,
        requestData.company_id,
        Dealership
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
const handleDealershipId = async (vehicleData, companyId, Dealership) => {
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
// @desc    Update vehicle overview section
// @route   PUT /api/vehicle/:id/overview
// @access  Private (Company Admin/Super Admin)
const updateVehicleOverview = async (req, res) => {
  try {
    const Vehicle = req.getModel('Vehicle');
    
    const oldVehicle = await Vehicle.findOne({
      _id: req.params.id,
      company_id: req.user.company_id,
      vehicle_type: req.params.vehicleType,
    });

    if (!oldVehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    // Prepare update data - only include fields that are provided
    const updateData = {};
    const allowedFields = [
      'make', 'model', 'variant', 'year', 'vin', 'plate_no', 'chassis_no',
      'body_style', 'vehicle_category', 'vehicle_hero_image', 'color',
      'fuel_type', 'transmission', 'drive_type', 'doors', 'seats',
      'engine_size', 'engine_code', 'description', 'notes', 'name'
    ];

    // Handle simple fields
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    // Handle array fields that might be part of overview
    const arrayFields = ['vehicle_attachments'];
    arrayFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    const vehicle = await Vehicle.findOneAndUpdate(
      { _id: req.params.id, company_id: req.user.company_id, vehicle_type: req.params.vehicleType, },
      updateData,
      { new: true, runValidators: true }
    );

    // Log activity using centralized service
    await ActivityLoggingService.logVehicleUpdate({
      oldData: oldVehicle.toObject(),
      newData: vehicle.toObject(),
      req,
      vehicle,
      options: {
        vehicleType: vehicle.vehicle_type
      }
    });

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
// @desc    Update vehicle general info section
// @route   PUT /api/vehicle/:id/general-info
// @access  Private (Company Admin/Super Admin)
const updateVehicleGeneralInfo = async (req, res) => {
  try {
    const Vehicle = req.getModel('Vehicle');
    
    const oldVehicle = await Vehicle.findOne({
      _id: req.params.id,
      company_id: req.user.company_id,
      vehicle_type: req.params.vehicleType,
    });

    if (!oldVehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    const vehicle = await Vehicle.findOneAndUpdate(
      { _id: req.params.id, company_id: req.user.company_id, vehicle_type: req.params.vehicleType, },
      { vehicle_other_details: req.body.vehicle_other_details },
      { new: true, runValidators: true }
    );

    // Log activity using centralized service
    await ActivityLoggingService.logVehicleUpdate({
      oldData: oldVehicle.toObject(),
      newData: vehicle.toObject(),
      req,
      vehicle,
      options: {
        vehicleType: vehicle.vehicle_type
      }
    });


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
// @desc    Update vehicle source section
// @route   PUT /api/vehicle/:id/source
// @access  Private (Company Admin/Super Admin)
const updateVehicleSource = async (req, res) => {
  try {
    const Vehicle = req.getModel('Vehicle');
    
    const oldVehicle = await Vehicle.findOne({
      _id: req.params.id,
      company_id: req.user.company_id,
      vehicle_type: req.params.vehicleType,
    });

    if (!oldVehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    // Process vehicle_source data to handle dates properly
    const processedVehicleSource = req.body.vehicle_source?.map(source => ({
      ...source,
      purchase_date: source.purchase_date ? new Date(source.purchase_date) : null
    }));

    const vehicle = await Vehicle.findOneAndUpdate(
      { _id: req.params.id, company_id: req.user.company_id, vehicle_type: req.params.vehicleType, },
      { vehicle_source: processedVehicleSource },
      { new: true, runValidators: true }
    );

    // Log activity using centralized service
    await ActivityLoggingService.logVehicleUpdate({
      oldData: oldVehicle.toObject(),
      newData: vehicle.toObject(),
      req,
      vehicle,
      options: {
        vehicleType: vehicle.vehicle_type
      }
    });

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
// @desc    Update vehicle registration section
// @route   PUT /api/vehicle/:id/registration
// @access  Private (Company Admin/Super Admin)
const updateVehicleRegistration = async (req, res) => {
  try {
    const Vehicle = req.getModel('Vehicle');
    
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

    const oldVehicle = vehicle.toObject();

    // Apply updates
    vehicle.set(req.body);
    await vehicle.save();

    // Log activity using centralized service
    await ActivityLoggingService.logVehicleUpdate({
      oldData: oldVehicle,
      newData: vehicle.toObject(),
      req,
      vehicle,
      options: {
        vehicleType: vehicle.vehicle_type
      }
    });

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
// @desc    Update vehicle import section
// @route   PUT /api/vehicle/:id/import
// @access  Private (Company Admin/Super Admin)
const updateVehicleImport = async (req, res) => {
  try {
    const Vehicle = req.getModel('Vehicle');
    
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

    const oldVehicle = vehicle.toObject();

    // Apply updates
    vehicle.set(req.body);
    await vehicle.save();

    // Log activity using centralized service
    await ActivityLoggingService.logVehicleUpdate({
      oldData: oldVehicle,
      newData: vehicle.toObject(),
      req,
      vehicle,
      options: {
        vehicleType: vehicle.vehicle_type
      }
    });

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
// @desc    Update vehicle engine section
// @route   PUT /api/vehicle/:id/engine
// @access  Private (Company Admin/Super Admin)
const updateVehicleEngine = async (req, res) => {
  try {
    const Vehicle = req.getModel('Vehicle');
    
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

    const oldVehicle = vehicle.toObject();

    // Apply updates
    vehicle.set(req.body);
    await vehicle.save();

    // Log activity using centralized service
    await ActivityLoggingService.logVehicleUpdate({
      oldData: oldVehicle,
      newData: vehicle.toObject(),
      req,
      vehicle,
      options: {
        vehicleType: vehicle.vehicle_type
      }
    });

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
// @desc    Update vehicle specifications section
// @route   PUT /api/vehicle/:id/specifications
// @access  Private (Company Admin/Super Admin)
const updateVehicleSpecifications = async (req, res) => {
  try {
    const Vehicle = req.getModel('Vehicle');
    
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

    const oldVehicle = vehicle.toObject();

    // Apply updates
    vehicle.set(req.body);
    await vehicle.save();

    // Log activity using centralized service
    await ActivityLoggingService.logVehicleUpdate({
      oldData: oldVehicle,
      newData: vehicle.toObject(),
      req,
      vehicle,
      options: {
        vehicleType: vehicle.vehicle_type
      }
    });

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



// @desc    Update vehicle odometer section
// @route   PUT /api/vehicle/:id/odometer
// @access  Private (Company Admin/Super Admin)
// @desc    Update vehicle odometer section
// @route   PUT /api/vehicle/:id/odometer
// @access  Private (Company Admin/Super Admin)
const updateVehicleOdometer = async (req, res) => {
  try {
    const Vehicle = req.getModel('Vehicle');
    
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

    // Capture old state for logging
    const oldVehicle = vehicle.toObject();

    // If vehicle_odometer array is provided, replace the entire array
    if (req.body.vehicle_odometer && Array.isArray(req.body.vehicle_odometer)) {
      vehicle.vehicle_odometer = req.body.vehicle_odometer.map((entry) => ({
        ...entry,
        reading: Number(entry.reading),
        reading_date: entry.reading_date ? new Date(entry.reading_date) : new Date(),
        odometerCertified: entry.odometerCertified || false,
        odometerStatus: entry.odometerStatus || "",
        created_at: entry.created_at ? new Date(entry.created_at) : new Date(),
      }));
    }

    await vehicle.save();

    // Log activity using centralized service
    await ActivityLoggingService.logVehicleUpdate({
      oldData: oldVehicle,
      newData: vehicle.toObject(),
      req,
      vehicle,
      options: {
        vehicleType: vehicle.vehicle_type
      }
    });

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
// @desc    Update vehicle ownership section
// @route   PUT /api/vehicle/:id/ownership
// @access  Private (Company Admin/Super Admin)
const updateVehicleOwnership = async (req, res) => {
  try {
    const Vehicle = req.getModel('Vehicle');
    
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

    const oldVehicle = vehicle.toObject();

    // Get explicit section name from request body if provided BEFORE cleaning up
    const formSectionName = req.body.module_section;

    // Create a copy of req.body for processing changes
    const requestDataForProcessing = { ...req.body };

    // Apply updates
    vehicle.set(req.body);
    await vehicle.save();

    // Log Activity - Dynamic field comparison approach (same as advertisement controller)
    const groupLogs = {};

    // Clean up request body for processing (but keep the copy)
    delete requestDataForProcessing.module_section;

    // Helper to determine group name based on field path structure
    const getFieldGroup = (fieldPath) => {
      // If an explicit section name is provided from the form, prioritize it
      if (formSectionName) {
        return formSectionName;
      }

      // Dynamic section mapping based on field path patterns
      if (fieldPath.startsWith('vehicle_source') || fieldPath.includes('vehicle_source')) {
        return 'Vehicle Source Info';
      }
      if (fieldPath.startsWith('vehicle_registration') || fieldPath.includes('vehicle_registration')) {
        return 'Vehicle Registration';
      }
      if (fieldPath.startsWith('vehicle_eng_transmission') || fieldPath.includes('vehicle_eng_transmission')) {
        return 'Vehicle Engine & Transmission';
      }
      if (fieldPath.startsWith('vehicle_specifications') || fieldPath.includes('vehicle_specifications')) {
        return 'Vehicle Specifications';
      }
      if (fieldPath.startsWith('vehicle_odometer') || fieldPath.includes('vehicle_odometer')) {
        return 'Vehicle Odometer';
      }
      if (fieldPath.startsWith('vehicle_import_details') || fieldPath.includes('vehicle_import_details')) {
        return 'Vehicle Import Details';
      }
      if (fieldPath.startsWith('vehicle_ownership') || fieldPath.includes('vehicle_ownership')) {
        return 'Vehicle Ownership';
      }
      if (fieldPath.startsWith('vehicle_attachments') || fieldPath.includes('vehicle_attachments')) {
        return 'Vehicle Attachments';
      }
      if (fieldPath.startsWith('vehicle_other_details') || fieldPath.includes('vehicle_other_details')) {
        return 'Vehicle Overview';
      }
      if (fieldPath.startsWith('inspection_result') || fieldPath.includes('inspection_result')) {
        return 'Vehicle Inspection';
      }
      if (fieldPath.startsWith('trade_in_result') || fieldPath.includes('trade_in_result')) {
        return 'Vehicle Trade-in';
      }

      // Basic vehicle info fields
      const basicFields = ['make', 'model', 'year', 'variant', 'body_style', 'vin', 'plate_no', 'chassis_no', 'vehicle_hero_image', 'status', 'dealership_id'];
      if (basicFields.includes(fieldPath)) {
        return 'Vehicle Basic Info';
      }

      // Fallback for unmatched fields
      return 'Vehicle Ownership Update';
    };

    // Helper to get nested value from object using dot notation
    const getNestedValue = (obj, path) => {
      return path.split('.').reduce((current, key) => {
        // Handle singleton array logic: many fields in this schema are stored as single-item arrays
        // If current is an array and key is not a numeric index, look inside the first element.
        if (Array.isArray(current) && current.length > 0 && isNaN(key)) {
          current = current[0];
        }

        if (current && typeof current === 'object') {
          return current[key];
        }
        return undefined;
      }, obj);
    };

    // Helper to format values for logging (matches calculateChanges format)
    const formatValue = (val, fieldName = '') => {
      if (val === null || val === undefined) return null;
      if (val === '') return '';

      // Handle boolean
      if (typeof val === 'boolean') {
        return val ? 'Yes' : 'No';
      }

      // Check if this is a date field or date value
      const dateFields = ['_date', 'created_at', 'updated_at', 'timestamp', '_expiry', 'purchase_date', 'registration_date', 'license_expiry_date', 'wof_cof_expiry_date'];
      const isDateField = dateFields.some(field => fieldName.toLowerCase().includes(field));

      const isDate = (v) => {
        if (v instanceof Date) return true;
        if (typeof v === 'string') {
          const datePatterns = [
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
            /^\d{4}-\d{2}-\d{2}$/,
            /^\d{2}\/\d{2}\/\d{4}$/,
            /^\d{2}-\d{2}-\d{4}$/,
            /^\d{4}\/\d{2}\/\d{2}$/,
          ];
          return datePatterns.some(pattern => pattern.test(v)) && !isNaN(Date.parse(v));
        }
        return false;
      };

      if (isDate(val) || isDateField) {
        try {
          const dateObj = new Date(val);
          if (!isNaN(dateObj.getTime())) {
            return dateObj.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            });
          }
        } catch (e) {
          // If date parsing fails, continue
        }
      }

      // Handle arrays
      if (Array.isArray(val)) {
        return `[${val.length} item(s)]`;
      }

      // Handle objects
      if (typeof val === 'object' && val !== null) {
        return '[Object]';
      }

      // Handle numbers
      if (typeof val === 'number') {
        const currencyFields = ['price', 'cost', 'expense', 'amount', 'fee'];
        if (currencyFields.some(field => fieldName.toLowerCase().includes(field))) {
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
          }).format(val);
        }

        if (val >= 1000) {
          return new Intl.NumberFormat('en-US').format(val);
        }

        return val.toString();
      }

      return val.toString();
    };

    // Simple comparison - just check if values are different
    const hasChanged = (oldVal, newVal) => {
      // Handle null/undefined
      if (oldVal === newVal) return false;
      if (oldVal == null && newVal == null) return false;
      if (oldVal == null || newVal == null) return true;

      // Handle Date objects - compare only date part (ignore time)
      if (oldVal instanceof Date && newVal instanceof Date) {
        return oldVal.toDateString() !== newVal.toDateString();
      }

      // Handle Date strings - convert to date and compare date part only
      if ((oldVal instanceof Date || typeof oldVal === 'string') &&
        (newVal instanceof Date || typeof newVal === 'string')) {
        try {
          const dateA = new Date(oldVal);
          const dateB = new Date(newVal);
          if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
            return dateA.toDateString() !== dateB.toDateString();
          }
        } catch (e) {
          // Continue with other comparisons
        }
      }

      // For objects/arrays, use JSON comparison
      if (typeof oldVal === 'object' && typeof newVal === 'object') {
        try {
          return JSON.stringify(oldVal) !== JSON.stringify(newVal);
        } catch (e) {
          return true; // If can't stringify, assume changed
        }
      }

      // Simple inequality check
      return oldVal != newVal;
    };

    // Compare each field in request body with old vehicle data
    const processFieldChanges = (requestData, oldData, currentPath = '') => {
      for (const [key, newValue] of Object.entries(requestData)) {
        const fieldPath = currentPath ? `${currentPath}.${key}` : key;

        // Special handling for vehicle_ownership when frontend sends object but DB stores array
        if (key === 'vehicle_ownership' && typeof newValue === 'object' && !Array.isArray(newValue)) {
          // Frontend sends object, but DB stores as array - handle this mismatch
          const oldOwnership = oldData.vehicle_ownership && oldData.vehicle_ownership[0] ? oldData.vehicle_ownership[0] : {};

          // Process each field in the ownership object
          for (const [ownershipKey, ownershipValue] of Object.entries(newValue)) {
            const ownershipFieldPath = `${fieldPath}.0.${ownershipKey}`;
            const oldOwnershipValue = oldOwnership[ownershipKey];

            if (hasChanged(oldOwnershipValue, ownershipValue)) {
              const groupName = getFieldGroup(ownershipFieldPath);

              if (!groupLogs[groupName]) {
                groupLogs[groupName] = [];
              }

              groupLogs[groupName].push({
                field: ownershipKey,
                old_value: formatValue(oldOwnershipValue, ownershipFieldPath),
                new_value: formatValue(ownershipValue, ownershipFieldPath),
                raw_field: ownershipFieldPath
              });
            }
          }
          continue;
        }

        const oldValue = getNestedValue(oldData, fieldPath);

        // Simple change detection
        if (!hasChanged(oldValue, newValue)) {
          continue;
        }

        // For nested objects (not arrays), recurse into them
        if (newValue && typeof newValue === 'object' && !Array.isArray(newValue) && !(newValue instanceof Date)) {
          processFieldChanges(newValue, oldData, fieldPath);
          continue;
        }

        // Handle array/object comparison for single-item arrays (same as master vehicle controller)
        // Normalize: extract the object from array if it's a single-item array
        const normalizeValue = (val) => {
          if (Array.isArray(val) && val.length === 1 && typeof val[0] === 'object') {
            return val[0];
          }
          if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
            return val;
          }
          return val;
        };

        const normalizedOld = normalizeValue(oldValue);
        const normalizedNew = normalizeValue(newValue);

        // If both normalized to objects, compare field by field
        if (typeof normalizedOld === 'object' && normalizedOld !== null &&
          typeof normalizedNew === 'object' && normalizedNew !== null &&
          !Array.isArray(normalizedOld) && !Array.isArray(normalizedNew)) {

          // Get all keys from both objects (handles additions and deletions)
          const allKeys = new Set([
            ...Object.keys(normalizedOld || {}),
            ...Object.keys(normalizedNew || {})
          ]);

          for (const objKey of allKeys) {
            const objFullFieldPath = `${fieldPath}.0.${objKey}`;
            const objNewValue = normalizedNew?.[objKey];
            const objOldValue = normalizedOld?.[objKey];

            if (hasChanged(objOldValue, objNewValue)) {
              const groupName = getFieldGroup(objFullFieldPath);

              if (!groupLogs[groupName]) {
                groupLogs[groupName] = [];
              }

              groupLogs[groupName].push({
                field: objKey,
                old_value: formatValue(objOldValue, objFullFieldPath),
                new_value: formatValue(objNewValue, objFullFieldPath),
                raw_field: objFullFieldPath
              });
            }
          }
          continue;
        }

        // If one is undefined/null and other is object, treat undefined as empty object
        if ((normalizedOld === undefined || normalizedOld === null) &&
          typeof normalizedNew === 'object' && normalizedNew !== null) {

          const allKeys = Object.keys(normalizedNew || {});

          for (const objKey of allKeys) {
            const objFullFieldPath = `${fieldPath}.0.${objKey}`;
            const objNewValue = normalizedNew?.[objKey];

            const groupName = getFieldGroup(objFullFieldPath);

            if (!groupLogs[groupName]) {
              groupLogs[groupName] = [];
            }

            groupLogs[groupName].push({
              field: objKey,
              old_value: null,
              new_value: formatValue(objNewValue, objFullFieldPath),
              raw_field: objFullFieldPath
            });
          }
          continue;
        }

        // If old is object and new is undefined/null, log removals
        if (typeof normalizedOld === 'object' && normalizedOld !== null &&
          (normalizedNew === undefined || normalizedNew === null)) {

          const allKeys = Object.keys(normalizedOld || {});

          for (const objKey of allKeys) {
            const objFullFieldPath = `${fieldPath}.0.${objKey}`;
            const objOldValue = normalizedOld?.[objKey];

            const groupName = getFieldGroup(objFullFieldPath);

            if (!groupLogs[groupName]) {
              groupLogs[groupName] = [];
            }

            groupLogs[groupName].push({
              field: objKey,
              old_value: formatValue(objOldValue, objFullFieldPath),
              new_value: null,
              raw_field: objFullFieldPath
            });
          }
          continue;
        }

        // Log the change
        const groupName = getFieldGroup(fieldPath);

        if (!groupLogs[groupName]) {
          groupLogs[groupName] = [];
        }

        // Create change object with formatted values
        const change = {
          field: key,
          old_value: formatValue(oldValue, fieldPath),
          new_value: formatValue(newValue, fieldPath),
          raw_field: fieldPath
        };

        groupLogs[groupName].push(change);
      }
    };

    // Process all changes from request body (use the copy that still has the data)
    processFieldChanges(requestDataForProcessing, oldVehicle);

    // Log activity for each group that has changes
    for (const [moduleName, groupChanges] of Object.entries(groupLogs)) {
      if (groupChanges.length > 0) {
        await logActivity({
          company_id: req.user.company_id,
          vehicle_stock_id: vehicle.vehicle_stock_id,
          vehicle_type: vehicle.vehicle_type,
          module_name: moduleName,
          action: 'update',
          user_id: req.user.id,
          changes: groupChanges,
          metadata: {
            vehicle_stock_id: vehicle.vehicle_stock_id
          }
        });
      }
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
    const Vehicle = req.getModel('Vehicle');
    
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
    const Vehicle = req.getModel('Vehicle');
    
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

    // Capture old state for logging
    const oldVehicle = vehicle.toObject();

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
      vehicle_type: vehicle.vehicle_type,
      module_name: req.body.module_section || 'Vehicle Attachments',
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
    const Vehicle = req.getModel('Vehicle');
    
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
      vehicle_type: vehicle.vehicle_type,
      module_name: req.body.module_section || 'Vehicle Attachments',
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
    const Vehicle = req.getModel('Vehicle');
    
    const { stages, workshop_action } = req.body;

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

    // Capture old state for logging
    const oldVehicle = vehicle.toObject();

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

      if (workshop_action === 'push') {
        stages.forEach(stageName => {

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


          // Handle is_workshop array
          if (existingWorkshopIndex === -1) {
            vehicle.is_workshop.push({
              stage_name: stageName,
              in_workshop: true,
              pushed_at: new Date()
            });
          } else {
            vehicle.is_workshop[existingWorkshopIndex].in_workshop = true;
            vehicle.is_workshop[existingWorkshopIndex].pushed_at = new Date();
          }

          // Handle workshop_progress array
          if (existingProgressIndex === -1) {
            vehicle.workshop_progress.push({
              stage_name: stageName,
              progress: "in_progress",
              started_at: new Date()
            });
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

          // Check if stage is in progress - cannot remove if in progress
          const progressIndex = vehicle.workshop_progress.findIndex(
            item => item.stage_name === stageName
          );

          if (progressIndex !== -1 && vehicle.workshop_progress[progressIndex].progress === "in_progress") {
            return;
          }

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
        });
      }


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

    // Log activity using centralized service
    await ActivityLoggingService.logVehicleUpdate({
      oldData: oldVehicle.toObject(),
      newData: savedVehicle.toObject(),
      req,
      vehicle: savedVehicle,
      options: {
        vehicleType: savedVehicle.vehicle_type
      }
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
  softDeleteVehicle,
  restoreVehicle,
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
  updateVehicleOdometer,
  updateVehicleOwnership,
  getVehicleAttachments,
  uploadVehicleAttachment,
  deleteVehicleAttachment,
  updateVehicleWorkshopStatus,
};
