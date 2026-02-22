const jwt = require("jsonwebtoken");
const Env_Configuration = require("../config/env");
const connectionManager = require("../config/dbConnectionManager");
const { getModel } = require("../utils/modelFactory");
const Company = require("../models/Company");
const User = require("../models/User");
const { createTenderHistory } = require("../utils/tenderHistory.utils");
const mailService = require("../config/mailer");
const frontendUrl =Env_Configuration.FRONTEND_URL || 'http://localhost:8080';

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

// @desc    Submit or update quotes for a tender (handles single or multiple vehicles)
// @route   POST /api/tender-dealership-auth/tenders/:id/quote
// @access  Private (Dealership User)
const submitQuote = async (req, res) => {
  try {
    const Tender = req.getModel('Tender');
    const TenderVehicle = req.getModel('TenderVehicle');
    const TenderNotification = req.getModel('TenderNotification');
    
    const { is_draft = false, vehicles } = req.body;

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

    // Support both new unified format (vehicles array) and legacy single vehicle format
    let vehiclesToProcess = [];
    
    if (vehicles && Array.isArray(vehicles)) {
      // New unified format - accept array of vehicles
      vehiclesToProcess = vehicles;
    } else {
      // Legacy format - single vehicle
      const {
        vehicle_id,
        vehicle_type = 'sent_vehicle',
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
      
      vehiclesToProcess = [{
        vehicle_id,
        vehicle_type,
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
      }];
    }

    // Process all vehicles in a single transaction
    const savedVehicles = [];
    let tenderUpdated = false;
    
    // Get all existing vehicle IDs from the request
    const submittedVehicleIds = vehiclesToProcess
      .map(v => v.vehicle_id)
      .filter(id => id); // Filter out null/undefined IDs
    
    console.log('📋 Submitted vehicle IDs:', submittedVehicleIds);

    for (const vehicleData of vehiclesToProcess) {
      const {
        vehicle_id,
        vehicle_type,
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
      } = vehicleData;

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
            message: `Vehicle record not found for ID: ${vehicle_id}`
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

        // Find the sent_vehicle for this dealership to link as parent
        const sentVehicle = await TenderVehicle.findOne({
          tender_id: tender._id,
          tenderDealership_id: req.dealershipUser.tenderDealership_id,
          vehicle_type: 'sent_vehicle'
        });

        if (!sentVehicle) {
          return res.status(400).json({
            success: false,
            message: 'Sent vehicle not found. Cannot create alternate vehicle.'
          });
        }

        // Create new alternate vehicle
        tenderVehicle = new TenderVehicle({
          tender_id: tender._id,
          tenderDealership_id: req.dealershipUser.tenderDealership_id,
          vehicle_type: 'alternate_vehicle',
          parent_vehicle_id: sentVehicle._id,
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
            message: `Quote price is required for submission (${vehicle_type})`,
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
      savedVehicles.push(tenderVehicle);

      // Update tender status if quote is submitted (do this only once per tender)
      if (!is_draft && !tenderUpdated && tender.tender_status === 'Sent') {
        tender.tender_status = 'Quote Received';
        await tender.save();
        tenderUpdated = true;
      }

      // Create history record
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
          ? `Quote saved as draft for ${vehicle_type} by ${req.dealershipUser.username}` 
          : `Quote submitted for ${vehicle_type} by ${req.dealershipUser.username}`,
        metadata: {
          vehicle_type: tenderVehicle.vehicle_type,
          quote_price: tenderVehicle.quote_price,
          vehicle_details: `${tenderVehicle.make} ${tenderVehicle.model} ${tenderVehicle.year}`
        }
      }, req.getModel);
    }

    // Delete vehicles that exist in DB but were not included in the submission
    // This handles the case where user removes alternate vehicles from the frontend
    console.log('🗑️ Checking for vehicles to delete...');
    
    // Find all existing vehicles for this tender and dealership
    const existingVehicles = await TenderVehicle.find({
      tender_id: tender._id,
      tenderDealership_id: req.dealershipUser.tenderDealership_id
    });
    
    console.log(`Found ${existingVehicles.length} existing vehicles in database`);
    
    // Identify vehicles to delete (exist in DB but not in submitted list)
    const vehiclesToDelete = existingVehicles.filter(existingVehicle => {
      // Don't delete if this vehicle was just saved
      if (savedVehicles.some(saved => saved._id.toString() === existingVehicle._id.toString())) {
        return false;
      }
      
      // Don't delete if this vehicle ID is in the submitted list
      if (submittedVehicleIds.some(id => id && id.toString() === existingVehicle._id.toString())) {
        return false;
      }
      
      // This vehicle should be deleted
      return true;
    });
    
    if (vehiclesToDelete.length > 0) {
      console.log(`🗑️ Deleting ${vehiclesToDelete.length} removed vehicle(s)...`);
      
      for (const vehicleToDelete of vehiclesToDelete) {
        console.log(`Deleting vehicle: ${vehicleToDelete._id} (${vehicleToDelete.vehicle_type})`);
        
        // Create history record for deletion
        await createTenderHistory({
          tender_id: tender._id,
          tenderDealership_id: req.dealershipUser.tenderDealership_id,
          action_type: 'updated',
          old_status: vehicleToDelete.quote_status,
          new_status: 'Deleted',
          performed_by: req.dealershipUser.id,
          performed_by_type: 'dealership_user',
          notes: `${vehicleToDelete.vehicle_type} removed by ${req.dealershipUser.username}`,
          metadata: {
            vehicle_type: vehicleToDelete.vehicle_type,
            vehicle_details: `${vehicleToDelete.make} ${vehicleToDelete.model} ${vehicleToDelete.year}`,
            action: 'deleted'
          }
        }, req.getModel);
        
        // Delete the vehicle
        await TenderVehicle.deleteOne({ _id: vehicleToDelete._id });
      }
      
      console.log('✅ Vehicle deletion completed');
    } else {
      console.log('✅ No vehicles to delete');
    }

    // Send notification to admin if quotes are submitted (not draft) - once per tender
    if (!is_draft) {
      console.log('📧 Starting notification process for quote submission...');
      console.log('Tender ID:', tender._id);
      console.log('Company ID:', req.dealershipUser.company_id);
      
      // Get company admin users - use req.getModel for multi-tenant support
      const User = req.getModel('User');
      const adminUsers = await User.find({
        company_id: req.dealershipUser.company_id,
        is_active: true
      }).select('_id email first_name last_name');
      
      console.log(`Found ${adminUsers.length} admin users to notify`);

      // Create notifications for each admin
      for (const admin of adminUsers) {
        console.log(`Creating notification for admin: ${admin.email}`);
        
        await TenderNotification.create({
          recipient_id: admin._id,
          recipient_type: 'admin',
          tender_id: tender._id,
          notification_type: 'quote_submitted',
          message: `Quotes submitted for tender ${tender.tender_id} - ${savedVehicles.length} vehicle(s)`
        });

        // Send email notification
        try {
          console.log(`Sending email to: ${admin.email}`);
          const emailHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Quote Received</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;padding:48px 16px;">
    <tr>
      <td align="center">

        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08),0 8px 32px rgba(0,0,0,0.06);">

          <tr>
            <td style="background:#1c1c1e;padding:44px 48px 40px;">
              <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:linear-gradient(135deg,#22c55e,#16a34a);border-radius:10px;width:42px;height:42px;text-align:center;vertical-align:middle;font-size:20px;line-height:42px;">🚗</td>
                  <td style="padding-left:12px;vertical-align:middle;font-size:18px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">Auto ERP - Complete Vehicle Management Solution</td>
                </tr>
              </table>
              <div style="display:inline-block;background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.35);color:#22c55e;font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;padding:5px 14px;border-radius:100px;margin-bottom:16px;">Quote Update</div>
              <h1 style="margin:0;font-size:28px;font-weight:800;color:#ffffff;line-height:1.2;letter-spacing:-0.5px;">
                Quote<br/>
                <span style="color:#22c55e;">Received</span>
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding:40px 48px 0 48px;background:#ffffff;">

              <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#111827;">Hello ${admin.first_name || admin.email},</p>
              <p style="margin:0 0 30px;font-size:14px;color:#6b7280;line-height:1.75;">
                A dealership has submitted <strong style="color:#111827;">${savedVehicles.length} quote(s)</strong> for the following tender. Please review the details below.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:22px;">
                <tr>
                  <td style="background:linear-gradient(180deg,#22c55e,#16a34a);width:4px;border-radius:4px 0 0 4px;"></td>
                  <td style="background:#f0fdf4;border:1px solid #bbf7d0;border-left:none;border-radius:0 14px 14px 0;padding:26px 26px 22px;">
                    <p style="margin:0 0 18px;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#16a34a;">📋 Tender Details</p>

                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;"><tr>
                      <td style="font-size:11px;color:#6b7280;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;width:130px;vertical-align:middle;">Tender ID</td>
                      <td style="font-size:14px;color:#111827;font-weight:700;font-family:'Courier New',monospace;background:#fff;border:1px solid #d1fae5;padding:6px 14px;border-radius:8px;">${tender.tender_id}</td>
                    </tr></table>

                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;"><tr>
                      <td style="font-size:11px;color:#6b7280;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;width:130px;vertical-align:middle;">Customer</td>
                      <td style="font-size:14px;color:#111827;font-weight:700;background:#fff;border:1px solid #d1fae5;padding:6px 14px;border-radius:8px;">${tender.customer_info?.name || 'N/A'}</td>
                    </tr></table>

                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;"><tr>
                      <td style="font-size:11px;color:#6b7280;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;width:130px;vertical-align:middle;">Vehicle</td>
                      <td style="font-size:14px;color:#111827;font-weight:700;background:#fff;border:1px solid #d1fae5;padding:6px 14px;border-radius:8px;">${tender.basic_vehicle_info?.make || ''} ${tender.basic_vehicle_info?.model || ''} ${tender.basic_vehicle_info?.year || ''}</td>
                    </tr></table>

                    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                      <td style="font-size:11px;color:#6b7280;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;width:130px;vertical-align:middle;">Quotes Submitted</td>
                      <td>
                        <span style="display:inline-block;background:#fff;border:1px solid #d1fae5;color:#111827;font-size:13px;font-weight:700;padding:6px 14px;border-radius:8px;">${savedVehicles.length}</span>
                      </td>
                    </tr></table>

                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:40px;">
                <tr><td align="center">
                  <a href="${frontendUrl}/login" style="display:inline-block;background:linear-gradient(135deg,#22c55e 0%,#16a34a 100%);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:17px 52px;border-radius:100px;letter-spacing:0.3px;box-shadow:0 8px 20px rgba(34,197,94,0.35);">📝 &nbsp; View Tender &amp; Review Quotes</a>
                </td></tr>
              </table>

            </td>
          </tr>

          <tr>
            <td style="background:#2a2a2c;padding:28px 48px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <p style="margin:0 0 3px;font-size:14px;font-weight:700;color:#f9fafb;">Auto ERP Team</p>
                    <p style="margin:0;font-size:12px;color:#9ca3af;">This is an automated message. Please do not reply directly.</p>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <span style="display:inline-block;background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.25);color:#22c55e;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:5px 12px;border-radius:100px;">Secure Mail</span>
                  </td>
                </tr>
              </table>
              <div style="height:1px;background:rgba(255,255,255,0.07);margin:20px 0;"></div>
              <p style="margin:0;font-size:11px;color:#6b7280;text-align:center;line-height:1.7;">© 2025 Auto ERP. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;

          await mailService.sendEmail({
            to: admin.email,
            subject: `Quotes Received for Tender ${tender.tender_id} (${savedVehicles.length} vehicle(s))`,
            html: emailHtml
          });
          console.log(`✅ Email sent successfully to: ${admin.email}`);
        } catch (emailError) {
          console.error(`❌ Failed to send email to ${admin.email}:`, emailError);
        }
      }
      
      console.log('✅ Notification process completed');
    }

    console.log('📤 Sending success response to client...');
    res.status(200).json({
      success: true,
      message: is_draft ? `${savedVehicles.length} quote(s) saved as draft successfully` : `${savedVehicles.length} quote(s) submitted successfully`,
      data: savedVehicles
    });
    console.log('✅ Response sent successfully');

  } catch (error) {
    console.error('❌ Submit quote error:', error);
    console.error('Error stack:', error.stack);
    
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
      message: 'Error submitting quotes',
      error: error.message
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
          const emailHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Quote Withdrawn</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;padding:48px 16px;">
    <tr>
      <td align="center">

        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08),0 8px 32px rgba(0,0,0,0.06);">

          <tr>
            <td style="background:#1c1c1e;padding:44px 48px 40px;">
              <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:linear-gradient(135deg,#f97316,#ef4444);border-radius:10px;width:42px;height:42px;text-align:center;vertical-align:middle;font-size:20px;line-height:42px;">⚠️</td>
                  <td style="padding-left:12px;vertical-align:middle;font-size:18px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">Auto ERP - Tender Update</td>
                </tr>
              </table>
              <div style="display:inline-block;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.25);color:#ef4444;font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;padding:5px 14px;border-radius:100px;margin-bottom:16px;">Quote Update</div>
              <h1 style="margin:0;font-size:28px;font-weight:800;color:#ffffff;line-height:1.2;letter-spacing:-0.5px;">
                Quote<br/>
                <span style="color:#ef4444;">Withdrawn</span>
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding:40px 48px 0 48px;background:#ffffff;">

              <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#111827;">Hello ${admin.first_name || admin.email},</p>
              <p style="margin:0 0 30px;font-size:14px;color:#6b7280;line-height:1.75;">
                A dealership has withdrawn their quote for the tender below. The tender status has been updated.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:22px;">
                <tr>
                  <td style="background:linear-gradient(180deg,#f97316,#ef4444);width:4px;border-radius:4px 0 0 4px;"></td>
                  <td style="background:#fff7ed;border:1px solid #ffedd5;border-left:none;border-radius:0 14px 14px 0;padding:26px 26px 22px;">
                    <p style="margin:0 0 18px;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#d97706;">📋 Tender Details</p>

                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;"><tr>
                      <td style="font-size:11px;color:#6b7280;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;width:130px;vertical-align:middle;">Tender ID</td>
                      <td style="font-size:14px;color:#111827;font-weight:700;background:#fff;border:1px solid #fde68a;padding:6px 14px;border-radius:8px;">${tender.tender_id}</td>
                    </tr></table>

                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;"><tr>
                      <td style="font-size:11px;color:#6b7280;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;width:130px;vertical-align:middle;">Customer</td>
                      <td style="font-size:14px;color:#111827;font-weight:700;background:#fff;border:1px solid #fde68a;padding:6px 14px;border-radius:8px;">${tender.customer_info?.name || 'N/A'}</td>
                    </tr></table>

                    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                      <td style="font-size:11px;color:#6b7280;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;width:130px;vertical-align:middle;">Vehicle</td>
                      <td style="font-size:14px;color:#111827;font-weight:700;background:#fff;border:1px solid #fde68a;padding:6px 14px;border-radius:8px;">${tender.basic_vehicle_info?.make || ''} ${tender.basic_vehicle_info?.model || ''} ${tender.basic_vehicle_info?.year || ''}</td>
                    </tr></table>

                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:40px;">
                <tr><td align="center">
                  <a href="${frontendUrl}login" style="display:inline-block;background:linear-gradient(135deg,#f97316 0%,#ef4444 100%);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:17px 52px;border-radius:100px;letter-spacing:0.3px;">🔎 &nbsp; View Tender</a>
                </td></tr>
              </table>

            </td>
          </tr>

          <tr>
            <td style="background:#2a2a2c;padding:28px 48px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <p style="margin:0 0 3px;font-size:14px;font-weight:700;color:#f9fafb;">Auto ERP Team</p>
                    <p style="margin:0;font-size:12px;color:#9ca3af;">This is an automated message. Please do not reply directly.</p>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <span style="display:inline-block;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.18);color:#ef4444;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:5px 12px;border-radius:100px;">Notice</span>
                  </td>
                </tr>
              </table>
              <div style="height:1px;background:rgba(255,255,255,0.07);margin:20px 0;"></div>
              <p style="margin:0;font-size:11px;color:#6b7280;text-align:center;line-height:1.7;">© 2025 Auto ERP. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;

        await mailService.sendEmail({
          to: admin.email,
          subject: `Quote Withdrawn for Tender ${tender.tender_id}`,
          html: emailHtml
        });
      } catch (emailError) {
        console.error(`Failed to send email to ${admin.email}:`, emailError);
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
          const emailHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Order Accepted</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;padding:48px 16px;">
    <tr>
      <td align="center">

        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08),0 8px 32px rgba(0,0,0,0.06);">

          <tr>
            <td style="background:#1c1c1e;padding:44px 48px 40px;">
              <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:linear-gradient(135deg,#22c55e,#16a34a);border-radius:10px;width:42px;height:42px;text-align:center;vertical-align:middle;font-size:20px;line-height:42px;">✅</td>
                  <td style="padding-left:12px;vertical-align:middle;font-size:18px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">Auto ERP - Order Update</td>
                </tr>
              </table>
              <div style="display:inline-block;background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.35);color:#22c55e;font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;padding:5px 14px;border-radius:100px;margin-bottom:16px;">Order Update</div>
              <h1 style="margin:0;font-size:28px;font-weight:800;color:#ffffff;line-height:1.2;letter-spacing:-0.5px;">
                Order<br/>
                <span style="color:#22c55e;">Accepted</span>
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding:40px 48px 0 48px;background:#ffffff;">

              <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#111827;">Hello ${admin.first_name || admin.email},</p>
              <p style="margin:0 0 30px;font-size:14px;color:#6b7280;line-height:1.75;">
                The dealership has accepted the order associated with the tender below. See the key details.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:22px;">
                <tr>
                  <td style="background:linear-gradient(180deg,#22c55e,#16a34a);width:4px;border-radius:4px 0 0 4px;"></td>
                  <td style="background:#f0fdf4;border:1px solid #bbf7d0;border-left:none;border-radius:0 14px 14px 0;padding:26px 26px 22px;">
                    <p style="margin:0 0 18px;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#16a34a;">📋 Order Details</p>

                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;"><tr>
                      <td style="font-size:11px;color:#6b7280;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;width:130px;vertical-align:middle;">Tender ID</td>
                      <td style="font-size:14px;color:#111827;font-weight:700;background:#fff;border:1px solid #d1fae5;padding:6px 14px;border-radius:8px;">${tender?.tender_id || 'N/A'}</td>
                    </tr></table>

                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;"><tr>
                      <td style="font-size:11px;color:#6b7280;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;width:130px;vertical-align:middle;">Customer</td>
                      <td style="font-size:14px;color:#111827;font-weight:700;background:#fff;border:1px solid #d1fae5;padding:6px 14px;border-radius:8px;">${tender?.customer_info?.name || 'N/A'}</td>
                    </tr></table>

                    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                      <td style="font-size:11px;color:#6b7280;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;width:130px;vertical-align:middle;">Vehicle</td>
                      <td style="font-size:14px;color:#111827;font-weight:700;background:#fff;border:1px solid #d1fae5;padding:6px 14px;border-radius:8px;">${tenderVehicle.make} ${tenderVehicle.model} ${tenderVehicle.year}</td>
                    </tr></table>

                    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                      <td style="font-size:11px;color:#6b7280;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;width:130px;vertical-align:middle;">Quote Price</td>
                      <td><span style="display:inline-block;background:#fff;border:1px solid #d1fae5;color:#111827;font-size:13px;font-weight:700;padding:6px 14px;border-radius:8px;">${tenderVehicle.quote_price ? tenderVehicle.quote_price.toLocaleString() : 'N/A'}</span></td>
                    </tr></table>

                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:40px;">
                <tr><td align="center">
                  <a href="${frontendUrl}login" style="display:inline-block;background:linear-gradient(135deg,#22c55e 0%,#16a34a 100%);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:17px 52px;border-radius:100px;letter-spacing:0.3px;">📦 &nbsp; View Order</a>
                </td></tr>
              </table>

            </td>
          </tr>

          <tr>
            <td style="background:#2a2a2c;padding:28px 48px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <p style="margin:0 0 3px;font-size:14px;font-weight:700;color:#f9fafb;">Auto ERP Team</p>
                    <p style="margin:0;font-size:12px;color:#9ca3af;">This is an automated message. Please do not reply directly.</p>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <span style="display:inline-block;background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.25);color:#22c55e;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:5px 12px;border-radius:100px;">Secure Mail</span>
                  </td>
                </tr>
              </table>
              <div style="height:1px;background:rgba(255,255,255,0.07);margin:20px 0;"></div>
              <p style="margin:0;font-size:11px;color:#6b7280;text-align:center;line-height:1.7;">© 2025 Auto ERP. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;

        await mailService.sendEmail({
          to: admin.email,
          subject: `Order Accepted - Tender ${tender?.tender_id || 'N/A'}`,
          html: emailHtml
        });
      } catch (emailError) {
        console.error(`Failed to send email to ${admin.email}:`, emailError);
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
          const emailHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Order Delivered</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;padding:48px 16px;">
    <tr>
      <td align="center">

        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08),0 8px 32px rgba(0,0,0,0.06);">

          <tr>
            <td style="background:#1c1c1e;padding:44px 48px 40px;">
              <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:linear-gradient(135deg,#10b981,#059669);border-radius:10px;width:42px;height:42px;text-align:center;vertical-align:middle;font-size:20px;line-height:42px;">🚚</td>
                  <td style="padding-left:12px;vertical-align:middle;font-size:18px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">Auto ERP - Order Update</td>
                </tr>
              </table>
              <div style="display:inline-block;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.25);color:#10b981;font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;padding:5px 14px;border-radius:100px;margin-bottom:16px;">Order Update</div>
              <h1 style="margin:0;font-size:28px;font-weight:800;color:#ffffff;line-height:1.2;letter-spacing:-0.5px;">
                Order<br/>
                <span style="color:#10b981;">Delivered</span>
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding:40px 48px 0 48px;background:#ffffff;">

              <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#111827;">Hello ${admin.first_name || admin.email},</p>
              <p style="margin:0 0 30px;font-size:14px;color:#6b7280;line-height:1.75;">
                The dealership has marked the order as delivered. Below are the details for your reference.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:22px;">
                <tr>
                  <td style="background:linear-gradient(180deg,#10b981,#059669);width:4px;border-radius:4px 0 0 4px;"></td>
                  <td style="background:#ecfdf5;border:1px solid #bbf7d0;border-left:none;border-radius:0 14px 14px 0;padding:26px 26px 22px;">
                    <p style="margin:0 0 18px;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#059669;">📋 Delivery Details</p>

                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;"><tr>
                      <td style="font-size:11px;color:#6b7280;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;width:130px;vertical-align:middle;">Tender ID</td>
                      <td style="font-size:14px;color:#111827;font-weight:700;background:#fff;border:1px solid #d1fae5;padding:6px 14px;border-radius:8px;">${tender?.tender_id || 'N/A'}</td>
                    </tr></table>

                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;"><tr>
                      <td style="font-size:11px;color:#6b7280;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;width:130px;vertical-align:middle;">Customer</td>
                      <td style="font-size:14px;color:#111827;font-weight:700;background:#fff;border:1px solid #d1fae5;padding:6px 14px;border-radius:8px;">${tender?.customer_info?.name || 'N/A'}</td>
                    </tr></table>

                    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                      <td style="font-size:11px;color:#6b7280;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;width:130px;vertical-align:middle;">Vehicle</td>
                      <td style="font-size:14px;color:#111827;font-weight:700;background:#fff;border:1px solid #d1fae5;padding:6px 14px;border-radius:8px;">${tenderVehicle.make} ${tenderVehicle.model} ${tenderVehicle.year}</td>
                    </tr></table>

                    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                      <td style="font-size:11px;color:#6b7280;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;width:130px;vertical-align:middle;">Delivery Date</td>
                      <td><span style="display:inline-block;background:#fff;border:1px solid #d1fae5;color:#111827;font-size:13px;font-weight:700;padding:6px 14px;border-radius:8px;">${new Date().toLocaleDateString()}</span></td>
                    </tr></table>

                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:40px;">
                <tr><td align="center">
                  <a href="${frontendUrl}login" style="display:inline-block;background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:17px 52px;border-radius:100px;letter-spacing:0.3px;">📄 &nbsp; View Delivery</a>
                </td></tr>
              </table>

            </td>
          </tr>

          <tr>
            <td style="background:#2a2a2c;padding:28px 48px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <p style="margin:0 0 3px;font-size:14px;font-weight:700;color:#f9fafb;">Auto ERP Team</p>
                    <p style="margin:0;font-size:12px;color:#9ca3af;">This is an automated message. Please do not reply directly.</p>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <span style="display:inline-block;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.18);color:#10b981;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:5px 12px;border-radius:100px;">Info</span>
                  </td>
                </tr>
              </table>
              <div style="height:1px;background:rgba(255,255,255,0.07);margin:20px 0;"></div>
              <p style="margin:0;font-size:11px;color:#6b7280;text-align:center;line-height:1.7;">© 2025 Auto ERP. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;

        await mailService.sendEmail({
          to: admin.email,
          subject: `Order Delivered - Tender ${tender?.tender_id || 'N/A'}`,
          html: emailHtml
        });
      } catch (emailError) {
        console.error(`Failed to send email to ${admin.email}:`, emailError);
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
        const emailHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Order Aborted</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;padding:48px 16px;">
    <tr>
      <td align="center">

        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08),0 8px 32px rgba(0,0,0,0.06);">

          <tr>
            <td style="background:#1c1c1e;padding:44px 48px 40px;">
              <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:linear-gradient(135deg,#ef4444,#f97316);border-radius:10px;width:42px;height:42px;text-align:center;vertical-align:middle;font-size:20px;line-height:42px;">🛑</td>
                  <td style="padding-left:12px;vertical-align:middle;font-size:18px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">Auto ERP - Order Update</td>
                </tr>
              </table>
              <div style="display:inline-block;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.25);color:#ef4444;font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;padding:5px 14px;border-radius:100px;margin-bottom:16px;">Order Update</div>
              <h1 style="margin:0;font-size:28px;font-weight:800;color:#ffffff;line-height:1.2;letter-spacing:-0.5px;">
                Order<br/>
                <span style="color:#ef4444;">Aborted</span>
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding:40px 48px 0 48px;background:#ffffff;">

              <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#111827;">Hello ${admin.first_name || admin.email},</p>
              <p style="margin:0 0 30px;font-size:14px;color:#6b7280;line-height:1.75;">
                The dealership has aborted the order for the tender below. See details and the provided reason if available.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:22px;">
                <tr>
                  <td style="background:linear-gradient(180deg,#ef4444,#f97316);width:4px;border-radius:4px 0 0 4px;"></td>
                  <td style="background:#fff7ed;border:1px solid #ffedd5;border-left:none;border-radius:0 14px 14px 0;padding:26px 26px 22px;">
                    <p style="margin:0 0 18px;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#d97706;">📋 Order Details</p>

                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;"><tr>
                      <td style="font-size:11px;color:#6b7280;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;width:130px;vertical-align:middle;">Tender ID</td>
                      <td style="font-size:14px;color:#111827;font-weight:700;background:#fff;border:1px solid #fde68a;padding:6px 14px;border-radius:8px;">${tender?.tender_id || 'N/A'}</td>
                    </tr></table>

                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;"><tr>
                      <td style="font-size:11px;color:#6b7280;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;width:130px;vertical-align:middle;">Customer</td>
                      <td style="font-size:14px;color:#111827;font-weight:700;background:#fff;border:1px solid #fde68a;padding:6px 14px;border-radius:8px;">${tender?.customer_info?.name || 'N/A'}</td>
                    </tr></table>

                    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                      <td style="font-size:11px;color:#6b7280;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;width:130px;vertical-align:middle;">Vehicle</td>
                      <td style="font-size:14px;color:#111827;font-weight:700;background:#fff;border:1px solid #fde68a;padding:6px 14px;border-radius:8px;">${tenderVehicle.make} ${tenderVehicle.model} ${tenderVehicle.year}</td>
                    </tr></table>

                    ${reason ? `<p style="margin-top:12px;font-size:13px;color:#6b7280;"><strong>Reason:</strong> ${reason}</p>` : ''}

                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:40px;">
                <tr><td align="center">
                  <a href="${frontendUrl}login" style="display:inline-block;background:linear-gradient(135deg,#ef4444 0%,#f97316 100%);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:17px 52px;border-radius:100px;letter-spacing:0.3px;">⚠️ &nbsp; View Order Details</a>
                </td></tr>
              </table>

            </td>
          </tr>

          <tr>
            <td style="background:#2a2a2c;padding:28px 48px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <p style="margin:0 0 3px;font-size:14px;font-weight:700;color:#f9fafb;">Auto ERP Team</p>
                    <p style="margin:0;font-size:12px;color:#9ca3af;">This is an automated message. Please do not reply directly.</p>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <span style="display:inline-block;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.18);color:#ef4444;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:5px 12px;border-radius:100px;">Notice</span>
                  </td>
                </tr>
              </table>
              <div style="height:1px;background:rgba(255,255,255,0.07);margin:20px 0;"></div>
              <p style="margin:0;font-size:11px;color:#6b7280;text-align:center;line-height:1.7;">© 2025 Auto ERP. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;

        await mailService.sendEmail({
          to: admin.email,
          subject: `Order Aborted - Tender ${tender?.tender_id || 'N/A'}`,
          html: emailHtml
        });
      } catch (emailError) {
        console.error(`Failed to send email to ${admin.email}:`, emailError);
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

// @desc    Get quotes by status for dealership
// @route   GET /api/tender-dealership-auth/quotes
// @access  Private (Dealership User)
const getQuotesByStatus = async (req, res) => {
  try {
    const Tender = req.getModel('Tender');
    const TenderVehicle = req.getModel('TenderVehicle');
    const { page = 1, limit = 20, search, status } = req.query;
    const skip = (page - 1) * limit;

    // Build filter for sent_vehicle only (main quotes)
    let vehicleFilter = {
      tenderDealership_id: req.dealershipUser.tenderDealership_id,
      vehicle_type: 'sent_vehicle' // Only get sent vehicles for main list
    };

    // Filter by quote status if provided
    if (status && status !== 'all') {
      vehicleFilter.quote_status = status;
    } else {
      // For quotes, exclude order statuses
      vehicleFilter.quote_status = { 
        $in: ['Open', 'In Progress', 'Submitted', 'Withdrawn', 'Closed'] 
      };
    }

    // Get total count for pagination (only sent vehicles)
    const total = await TenderVehicle.countDocuments(vehicleFilter);

    // Get sent vehicle records
    const sentVehicles = await TenderVehicle.find(vehicleFilter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    if (sentVehicles.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        total: 0,
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

    // Get all alternate vehicles for these sent vehicles
    const sentVehicleIds = sentVehicles.map(sv => sv._id);
    const alternateVehicles = await TenderVehicle.find({
      parent_vehicle_id: { $in: sentVehicleIds },
      vehicle_type: 'alternate_vehicle'
    }).lean();

    // Create a map of parent_vehicle_id to alternate vehicles
    const alternatesByParent = {};
    alternateVehicles.forEach(av => {
      const parentId = av.parent_vehicle_id.toString();
      if (!alternatesByParent[parentId]) {
        alternatesByParent[parentId] = [];
      }
      alternatesByParent[parentId].push(av);
    });

    // Get tender IDs
    const tenderIds = sentVehicles.map(tv => tv.tender_id);

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

    // Combine tender and vehicle data with alternates
    const results = sentVehicles
      .map(sv => {
        const tender = tenderMap[sv.tender_id.toString()];
        if (!tender) return null;

        const alternates = alternatesByParent[sv._id.toString()] || [];

        return {
          ...tender,
          ...sv,
          _id: sv._id,
          tender_id: tender._id,// Use the tender_id string for display
          vehicle_id: sv._id,
          alternate_vehicles: alternates
        };
      })
      .filter(item => item !== null);

    res.status(200).json({
      success: true,
      data: results,
      total: total,
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
    console.error('Get quotes by status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving quotes'
    });
  }
};

// @desc    Get orders by status for dealership
// @route   GET /api/tender-dealership-auth/orders
// @access  Private (Dealership User)
const getOrdersByStatus = async (req, res) => {
  try {
    const Tender = req.getModel('Tender');
    const TenderVehicle = req.getModel('TenderVehicle');
    const { page = 1, limit = 20, search, status } = req.query;
    const skip = (page - 1) * limit;

    // Build filter for TenderVehicle
    let vehicleFilter = {
      tenderDealership_id: req.dealershipUser.tenderDealership_id,
    };

    // Filter by order status if provided
    if (status && status !== 'all') {
      vehicleFilter.quote_status = status;
    } else {
      // For orders, only include order statuses
      vehicleFilter.quote_status = { 
        $in: ['Order - Approved', 'Accepted', 'Delivered', 'Aborted'] 
      };
    }

    // Get total count for pagination
    const total = await TenderVehicle.countDocuments(vehicleFilter);

    // Get TenderVehicle records
    const tenderVehicles = await TenderVehicle.find(vehicleFilter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    if (tenderVehicles.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        total: 0,
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
          ...tv,
          _id: tv._id,
          tender_id: tender._id, // Keep the actual tender ID for API calls
          vehicle_id: tv._id,
        };
      })
      .filter(item => item !== null);

    res.status(200).json({
      success: true,
      data: results,
      total: total,
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
    console.error('Get orders by status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving orders'
    });
  }
};

module.exports = {
  dealershipLogin,
  getDealershipTenders,
  getDealershipTender,
  submitQuote,
  withdrawQuote,
  getQuotesByStatus,
  getOrdersByStatus,
  acceptOrder,
  deliverOrder,
  abortOrder,
};
