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

    // Define the fields to select
    const selectedFields = {
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
      dealership_id: 1
    };

    // Use parallel execution for count and data retrieval
    const [vehicles, total] = await Promise.all([
      Vehicle.find(filter)
        .select(selectedFields)
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

    // For inspection vehicles, filter inspection_result to only include stages that are in progress
    if (vehicle.vehicle_type === "inspection" && vehicle.inspection_result) {
      // Get the stage names that are currently in progress in workshop
      const inProgressStages = [];

      if (Array.isArray(vehicle.workshop_progress)) {
        vehicle.workshop_progress.forEach((stage) => {
          if (stage.progress === "in_progress") {
            inProgressStages.push(stage.stage_name);
          }
        });
      }

      // Filter inspection_result to only include in-progress stages
      vehicle.inspection_result = vehicle.inspection_result.filter((category) =>
        inProgressStages.includes(category.category_name)
      );
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
      images, // Add images from request
      videos, // Add videos from request
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

module.exports = {
  getWorkshopVehicles,
  getWorkshopVehicleDetails,
  createQuote,
  getQuotesForField,
  approveSupplierQuote,
};
