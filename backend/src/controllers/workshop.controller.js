const Vehicle = require("../models/Vehicle");
const WorkshopQuote = require("../models/WorkshopQuote");
const Supplier = require("../models/Supplier");
const { logEvent } = require("./logs.controller");

// @desc    Get vehicles with inspection results for workshop
// @route   GET /api/workshop/vehicles
// @access  Private (Company Admin/Super Admin)
const getWorkshopVehicles = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, vehicle_type } = req.query;
    const skip = (page - 1) * limit;
    const numericLimit = parseInt(limit);
    const numericPage = parseInt(page);

    // Build filter with company_id first for index usage
    let filter = {
      company_id: req.user.company_id,
      $or: [
        { workshop_progress: "in_progress" }, // String format
        { "workshop_progress.progress": "in_progress" }, // Array of objects format
      ],
    };

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

    if (vehicle_type) {
      filter.vehicle_type = vehicle_type;
    }

    if (search) {
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { make: { $regex: search, $options: "i" } },
          { model: { $regex: search, $options: "i" } },
          { plate_no: { $regex: search, $options: "i" } },
          { vin: { $regex: search, $options: "i" } },
          { name: { $regex: search, $options: "i" } },
        ],
      });
    }

    // Define the fields to select with additional fields for odometer and registration
    const projection = {
      vehicle_stock_id: 1,
      make: 1,
      model: 1,
      year: 1,
      plate_no: 1,
      vehicle_type: 1,
      vin: 1,
      name: 1,
      vehicle_hero_image: 1,
      created_at: 1,
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

    // Use parallel execution for count and data retrieval
    const [vehicles, total] = await Promise.all([
      Vehicle.find(filter)
        .select(projection)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(numericLimit)
        .lean(), // Use lean for faster queries
      Vehicle.countDocuments(filter),
    ]);

    // Process vehicles to extract odometer and license expiry details
    const processedVehicles = vehicles.map(vehicle => {
      // Get latest odometer reading
      const latestOdometer = vehicle.vehicle_odometer?.[0]?.reading || null;

      // Get latest license expiry date
      const latestRegistration = vehicle.vehicle_registration?.[0];
      const licenseExpiryDate = latestRegistration?.license_expiry_date || null;

      return {
        _id: vehicle._id,
        vehicle_stock_id: vehicle.vehicle_stock_id,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        plate_no: vehicle.plate_no,
        vehicle_type: vehicle.vehicle_type,
        vin: vehicle.vin,
        name: vehicle.name,
        vehicle_hero_image: vehicle.vehicle_hero_image,
        created_at: vehicle.created_at,
        dealership_id: vehicle.dealership_id,
        status: vehicle.status || 'active', // Default status if not present
        latest_odometer: latestOdometer,
        license_expiry_date: licenseExpiryDate,
      };
    });

    res.status(200).json({
      success: true,
      data: processedVehicles,
      total,
      pagination: {
        current_page: numericPage,
        total_pages: Math.ceil(total / numericLimit),
        total_records: total,
        per_page: numericLimit,
      },
    });
  } catch (error) {
    console.error("Get workshop vehicles error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving workshop vehicles",
    });
  }
};

// @desc    Get vehicle details for workshop config
// @route   GET /api/workshop/vehicle/:vehicleId
// @access  Private (Company Admin/Super Admin)
const getWorkshopVehicleDetails = async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({
      vehicle_stock_id: req.params.vehicleId,
      vehicle_type: req.params.vehicleType,
      company_id: req.user.company_id,
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    if (vehicle.vehicle_type === "inspection" && vehicle.inspection_result) {
      const inProgressStages = [];

      if (Array.isArray(vehicle.workshop_progress)) {
        vehicle.workshop_progress.forEach((stage) => {
          if (stage.progress === "in_progress") {
            inProgressStages.push(stage.stage_name);
          }
        });
      }
      vehicle.inspection_result = vehicle.inspection_result
        .filter((category) => inProgressStages.includes(category.category_name))
        .map((category) => ({
          ...category,
          sections: category.sections.map((section) => ({
            ...section,
            fields: section.fields.filter((field) => field.workshop_work_required === true)
          })).filter((section) => section.fields.length > 0)
        }))
        .filter((category) => category.sections.length > 0);
    }
    
    if (vehicle.vehicle_type === "tradein" && vehicle.trade_in_result) {
      const inProgressStages = [];
      if (Array.isArray(vehicle.workshop_progress)) {
        vehicle.workshop_progress.forEach((stage) => {
          if (stage.progress === "in_progress") {
            inProgressStages.push(stage.stage_name);
          }
        });
      }
      vehicle.trade_in_result = vehicle.trade_in_result
        .filter((category) => inProgressStages.includes(category.category_name))
        .map((category) => ({
          ...category,
          sections: category.sections.map((section) => ({
            ...section,
            fields: section.fields.filter((field) => field.workshop_work_required === true)
          })).filter((section) => section.fields.length > 0)
        }))
        .filter((category) => category.sections.length > 0);
    }

    const quotes = await WorkshopQuote.find({
      vehicle_stock_id: req.params.vehicleId,
      vehicle_type: req.params.vehicleType,
      company_id: req.user.company_id,
    })
      .populate("selected_suppliers", "name email supplier_shop_name")
      .populate("approved_supplier", "name email supplier_shop_name");

    res.status(200).json({
      success: true,
      data: {
        vehicle,
        quotes,
      },
    });
  } catch (error) {
    console.error("Get workshop vehicle details error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving vehicle details",
    });
  }
};

