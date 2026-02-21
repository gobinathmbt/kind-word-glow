const jwt = require("jsonwebtoken");
const Env_Configuration = require("../config/env");
const connectionManager = require("../config/dbConnectionManager");
const { getModel } = require("../utils/modelFactory");
const Company = require("../models/Company");
const User = require("../models/User");
const { createTenderHistory } = require("../utils/tenderHistory.utils");
const mailService = require("../config/mailer");

// Generate JWT Token for dealership user
const generateDealershipToken = (user, dealershipId, companyId) => {
  const tokenPayload = {
    id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    tenderDealership_id: dealershipId,
    company_id: companyId,
    company_db_name: `company_${companyId}`,
    type: 'dealership_user'
  };

  return jwt.sign(
    tokenPayload,
    Env_Configuration.JWT_SECRET,
    { expiresIn: Env_Configuration.JWT_EXPIRE }
  );
};

// @desc    Dealership user login
// @route   POST /api/tender-dealership-auth/login
// @access  Public
const dealershipLogin = async (req, res) => {
  try {
    const { email, password, company_id, dealership_id } = req.body;

    // Validate required fields
    if (!email || !password || !company_id || !dealership_id) {
      return res.status(400).json({
        success: false,
        message: "Email, password, company_id, and dealership_id are required",
      });
    }

    // Validate company exists and is active
    const company = await Company.findById(company_id);
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

    // Connect to company database
    let companyDb;
    try {
      companyDb = await connectionManager.getCompanyConnection(company_id);
    } catch (error) {
      console.error("Error connecting to company database:", error);
      return res.status(500).json({
        success: false,
        message: "Database connection error",
      });
    }

    // Setup cleanup handler
    const cleanup = () => {
      connectionManager.decrementActiveRequests(company_id);
    };
    res.on('finish', cleanup);
    res.on('close', cleanup);

    // Get TenderDealershipUser model from company database
    const TenderDealershipUser = getModel('TenderDealershipUser', companyDb);

    // Find user by email, company_id, and dealership_id
    const user = await TenderDealershipUser.findOne({
      email: email.toLowerCase(),
      company_id,
      tenderDealership_id: dealership_id,
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Account is deactivated",
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate JWT token
    const token = generateDealershipToken(user, dealership_id, company_id);

    // Get dealership information
    const TenderDealership = getModel('TenderDealership', companyDb);
    const dealership = await TenderDealership.findById(dealership_id);

    // Prepare user data for response
    const userData = {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      tenderDealership_id: dealership_id,
      dealership_name: dealership?.dealership_name,
      company_id: company_id,
      company_name: company.company_name,
      type: 'dealership_user',
      isActive: user.isActive,
    };

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: userData,
    });
  } catch (error) {
    console.error("Dealership login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
};

// @desc    Get tenders for dealership (filtered by dealership_id)
// @route   GET /api/tender-dealership-auth/tenders
// @access  Private (Dealership User)
const getDealershipTenders = async (req, res) => {
  try {
    const Tender = req.getModel('Tender');
    const TenderVehicle = req.getModel('TenderVehicle');
    const { page = 1, limit = 10, search, status } = req.query;
    const skip = (page - 1) * limit;

    // Get all TenderVehicle records for this dealership
    let vehicleFilter = {
      tenderDealership_id: req.dealershipUser.tenderDealership_id,
      vehicle_type: 'sent_vehicle'
    };

    // Filter by quote status if provided
    if (status && status !== 'all') {
      vehicleFilter.quote_status = status;
    }

    const tenderVehicles = await TenderVehicle.find(vehicleFilter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    if (tenderVehicles.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        pagination: {
          current_page: parseInt(page),
          total_pages: 0,
          total_records: 0,
          per_page: parseInt(limit),
          has_next_page: false,
          has_prev_page: false
        }
      });
    }

    // Get tender IDs
    const tenderIds = tenderVehicles.map(tv => tv.tender_id);

    // Build tender filter
    let tenderFilter = {
      _id: { $in: tenderIds },
      company_id: req.dealershipUser.company_id
    };

    // Add search filter if provided
    if (search) {
      tenderFilter.$or = [
        { tender_id: { $regex: search, $options: 'i' } },
        { 'customer_info.name': { $regex: search, $options: 'i' } },
        { 'customer_info.email': { $regex: search, $options: 'i' } },
        { 'basic_vehicle_info.make': { $regex: search, $options: 'i' } },
        { 'basic_vehicle_info.model': { $regex: search, $options: 'i' } }
      ];
    }

    // Get tenders
    const tenders = await Tender.find(tenderFilter).lean();

    // Create a map of tender_id to tender data
    const tenderMap = {};
    tenders.forEach(tender => {
      tenderMap[tender._id.toString()] = tender;
    });

    // Combine tender and vehicle data
    const results = tenderVehicles
      .map(tv => {
        const tender = tenderMap[tv.tender_id.toString()];
        if (!tender) return null;

        return {
          ...tender,
          quote_status: tv.quote_status,
          quote_price: tv.quote_price,
          vehicle_id: tv._id,
          submitted_at: tv.submitted_at
        };
      })
      .filter(item => item !== null);

    // Get total count for pagination
    const total = await TenderVehicle.countDocuments(vehicleFilter);

    res.status(200).json({
      success: true,
      data: results,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_records: total,
        per_page: parseInt(limit),
        has_next_page: page < Math.ceil(total / limit),
        has_prev_page: page > 1
      }
    });

  } catch (error) {
    console.error('Get dealership tenders error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving tenders'
    });
  }
};

