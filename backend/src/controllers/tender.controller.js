const User = require('../models/User');
const { logEvent } = require('./logs.controller');
const { createTenderHistory } = require('../utils/tenderHistory.utils');
const mailService = require('../config/mailer');

/**
 * Manually populate User fields from main DB for Tender documents
 * @param {Array|Object} items - Tender document(s) to populate
 * @returns {Array|Object} Populated items
 */
async function populateTenderUsers(items) {
  const isArray = Array.isArray(items);
  const itemsArray = isArray ? items : [items];
  
  if (itemsArray.length === 0) return items;

  // Collect all unique user IDs from created_by field
  const userIds = new Set();
  itemsArray.forEach(item => {
    if (item.created_by) {
      userIds.add(item.created_by.toString());
    }
  });

  if (userIds.size === 0) return items;

  // Fetch all users at once
  const users = await User.find(
    { _id: { $in: Array.from(userIds) } },
    'first_name last_name email'
  ).lean();

  // Create user lookup map
  const userMap = {};
  users.forEach(user => {
    userMap[user._id.toString()] = user;
  });

  // Populate items
  itemsArray.forEach(item => {
    if (item.created_by) {
      item.created_by = userMap[item.created_by.toString()] || item.created_by;
    }
  });

  return isArray ? itemsArray : itemsArray[0];
}

/**
 * Calculate response count for a tender
 * @param {ObjectId} tenderId - Tender ID
 * @param {Function} getModel - Function to get model from tenant context
 * @returns {String} Response count in "X/Y" format
 */
async function calculateResponseCount(tenderId, getModel) {
  const TenderVehicle = getModel('TenderVehicle');
  
  // Count total TenderVehicle records for this tender
  const totalRecipients = await TenderVehicle.countDocuments({
    tender_id: tenderId,
    vehicle_type: 'sent_vehicle'
  });
  
  // Count TenderVehicle records with status "Submitted"
  const submittedQuotes = await TenderVehicle.countDocuments({
    tender_id: tenderId,
    vehicle_type: 'sent_vehicle',
    quote_status: 'Submitted'
  });
  
  return `${submittedQuotes}/${totalRecipients}`;
}

// @desc    Get tenders with pagination, search, and status filter
// @route   GET /api/tender
// @access  Private (Company Admin)
const getTenders = async (req, res) => {
  try {
    const Tender = req.getModel('Tender');
    const { page = 1, limit = 10, search, status } = req.query;
    const skip = (page - 1) * limit;

    let filter = {
      company_id: req.user.company_id
    };

    // Handle status filter
    if (status && status !== 'all') {
      filter.tender_status = status;
    }

    if (search) {
      filter.$or = [
        { tender_id: { $regex: search, $options: 'i' } },
        { 'customer_info.name': { $regex: search, $options: 'i' } },
        { 'customer_info.email': { $regex: search, $options: 'i' } },
        { 'customer_info.phone': { $regex: search, $options: 'i' } },
        { 'basic_vehicle_info.make': { $regex: search, $options: 'i' } },
        { 'basic_vehicle_info.model': { $regex: search, $options: 'i' } },
        { 'basic_vehicle_info.year': { $regex: search, $options: 'i' } }
      ];
    }

    const tenders = await Tender.find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Manually populate User fields from main DB
    await populateTenderUsers(tenders);

    // Calculate response count for each tender
    for (let tender of tenders) {
      tender.response_count = await calculateResponseCount(tender._id, req.getModel);
    }

    const total = await Tender.countDocuments(filter);

    // Get stats
    const totalTenders = await Tender.countDocuments({ company_id: req.user.company_id });
    const pendingTenders = await Tender.countDocuments({ 
      company_id: req.user.company_id, 
      tender_status: 'Pending' 
    });
    const sentTenders = await Tender.countDocuments({ 
      company_id: req.user.company_id, 
      tender_status: 'Sent' 
    });
    const quoteReceivedTenders = await Tender.countDocuments({ 
      company_id: req.user.company_id, 
      tender_status: 'Quote Received' 
    });
    const approvedTenders = await Tender.countDocuments({ 
      company_id: req.user.company_id, 
      tender_status: 'Approved' 
    });
    const closedTenders = await Tender.countDocuments({ 
      company_id: req.user.company_id, 
      tender_status: 'Closed' 
    });

    res.status(200).json({
      success: true,
      data: tenders,
      stats: {
        totalTenders,
        pendingTenders,
        sentTenders,
        quoteReceivedTenders,
        approvedTenders,
        closedTenders
      },
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
    console.error('Get tenders error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving tenders'
    });
  }
};

// @desc    Get single tender by ID with response count
// @route   GET /api/tender/:id
// @access  Private (Company Admin)
const getTender = async (req, res) => {
  try {
    const Tender = req.getModel('Tender');
    const tender = await Tender.findOne({
      _id: req.params.id,
      company_id: req.user.company_id
    }).lean();

    if (!tender) {
      return res.status(404).json({
        success: false,
        message: 'Tender not found'
      });
    }

    // Manually populate User fields from main DB
    await populateTenderUsers(tender);

    // Calculate response count
    tender.response_count = await calculateResponseCount(tender._id, req.getModel);

    res.status(200).json({
      success: true,
      data: tender
    });

  } catch (error) {
    console.error('Get tender error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving tender'
    });
  }
};