// @desc    Create quote for inspection field
// @route   POST /api/workshop/quote
// @access  Private (Company Admin/Super Admin)
const createQuote = async (req, res) => {
  try {
    const {
      vehicle_type,
      vehicle_stock_id,
      field_id,
      field_name,
      quote_amount,
      quote_description,
      selected_suppliers,
      images,
      videos,
    } = req.body;

    // Validate required fields
    if (
      !vehicle_type ||
      !vehicle_stock_id ||
      !field_id ||
      !quote_amount ||
      !selected_suppliers ||
      !selected_suppliers.length
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    // Check if quote already exists for this field
    const existingQuote = await WorkshopQuote.findOne({
      vehicle_type,
      company_id: req.user.company_id,
      vehicle_stock_id,
      field_id,
    });

    if (existingQuote) {
      if (existingQuote.approved_supplier) {
        return res.status(400).json({
          success: false,
          message:
            "This quote is already approved. Further changes are not allowed.",
        });
      }

      // Update existing quote with new suppliers and media
      const newSuppliers = selected_suppliers.filter(
        (supplierId) => !existingQuote.selected_suppliers.includes(supplierId)
      );

      if (newSuppliers.length === 0) {
        return res.status(400).json({
          success: false,
          message: "All selected suppliers are already part of this quote",
        });
      }

      // Add new suppliers to existing quote
      existingQuote.selected_suppliers.push(...newSuppliers);
      existingQuote.quote_amount = quote_amount;
      existingQuote.quote_description = quote_description;
      existingQuote.status = "quote_request";
      existingQuote.quote_type = "supplier";

      // Clear bay-related fields when switching to supplier
      existingQuote.bay_id = undefined;
      existingQuote.bay_user_id = undefined;
      existingQuote.booking_date = undefined;
      existingQuote.booking_start_time = undefined;
      existingQuote.booking_end_time = undefined;
      existingQuote.booking_description = undefined;
      existingQuote.accepted_by = undefined;
      existingQuote.accepted_at = undefined;
      existingQuote.rejected_reason = undefined;

      // Update media references if provided
      if (images) {
        existingQuote.images = images;
      }
      if (videos) {
        existingQuote.videos = videos;
      }

      await existingQuote.save();

      await logEvent({
        event_type: "workshop_operation",
        event_action: "quote_updated",
        event_description: `Quote updated for field ${field_name} on vehicle ${vehicle_stock_id}`,
        user_id: req.user.id,
        company_id: req.user.company_id,
        user_role: req.user.role,
        metadata: {
          quote_id: existingQuote._id,
          vehicle_stock_id,
          field_id,
          field_name,
          quote_amount,
          new_supplier_count: newSuppliers.length,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Quote updated with new suppliers successfully",
        data: existingQuote,
      });
    }

    // Verify suppliers exist and belong to company
    const suppliers = await Supplier.find({
      _id: { $in: selected_suppliers },
      company_id: req.user.company_id,
      is_active: true,
    });

    if (suppliers.length !== selected_suppliers.length) {
      return res.status(400).json({
        success: false,
        message: "One or more selected suppliers are invalid",
      });
    }

    const quote = new WorkshopQuote({
      quote_type: "supplier",
      vehicle_type,
      company_id: req.user.company_id,
      vehicle_stock_id,
      field_id,
      field_name,
      quote_amount,
      quote_description,
      selected_suppliers,
      status: "quote_request",
      created_by: req.user.id,
      images: images || [],
      videos: videos || [],
    });

    await quote.save();

    // Log the event
    await logEvent({
      event_type: "workshop_operation",
      event_action: "quote_created",
      event_description: `Quote created for field ${field_name} on vehicle ${vehicle_stock_id}`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role,
      metadata: {
        quote_id: quote._id,
        vehicle_stock_id,
        field_id,
        field_name,
        quote_amount,
        supplier_count: selected_suppliers.length,
        image_count: images ? images.length : 0,
        video_count: videos ? videos.length : 0,
      },
    });

    res.status(201).json({
      success: true,
      message: "Quote created and sent to suppliers",
      data: quote,
    });
  } catch (error) {
    console.error("Create quote error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating quote",
    });
  }
};

// @desc    Get quotes for a vehicle field
// @route   GET /api/workshop/quotes/:vehicle_type/:vehicle_stock_id/:field_id
// @access  Private (Company Admin/Super Admin)
const getQuotesForField = async (req, res) => {
  try {
    const { vehicle_type, vehicle_stock_id, field_id } = req.params;
    const quote = await WorkshopQuote.findOne({
      vehicle_type,
      company_id: req.user.company_id,
      vehicle_stock_id: parseInt(vehicle_stock_id),
      field_id,
    })
      .populate("selected_suppliers", "name email supplier_shop_name")
      .populate("approved_supplier", "name email supplier_shop_name")
      .populate(
        "supplier_responses.supplier_id",
        "name email supplier_shop_name"
      );

    res.status(200).json({
      success: true,
      data: quote,
    });
  } catch (error) {
    console.error("Get quotes for field error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving quotes",
    });
  }
};