// @desc    Get single tender by ID for dealership
// @route   GET /api/tender-dealership-auth/tenders/:id
// @access  Private (Dealership User)
const getDealershipTender = async (req, res) => {
  try {
    const Tender = req.getModel('Tender');
    const TenderVehicle = req.getModel('TenderVehicle');

    // Find the tender
    const tender = await Tender.findOne({
      _id: req.params.id,
      company_id: req.dealershipUser.company_id
    }).lean();

    if (!tender) {
      return res.status(404).json({
        success: false,
        message: 'Tender not found'
      });
    }

    // Verify this dealership has access to this tender
    const tenderVehicle = await TenderVehicle.findOne({
      tender_id: tender._id,
      tenderDealership_id: req.dealershipUser.tenderDealership_id,
      vehicle_type: 'sent_vehicle'
    }).lean();

    if (!tenderVehicle) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this tender'
      });
    }

    // Get all alternate vehicles for this tender and dealership
    const alternateVehicles = await TenderVehicle.find({
      tender_id: tender._id,
      tenderDealership_id: req.dealershipUser.tenderDealership_id,
      vehicle_type: 'alternate_vehicle'
    }).lean();

    // Combine tender with vehicle information
    const result = {
      ...tender,
      sent_vehicle: {
        ...tenderVehicle,
        vehicle_id: tenderVehicle._id
      },
      alternate_vehicles: alternateVehicles.map(av => ({
        ...av,
        vehicle_id: av._id
      }))
    };

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Get dealership tender error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving tender'
    });
  }
};

