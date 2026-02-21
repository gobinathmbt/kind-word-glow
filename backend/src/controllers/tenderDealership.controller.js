const User = require('../models/User');
const { logEvent } = require('./logs.controller');
const mailService = require('../config/mailer');

/**
 * Manually populate User fields from main DB for TenderDealership documents
 * @param {Array|Object} items - TenderDealership document(s) to populate
 * @returns {Array|Object} Populated items
 */
async function populateTenderDealershipUsers(items) {
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

// @desc    Get tender dealerships with pagination and search
// @route   GET /api/tender-dealership
// @access  Private (Company Admin/Super Admin)
const getTenderDealerships = async (req, res) => {
  try {
    const TenderDealership = req.getModel('TenderDealership');
    const { page = 1, limit = 10, search, status } = req.query;
    const skip = (page - 1) * limit;

    let filter = {
      company_id: req.user.company_id
    };

    // Handle status filter
    if (status && status !== 'all') {
      filter.isActive = status === 'active';
    }

    if (search) {
      filter.$or = [
        { dealership_name: { $regex: search, $options: 'i' } },
        { 'address.street': { $regex: search, $options: 'i' } },
        { 'address.suburb': { $regex: search, $options: 'i' } },
        { 'address.state': { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { tenderDealership_id: { $regex: search, $options: 'i' } },
        { abn: { $regex: search, $options: 'i' } },
        { dp_name: { $regex: search, $options: 'i' } },
        { brand_or_make: { $regex: search, $options: 'i' } }
      ];
    }

    const dealerships = await TenderDealership.find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Manually populate User fields from main DB
    await populateTenderDealershipUsers(dealerships);

    const total = await TenderDealership.countDocuments(filter);

    // Get stats
    const totalDealerships = await TenderDealership.countDocuments({ company_id: req.user.company_id });
    const activeDealerships = await TenderDealership.countDocuments({ 
      company_id: req.user.company_id, 
      isActive: true 
    });
    const inactiveDealerships = await TenderDealership.countDocuments({ 
      company_id: req.user.company_id, 
      isActive: false 
    });

    res.status(200).json({
      success: true,
      data: dealerships,
      stats: {
        totalDealerships,
        activeDealerships,
        inactiveDealerships
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
    console.error('Get tender dealerships error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving tender dealerships'
    });
  }
};

// @desc    Get single tender dealership
// @route   GET /api/tender-dealership/:id
// @access  Private (Company Admin/Super Admin)
const getTenderDealership = async (req, res) => {
  try {
    const TenderDealership = req.getModel('TenderDealership');
    const dealership = await TenderDealership.findOne({
      _id: req.params.id,
      company_id: req.user.company_id
    }).lean();

    if (!dealership) {
      return res.status(404).json({
        success: false,
        message: 'Tender dealership not found'
      });
    }

    // Manually populate User fields from main DB
    await populateTenderDealershipUsers(dealership);

    res.status(200).json({
      success: true,
      data: dealership
    });

  } catch (error) {
    console.error('Get tender dealership error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving tender dealership'
    });
  }
};

// @desc    Create new tender dealership
// @route   POST /api/tender-dealership
// @access  Private (Super Admin only)
const createTenderDealership = async (req, res) => {
  try {
    const TenderDealership = req.getModel('TenderDealership');
    
    // Validate required fields
    const { dealership_name, email } = req.body;
    
    if (!dealership_name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Dealership name and email are required',
        errors: [
          !dealership_name && { field: 'dealership_name', message: 'Dealership name is required' },
          !email && { field: 'email', message: 'Email is required' }
        ].filter(Boolean)
      });
    }

    // Check for duplicate email within company
    const existingDealership = await TenderDealership.findOne({
      company_id: req.user.company_id,
      email: email.toLowerCase()
    });

    if (existingDealership) {
      return res.status(409).json({
        success: false,
        message: 'A tender dealership with this email already exists',
        code: 'DUPLICATE_EMAIL'
      });
    }

    // Create dealership data
    const dealershipData = {
      ...req.body,
      company_id: req.user.company_id,
      created_by: req.user.id
    };

    const dealership = await TenderDealership.create(dealershipData);

    // Create primary dealership user
    const TenderDealershipUser = req.getModel('TenderDealershipUser');
    
    // Generate username from dealership name
    const username = dealership.dealership_name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
      .substring(0, 30);
    
    const defaultPassword = 'Welcome@123';
    
    const primaryUser = await TenderDealershipUser.create({
      username,
      email: dealership.email,
      password: defaultPassword,
      tenderDealership_id: dealership._id,
      company_id: req.user.company_id,
      role: 'primary_tender_dealership_user',
      isActive: true
    });

    // Send email invitation with credentials
    try {
      const Company = require('../models/Company');
      const company = await Company.findById(req.user.company_id);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #3b82f6;">Welcome to ${company ? company.company_name : 'Auto ERP'} Tender Portal</h1>
          <p>Dear ${dealership.dealership_name} team,</p>
          <p>Your dealership has been successfully registered on our tender portal. Here are your login credentials:</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Username:</strong> ${username}</p>
            <p><strong>Password:</strong> ${defaultPassword}</p>
            <p><strong>Company ID:</strong> ${req.user.company_id}</p>
            <p><strong>Dealership ID:</strong> ${dealership._id}</p>
            <p><strong>Role:</strong> Primary Tender Dealership User</p>
          </div>
          
          <p>Please log in and change your password immediately for security purposes.</p>
          <p>You can access the tender portal at: <a href="${frontendUrl}/tender-dealership/login">Login Here</a></p>
          
          <p>Best regards,<br>${company ? company.company_name : 'Auto ERP'} Team</p>
        </div>
      `;

      await mailService.sendEmail({
        to: dealership.email,
        subject: `Welcome to ${company ? company.company_name : 'Auto ERP'} Tender Portal`,
        html
      });
    } catch (emailError) {
      console.error('Error sending email invitation:', emailError);
      // Don't fail the request if email fails, just log it
    }

    // Log event
    await logEvent({
      user_id: req.user.id,
      company_id: req.user.company_id,
      action: 'CREATE',
      resource_type: 'TenderDealership',
      resource_id: dealership._id,
      description: `Created tender dealership: ${dealership.dealership_name}`,
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    res.status(201).json({
      success: true,
      message: 'Tender dealership created successfully and invitation email sent',
      data: dealership
    });

  } catch (error) {
    console.error('Create tender dealership error:', error);
    
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
      message: 'Error creating tender dealership'
    });
  }
};

// @desc    Update tender dealership
// @route   PUT /api/tender-dealership/:id
// @access  Private (Super Admin only)
const updateTenderDealership = async (req, res) => {
  try {
    const TenderDealership = req.getModel('TenderDealership');
    
    // Find dealership
    const dealership = await TenderDealership.findOne({
      _id: req.params.id,
      company_id: req.user.company_id
    });

    if (!dealership) {
      return res.status(404).json({
        success: false,
        message: 'Tender dealership not found'
      });
    }

    // Check for duplicate email if email is being changed
    if (req.body.email && req.body.email.toLowerCase() !== dealership.email.toLowerCase()) {
      const existingDealership = await TenderDealership.findOne({
        company_id: req.user.company_id,
        email: req.body.email.toLowerCase(),
        _id: { $ne: req.params.id }
      });

      if (existingDealership) {
        return res.status(409).json({
          success: false,
          message: 'A tender dealership with this email already exists',
          code: 'DUPLICATE_EMAIL'
        });
      }
    }

    // Update fields
    const allowedUpdates = [
      'dealership_name', 'address', 'billing_address', 'abn', 
      'dp_name', 'brand_or_make', 'email', 'hubRecID'
    ];
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        dealership[field] = req.body[field];
      }
    });

    await dealership.save();

    // Log event
    await logEvent({
      user_id: req.user.id,
      company_id: req.user.company_id,
      action: 'UPDATE',
      resource_type: 'TenderDealership',
      resource_id: dealership._id,
      description: `Updated tender dealership: ${dealership.dealership_name}`,
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: 'Tender dealership updated successfully',
      data: dealership
    });

  } catch (error) {
    console.error('Update tender dealership error:', error);
    
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
      message: 'Error updating tender dealership'
    });
  }
};

// @desc    Delete tender dealership (permanent)
// @route   DELETE /api/tender-dealership/:id
// @access  Private (Super Admin only)
const deleteTenderDealership = async (req, res) => {
  try {
    const TenderDealership = req.getModel('TenderDealership');
    const TenderDealershipUser = req.getModel('TenderDealershipUser');
    
    // Find dealership
    const dealership = await TenderDealership.findOne({
      _id: req.params.id,
      company_id: req.user.company_id
    });

    if (!dealership) {
      return res.status(404).json({
        success: false,
        message: 'Tender dealership not found'
      });
    }

    // Delete all associated users (cascade deletion)
    await TenderDealershipUser.deleteMany({
      tenderDealership_id: dealership._id,
      company_id: req.user.company_id
    });

    // Delete dealership
    await TenderDealership.deleteOne({ _id: dealership._id });

    // Log event
    await logEvent({
      user_id: req.user.id,
      company_id: req.user.company_id,
      action: 'DELETE',
      resource_type: 'TenderDealership',
      resource_id: dealership._id,
      description: `Deleted tender dealership: ${dealership.dealership_name}`,
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: 'Tender dealership and associated users deleted successfully'
    });

  } catch (error) {
    console.error('Delete tender dealership error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting tender dealership'
    });
  }
};

// @desc    Toggle tender dealership status
// @route   PATCH /api/tender-dealership/:id/status
// @access  Private (Super Admin only)
const toggleTenderDealershipStatus = async (req, res) => {
  try {
    const TenderDealership = req.getModel('TenderDealership');
    
    // Find dealership
    const dealership = await TenderDealership.findOne({
      _id: req.params.id,
      company_id: req.user.company_id
    });

    if (!dealership) {
      return res.status(404).json({
        success: false,
        message: 'Tender dealership not found'
      });
    }

    // Toggle status
    dealership.isActive = !dealership.isActive;
    await dealership.save();

    // Log event
    await logEvent({
      user_id: req.user.id,
      company_id: req.user.company_id,
      action: 'UPDATE',
      resource_type: 'TenderDealership',
      resource_id: dealership._id,
      description: `${dealership.isActive ? 'Activated' : 'Deactivated'} tender dealership: ${dealership.dealership_name}`,
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: `Tender dealership ${dealership.isActive ? 'activated' : 'deactivated'} successfully`,
      data: dealership
    });

  } catch (error) {
    console.error('Toggle tender dealership status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error toggling tender dealership status'
    });
  }
};

module.exports = {
  getTenderDealerships,
  getTenderDealership,
  createTenderDealership,
  updateTenderDealership,
  deleteTenderDealership,
  toggleTenderDealershipStatus
};