// @desc    Approve supplier quote
// @route   POST /api/workshop/quote/:quoteId/approve/:supplierId
// @access  Private (Company Admin/Super Admin)
const approveSupplierQuote = async (req, res) => {
  try {
    const { quoteId, supplierId } = req.params;

    const quote = await WorkshopQuote.findOne({
      _id: quoteId,
      company_id: req.user.company_id,
    });

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: "Quote not found",
      });
    }

    // Check if supplier response exists
    const supplierResponse = quote.supplier_responses.find(
      (response) => response.supplier_id.toString() === supplierId
    );

    if (!supplierResponse) {
      return res.status(404).json({
        success: false,
        message: "Supplier response not found",
      });
    }

    // Update quote status and approve supplier
    quote.status = "quote_approved";
    quote.approved_supplier = supplierId;
    quote.approved_at = new Date();

    // Update all responses status
    quote.supplier_responses.forEach((response) => {
      if (response.supplier_id.toString() === supplierId) {
        response.status = "approved";
      } else {
        response.status = "rejected";
      }
    });

    await quote.save();

    // TODO: Send email notifications to all suppliers
    // Approved supplier gets approval email
    // Rejected suppliers get rejection email

    // Log the event
    await logEvent({
      event_type: "workshop_operation",
      event_action: "quote_approved",
      event_description: `Quote approved for supplier on vehicle ${quote.vehicle_stock_id}`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role,
      metadata: {
        quote_id: quote._id,
        approved_supplier: supplierId,
        vehicle_stock_id: quote.vehicle_stock_id,
        field_id: quote.field_id,
      },
    });

    res.status(200).json({
      success: true,
      message: "Supplier quote approved successfully",
      data: quote,
    });
  } catch (error) {
    console.error("Approve supplier quote error:", error);
    res.status(500).json({
      success: false,
      message: "Error approving supplier quote",
    });
  }
};

