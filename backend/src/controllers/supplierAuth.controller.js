const { logEvent } = require("./logs.controller");
const jwt = require("jsonwebtoken");
const Env_Configuration = require("../config/env");
const { type } = require("os");

// @desc    Supplier login
// @route   POST /api/supplier-auth/login
// @access  Public
const supplierLogin = async (req, res) => {
  try {
    const { email, password, company_id } = req.body;

    if (!email || !password || !company_id) {
      return res.status(400).json({
        success: false,
        message: "Email, password, and company_id are required",
      });
    }

    // Get connection manager and utilities
    const connectionManager = require("../config/dbConnectionManager");
    const { getModel } = require("../utils/modelFactory");
    const Company = require("../models/Company");

    // Validate company exists and is active
    let company;
    try {
      company = await Company.findById(company_id);
      if (!company) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      if (!company.is_active) {
        return res.status(401).json({
          success: false,
          message: "Company is inactive",
        });
      }
    } catch (error) {
      console.error('Error fetching company:', error);
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Get company database connection
    let companyDb;
    try {
      companyDb = await connectionManager.getCompanyConnection(company_id);
    } catch (error) {
      console.error(`Error connecting to company database ${company_id}:`, error);
      return res.status(500).json({
        success: false,
        message: 'Error during login',
      });
    }

    // Setup cleanup handler
    const cleanup = () => {
      connectionManager.decrementActiveRequests(company_id);
    };
    res.on('finish', cleanup);
    res.on('close', cleanup);

    // Get Supplier model from company database
    const Supplier = getModel('Supplier', companyDb);

    // Search for supplier in this company
    const foundSupplier = await Supplier.findOne({
      email: email.toLowerCase(),
      is_active: true,
    });

    // If supplier not found
    if (!foundSupplier) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Verify password
    if (password !== foundSupplier.password) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        supplier_id: foundSupplier._id,
        email: foundSupplier.email,
        company_id: company._id,
      },
      Env_Configuration.JWT_SECRET || "your-secret-key",
      { expiresIn: "30d" }
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        supplier: {
          id: foundSupplier._id,
          name: foundSupplier.name,
          email: foundSupplier.email,
          supplier_shop_name: foundSupplier.supplier_shop_name,
          company_id: company._id,
          company_name: company.company_name,
          type: "supplier",
          role: "supplier",
        },
        token,
      },
    });
  } catch (error) {
    console.error("Supplier login error:", error);
    res.status(500).json({
      success: false,
      message: "Error during login",
    });
  }
};


// @desc    Get vehicles assigned to supplier
// @route   GET /api/supplier-auth/vehicles
// @access  Private (Supplier)
const getSupplierVehicles = async (req, res) => {
  try {
    const WorkshopQuote = req.getModel('WorkshopQuote');
    const Vehicle = req.getModel('Vehicle');
    const supplierId = req.supplier.supplier_id;

    // Find all quotes where this supplier is selected
    const quotes = await WorkshopQuote.find({
      selected_suppliers: supplierId,
      status: { $in: ["pending", "in_progress"] },
    })
      .populate("selected_suppliers", "name email")
      .sort({ created_at: -1 });

    // Get unique vehicle stock IDs
    const vehicleStockIds = [
      ...new Set(quotes.map((quote) => quote.vehicle_stock_id)),
    ];
    // Get unique vehicle types
    const vehicleTypes = [...new Set(quotes.map((q) => q.vehicle_type))];

    // Get vehicle details
    const vehicles = await Vehicle.find({
      vehicle_stock_id: { $in: vehicleStockIds },
      vehicle_type: { $in: vehicleTypes }, // <-- match all types
      company_id: req.supplier.company_id,
    }).select(
      "vehicle_stock_id make model year plate_no vin name vehicle_type vehicle_hero_image inspection_result created_at"
    );

    // Group quotes by vehicle
    const vehiclesWithQuotes = vehicles.map((vehicle) => ({
      ...vehicle.toObject(),
      quotes: quotes.filter(
        (quote) => quote.vehicle_stock_id === vehicle.vehicle_stock_id
      ),
    }));

    res.status(200).json({
      success: true,
      data: vehiclesWithQuotes,
    });
  } catch (error) {
    console.error("Get supplier vehicles error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving vehicles",
    });
  }
};

// @desc    Get vehicle details for supplier
// @route   GET /api/supplier-auth/vehicle/:vehicleStockId
// @access  Private (Supplier)
const getSupplierVehicleDetails = async (req, res) => {
  try {
    const Vehicle = req.getModel('Vehicle');
    const WorkshopQuote = req.getModel('WorkshopQuote');
    const { vehicleStockId, vehicleType } = req.params;
    const supplierId = req.supplier.supplier_id;

    // Get vehicle details
    const vehicle = await Vehicle.findOne({
      vehicle_stock_id: parseInt(vehicleStockId),
      vehicle_type: vehicleType,
      company_id: req.supplier.company_id,
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    // Get quotes for this vehicle where supplier is selected
    const quotes = await WorkshopQuote.find({
      vehicle_stock_id: parseInt(vehicleStockId),
      company_id: req.supplier.company_id,
       vehicle_type: vehicleType,
      selected_suppliers: supplierId,
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
    console.error("Get supplier vehicle details error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving vehicle details",
    });
  }
};

// @desc    Submit supplier quote response
// @route   POST /api/supplier-auth/quote/:quoteId/respond
// @access  Private (Supplier)
const submitSupplierResponse = async (req, res) => {
  try {
    const WorkshopQuote = req.getModel('WorkshopQuote');
    const { quoteId } = req.params;
    const {
      estimated_cost,
      estimated_time,
      comments,
      quote_pdf_url,
      quote_pdf_key,
    } = req.body;
    const supplierId = req.supplier.supplier_id;


    const quote = await WorkshopQuote.findOne({
      _id: quoteId,
      selected_suppliers: supplierId,
    });

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: "Quote not found or not assigned to this supplier",
      });
    }
    if (quote.status === 'quote_approved') {
      return res.status(404).json({
        success: false,
        message: "Quote Is Already Taken By Another Supplier",
      });
    }

    // Check if supplier already responded
    const existingResponseIndex = quote.supplier_responses.findIndex(
      (response) => response.supplier_id.toString() === supplierId
    );

    const responseData = {
      supplier_id: supplierId,
      estimated_cost: parseFloat(estimated_cost),
      estimated_time,
      comments,
      quote_pdf_url,
      quote_pdf_key,
      status: "pending",
    };

    if (existingResponseIndex >= 0) {
      // Update existing response
      quote.supplier_responses[existingResponseIndex] = responseData;
    } else {
      // Add new response
      quote.supplier_responses.push(responseData);
    }


    await quote.save();

    res.status(200).json({
      success: true,
      message: "Response submitted successfully",
      data: quote,
    });
  } catch (error) {
    console.error("Submit supplier response error:", error);
    res.status(500).json({
      success: false,
      message: "Error submitting response",
    });
  }
};

// @desc    Get supplier profile
// @route   GET /api/supplier-auth/profile
// @access  Private (Supplier)
const getSupplierProfile = async (req, res) => {
  try {
    const Supplier = req.getModel('Supplier');
    const supplier = await Supplier.findById(req.supplier.supplier_id).select(
      "-password"
    );

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    res.status(200).json({
      success: true,
      data: supplier,
    });
  } catch (error) {
    console.error("Get supplier profile error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving profile",
    });
  }
};

module.exports = {
  supplierLogin,
  getSupplierVehicles,
  getSupplierVehicleDetails,
  submitSupplierResponse,
  getSupplierProfile,
};