// @desc    Create new tender with validation
// @route   POST /api/tender
// @access  Private (Company Admin)
const createTender = async (req, res) => {
  try {
    const Tender = req.getModel('Tender');
    
    // Validate required fields
    const { customer_info, basic_vehicle_info, tender_expiry_time } = req.body;
    
    const errors = [];
    
    if (!customer_info || !customer_info.name) {
      errors.push({ field: 'customer_info.name', message: 'Customer name is required' });
    }
    if (!customer_info || !customer_info.email) {
      errors.push({ field: 'customer_info.email', message: 'Customer email is required' });
    }
    if (!basic_vehicle_info || !basic_vehicle_info.make) {
      errors.push({ field: 'basic_vehicle_info.make', message: 'Vehicle make is required' });
    }
    if (!basic_vehicle_info || !basic_vehicle_info.model) {
      errors.push({ field: 'basic_vehicle_info.model', message: 'Vehicle model is required' });
    }
    if (!basic_vehicle_info || !basic_vehicle_info.year) {
      errors.push({ field: 'basic_vehicle_info.year', message: 'Vehicle year is required' });
    }
    if (!tender_expiry_time) {
      errors.push({ field: 'tender_expiry_time', message: 'Tender expiry time is required' });
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    // Validate expiry time is in the future
    const expiryDate = new Date(tender_expiry_time);
    const now = new Date();
    
    if (expiryDate <= now) {
      return res.status(400).json({
        success: false,
        message: 'Tender expiry time must be in the future',
        code: 'PAST_EXPIRY_DATE',
        errors: [
          { field: 'tender_expiry_time', message: 'Expiry time must be in the future' }
        ]
      });
    }

    // Create tender data
    const tenderData = {
      customer_info: req.body.customer_info,
      basic_vehicle_info: req.body.basic_vehicle_info,
      tender_expiry_time: req.body.tender_expiry_time,
      company_id: req.user.company_id,
      created_by: req.user.id,
      tender_status: 'Pending'
    };

    const tender = await Tender.create(tenderData);

    // Create history record for tender creation
    await createTenderHistory({
      tender_id: tender._id,
      action_type: 'created',
      old_status: null,
      new_status: 'Pending',
      performed_by: req.user.id,
      performed_by_type: 'admin',
      notes: `Tender created: ${tender.tender_id}`,
      metadata: {
        customer_name: tender.customer_info.name,
        vehicle: `${tender.basic_vehicle_info.make} ${tender.basic_vehicle_info.model} ${tender.basic_vehicle_info.year}`
      }
    }, req.getModel);

    // Log event
    await logEvent({
      user_id: req.user.id,
      company_id: req.user.company_id,
      action: 'CREATE',
      resource_type: 'Tender',
      resource_id: tender._id,
      description: `Created tender: ${tender.tender_id}`,
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    res.status(201).json({
      success: true,
      message: 'Tender created successfully',
      data: tender
    });

  } catch (error) {
    console.error('Create tender error:', error);
    
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
      message: 'Error creating tender'
    });
  }
};

// @desc    Update tender with validation
// @route   PUT /api/tender/:id
// @access  Private (Company Admin)
const updateTender = async (req, res) => {
  try {
    const Tender = req.getModel('Tender');
    
    // Find tender
    const tender = await Tender.findOne({
      _id: req.params.id,
      company_id: req.user.company_id
    });

    if (!tender) {
      return res.status(404).json({
        success: false,
        message: 'Tender not found'
      });
    }

    // Validate expiry time if being updated
    if (req.body.tender_expiry_time) {
      const expiryDate = new Date(req.body.tender_expiry_time);
      const now = new Date();
      
      if (expiryDate <= now) {
        return res.status(400).json({
          success: false,
          message: 'Tender expiry time must be in the future',
          code: 'PAST_EXPIRY_DATE',
          errors: [
            { field: 'tender_expiry_time', message: 'Expiry time must be in the future' }
          ]
        });
      }
    }

    // Update fields
    const allowedUpdates = [
      'customer_info', 'basic_vehicle_info', 'tender_expiry_time'
    ];
    
    const oldStatus = tender.tender_status;
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        tender[field] = req.body[field];
      }
    });

    await tender.save();

    // Create history record for tender update
    await createTenderHistory({
      tender_id: tender._id,
      action_type: 'updated',
      old_status: oldStatus,
      new_status: tender.tender_status,
      performed_by: req.user.id,
      performed_by_type: 'admin',
      notes: `Tender updated: ${tender.tender_id}`,
      metadata: {
        updated_fields: Object.keys(req.body).filter(key => allowedUpdates.includes(key))
      }
    }, req.getModel);

    // Log event
    await logEvent({
      user_id: req.user.id,
      company_id: req.user.company_id,
      action: 'UPDATE',
      resource_type: 'Tender',
      resource_id: tender._id,
      description: `Updated tender: ${tender.tender_id}`,
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: 'Tender updated successfully',
      data: tender
    });

  } catch (error) {
    console.error('Update tender error:', error);
    
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
      message: 'Error updating tender'
    });
  }
};

// @desc    Delete tender (permanent deletion)
// @route   DELETE /api/tender/:id
// @access  Private (Company Admin)
const deleteTender = async (req, res) => {
  try {
    const Tender = req.getModel('Tender');
    const TenderVehicle = req.getModel('TenderVehicle');
    const TenderHistory = req.getModel('TenderHistory');
    const TenderNotification = req.getModel('TenderNotification');
    
    // Find tender
    const tender = await Tender.findOne({
      _id: req.params.id,
      company_id: req.user.company_id
    });

    if (!tender) {
      return res.status(404).json({
        success: false,
        message: 'Tender not found'
      });
    }

    // Delete all associated data (cascade deletion)
    await TenderVehicle.deleteMany({ tender_id: tender._id });
    await TenderHistory.deleteMany({ tender_id: tender._id });
    await TenderNotification.deleteMany({ tender_id: tender._id });

    // Delete tender
    await Tender.deleteOne({ _id: tender._id });

    // Log event
    await logEvent({
      user_id: req.user.id,
      company_id: req.user.company_id,
      action: 'DELETE',
      resource_type: 'Tender',
      resource_id: tender._id,
      description: `Deleted tender: ${tender.tender_id}`,
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: 'Tender and associated data deleted successfully'
    });

  } catch (error) {
    console.error('Delete tender error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting tender'
    });
  }
};