// @desc    Create bay quote
// @route   POST /api/workshop/bay-quote
// @access  Private (Company Admin/Super Admin)
const createBayQuote = async (req, res) => {
  try {
    const {
      vehicle_type,
      vehicle_stock_id,
      field_id,
      field_name,
      quote_amount,
      quote_description,
      bay_id,
      booking_date,
      booking_start_time,
      booking_end_time,
      booking_description,
      images,
      videos,
    } = req.body;

    // Validate required fields
    if (
      !vehicle_type ||
      !vehicle_stock_id ||
      !field_id ||
      !quote_amount ||
      !bay_id ||
      !booking_date ||
      !booking_start_time ||
      !booking_end_time
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    // Check if bay quote already exists for this field
    const existingQuote = await WorkshopQuote.findOne({
      vehicle_type,
      company_id: req.user.company_id,
      vehicle_stock_id,
      field_id,
    });

    // Verify bay exists and get primary admin
    const ServiceBay = require("../models/ServiceBay");
    const bay = await ServiceBay.findOne({
      _id: bay_id,
      company_id: req.user.company_id,
      is_active: true,
    }).populate("primary_admin", "first_name last_name email");

    if (!bay) {
      return res.status(404).json({
        success: false,
        message: "Service bay not found or inactive",
      });
    }

    if (existingQuote) {
      // Check if quote is already approved
      if (existingQuote.approved_supplier) {
        return res.status(400).json({
          success: false,
          message:
            "This quote is already approved. Further changes are not allowed.",
        });
      }

      // Update existing quote with new bay information
      existingQuote.quote_type = "bay";
      existingQuote.quote_amount = quote_amount;
      existingQuote.quote_description = quote_description;
      existingQuote.bay_id = bay_id;
      existingQuote.bay_user_id = bay.primary_admin._id;
      existingQuote.booking_date = new Date(booking_date);
      existingQuote.booking_start_time = booking_start_time;
      existingQuote.booking_end_time = booking_end_time;
      existingQuote.booking_description = booking_description;
      existingQuote.status = "booking_request";

      // Clear supplier-related fields when switching to bay
      existingQuote.selected_suppliers = [];
      existingQuote.supplier_responses = [];
      existingQuote.approved_supplier = undefined;

      // Update media references if provided
      if (images) {
        existingQuote.images = images;
      }
      if (videos) {
        existingQuote.videos = videos;
      }

      await existingQuote.save();

      await logEvent({
        event_type: "workshop_operation",
        event_action: "bay_quote_updated",
        event_description: `Bay quote updated for field ${field_name} on vehicle ${vehicle_stock_id}`,
        user_id: req.user.id,
        company_id: req.user.company_id,
        user_role: req.user.role,
        metadata: {
          quote_id: existingQuote._id,
          bay_id,
          vehicle_stock_id,
          field_id,
          field_name,
          quote_amount,
          booking_date,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Bay quote updated successfully",
        data: existingQuote,
      });
    }

    // Create new bay quote
    const quote = new WorkshopQuote({
      quote_type: "bay",
      vehicle_type,
      company_id: req.user.company_id,
      vehicle_stock_id,
      field_id,
      field_name,
      quote_amount,
      quote_description,
      bay_id,
      bay_user_id: bay.primary_admin._id,
      booking_date: new Date(booking_date),
      booking_start_time,
      booking_end_time,
      booking_description,
      images: images || [],
      videos: videos || [],
      status: "booking_request",
      created_by: req.user.id,
    });

    await quote.save();

    await logEvent({
      event_type: "workshop_operation",
      event_action: "bay_quote_created",
      event_description: `Bay quote created for field ${field_name} on vehicle ${vehicle_stock_id}`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role,
      metadata: {
        quote_id: quote._id,
        bay_id,
        vehicle_stock_id,
        field_id,
        field_name,
        quote_amount,
        image_count: images ? images.length : 0,
        video_count: videos ? videos.length : 0,
      },
    });

    res.status(201).json({
      success: true,
      message: "Bay quote created successfully",
      data: quote,
    });
  } catch (error) {
    console.error("Create bay quote error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating bay quote",
    });
  }
};

// @desc    Update bay quote for rebooking
// @route   PUT /api/workshop/bay-quote/:quoteId/rebook
// @access  Private (Company Admin/Super Admin)
const rebookBayQuote = async (req, res) => {
  try {
    const {
      quote_amount,
      quote_description,
      booking_date,
      booking_start_time,
      booking_end_time,
      booking_description,
      images,
      videos,
    } = req.body;

    const quote = await WorkshopQuote.findOne({
      _id: req.params.quoteId,
      quote_type: "bay",
      company_id: req.user.company_id,
    });

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: "Bay quote not found",
      });
    }

    // Only allow rebooking if status is booking_rejected
    if (quote.status !== "booking_rejected") {
      return res.status(400).json({
        success: false,
        message: "Rebooking is only allowed for rejected bookings",
      });
    }

    // Update quote details for rebooking
    if (quote_amount !== undefined) quote.quote_amount = quote_amount;
    if (quote_description !== undefined)
      quote.quote_description = quote_description;
    if (booking_date) quote.booking_date = new Date(booking_date);
    if (booking_start_time) quote.booking_start_time = booking_start_time;
    if (booking_end_time) quote.booking_end_time = booking_end_time;
    if (booking_description !== undefined)
      quote.booking_description = booking_description;
    if (images) quote.images = images;
    if (videos) quote.videos = videos;

    // Reset status to booking_request for rebooking
    quote.status = "booking_request";
    quote.rejected_reason = undefined; // Clear rejection reason
    quote.accepted_by = undefined;
    quote.accepted_at = undefined;

    // Clear supplier-related fields when rebooking bay quote
    quote.selected_suppliers = [];
    quote.supplier_responses = [];
    quote.approved_supplier = undefined;

    await quote.save();

    await logEvent({
      event_type: "workshop_operation",
      event_action: "bay_quote_rebooked",
      event_description: `Bay quote rebooked for field ${quote.field_name} on vehicle ${quote.vehicle_stock_id}`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role,
      metadata: {
        quote_id: quote._id,
        bay_id: quote.bay_id,
        vehicle_stock_id: quote.vehicle_stock_id,
        field_id: quote.field_id,
        field_name: quote.field_name,
        quote_amount: quote.quote_amount,
      },
    });

    res.status(200).json({
      success: true,
      message: "Bay quote rebooked successfully",
      data: quote,
    });
  } catch (error) {
    console.error("Rebook bay quote error:", error);
    res.status(500).json({
      success: false,
      message: "Error rebooking bay quote",
    });
  }
};