// @desc    Submit or update quote for a tender
// @route   POST /api/tender-dealership-auth/tenders/:id/quote
// @access  Private (Dealership User)
const submitQuote = async (req, res) => {
  try {
    const Tender = req.getModel('Tender');
    const TenderVehicle = req.getModel('TenderVehicle');
    const TenderNotification = req.getModel('TenderNotification');
    
    const { 
      vehicle_id, 
      vehicle_type = 'sent_vehicle',
      is_draft = false,
      // Vehicle details
      make,
      model,
      year,
      variant,
      body_style,
      color,
      registration_number,
      vin,
      odometer_reading,
      engine_details,
      specifications,
      attachments,
      quote_price,
      quote_notes
    } = req.body;

    // Find the tender
    const tender = await Tender.findOne({
      _id: req.params.id,
      company_id: req.dealershipUser.company_id
    });

    if (!tender) {
      return res.status(404).json({
        success: false,
        message: 'Tender not found'
      });
    }

    // Check if tender has expired
    const now = new Date();
    const expiryDate = new Date(tender.tender_expiry_time);
    
    if (expiryDate <= now && !is_draft) {
      return res.status(400).json({
        success: false,
        message: 'Cannot submit quote - tender has expired',
        code: 'TENDER_EXPIRED'
      });
    }

    let tenderVehicle;
    let isNewVehicle = false;

    // If vehicle_id is provided, update existing vehicle
    if (vehicle_id) {
      tenderVehicle = await TenderVehicle.findOne({
        _id: vehicle_id,
        tender_id: tender._id,
        tenderDealership_id: req.dealershipUser.tenderDealership_id
      });

      if (!tenderVehicle) {
        return res.status(404).json({
          success: false,
          message: 'Vehicle record not found'
        });
      }
    } else {
      // Creating new alternate vehicle
      if (vehicle_type !== 'alternate_vehicle') {
        return res.status(400).json({
          success: false,
          message: 'vehicle_id is required for sent_vehicle updates'
        });
      }

      // Validate required fields for new alternate vehicle
      if (!make || !model || !year) {
        return res.status(400).json({
          success: false,
          message: 'Make, model, and year are required for alternate vehicles',
          errors: [
            { field: 'make', message: 'Make is required' },
            { field: 'model', message: 'Model is required' },
            { field: 'year', message: 'Year is required' }
          ]
        });
      }

      // Create new alternate vehicle
      tenderVehicle = new TenderVehicle({
        tender_id: tender._id,
        tenderDealership_id: req.dealershipUser.tenderDealership_id,
        vehicle_type: 'alternate_vehicle',
        make,
        model,
        year,
        quote_status: 'Open',
        created_by: req.dealershipUser.id
      });
      isNewVehicle = true;
    }

    // Track old status for history
    const oldStatus = tenderVehicle.quote_status;

    // Update vehicle details (only editable fields for sent_vehicle)
    if (vehicle_type === 'sent_vehicle') {
      // For sent_vehicle, make/model/year/variant are read-only
      // Update other fields
      if (body_style !== undefined) tenderVehicle.body_style = body_style;
      if (color !== undefined) tenderVehicle.color = color;
      if (registration_number !== undefined) tenderVehicle.registration_number = registration_number;
      if (vin !== undefined) tenderVehicle.vin = vin;
      if (odometer_reading !== undefined) tenderVehicle.odometer_reading = odometer_reading;
      if (engine_details !== undefined) tenderVehicle.engine_details = engine_details;
      if (specifications !== undefined) tenderVehicle.specifications = specifications;
      if (attachments !== undefined) tenderVehicle.attachments = attachments;
    } else {
      // For alternate_vehicle, all fields are editable
      if (make !== undefined) tenderVehicle.make = make;
      if (model !== undefined) tenderVehicle.model = model;
      if (year !== undefined) tenderVehicle.year = year;
      if (variant !== undefined) tenderVehicle.variant = variant;
      if (body_style !== undefined) tenderVehicle.body_style = body_style;
      if (color !== undefined) tenderVehicle.color = color;
      if (registration_number !== undefined) tenderVehicle.registration_number = registration_number;
      if (vin !== undefined) tenderVehicle.vin = vin;
      if (odometer_reading !== undefined) tenderVehicle.odometer_reading = odometer_reading;
      if (engine_details !== undefined) tenderVehicle.engine_details = engine_details;
      if (specifications !== undefined) tenderVehicle.specifications = specifications;
      if (attachments !== undefined) tenderVehicle.attachments = attachments;
    }

    // Update quote information
    if (quote_price !== undefined) tenderVehicle.quote_price = quote_price;
    if (quote_notes !== undefined) tenderVehicle.quote_notes = quote_notes;

    // Update status based on draft or submit
    if (is_draft) {
      tenderVehicle.quote_status = 'In Progress';
    } else {
      // Validate required fields for submission
      if (!tenderVehicle.quote_price) {
        return res.status(400).json({
          success: false,
          message: 'Quote price is required for submission',
          errors: [
            { field: 'quote_price', message: 'Quote price is required' }
          ]
        });
      }

      tenderVehicle.quote_status = 'Submitted';
      tenderVehicle.submitted_at = new Date();
    }

    // Set modified_by
    tenderVehicle.modified_by = req.dealershipUser.id;

    // Save the vehicle
    await tenderVehicle.save();

    // Update tender status if quote is submitted
    if (!is_draft && tender.tender_status === 'Sent') {
      tender.tender_status = 'Quote Received';
      await tender.save();
    }

    // Create history record
    const actionType = is_draft ? 'quote_saved_draft' : 'quote_submitted';
    const newStatus = is_draft ? 'In Progress' : 'Submitted';
    
    await createTenderHistory({
      tender_id: tender._id,
      tenderDealership_id: req.dealershipUser.tenderDealership_id,
      action_type: is_draft ? 'viewed' : 'quote_submitted',
      old_status: oldStatus,
      new_status: newStatus,
      performed_by: req.dealershipUser.id,
      performed_by_type: 'dealership_user',
      notes: is_draft 
        ? `Quote saved as draft by ${req.dealershipUser.username}` 
        : `Quote submitted by ${req.dealershipUser.username}`,
      metadata: {
        vehicle_type: tenderVehicle.vehicle_type,
        quote_price: tenderVehicle.quote_price,
        vehicle_details: `${tenderVehicle.make} ${tenderVehicle.model} ${tenderVehicle.year}`
      }
    }, req.getModel);

    // Send notification to admin if quote is submitted (not draft)
    if (!is_draft) {
      // Get company admin users
      const adminUsers = await User.find({
        company_id: req.dealershipUser.company_id,
        is_active: true
      }).select('_id email first_name last_name');

      // Create notifications for each admin
      for (const admin of adminUsers) {
        await TenderNotification.create({
          recipient_id: admin._id,
          recipient_type: 'admin',
          tender_id: tender._id,
          notification_type: 'quote_submitted',
          message: `Quote submitted for tender ${tender.tender_id} by dealership`
        });

        // Send email notification
        try {
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #3b82f6;">Quote Received</h1>
              <p>Hello ${admin.first_name},</p>
              <p>A dealership has submitted a quote for tender:</p>
              
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Tender ID:</strong> ${tender.tender_id}</p>
                <p><strong>Customer:</strong> ${tender.customer_info.name}</p>
                <p><strong>Vehicle:</strong> ${tender.basic_vehicle_info.make} ${tender.basic_vehicle_info.model} ${tender.basic_vehicle_info.year}</p>
                <p><strong>Quote Price:</strong> $${tenderVehicle.quote_price?.toLocaleString() || 'N/A'}</p>
                <p><strong>Vehicle Type:</strong> ${tenderVehicle.vehicle_type === 'sent_vehicle' ? 'Requested Vehicle' : 'Alternate Vehicle'}</p>
              </div>
              
              <p>Please log in to the admin portal to review the quote.</p>
              
              <p>Best regards,<br>Auto Erp Team</p>
            </div>
          `;

          await mailService.sendEmail({
            to: admin.email,
            subject: `Quote Received for Tender ${tender.tender_id}`,
            html: emailHtml
          });
        } catch (emailError) {
          console.error(`Failed to send email to ${admin.email}:`, emailError);
          // Continue with other emails even if one fails
        }
      }
    }

    res.status(200).json({
      success: true,
      message: is_draft ? 'Quote saved as draft successfully' : 'Quote submitted successfully',
      data: tenderVehicle
    });

  } catch (error) {
    console.error('Submit quote error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error submitting quote'
    });
  }
};

// @desc    Withdraw a submitted quote
// @route   POST /api/tender-dealership-auth/tenders/:id/withdraw
// @access  Private (Dealership User)
const withdrawQuote = async (req, res) => {
  try {
    const Tender = req.getModel('Tender');
    const TenderVehicle = req.getModel('TenderVehicle');
    const TenderNotification = req.getModel('TenderNotification');
    
    const { vehicle_id } = req.body;

    // Validate vehicle_id
    if (!vehicle_id) {
      return res.status(400).json({
        success: false,
        message: 'vehicle_id is required',
        errors: [
          { field: 'vehicle_id', message: 'Vehicle ID is required' }
        ]
      });
    }

    // Find the tender
    const tender = await Tender.findOne({
      _id: req.params.id,
      company_id: req.dealershipUser.company_id
    });

    if (!tender) {
      return res.status(404).json({
        success: false,
        message: 'Tender not found'
      });
    }

    // Find the vehicle
    const tenderVehicle = await TenderVehicle.findOne({
      _id: vehicle_id,
      tender_id: tender._id,
      tenderDealership_id: req.dealershipUser.tenderDealership_id
    });

    if (!tenderVehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle record not found'
      });
    }

    // Check if quote can be withdrawn (must be in Submitted status)
    if (tenderVehicle.quote_status !== 'Submitted') {
      return res.status(400).json({
        success: false,
        message: `Cannot withdraw quote with status: ${tenderVehicle.quote_status}`,
        code: 'INVALID_STATUS'
      });
    }

    // Track old status for history
    const oldStatus = tenderVehicle.quote_status;

    // Update quote status to Withdrawn
    tenderVehicle.quote_status = 'Withdrawn';
    tenderVehicle.modified_by = req.dealershipUser.id;
    await tenderVehicle.save();

    // Create history record
    await createTenderHistory({
      tender_id: tender._id,
      tenderDealership_id: req.dealershipUser.tenderDealership_id,
      action_type: 'quote_withdrawn',
      old_status: oldStatus,
      new_status: 'Withdrawn',
      performed_by: req.dealershipUser.id,
      performed_by_type: 'dealership_user',
      notes: `Quote withdrawn by ${req.dealershipUser.username}`,
      metadata: {
        vehicle_type: tenderVehicle.vehicle_type,
        quote_price: tenderVehicle.quote_price,
        vehicle_details: `${tenderVehicle.make} ${tenderVehicle.model} ${tenderVehicle.year}`
      }
    }, req.getModel);

    // Send notification to admin
    const adminUsers = await User.find({
      company_id: req.dealershipUser.company_id,
      is_active: true
    }).select('_id email first_name last_name');

    // Create notifications for each admin
    for (const admin of adminUsers) {
      await TenderNotification.create({
        recipient_id: admin._id,
        recipient_type: 'admin',
        tender_id: tender._id,
        notification_type: 'quote_withdrawn',
        message: `Quote withdrawn for tender ${tender.tender_id} by dealership`
      });

      // Send email notification
      try {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #ef4444;">Quote Withdrawn</h1>
            <p>Hello ${admin.first_name},</p>
            <p>A dealership has withdrawn their quote for tender:</p>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Tender ID:</strong> ${tender.tender_id}</p>
              <p><strong>Customer:</strong> ${tender.customer_info.name}</p>
              <p><strong>Vehicle:</strong> ${tender.basic_vehicle_info.make} ${tender.basic_vehicle_info.model} ${tender.basic_vehicle_info.year}</p>
              <p><strong>Vehicle Type:</strong> ${tenderVehicle.vehicle_type === 'sent_vehicle' ? 'Requested Vehicle' : 'Alternate Vehicle'}</p>
            </div>
            
            <p>Please log in to the admin portal to view the updated tender status.</p>
            
            <p>Best regards,<br>Auto Erp Team</p>
          </div>
        `;

        await mailService.sendEmail({
          to: admin.email,
          subject: `Quote Withdrawn for Tender ${tender.tender_id}`,
          html: emailHtml
        });
      } catch (emailError) {
        console.error(`Failed to send email to ${admin.email}:`, emailError);
        // Continue with other emails even if one fails
      }
    }

    res.status(200).json({
      success: true,
      message: 'Quote withdrawn successfully',
      data: tenderVehicle
    });

  } catch (error) {
    console.error('Withdraw quote error:', error);
    res.status(500).json({
      success: false,
      message: 'Error withdrawing quote'
    });
  }
};

// @desc    Accept an approved order
// @route   POST /api/tender-dealership-auth/orders/:id/accept
// @access  Private (Dealership User)
const acceptOrder = async (req, res) => {
  try {
    const TenderVehicle = req.getModel('TenderVehicle');
    const Tender = req.getModel('Tender');
    const TenderNotification = req.getModel('TenderNotification');
    
    // Find the vehicle/order
    const tenderVehicle = await TenderVehicle.findOne({
      _id: req.params.id,
      tenderDealership_id: req.dealershipUser.tenderDealership_id
    });

    if (!tenderVehicle) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Verify order is in "Order - Approved" status
    if (tenderVehicle.quote_status !== 'Order - Approved') {
      return res.status(400).json({
        success: false,
        message: `Cannot accept order with status: ${tenderVehicle.quote_status}`,
        code: 'INVALID_STATUS'
      });
    }

    // Track old status for history
    const oldStatus = tenderVehicle.quote_status;

    // Update order status to "Accepted"
    tenderVehicle.quote_status = 'Accepted';
    tenderVehicle.modified_by = req.dealershipUser.id;
    await tenderVehicle.save();

    // Get tender information
    const tender = await Tender.findById(tenderVehicle.tender_id);

    // Create history record
    await createTenderHistory({
      tender_id: tenderVehicle.tender_id,
      tenderDealership_id: req.dealershipUser.tenderDealership_id,
      action_type: 'order_accepted',
      old_status: oldStatus,
      new_status: 'Accepted',
      performed_by: req.dealershipUser.id,
      performed_by_type: 'dealership_user',
      notes: `Order accepted by ${req.dealershipUser.username}`,
      metadata: {
        vehicle_type: tenderVehicle.vehicle_type,
        quote_price: tenderVehicle.quote_price,
        vehicle_details: `${tenderVehicle.make} ${tenderVehicle.model} ${tenderVehicle.year}`
      }
    }, req.getModel);

    // Send notification to admin
    const adminUsers = await User.find({
      company_id: req.dealershipUser.company_id,
      is_active: true
    }).select('_id email first_name last_name');

    // Create notifications and send emails
    for (const admin of adminUsers) {
      await TenderNotification.create({
        recipient_id: admin._id,
        recipient_type: 'admin',
        tender_id: tenderVehicle.tender_id,
        notification_type: 'order_status_change',
        message: `Order accepted for tender ${tender?.tender_id || 'N/A'}`
      });

      // Send email notification
      try {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #3b82f6;">Order Accepted</h1>
            <p>Hello ${admin.first_name},</p>
            <p>The dealership has accepted the order for tender:</p>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Tender ID:</strong> ${tender?.tender_id || 'N/A'}</p>
              <p><strong>Customer:</strong> ${tender?.customer_info?.name || 'N/A'}</p>
              <p><strong>Vehicle:</strong> ${tenderVehicle.make} ${tenderVehicle.model} ${tenderVehicle.year}</p>
              <p><strong>Quote Price:</strong> ${tenderVehicle.quote_price?.toLocaleString() || 'N/A'}</p>
            </div>
            
            <p>The dealership will proceed with delivery.</p>
            
            <p>Best regards,<br>Auto Erp Team</p>
          </div>
        `;

        await mailService.sendEmail({
          to: admin.email,
          subject: `Order Accepted - Tender ${tender?.tender_id || 'N/A'}`,
          html: emailHtml
        });
      } catch (emailError) {
        console.error(`Failed to send email to ${admin.email}:`, emailError);
        // Continue with other emails even if one fails
      }
    }

    res.status(200).json({
      success: true,
      message: 'Order accepted successfully',
      data: tenderVehicle
    });

  } catch (error) {
    console.error('Accept order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error accepting order'
    });
  }
};

// @desc    Mark order as delivered
// @route   POST /api/tender-dealership-auth/orders/:id/deliver
// @access  Private (Dealership User)
const deliverOrder = async (req, res) => {
  try {
    const TenderVehicle = req.getModel('TenderVehicle');
    const Tender = req.getModel('Tender');
    const TenderNotification = req.getModel('TenderNotification');
    
    // Find the vehicle/order
    const tenderVehicle = await TenderVehicle.findOne({
      _id: req.params.id,
      tenderDealership_id: req.dealershipUser.tenderDealership_id
    });

    if (!tenderVehicle) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Verify order is in "Accepted" status
    if (tenderVehicle.quote_status !== 'Accepted') {
      return res.status(400).json({
        success: false,
        message: `Cannot mark order as delivered with status: ${tenderVehicle.quote_status}`,
        code: 'INVALID_STATUS'
      });
    }

    // Track old status for history
    const oldStatus = tenderVehicle.quote_status;

    // Update order status to "Delivered"
    tenderVehicle.quote_status = 'Delivered';
    tenderVehicle.modified_by = req.dealershipUser.id;
    await tenderVehicle.save();

    // Get tender information
    const tender = await Tender.findById(tenderVehicle.tender_id);

    // Create history record
    await createTenderHistory({
      tender_id: tenderVehicle.tender_id,
      tenderDealership_id: req.dealershipUser.tenderDealership_id,
      action_type: 'order_delivered',
      old_status: oldStatus,
      new_status: 'Delivered',
      performed_by: req.dealershipUser.id,
      performed_by_type: 'dealership_user',
      notes: `Order marked as delivered by ${req.dealershipUser.username}`,
      metadata: {
        vehicle_type: tenderVehicle.vehicle_type,
        quote_price: tenderVehicle.quote_price,
        vehicle_details: `${tenderVehicle.make} ${tenderVehicle.model} ${tenderVehicle.year}`,
        delivery_date: new Date()
      }
    }, req.getModel);

    // Send notification to admin
    const adminUsers = await User.find({
      company_id: req.dealershipUser.company_id,
      is_active: true
    }).select('_id email first_name last_name');

    // Create notifications and send emails
    for (const admin of adminUsers) {
      await TenderNotification.create({
        recipient_id: admin._id,
        recipient_type: 'admin',
        tender_id: tenderVehicle.tender_id,
        notification_type: 'order_status_change',
        message: `Order delivered for tender ${tender?.tender_id || 'N/A'}`
      });

      // Send email notification
      try {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #10b981;">Order Delivered</h1>
            <p>Hello ${admin.first_name},</p>
            <p>The dealership has marked the order as delivered for tender:</p>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Tender ID:</strong> ${tender?.tender_id || 'N/A'}</p>
              <p><strong>Customer:</strong> ${tender?.customer_info?.name || 'N/A'}</p>
              <p><strong>Vehicle:</strong> ${tenderVehicle.make} ${tenderVehicle.model} ${tenderVehicle.year}</p>
              <p><strong>Quote Price:</strong> ${tenderVehicle.quote_price?.toLocaleString() || 'N/A'}</p>
              <p><strong>Delivery Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            
            <p>The order has been completed successfully.</p>
            
            <p>Best regards,<br>Auto Erp Team</p>
          </div>
        `;

        await mailService.sendEmail({
          to: admin.email,
          subject: `Order Delivered - Tender ${tender?.tender_id || 'N/A'}`,
          html: emailHtml
        });
      } catch (emailError) {
        console.error(`Failed to send email to ${admin.email}:`, emailError);
        // Continue with other emails even if one fails
      }
    }

    res.status(200).json({
      success: true,
      message: 'Order marked as delivered successfully',
      data: tenderVehicle
    });

  } catch (error) {
    console.error('Deliver order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking order as delivered'
    });
  }
};