// @desc    Toggle tender status (active/inactive)
// @route   PATCH /api/tender/:id/status
// @access  Private (Company Admin)
const toggleTenderStatus = async (req, res) => {
  try {
    const Tender = req.getModel('Tender');
    
    // Find tender
    const tender = await Tender.findOne({
      _id: req.params.id,
      company_id: req.user.company_id
    });

    if (!tender) {
      return res.status(404).json({
        success: false,
        message: 'Tender not found'
      });
    }

    // Toggle status
    const oldActiveStatus = tender.isActive;
    tender.isActive = !tender.isActive;
    await tender.save();

    // Create history record for status toggle
    await createTenderHistory({
      tender_id: tender._id,
      action_type: tender.isActive ? 'activated' : 'deactivated',
      old_status: tender.tender_status,
      new_status: tender.tender_status,
      performed_by: req.user.id,
      performed_by_type: 'admin',
      notes: `Tender ${tender.isActive ? 'activated' : 'deactivated'}: ${tender.tender_id}`,
      metadata: {
        old_active_status: oldActiveStatus,
        new_active_status: tender.isActive
      }
    }, req.getModel);

    // Log event
    await logEvent({
      user_id: req.user.id,
      company_id: req.user.company_id,
      action: 'UPDATE',
      resource_type: 'Tender',
      resource_id: tender._id,
      description: `${tender.isActive ? 'Activated' : 'Deactivated'} tender: ${tender.tender_id}`,
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: `Tender ${tender.isActive ? 'activated' : 'deactivated'} successfully`,
      data: tender
    });

  } catch (error) {
    console.error('Toggle tender status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error toggling tender status'
    });
  }
};