// Also update the updateBayQuote function to handle rebooking scenario
// @desc    Update bay quote
// @route   PUT /api/workshop/bay-quote/:quoteId
// @access  Private (Company Admin/Super Admin)
const updateBayQuote = async (req, res) => {
  try {
    const quote = await WorkshopQuote.findOne({
      _id: req.params.quoteId,
      quote_type: "bay",
      company_id: req.user.company_id,
    });

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: "Bay quote not found",
      });
    }

    // Allow updates if status is booking_request OR booking_rejected (for rebooking)
    if (
      quote.status !== "booking_request" &&
      quote.status !== "booking_rejected"
    ) {
      return res.status(400).json({
        success: false,
        message: "Cannot edit bay quote after it has been accepted",
      });
    }

    const {
      quote_amount,
      quote_description,
      booking_date,
      booking_start_time,
      booking_end_time,
      booking_description,
      images,
      videos,
    } = req.body;

    if (quote_amount !== undefined) quote.quote_amount = quote_amount;
    if (quote_description !== undefined)
      quote.quote_description = quote_description;
    if (booking_date) quote.booking_date = new Date(booking_date);
    if (booking_start_time) quote.booking_start_time = booking_start_time;
    if (booking_end_time) quote.booking_end_time = booking_end_time;
    if (booking_description !== undefined)
      quote.booking_description = booking_description;
    if (images) quote.images = images;
    if (videos) quote.videos = videos;

    // If it was rejected and we're updating, change status back to booking_request
    if (quote.status === "booking_rejected") {
      quote.status = "booking_request";
      quote.rejected_reason = undefined;
    }

    // Clear supplier-related fields when updating bay quote
    quote.selected_suppliers = [];
    quote.supplier_responses = [];
    quote.approved_supplier = undefined;

    await quote.save();

    res.status(200).json({
      success: true,
      message: "Bay quote updated successfully",
      data: quote,
    });
  } catch (error) {
    console.error("Update bay quote error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating bay quote",
    });
  }
};

// @desc    Get bay quote for field
// @route   GET /api/workshop/bay-quote/:vehicle_type/:vehicle_stock_id/:field_id
// @access  Private (Company Admin)
const getBayQuoteForField = async (req, res) => {
  try {
    const { vehicle_type, vehicle_stock_id, field_id } = req.params;
    const quote = await WorkshopQuote.findOne({
      quote_type: "bay",
      vehicle_type,
      company_id: req.user.company_id,
      vehicle_stock_id: parseInt(vehicle_stock_id),
      field_id,
    })
      .populate("bay_id", "bay_name bay_description bay_timings")
      .populate("bay_user_id", "first_name last_name email")
      .populate("accepted_by", "first_name last_name email");

    res.status(200).json({
      success: true,
      data: quote,
    });
  } catch (error) {
    console.error("Get bay quote for field error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving bay quote",
    });
  }
};

// @desc    Get bay calendar (all quotes for bay user)
// @route   GET /api/workshop/bay-calendar
// @access  Private (Company Admin - Bay User)
const getBayCalendar = async (req, res) => {
  try {
    const { start_date, end_date, bay_id } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: "Start date and end date are required",
      });
    }

    // Get bays user has access to
    const ServiceBay = require("../models/ServiceBay");
    let bayFilter = {
      company_id: req.user.company_id,
      is_active: true,
    };

    if (req.user.role === "company_admin") {
      bayFilter.bay_users = req.user.id;
    }

    if (bay_id) {
      bayFilter._id = bay_id;
    }

    const userBays = await ServiceBay.find(bayFilter).select(
      "_id bay_name bay_timings"
    );

    if (userBays.length === 0) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned to any bays",
      });
    }

    const bayIds = userBays.map((b) => b._id);

    // Get bay quotes for these bays within date range
    const quotes = await WorkshopQuote.find({
quote_type: ["bay", "manual"],

      bay_id: { $in: bayIds },
      booking_date: {
        $gte: new Date(start_date),
        $lte: new Date(end_date),
      },
    })
      .populate("bay_id", "bay_name")
      .populate("created_by", "first_name last_name")
      .populate("accepted_by", "first_name last_name")
      .lean();

    res.status(200).json({
      success: true,
      data: {
        bays: userBays,
        bookings: quotes,
      },
    });
  } catch (error) {
    console.error("Get bay calendar error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving bay calendar",
    });
  }
};