// @desc    Abort/cancel an order
// @route   POST /api/tender-dealership-auth/orders/:id/abort
// @access  Private (Dealership User)
const abortOrder = async (req, res) => {
  try {
    const TenderVehicle = req.getModel('TenderVehicle');
    const Tender = req.getModel('Tender');
    const TenderNotification = req.getModel('TenderNotification');
    
    const { reason } = req.body;

    // Find the vehicle/order
    const tenderVehicle = await TenderVehicle.findOne({
      _id: req.params.id,
      tenderDealership_id: req.dealershipUser.tenderDealership_id
    });

    if (!tenderVehicle) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Verify order can be aborted (must be in Order - Approved or Accepted status)
    const validStatuses = ['Order - Approved', 'Accepted'];
    if (!validStatuses.includes(tenderVehicle.quote_status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot abort order with status: ${tenderVehicle.quote_status}`,
        code: 'INVALID_STATUS'
      });
    }

    // Track old status for history
    const oldStatus = tenderVehicle.quote_status;

    // Update order status to "Aborted"
    tenderVehicle.quote_status = 'Aborted';
    tenderVehicle.modified_by = req.dealershipUser.id;
    await tenderVehicle.save();

    // Get tender information
    const tender = await Tender.findById(tenderVehicle.tender_id);

    // Create history record
    await createTenderHistory({
      tender_id: tenderVehicle.tender_id,
      tenderDealership_id: req.dealershipUser.tenderDealership_id,
      action_type: 'order_aborted',
      old_status: oldStatus,
      new_status: 'Aborted',
      performed_by: req.dealershipUser.id,
      performed_by_type: 'dealership_user',
      notes: `Order aborted by ${req.dealershipUser.username}${reason ? `: ${reason}` : ''}`,
      metadata: {
        vehicle_type: tenderVehicle.vehicle_type,
        quote_price: tenderVehicle.quote_price,
        vehicle_details: `${tenderVehicle.make} ${tenderVehicle.model} ${tenderVehicle.year}`,
        abort_reason: reason || 'No reason provided',
        abort_date: new Date()
      }
    }, req.getModel);

    // Send notification to admin
    const adminUsers = await User.find({
      company_id: req.dealershipUser.company_id,
      is_active: true
    }).select('_id email first_name last_name');

    // Create notifications and send emails
    for (const admin of adminUsers) {
      await TenderNotification.create({
        recipient_id: admin._id,
        recipient_type: 'admin',
        tender_id: tenderVehicle.tender_id,
        notification_type: 'order_status_change',
        message: `Order aborted for tender ${tender?.tender_id || 'N/A'}`
      });

      // Send email notification
      try {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #ef4444;">Order Aborted</h1>
            <p>Hello ${admin.first_name},</p>
            <p>The dealership has aborted the order for tender:</p>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Tender ID:</strong> ${tender?.tender_id || 'N/A'}</p>
              <p><strong>Customer:</strong> ${tender?.customer_info?.name || 'N/A'}</p>
              <p><strong>Vehicle:</strong> ${tenderVehicle.make} ${tenderVehicle.model} ${tenderVehicle.year}</p>
              <p><strong>Quote Price:</strong> ${tenderVehicle.quote_price?.toLocaleString() || 'N/A'}</p>
              ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
            </div>
            
            <p>Please contact the dealership for more information.</p>
            
            <p>Best regards,<br>Auto Erp Team</p>
          </div>
        `;

        await mailService.sendEmail({
          to: admin.email,
          subject: `Order Aborted - Tender ${tender?.tender_id || 'N/A'}`,
          html: emailHtml
        });
      } catch (emailError) {
        console.error(`Failed to send email to ${admin.email}:`, emailError);
        // Continue with other emails even if one fails
      }
    }

    res.status(200).json({
      success: true,
      message: 'Order aborted successfully',
      data: tenderVehicle
    });

  } catch (error) {
    console.error('Abort order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error aborting order'
    });
  }
};

module.exports = {
  dealershipLogin,
  getDealershipTenders,
  getDealershipTender,
  submitQuote,
  withdrawQuote,
  acceptOrder,
  deliverOrder,
  abortOrder,
};