// @desc    Send tender to selected dealerships
// @route   POST /api/tender/:id/send
// @access  Private (Company Admin)
const sendTender = async (req, res) => {
  try {
    const Tender = req.getModel('Tender');
    const TenderDealership = req.getModel('TenderDealership');
    const TenderVehicle = req.getModel('TenderVehicle');
    const TenderHistory = req.getModel('TenderHistory');
    const TenderNotification = req.getModel('TenderNotification');
    const TenderDealershipUser = req.getModel('TenderDealershipUser');
    
    const { dealership_ids } = req.body;
    
    // Validate input
    if (!dealership_ids || !Array.isArray(dealership_ids) || dealership_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of dealership IDs',
        errors: [
          { field: 'dealership_ids', message: 'Dealership IDs array is required' }
        ]
      });
    }
    
    // Find tender
    const tender = await Tender.findOne({
      _id: req.params.id,
      company_id: req.user.company_id
    });

    if (!tender) {
      return res.status(404).json({
        success: false,
        message: 'Tender not found'
      });
    }

    // Get all active dealerships from the provided IDs
    const activeDealerships = await TenderDealership.find({
      _id: { $in: dealership_ids },
      company_id: req.user.company_id,
      isActive: true
    });

    if (activeDealerships.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No active dealerships found from the provided IDs'
      });
    }

    // Get dealerships that already received this tender
    const existingRecipients = await TenderVehicle.find({
      tender_id: tender._id,
      vehicle_type: 'sent_vehicle'
    }).distinct('tenderDealership_id');

    // Filter out dealerships that already received the tender
    const newRecipients = activeDealerships.filter(
      dealership => !existingRecipients.some(
        existingId => existingId.toString() === dealership._id.toString()
      )
    );

    if (newRecipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'All selected dealerships have already received this tender'
      });
    }

    // Create TenderVehicle records for each new recipient
    const tenderVehicles = [];
    for (const dealership of newRecipients) {
      const tenderVehicle = await TenderVehicle.create({
        tender_id: tender._id,
        tenderDealership_id: dealership._id,
        vehicle_type: 'sent_vehicle',
        make: tender.basic_vehicle_info.make,
        model: tender.basic_vehicle_info.model,
        year: tender.basic_vehicle_info.year,
        variant: tender.basic_vehicle_info.variant,
        body_style: tender.basic_vehicle_info.body_style,
        color: tender.basic_vehicle_info.color,
        quote_status: 'Open'
      });
      tenderVehicles.push(tenderVehicle);
    }

    // Update tender status to "Sent"
    tender.tender_status = 'Sent';
    await tender.save();

    // Create history records for each send
    const historyRecords = [];
    for (const dealership of newRecipients) {
      const history = await TenderHistory.create({
        tender_id: tender._id,
        tenderDealership_id: dealership._id,
        action_type: 'sent',
        old_status: 'Pending',
        new_status: 'Sent',
        performed_by: req.user.id,
        performed_by_type: 'admin',
        notes: `Tender sent to ${dealership.dealership_name}`,
        metadata: {
          dealership_name: dealership.dealership_name,
          dealership_email: dealership.email
        }
      });
      historyRecords.push(history);
    }

    // Create notifications for each dealership
    const notifications = [];
    for (const dealership of newRecipients) {
      // Get all users for this dealership
      const dealershipUsers = await TenderDealershipUser.find({
        tenderDealership_id: dealership._id,
        company_id: req.user.company_id,
        isActive: true
      });

      // Create notification for each user
      for (const user of dealershipUsers) {
        const notification = await TenderNotification.create({
          recipient_id: user._id,
          recipient_type: 'dealership_user',
          tender_id: tender._id,
          notification_type: 'tender_sent',
          message: `New tender request: ${tender.tender_id} for ${tender.basic_vehicle_info.make} ${tender.basic_vehicle_info.model}`
        });
        notifications.push(notification);
      }
    }

    // Send email notifications to dealership users
    const mailService = require('../config/mailer');
    for (const dealership of newRecipients) {
      // Get all users for this dealership
      const dealershipUsers = await TenderDealershipUser.find({
        tenderDealership_id: dealership._id,
        company_id: req.user.company_id,
        isActive: true
      });

      // Send email to each user
      for (const user of dealershipUsers) {
        try {
          const emailHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>New Tender Request</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;padding:48px 16px;">
    <tr>
      <td align="center">

        <!-- Email Card -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08),0 8px 32px rgba(0,0,0,0.06);">

          <!-- HEADER -->
          <tr>
            <td style="background:#1c1c1e;padding:44px 48px 40px;">
              <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:linear-gradient(135deg,#22c55e,#16a34a);border-radius:10px;width:42px;height:42px;text-align:center;vertical-align:middle;font-size:20px;line-height:42px;">🚗</td>
                  <td style="padding-left:12px;vertical-align:middle;font-size:18px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">Auto ERP - Complete Vehicle Management Solution</td>
                </tr>
              </table>
              <div style="display:inline-block;background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.35);color:#22c55e;font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;padding:5px 14px;border-radius:100px;margin-bottom:16px;">New Request</div>
              <h1 style="margin:0;font-size:28px;font-weight:800;color:#ffffff;line-height:1.2;letter-spacing:-0.5px;">
                New Tender<br/>
                <span style="color:#22c55e;">Request Received</span>
              </h1>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:40px 48px 0 48px;background:#ffffff;">

              <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#111827;">Hello ${user.username},</p>
              <p style="margin:0 0 30px;font-size:14px;color:#6b7280;line-height:1.75;">
                You have received a <strong style="color:#111827;">new tender request</strong>. Please review the details below and submit your quote before the expiry time.
              </p>

              <!-- Tender Details Box -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:22px;">
                <tr>
                  <td style="background:linear-gradient(180deg,#22c55e,#16a34a);width:4px;border-radius:4px 0 0 4px;"></td>
                  <td style="background:#f0fdf4;border:1px solid #bbf7d0;border-left:none;border-radius:0 14px 14px 0;padding:26px 26px 22px;">
                    <p style="margin:0 0 18px;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#16a34a;">📋 Tender Details</p>

                    <!-- Tender ID -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;"><tr>
                      <td style="font-size:11px;color:#6b7280;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;width:130px;vertical-align:middle;">Tender ID</td>
                      <td style="font-size:14px;color:#111827;font-weight:700;font-family:'Courier New',monospace;background:#fff;border:1px solid #d1fae5;padding:6px 14px;border-radius:8px;">${tender.tender_id}</td>
                    </tr></table>

                    <!-- Customer -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;"><tr>
                      <td style="font-size:11px;color:#6b7280;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;width:130px;vertical-align:middle;">Customer</td>
                      <td style="font-size:14px;color:#111827;font-weight:700;background:#fff;border:1px solid #d1fae5;padding:6px 14px;border-radius:8px;">${tender.customer_info.name}</td>
                    </tr></table>

                    <!-- Vehicle -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;"><tr>
                      <td style="font-size:11px;color:#6b7280;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;width:130px;vertical-align:middle;">Vehicle</td>
                      <td style="font-size:14px;color:#111827;font-weight:700;background:#fff;border:1px solid #d1fae5;padding:6px 14px;border-radius:8px;">${tender.basic_vehicle_info.make} ${tender.basic_vehicle_info.model} ${tender.basic_vehicle_info.year}</td>
                    </tr></table>

                    <!-- Expiry -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                      <td style="font-size:11px;color:#6b7280;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;width:130px;vertical-align:middle;">Expiry</td>
                      <td>
                        <span style="display:inline-block;background:#fef3c7;border:1px solid #fde68a;color:#b45309;font-size:13px;font-weight:700;padding:6px 14px;border-radius:8px;">⏰ ${new Date(tender.tender_expiry_time).toLocaleString()}</span>
                      </td>
                    </tr></table>

                  </td>
                </tr>
              </table>

              <!-- Action Notice -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;margin-bottom:30px;">
                <tr><td style="padding:14px 18px;font-size:13px;color:#15803d;line-height:1.6;">
                  <strong>✅ Action Required:</strong> Log in to the dealership portal to view full details and <strong>submit your quote</strong> before the tender expires.
                </td></tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:40px;">
                <tr><td align="center">
                  <a href="${frontendUrl}/login" style="display:inline-block;background:linear-gradient(135deg,#22c55e 0%,#16a34a 100%);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:17px 52px;border-radius:100px;letter-spacing:0.3px;box-shadow:0 8px 20px rgba(34,197,94,0.35);">
                    📝 &nbsp; View Tender &amp; Submit Quote
                  </a>
                </td></tr>
              </table>

            </td>
          </tr>

          <!-- FOOTER -->
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
              <p style="margin:0;font-size:11px;color:#6b7280;text-align:center;line-height:1.7;">
                © 2025 Auto ERP. All rights reserved.&nbsp;|&nbsp;
                <a href="#" style="color:#22c55e;text-decoration:none;">Privacy Policy</a>&nbsp;|&nbsp;
                <a href="#" style="color:#22c55e;text-decoration:none;">Support</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html> `;

          await mailService.sendEmail({
            to: user.email,
            subject: `New Tender Request: ${tender.tender_id}`,
            html: emailHtml
          });
        } catch (emailError) {
          console.error(`Failed to send email to ${user.email}:`, emailError);
          // Continue with other emails even if one fails
        }
      }
    }

    // Log event
    await logEvent({
      user_id: req.user.id,
      company_id: req.user.company_id,
      action: 'SEND',
      resource_type: 'Tender',
      resource_id: tender._id,
      description: `Sent tender ${tender.tender_id} to ${newRecipients.length} dealership(s)`,
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: `Tender sent to ${newRecipients.length} dealership(s) successfully`,
      data: {
        tender_id: tender._id,
        tender_status: tender.tender_status,
        recipients_count: newRecipients.length,
        recipients: newRecipients.map(d => ({
          id: d._id,
          name: d.dealership_name,
          email: d.email
        }))
      }
    });

  } catch (error) {
    console.error('Send tender error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending tender'
    });
  }
};

// @desc    Get all dealerships that received the tender
// @route   GET /api/tender/:id/recipients
// @access  Private (Company Admin)
const getTenderRecipients = async (req, res) => {
  try {
    const Tender = req.getModel('Tender');
    const TenderDealership = req.getModel('TenderDealership');
    const TenderVehicle = req.getModel('TenderVehicle');
    
    // Find tender
    const tender = await Tender.findOne({
      _id: req.params.id,
      company_id: req.user.company_id
    });

    if (!tender) {
      return res.status(404).json({
        success: false,
        message: 'Tender not found'
      });
    }

    // Get all TenderVehicle records for this tender (sent_vehicle type only)
    const tenderVehicles = await TenderVehicle.find({
      tender_id: tender._id,
      vehicle_type: 'sent_vehicle'
    }).lean();

    if (tenderVehicles.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        message: 'No dealerships have received this tender yet'
      });
    }

    // Get dealership IDs
    const dealershipIds = tenderVehicles.map(tv => tv.tenderDealership_id);

    // Get dealership details
    const dealerships = await TenderDealership.find({
      _id: { $in: dealershipIds },
      company_id: req.user.company_id
    }).lean();

    // Create a map of dealership ID to dealership data
    const dealershipMap = {};
    dealerships.forEach(d => {
      dealershipMap[d._id.toString()] = d;
    });

    // Build response with quote status and response date
    const recipients = tenderVehicles.map(tv => {
      const dealership = dealershipMap[tv.tenderDealership_id.toString()];
      
      return {
        dealership_id: tv.tenderDealership_id,
        dealership_name: dealership ? dealership.dealership_name : 'Unknown',
        dealership_email: dealership ? dealership.email : '',
        quote_status: tv.quote_status,
        quote_price: tv.quote_price,
        response_date: tv.submitted_at || null,
        vehicle_id: tv._id,
        created_at: tv.created_at
      };
    });

    res.status(200).json({
      success: true,
      data: recipients
    });

  } catch (error) {
    console.error('Get tender recipients error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving tender recipients'
    });
  }
};

// @desc    Get available dealerships for sending tender
// @route   GET /api/tender/:id/available-dealerships
// @access  Private (Company Admin)
const getAvailableDealerships = async (req, res) => {
  try {
    const Tender = req.getModel('Tender');
    const TenderDealership = req.getModel('TenderDealership');
    const TenderVehicle = req.getModel('TenderVehicle');
    
    // Find tender
    const tender = await Tender.findOne({
      _id: req.params.id,
      company_id: req.user.company_id
    });

    if (!tender) {
      return res.status(404).json({
        success: false,
        message: 'Tender not found'
      });
    }

    // Get all active dealerships for this company
    const allDealerships = await TenderDealership.find({
      company_id: req.user.company_id,
      isActive: true
    }).lean();

    // Get dealerships that already received this tender
    const existingRecipients = await TenderVehicle.find({
      tender_id: tender._id,
      vehicle_type: 'sent_vehicle'
    }).distinct('tenderDealership_id');

    // Convert to strings for comparison
    const existingRecipientIds = existingRecipients.map(id => id.toString());

    // Filter out dealerships that already received the tender
    const availableDealerships = allDealerships.filter(
      dealership => !existingRecipientIds.includes(dealership._id.toString())
    );

    res.status(200).json({
      success: true,
      data: availableDealerships.map(d => ({
        id: d._id,
        tenderDealership_id: d.tenderDealership_id,
        dealership_name: d.dealership_name,
        email: d.email,
        address: d.address,
        brand_or_make: d.brand_or_make,
        dp_name: d.dp_name,
        hubRecID: d.hubRecID
      }))
    });

  } catch (error) {
    console.error('Get available dealerships error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving available dealerships'
    });
  }
};

// @desc    Get tender history with user information
// @route   GET /api/tender/:id/history
// @access  Private (Company Admin)
const getTenderHistory = async (req, res) => {
  try {
    const Tender = req.getModel('Tender');
    const TenderHistory = req.getModel('TenderHistory');
    const TenderDealershipUser = req.getModel('TenderDealershipUser');
    
    // Find tender
    const tender = await Tender.findOne({
      _id: req.params.id,
      company_id: req.user.company_id
    });

    if (!tender) {
      return res.status(404).json({
        success: false,
        message: 'Tender not found'
      });
    }

    // Get all history records for this tender, sorted by created_at descending
    const historyRecords = await TenderHistory.find({
      tender_id: tender._id
    })
    .sort({ created_at: -1 })
    .lean();

    if (historyRecords.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        message: 'No history records found for this tender'
      });
    }

    // Collect all unique user IDs from performed_by field
    const adminUserIds = new Set();
    const dealershipUserIds = new Set();
    
    historyRecords.forEach(record => {
      if (record.performed_by) {
        if (record.performed_by_type === 'admin') {
          adminUserIds.add(record.performed_by.toString());
        } else if (record.performed_by_type === 'dealership_user') {
          dealershipUserIds.add(record.performed_by.toString());
        }
      }
    });

    // Fetch admin users from main database
    const adminUsers = await User.find(
      { _id: { $in: Array.from(adminUserIds) } },
      'first_name last_name email username'
    ).lean();

    // Fetch dealership users from company database
    const dealershipUsers = await TenderDealershipUser.find(
      { _id: { $in: Array.from(dealershipUserIds) } },
      'username email'
    ).lean();

    // Create user lookup maps
    const adminUserMap = {};
    adminUsers.forEach(user => {
      adminUserMap[user._id.toString()] = {
        name: `${user.first_name} ${user.last_name || ''}`.trim(),
        email: user.email,
        username: user.username,
        type: 'admin'
      };
    });

    const dealershipUserMap = {};
    dealershipUsers.forEach(user => {
      dealershipUserMap[user._id.toString()] = {
        name: user.username,
        email: user.email,
        username: user.username,
        type: 'dealership_user'
      };
    });

    // Populate history records with user information
    const populatedHistory = historyRecords.map(record => {
      const userId = record.performed_by.toString();
      let performedByInfo = null;

      if (record.performed_by_type === 'admin') {
        performedByInfo = adminUserMap[userId] || {
          name: 'Unknown Admin',
          email: '',
          username: '',
          type: 'admin'
        };
      } else if (record.performed_by_type === 'dealership_user') {
        performedByInfo = dealershipUserMap[userId] || {
          name: 'Unknown Dealership User',
          email: '',
          username: '',
          type: 'dealership_user'
        };
      }

      return {
        ...record,
        performed_by_info: performedByInfo
      };
    });

    res.status(200).json({
      success: true,
      data: populatedHistory
    });

  } catch (error) {
    console.error('Get tender history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving tender history'
    });
  }
};

// @desc    Approve a quote and create order
// @route   POST /api/tender/:id/approve-quote
// @access  Private (Company Admin)
const approveQuote = async (req, res) => {
  try {
    const Tender = req.getModel('Tender');
    const TenderVehicle = req.getModel('TenderVehicle');
    const TenderHistory = req.getModel('TenderHistory');
    const TenderNotification = req.getModel('TenderNotification');
    const TenderDealership = req.getModel('TenderDealership');
    const TenderDealershipUser = req.getModel('TenderDealershipUser');
    
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
      company_id: req.user.company_id
    });

    if (!tender) {
      return res.status(404).json({
        success: false,
        message: 'Tender not found'
      });
    }

    // Find the vehicle/quote to approve
    const approvedVehicle = await TenderVehicle.findOne({
      _id: vehicle_id,
      tender_id: tender._id
    });

    if (!approvedVehicle) {
      return res.status(404).json({
        success: false,
        message: 'Quote not found'
      });
    }

    // Verify quote is in Submitted status
    if (approvedVehicle.quote_status !== 'Submitted') {
      return res.status(400).json({
        success: false,
        message: `Cannot approve quote with status: ${approvedVehicle.quote_status}`,
        code: 'INVALID_STATUS'
      });
    }

    // Update approved quote status to "Order - Approved"
    const oldApprovedStatus = approvedVehicle.quote_status;
    approvedVehicle.quote_status = 'Order - Approved';
    await approvedVehicle.save();

    // Update tender status to "Approved"
    const oldTenderStatus = tender.tender_status;
    tender.tender_status = 'Approved';
    await tender.save();

    // Update all other quotes for this tender to "Closed"
    await TenderVehicle.updateMany(
      {
        tender_id: tender._id,
        _id: { $ne: vehicle_id }
      },
      {
        $set: { quote_status: 'Closed' }
      }
    );

    // Get the winning dealership
    const winningDealership = await TenderDealership.findById(approvedVehicle.tenderDealership_id);

    // Create history record for approval
    await createTenderHistory({
      tender_id: tender._id,
      tenderDealership_id: approvedVehicle.tenderDealership_id,
      action_type: 'approved',
      old_status: oldTenderStatus,
      new_status: 'Approved',
      performed_by: req.user.id,
      performed_by_type: 'admin',
      notes: `Quote approved for ${winningDealership?.dealership_name || 'dealership'}`,
      metadata: {
        approved_vehicle_id: approvedVehicle._id,
        quote_price: approvedVehicle.quote_price,
        vehicle_type: approvedVehicle.vehicle_type,
        vehicle_details: `${approvedVehicle.make} ${approvedVehicle.model} ${approvedVehicle.year}`
      }
    }, req.getModel);

    // Get all dealerships that received this tender
    const allTenderVehicles = await TenderVehicle.find({
      tender_id: tender._id,
      vehicle_type: 'sent_vehicle'
    }).distinct('tenderDealership_id');

    // Send notifications to all dealerships
    for (const dealershipId of allTenderVehicles) {
      const isWinner = dealershipId.toString() === approvedVehicle.tenderDealership_id.toString();
      
      // Get all users for this dealership
      const dealershipUsers = await TenderDealershipUser.find({
        tenderDealership_id: dealershipId,
        company_id: req.user.company_id,
        isActive: true
      });

      const dealership = await TenderDealership.findById(dealershipId);

      // Create notifications and send emails
      for (const user of dealershipUsers) {
        // Create notification
        await TenderNotification.create({
          recipient_id: user._id,
          recipient_type: 'dealership_user',
          tender_id: tender._id,
          notification_type: isWinner ? 'quote_approved' : 'quote_rejected',
          message: isWinner 
            ? `Your quote for tender ${tender.tender_id} has been approved!`
            : `Tender ${tender.tender_id} has been awarded to another dealership`
        });

        // Send email notification
        try {
          const emailHtml = isWinner ? `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Quote Approved</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08),0 8px 32px rgba(0,0,0,0.06);">

          <!-- HEADER -->
          <tr>
            <td style="background:#1c1c1e;padding:44px 48px 40px;">
              <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:linear-gradient(135deg,#22c55e,#16a34a);border-radius:10px;width:42px;height:42px;text-align:center;vertical-align:middle;font-size:20px;line-height:42px;">🚗</td>
                  <td style="padding-left:12px;vertical-align:middle;font-size:18px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">Auto ERP - Complete Vehicle Management Solution</td>
                </tr>
              </table>
              <div style="display:inline-block;background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.35);color:#22c55e;font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;padding:5px 14px;border-radius:100px;margin-bottom:16px;">🎉 Quote Approved</div>
              <h1 style="margin:0;font-size:28px;font-weight:800;color:#ffffff;line-height:1.2;letter-spacing:-0.5px;">
                Congratulations!<br/>
                <span style="color:#22c55e;">Your Quote is Approved</span>
              </h1>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:40px 48px 0 48px;background:#ffffff;">

              <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#111827;">Hello ${user.username},</p>
              <p style="margin:0 0 30px;font-size:14px;color:#6b7280;line-height:1.75;">
                Great news! Your quote for the following tender has been <strong style="color:#16a34a;">approved</strong>. This quote has been converted to an order — please log in to accept and proceed with delivery.
              </p>

              <!-- Details Box -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:22px;">
                <tr>
                  <td style="background:linear-gradient(180deg,#22c55e,#16a34a);width:4px;border-radius:4px 0 0 4px;"></td>
                  <td style="background:#f0fdf4;border:1px solid #bbf7d0;border-left:none;border-radius:0 14px 14px 0;padding:26px 26px 22px;">
                    <p style="margin:0 0 18px;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#16a34a;">📋 Approved Tender Details</p>

                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;"><tr>
                      <td style="font-size:11px;color:#6b7280;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;width:140px;vertical-align:middle;">Tender ID</td>
                      <td style="font-size:14px;color:#111827;font-weight:700;font-family:'Courier New',monospace;background:#fff;border:1px solid #d1fae5;padding:6px 14px;border-radius:8px;">${tender.tender_id}</td>
                    </tr></table>

                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;"><tr>
                      <td style="font-size:11px;color:#6b7280;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;width:140px;vertical-align:middle;">Customer</td>
                      <td style="font-size:14px;color:#111827;font-weight:700;background:#fff;border:1px solid #d1fae5;padding:6px 14px;border-radius:8px;">${tender.customer_info.name}</td>
                    </tr></table>

                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;"><tr>
                      <td style="font-size:11px;color:#6b7280;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;width:140px;vertical-align:middle;">Vehicle</td>
                      <td style="font-size:14px;color:#111827;font-weight:700;background:#fff;border:1px solid #d1fae5;padding:6px 14px;border-radius:8px;">${approvedVehicle.make} ${approvedVehicle.model} ${approvedVehicle.year}</td>
                    </tr></table>

                    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                      <td style="font-size:11px;color:#6b7280;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;width:140px;vertical-align:middle;">Approved Price</td>
                      <td>
                        <span style="display:inline-block;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;font-size:15px;font-weight:800;padding:7px 18px;border-radius:8px;letter-spacing:0.3px;">💰 ${approvedVehicle.quote_price?.toLocaleString() || 'N/A'}</span>
                      </td>
                    </tr></table>
                  </td>
                </tr>
              </table>

              <!-- Action Notice -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;margin-bottom:30px;">
                <tr><td style="padding:14px 18px;font-size:13px;color:#15803d;line-height:1.6;">
                  <strong>✅ Next Step:</strong> Log in to the dealership portal to <strong>accept the order</strong> and proceed with delivery arrangements.
                </td></tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:40px;">
                <tr><td align="center">
                  <a href="${frontendUrl}/login" style="display:inline-block;background:linear-gradient(135deg,#22c55e 0%,#16a34a 100%);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:17px 52px;border-radius:100px;letter-spacing:0.3px;box-shadow:0 8px 20px rgba(34,197,94,0.35);">
                    🚀 &nbsp; Accept Order &amp; Proceed
                  </a>
                </td></tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
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
              <p style="margin:0;font-size:11px;color:#6b7280;text-align:center;line-height:1.7;">
                © 2025 Auto ERP. All rights reserved.&nbsp;|&nbsp;
                <a href="#" style="color:#22c55e;text-decoration:none;">Privacy Policy</a>&nbsp;|&nbsp;
                <a href="#" style="color:#22c55e;text-decoration:none;">Support</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html> ` : `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Tender Update</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08),0 8px 32px rgba(0,0,0,0.06);">

          <!-- HEADER -->
          <tr>
            <td style="background:#1c1c1e;padding:44px 48px 40px;">
              <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:linear-gradient(135deg,#22c55e,#16a34a);border-radius:10px;width:42px;height:42px;text-align:center;vertical-align:middle;font-size:20px;line-height:42px;">🚗</td>
                  <td style="padding-left:12px;vertical-align:middle;font-size:18px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">Auto ERP - Complete Vehicle Management Solution</td>
                </tr>
              </table>
              <div style="display:inline-block;background:rgba(156,163,175,0.12);border:1px solid rgba(156,163,175,0.3);color:#9ca3af;font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;padding:5px 14px;border-radius:100px;margin-bottom:16px;">Tender Update</div>
              <h1 style="margin:0;font-size:28px;font-weight:800;color:#ffffff;line-height:1.2;letter-spacing:-0.5px;">
                Tender<br/>
                <span style="color:#9ca3af;">Awarded to Another</span>
              </h1>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:40px 48px 0 48px;background:#ffffff;">

              <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#111827;">Hello ${user.username},</p>
              <p style="margin:0 0 30px;font-size:14px;color:#6b7280;line-height:1.75;">
                Thank you for submitting your quote for tender <strong style="color:#111827;">${tender.tender_id}</strong>. We appreciate your participation and the effort you put into your submission.
              </p>

              <!-- Details Box -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:22px;">
                <tr>
                  <td style="background:linear-gradient(180deg,#9ca3af,#6b7280);width:4px;border-radius:4px 0 0 4px;"></td>
                  <td style="background:#f9fafb;border:1px solid #e5e7eb;border-left:none;border-radius:0 14px 14px 0;padding:26px 26px 22px;">
                    <p style="margin:0 0 18px;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#6b7280;">📋 Tender Details</p>

                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;"><tr>
                      <td style="font-size:11px;color:#6b7280;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;width:130px;vertical-align:middle;">Tender ID</td>
                      <td style="font-size:14px;color:#111827;font-weight:700;font-family:'Courier New',monospace;background:#fff;border:1px solid #e5e7eb;padding:6px 14px;border-radius:8px;">${tender.tender_id}</td>
                    </tr></table>

                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;"><tr>
                      <td style="font-size:11px;color:#6b7280;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;width:130px;vertical-align:middle;">Customer</td>
                      <td style="font-size:14px;color:#111827;font-weight:700;background:#fff;border:1px solid #e5e7eb;padding:6px 14px;border-radius:8px;">${tender.customer_info.name}</td>
                    </tr></table>

                    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                      <td style="font-size:11px;color:#6b7280;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;width:130px;vertical-align:middle;">Vehicle</td>
                      <td style="font-size:14px;color:#111827;font-weight:700;background:#fff;border:1px solid #e5e7eb;padding:6px 14px;border-radius:8px;">${tender.basic_vehicle_info.make} ${tender.basic_vehicle_info.model} ${tender.basic_vehicle_info.year}</td>
                    </tr></table>
                  </td>
                </tr>
              </table>

              <!-- Info Notice -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:30px;">
                <tr><td style="padding:14px 18px;font-size:13px;color:#475569;line-height:1.6;">
                  <strong>ℹ️ Update:</strong> This tender has been <strong>awarded to another dealership</strong>. We truly appreciate your participation and look forward to working with you on future opportunities.
                </td></tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:40px;">
                <tr><td align="center">
                  <a href="${frontendUrl}/login" style="display:inline-block;background:linear-gradient(135deg,#22c55e 0%,#16a34a 100%);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:17px 52px;border-radius:100px;letter-spacing:0.3px;box-shadow:0 8px 20px rgba(34,197,94,0.35);">
                    🔍 &nbsp; View Other Tenders
                  </a>
                </td></tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
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
              <p style="margin:0;font-size:11px;color:#6b7280;text-align:center;line-height:1.7;">
                © 2025 Auto ERP. All rights reserved.&nbsp;|&nbsp;
                <a href="#" style="color:#22c55e;text-decoration:none;">Privacy Policy</a>&nbsp;|&nbsp;
                <a href="#" style="color:#22c55e;text-decoration:none;">Support</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;

          await mailService.sendEmail({
            to: user.email,
            subject: isWinner 
              ? `Quote Approved - Tender ${tender.tender_id}`
              : `Tender Update - ${tender.tender_id}`,
            html: emailHtml
          });
        } catch (emailError) {
          console.error(`Failed to send email to ${user.email}:`, emailError);
          // Continue with other emails even if one fails
        }
      }

      // Create history record for rejected dealerships
      if (!isWinner) {
        await createTenderHistory({
          tender_id: tender._id,
          tenderDealership_id: dealershipId,
          action_type: 'rejected',
          old_status: 'Submitted',
          new_status: 'Closed',
          performed_by: req.user.id,
          performed_by_type: 'admin',
          notes: `Quote not selected for ${dealership?.dealership_name || 'dealership'}`,
          metadata: {
            reason: 'Another quote was approved'
          }
        }, req.getModel);
      }
    }

    // Log event
    await logEvent({
      user_id: req.user.id,
      company_id: req.user.company_id,
      action: 'APPROVE',
      resource_type: 'Tender',
      resource_id: tender._id,
      description: `Approved quote for tender ${tender.tender_id}`,
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: 'Quote approved successfully',
      data: {
        tender_id: tender._id,
        tender_status: tender.tender_status,
        approved_vehicle: approvedVehicle,
        winning_dealership: winningDealership?.dealership_name
      }
    });

  } catch (error) {
    console.error('Approve quote error:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving quote'
    });
  }
};