// @desc    Accept bay quote (by bay primary admin)
// @route   POST /api/workshop/bay-quote/:quoteId/accept
// @access  Private (Company Admin - Bay User)
const acceptBayQuote = async (req, res) => {
  try {
    const quote = await WorkshopQuote.findById(req.params.quoteId);

    if (!quote || quote.quote_type !== "bay") {
      return res.status(404).json({
        success: false,
        message: "Bay quote not found",
      });
    }

    // Verify user is bay primary admin or in bay users
    const ServiceBay = require("../models/ServiceBay");
    const bay = await ServiceBay.findOne({
      _id: quote.bay_id,
      company_id: req.user.company_id,
      $or: [{ primary_admin: req.user.id }, { bay_users: req.user.id }],
    });

    if (!bay) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to accept this quote",
      });
    }

    if (quote.status !== "booking_request") {
      return res.status(400).json({
        success: false,
        message: "Quote is not in request status",
      });
    }

    quote.status = "booking_accepted";
    quote.accepted_by = req.user.id;
    quote.accepted_at = new Date();

    await quote.save();

    await logEvent({
      event_type: "workshop_operation",
      event_action: "bay_quote_accepted",
      event_description: `Bay quote accepted for ${quote.field_name}`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role,
      metadata: {
        quote_id: quote._id,
        bay_id: quote.bay_id,
      },
    });

    res.status(200).json({
      success: true,
      message: "Quote accepted successfully",
      data: quote,
    });
  } catch (error) {
    console.error("Accept bay quote error:", error);
    res.status(500).json({
      success: false,
      message: "Error accepting quote",
    });
  }
};

// @desc    Reject bay quote
// @route   POST /api/workshop/bay-quote/:quoteId/reject
// @access  Private (Company Admin - Bay User)
const rejectBayQuote = async (req, res) => {
  try {
    const { reason } = req.body;
    const quote = await WorkshopQuote.findById(req.params.quoteId);

    if (!quote || quote.quote_type !== "bay") {
      return res.status(404).json({
        success: false,
        message: "Bay quote not found",
      });
    }

    // Verify user is bay primary admin
    const ServiceBay = require("../models/ServiceBay");
    const bay = await ServiceBay.findOne({
      _id: quote.bay_id,
      company_id: req.user.company_id,
      $or: [{ primary_admin: req.user.id }, { bay_users: req.user.id }],
    });

    if (!bay) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to reject this quote",
      });
    }

    if (quote.status !== "booking_request") {
      return res.status(400).json({
        success: false,
        message: "Quote is not in request status",
      });
    }

    quote.status = "booking_rejected";
    quote.rejected_reason = reason;

    await quote.save();

    res.status(200).json({
      success: true,
      message: "Quote rejected successfully",
      data: quote,
    });
  } catch (error) {
    console.error("Reject bay quote error:", error);
    res.status(500).json({
      success: false,
      message: "Error rejecting quote",
    });
  }
};

// @desc    Start work on bay quote
// @route   POST /api/workshop/bay-quote/:quoteId/start-work
// @access  Private (Company Admin - Bay User)
const startBayWork = async (req, res) => {
  try {
    const quote = await WorkshopQuote.findById(req.params.quoteId);

    if (!quote || quote.quote_type !== "bay") {
      return res.status(404).json({
        success: false,
        message: "Bay quote not found",
      });
    }

    const ServiceBay = require("../models/ServiceBay");
    const bay = await ServiceBay.findOne({
      _id: quote.bay_id,
      company_id: req.user.company_id,
      bay_users: req.user.id,
    });

    if (!bay) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized",
      });
    }

    if (quote.status !== "booking_accepted") {
      return res.status(400).json({
        success: false,
        message: "Quote must be accepted before starting work",
      });
    }

    quote.status = "work_in_progress";
    quote.work_started_at = new Date();

    await quote.save();

    res.status(200).json({
      success: true,
      message: "Work started successfully",
      data: quote,
    });
  } catch (error) {
    console.error("Start work error:", error);
    res.status(500).json({
      success: false,
      message: "Error starting work",
    });
  }
};

// @desc    Submit bay work
// @route   POST /api/workshop/bay-quote/:quoteId/submit-work
// @access  Private (Company Admin - Bay User)
const submitBayWork = async (req, res) => {
  try {
    const { quoteId } = req.params;
    const userId = req.user.id;
    const {
      work_entries,
      warranty_months,
      maintenance_recommendations,
      next_service_due,
      supplier_comments,
      company_feedback,
      customer_satisfaction,
      workMode,
      technician_company_assigned,
      work_completion_date,
      total_amount,
      quote_difference,
      final_price,
      gst_amount,
      amount_spent,
      invoice_pdf_url,
      invoice_pdf_key,
      work_images,
       save_as_draft,
    } = req.body;

    const statuses =
      workMode === "edit"
        ? ["work_review", "rework"] // allow both in edit mode
        : ["work_in_progress"]; // only work_in_progress otherwise

    const quote = await WorkshopQuote.findOne({
      _id: quoteId,
      quote_type: "bay",
      status: { $in: statuses },
    });

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: "Bay quote not found or work not in progress",
      });
    }

    // Verify bay authorization
    const ServiceBay = require("../models/ServiceBay");
    const bay = await ServiceBay.findOne({
      _id: quote.bay_id,
      company_id: req.user.company_id,
      bay_users: userId,
    });

    if (!bay) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to submit work for this bay",
      });
    }

    // Calculate total amount if not provided
    const calculatedTotal =
      total_amount || (final_price || 0) + (gst_amount || 0);

     // Only update status if NOT saving as draft
    if (!save_as_draft) {
      quote.status = "work_review";
      quote.work_submitted_at = new Date();
    }

    // Update comment_sheet with new structure
    quote.comment_sheet = {
      work_entries: work_entries || [],
      warranty_months,
      maintenance_recommendations,
      next_service_due: next_service_due ? new Date(next_service_due) : null,
      supplier_comments,
      company_feedback,
      customer_satisfaction,
      technician_company_assigned,
      work_completion_date: work_completion_date
        ? new Date(work_completion_date)
        : null,
      total_amount: calculatedTotal,
      quote_difference,
      final_price: final_price || 0,
      gst_amount: gst_amount || 0,
      amount_spent: amount_spent || 0,
      invoice_pdf_url,
      invoice_pdf_key,
      work_images: work_images || [],
      submitted_at: new Date(),
    };

    await quote.save();
    if (!save_as_draft) {
    // Log the event
    await logEvent({
      event_type: "workshop_operation",
      event_action: "bay_work_submitted",
      event_description: `Bay user submitted work for review on ${quote.field_name}`,
      user_id: userId,
      company_id: quote.company_id,
      user_role: "bay_user",
      metadata: {
        quote_id: quote._id,
        vehicle_stock_id: quote.vehicle_stock_id,
        field_id: quote.field_id,
        bay_id: quote.bay_id,
        final_price,
        total_amount: calculatedTotal,
        work_entries_count: work_entries ? work_entries.length : 0,
      },
    });
}
    res.status(200).json({
      success: true,
        message: save_as_draft
        ? "Work draft saved successfully"
        : "Work submitted for review successfully",
        draft_status:save_as_draft,
      data: quote,
    });
  } catch (error) {
    console.error("Submit bay work error:", error);
    res.status(500).json({
      success: false,
      message: "Error submitting work",
    });
  }
};

// @desc    Create manual quote
// @route   POST /api/workshop/manual-quote
// @access  Private (Company Admin/Super Admin)
const createManualQuote = async (req, res) => {
  try {
    const {
      vehicle_type,
      vehicle_stock_id,
      field_id,
      field_name,
      quote_amount,
      quote_description,
      images,
      videos,
    } = req.body;

    if (!vehicle_type || !vehicle_stock_id || !field_id || !quote_amount) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    const existingQuote = await WorkshopQuote.findOne({
      vehicle_type,
      company_id: req.user.company_id,
      vehicle_stock_id,
      field_id,
      quote_type: "manual",
    });

    if (existingQuote) {
      return res.status(400).json({
        success: false,
        message: "Manual quote already exists for this field",
      });
    }

    const quote = new WorkshopQuote({
      quote_type: "manual",
      vehicle_type,
      company_id: req.user.company_id,
      vehicle_stock_id,
      field_id,
      field_name,
      quote_amount,
      quote_description,
      status: "manual_completion_in_progress",
      created_by: req.user.id,
      images: images || [],
      videos: videos || [],
    });

    await quote.save();

    await logEvent({
      event_type: "workshop_operation",
      event_action: "manual_quote_created",
      event_description: `Manual quote created for field ${field_name}`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role,
      metadata: {
        quote_id: quote._id,
        vehicle_stock_id,
        field_id,
        field_name,
        quote_amount,
      },
    });

    res.status(201).json({
      success: true,
      message: "Manual quote created successfully",
      data: quote,
    });
  } catch (error) {
    console.error("Create manual quote error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating manual quote",
    });
  }
};