// @desc    Close tender and update all quotes to Closed
// @route   POST /api/tender/:id/close
// @access  Private (Company Admin)
const closeTender = async (req, res) => {
  try {
    const Tender = req.getModel('Tender');
    const TenderVehicle = req.getModel('TenderVehicle');
    
    // Find the tender
    const tender = await Tender.findOne({
      _id: req.params.id,
      company_id: req.user.company_id
    });

    if (!tender) {
      return res.status(404).json({
        success: false,
        message: 'Tender not found'
      });
    }

    // Track old status for history
    const oldStatus = tender.tender_status;

    // Update tender status to "Closed"
    tender.tender_status = 'Closed';
    await tender.save();

    // Update all quotes for this tender to "Closed"
    await TenderVehicle.updateMany(
      { tender_id: tender._id },
      { $set: { quote_status: 'Closed' } }
    );

    // Create history record
    await createTenderHistory({
      tender_id: tender._id,
      action_type: 'closed',
      old_status: oldStatus,
      new_status: 'Closed',
      performed_by: req.user.id,
      performed_by_type: 'admin',
      notes: `Tender closed by admin`,
      metadata: {
        closed_reason: req.body.reason || 'Manually closed by admin'
      }
    }, req.getModel);

    // Log event
    await logEvent({
      user_id: req.user.id,
      company_id: req.user.company_id,
      action: 'CLOSE',
      resource_type: 'Tender',
      resource_id: tender._id,
      description: `Closed tender ${tender.tender_id}`,
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: 'Tender closed successfully',
      data: tender
    });

  } catch (error) {
    console.error('Close tender error:', error);
    res.status(500).json({
      success: false,
      message: 'Error closing tender'
    });
  }
};

module.exports = {
  getTenders,
  getTender,
  createTender,
  updateTender,
  deleteTender,
  toggleTenderStatus,
  calculateResponseCount,
  sendTender,
  getTenderRecipients,
  getAvailableDealerships,
  getTenderHistory,
  approveQuote,
  closeTender
};