// @desc    Create manual bay quote (create booking with manual status)
// @route   POST /api/workshop/manual-bay-quote
// @access  Private (Company Admin/Super Admin)
const createManualBayQuote = async (req, res) => {
  try {
    const {
      vehicle_type,
      vehicle_stock_id,
      field_id,
      field_name,
      quote_amount,
      quote_description,
      bay_id,
      booking_date,
      booking_start_time,
      booking_end_time,
      booking_description,
      images,
      videos,
    } = req.body;
    
    // For manual bay, we use the bay booking creation logic but set quote_type as manual

    if (
      !vehicle_type ||
      !vehicle_stock_id ||
      !field_id ||
      !quote_amount ||
      !bay_id ||
      !booking_date ||
      !booking_start_time ||
      !booking_end_time
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    const existingQuote = await WorkshopQuote.findOne({
      vehicle_type,
      company_id: req.user.company_id,
      vehicle_stock_id,
      field_id,
      quote_type: "manual",
    });

    if (existingQuote) {
      return res.status(400).json({
        success: false,
        message: "Manual quote already exists for this field",
      });
    }

    const quote = new WorkshopQuote({
      quote_type: "manual",
      vehicle_type,
      company_id: req.user.company_id,
      vehicle_stock_id,
      field_id,
      field_name,
      quote_amount,
      quote_description,
      bay_id,
      booking_date,
      booking_start_time,
      booking_end_time,
      booking_description,
      status: "manual_completion_in_progress",
      created_by: req.user.id,
      images: images || [],
      videos: videos || [],
    });

    await quote.save();

    await logEvent({
      event_type: "workshop_operation",
      event_action: "manual_bay_quote_created",
      event_description: `Manual bay quote created for field ${field_name}`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role,
      metadata: {
        quote_id: quote._id,
        vehicle_stock_id,
        field_id,
        field_name,
        quote_amount,
        bay_id,
      },
    });

    res.status(201).json({
      success: true,
      message: "Manual bay quote created successfully",
      data: quote,
    });
  } catch (error) {
    console.error("Create manual bay quote error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating manual bay quote",
    });
  }
};

// @desc    Complete manual quote
// @route   POST /api/workshop/manual-quote/:quoteId/complete
// @access  Private (Company Admin/Super Admin)
const completeManualQuote = async (req, res) => {
  try {
    const { quoteId } = req.params;
    const {
      work_entries,
      warranty_months,
      maintenance_recommendations,
      next_service_due,
      supplier_comments,
      technician_company_assigned,
      work_completion_date,
      save_as_draft,
    } = req.body;

    const quote = await WorkshopQuote.findOne({
      _id: quoteId,
      company_id: req.user.company_id,
      quote_type: "manual",
    });

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: "Manual quote not found",
      });
    }

    const calculatedTotal = work_entries.reduce((total, entry) => {
      const parts = parseFloat(entry.parts_cost) || 0;
      const labor = parseFloat(entry.labor_cost) || 0;
      const gst = parseFloat(entry.gst) || 0;
      return total + parts + labor + gst;
    }, 0);

    const quoteDifference = calculatedTotal - quote.quote_amount;

    quote.comment_sheet = {
      work_entries,
      warranty_months,
      maintenance_recommendations,
      next_service_due,
      supplier_comments,
      technician_company_assigned,
      work_completion_date,
      total_amount: calculatedTotal,
      quote_difference: quoteDifference,
      submitted_at: new Date(),
    };

    if (!save_as_draft) {
      quote.status = "completed_jobs";
      quote.work_completed_at = new Date();
    }

    await quote.save();

    await logEvent({
      event_type: "workshop_operation",
      event_action: save_as_draft ? "manual_quote_draft_saved" : "manual_quote_completed",
      event_description: save_as_draft
        ? `Manual quote draft saved for field ${quote.field_name}`
        : `Manual quote completed for field ${quote.field_name}`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role,
      metadata: {
        quote_id: quote._id,
        vehicle_stock_id: quote.vehicle_stock_id,
        field_id: quote.field_id,
        total_amount: calculatedTotal,
      },
    });

    res.status(200).json({
      success: true,
      message: save_as_draft
        ? "Work draft saved successfully"
        : "Manual quote completed successfully",
      data: quote,
    });
  } catch (error) {
    console.error("Complete manual quote error:", error);
    res.status(500).json({
      success: false,
      message: "Error completing manual quote",
    });
  }
};

module.exports = {
  getWorkshopVehicles,
  getWorkshopVehicleDetails,
  createQuote,
  getQuotesForField,
  approveSupplierQuote,
  createBayQuote,
  updateBayQuote,
  getBayQuoteForField,
  getBayCalendar,
  acceptBayQuote,
  rejectBayQuote,
  startBayWork,
  submitBayWork,
  rebookBayQuote,
  createManualQuote,
  createManualBayQuote,
  completeManualQuote,
};
