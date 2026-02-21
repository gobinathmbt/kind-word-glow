const User = require('../models/User');
const { logEvent } = require('./logs.controller');
const mailService = require('../config/mailer');

/**
 * Manually populate User fields from main DB for TenderDealershipUser documents
 * @param {Array|Object} items - TenderDealershipUser document(s) to populate
 * @returns {Array|Object} Populated items
 */
async function populateTenderDealershipUserCreators(items) {
  const isArray = Array.isArray(items);
  const itemsArray = isArray ? items : [items];
  
  if (itemsArray.length === 0) return items;

  // Collect all unique user IDs from created_by field
  const userIds = new Set();
  const dealershipUserIds = new Set();
  
  itemsArray.forEach(item => {
    if (item.created_by) {
      // Check if created_by is a TenderDealershipUser (ObjectId) or User (ObjectId)
      // We'll try to populate from both sources
      dealershipUserIds.add(item.created_by.toString());
    }
  });

  if (dealershipUserIds.size === 0) return items;

  // Try to fetch from main DB User collection first
  const users = await User.find(
    { _id: { $in: Array.from(dealershipUserIds) } },
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
      const userId = item.created_by.toString();
      if (userMap[userId]) {
        item.created_by = userMap[userId];
      }
      // If not found in User collection, leave as ObjectId (might be TenderDealershipUser)
    }
  });

  return isArray ? itemsArray : itemsArray[0];
}

// @desc    Get tender dealership users (filtered by dealership)
// @route   GET /api/tender-dealership-user
// @access  Private (Dealership Admin/Primary User or Company Admin)
const getTenderDealershipUsers = async (req, res) => {
  try {
    const TenderDealershipUser = req.getModel('TenderDealershipUser');
    const { page = 1, limit = 10, search, dealership_id, status } = req.query;
    const skip = (page - 1) * limit;

    let filter = {
      company_id: req.user.company_id
    };

    // Filter by dealership if provided
    if (dealership_id) {
      filter.tenderDealership_id = dealership_id;
    }

    // Handle status filter
    if (status && status !== 'all') {
      filter.isActive = status === 'active';
    }

    // Search filter
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { role: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await TenderDealershipUser.find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Manually populate created_by from main DB
    await populateTenderDealershipUserCreators(users);

    const total = await TenderDealershipUser.countDocuments(filter);

    // Get stats
    const totalUsers = await TenderDealershipUser.countDocuments({ 
      company_id: req.user.company_id,
      ...(dealership_id && { tenderDealership_id: dealership_id })
    });
    const activeUsers = await TenderDealershipUser.countDocuments({ 
      company_id: req.user.company_id,
      ...(dealership_id && { tenderDealership_id: dealership_id }),
      isActive: true 
    });
    const inactiveUsers = await TenderDealershipUser.countDocuments({ 
      company_id: req.user.company_id,
      ...(dealership_id && { tenderDealership_id: dealership_id }),
      isActive: false 
    });

    res.status(200).json({
      success: true,
      data: users,
      stats: {
        totalUsers,
        activeUsers,
        inactiveUsers
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
    console.error('Get tender dealership users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving tender dealership users'
    });
  }
};

// @desc    Get single tender dealership user
// @route   GET /api/tender-dealership-user/:id
// @access  Private (Dealership Admin/Primary User or Company Admin)
const getTenderDealershipUser = async (req, res) => {
  try {
    const TenderDealershipUser = req.getModel('TenderDealershipUser');
    
    const user = await TenderDealershipUser.findOne({
      _id: req.params.id,
      company_id: req.user.company_id
    }).lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Tender dealership user not found'
      });
    }

    // Manually populate created_by from main DB
    await populateTenderDealershipUserCreators(user);

    res.status(200).json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Get tender dealership user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving tender dealership user'
    });
  }
};

// @desc    Create new tender dealership user
// @route   POST /api/tender-dealership-user
// @access  Private (Dealership Admin/Primary User or Company Admin)
const createTenderDealershipUser = async (req, res) => {
  try {
    const TenderDealershipUser = req.getModel('TenderDealershipUser');
    
    // Validate required fields
    const { username, email, tenderDealership_id, role } = req.body;
    
    if (!username || !email || !tenderDealership_id || !role) {
      return res.status(400).json({
        success: false,
        message: 'Username, email, dealership ID, and role are required',
        errors: [
          !username && { field: 'username', message: 'Username is required' },
          !email && { field: 'email', message: 'Email is required' },
          !tenderDealership_id && { field: 'tenderDealership_id', message: 'Dealership ID is required' },
          !role && { field: 'role', message: 'Role is required' }
        ].filter(Boolean)
      });
    }

    // Check for duplicate username within company
    const existingUser = await TenderDealershipUser.findOne({
      company_id: req.user.company_id,
      username: username.toLowerCase()
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'A user with this username already exists',
        code: 'DUPLICATE_USERNAME'
      });
    }

    // Verify dealership exists and belongs to company
    const TenderDealership = req.getModel('TenderDealership');
    const dealership = await TenderDealership.findOne({
      _id: tenderDealership_id,
      company_id: req.user.company_id
    });

    if (!dealership) {
      return res.status(404).json({
        success: false,
        message: 'Tender dealership not found'
      });
    }

    // Create user data
    const defaultPassword = 'Welcome@123';
    const userData = {
      username: username.toLowerCase().trim(),
      email: email.toLowerCase().trim(),
      password: defaultPassword,
      tenderDealership_id,
      company_id: req.user.company_id,
      role,
      isActive: true,
      created_by: req.user.id
    };

    const user = await TenderDealershipUser.create(userData);

    // Send email notification with credentials
    try {
      const Company = require('../models/Company');
      const company = await Company.findById(req.user.company_id);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #3b82f6;">Your Tender Portal Account</h1>
          <p>Hello,</p>
          <p>An account has been created for you at ${dealership.dealership_name} on ${company ? company.company_name : 'Auto ERP'} Tender Portal. Here are your login credentials:</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Username:</strong> ${user.username}</p>
            <p><strong>Password:</strong> ${defaultPassword}</p>
            <p><strong>Company ID:</strong> ${req.user.company_id}</p>
            <p><strong>Dealership ID:</strong> ${tenderDealership_id}</p>
            <p><strong>Role:</strong> ${role}</p>
          </div>
          
          <p>Please log in and change your password immediately for security purposes.</p>
          <p>You can access the tender portal at: <a href="${frontendUrl}/login">Login Here</a></p>
          
          <p>Best regards,<br>${company ? company.company_name : 'Auto ERP'} Team</p>
        </div>
      `;

      await mailService.sendEmail({
        to: user.email,
        subject: `Your ${company ? company.company_name : 'Auto ERP'} Tender Portal Account`,
        html
      });
    } catch (emailError) {
      console.error('Error sending email notification:', emailError);
      // Don't fail the request if email fails, just log it
    }

    // Log event
    await logEvent({
      user_id: req.user.id,
      company_id: req.user.company_id,
      action: 'CREATE',
      resource_type: 'TenderDealershipUser',
      resource_id: user._id,
      description: `Created tender dealership user: ${user.username}`,
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: 'Tender dealership user created successfully',
      data: userResponse
    });

  } catch (error) {
    console.error('Create tender dealership user error:', error);
    
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

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A user with this username already exists',
        code: 'DUPLICATE_USERNAME'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating tender dealership user'
    });
  }
};

// @desc    Update tender dealership user
// @route   PUT /api/tender-dealership-user/:id
// @access  Private (Dealership Admin/Primary User or Company Admin)
const updateTenderDealershipUser = async (req, res) => {
  try {
    const TenderDealershipUser = req.getModel('TenderDealershipUser');
    
    // Find user
    const user = await TenderDealershipUser.findOne({
      _id: req.params.id,
      company_id: req.user.company_id
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Tender dealership user not found'
      });
    }

    // Check for duplicate username if username is being changed
    if (req.body.username && req.body.username.toLowerCase() !== user.username.toLowerCase()) {
      const existingUser = await TenderDealershipUser.findOne({
        company_id: req.user.company_id,
        username: req.body.username.toLowerCase(),
        _id: { $ne: req.params.id }
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'A user with this username already exists',
          code: 'DUPLICATE_USERNAME'
        });
      }
    }

    // Update fields (excluding password, which has separate endpoint)
    const allowedUpdates = ['username', 'email', 'role'];
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'username' || field === 'email') {
          user[field] = req.body[field].toLowerCase().trim();
        } else {
          user[field] = req.body[field];
        }
      }
    });

    await user.save();

    // Log event
    await logEvent({
      user_id: req.user.id,
      company_id: req.user.company_id,
      action: 'UPDATE',
      resource_type: 'TenderDealershipUser',
      resource_id: user._id,
      description: `Updated tender dealership user: ${user.username}`,
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(200).json({
      success: true,
      message: 'Tender dealership user updated successfully',
      data: userResponse
    });

  } catch (error) {
    console.error('Update tender dealership user error:', error);
    
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

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A user with this username already exists',
        code: 'DUPLICATE_USERNAME'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating tender dealership user'
    });
  }
};

// @desc    Delete tender dealership user (permanent)
// @route   DELETE /api/tender-dealership-user/:id
// @access  Private (Dealership Admin/Primary User or Company Admin)
const deleteTenderDealershipUser = async (req, res) => {
  try {
    const TenderDealershipUser = req.getModel('TenderDealershipUser');
    
    // Find user
    const user = await TenderDealershipUser.findOne({
      _id: req.params.id,
      company_id: req.user.company_id
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Tender dealership user not found'
      });
    }

    // Prevent deletion of primary user
    if (user.role === 'primary_tender_dealership_user') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete primary tender dealership user',
        code: 'CANNOT_DELETE_PRIMARY_USER'
      });
    }

    const username = user.username;

    // Delete user
    await TenderDealershipUser.deleteOne({ _id: user._id });

    // Log event
    await logEvent({
      user_id: req.user.id,
      company_id: req.user.company_id,
      action: 'DELETE',
      resource_type: 'TenderDealershipUser',
      resource_id: user._id,
      description: `Deleted tender dealership user: ${username}`,
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: 'Tender dealership user deleted successfully'
    });

  } catch (error) {
    console.error('Delete tender dealership user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting tender dealership user'
    });
  }
};

// @desc    Toggle tender dealership user status
// @route   PATCH /api/tender-dealership-user/:id/status
// @access  Private (Dealership Admin/Primary User or Company Admin)
const toggleTenderDealershipUserStatus = async (req, res) => {
  try {
    const TenderDealershipUser = req.getModel('TenderDealershipUser');
    
    // Find user
    const user = await TenderDealershipUser.findOne({
      _id: req.params.id,
      company_id: req.user.company_id
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Tender dealership user not found'
      });
    }

    // Prevent deactivation of primary user
    if (user.role === 'primary_tender_dealership_user' && user.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Cannot deactivate primary tender dealership user',
        code: 'CANNOT_DEACTIVATE_PRIMARY_USER'
      });
    }

    // Toggle status
    user.isActive = !user.isActive;
    await user.save();

    // Log event
    await logEvent({
      user_id: req.user.id,
      company_id: req.user.company_id,
      action: 'UPDATE',
      resource_type: 'TenderDealershipUser',
      resource_id: user._id,
      description: `${user.isActive ? 'Activated' : 'Deactivated'} tender dealership user: ${user.username}`,
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(200).json({
      success: true,
      message: `Tender dealership user ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      data: userResponse
    });

  } catch (error) {
    console.error('Toggle tender dealership user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error toggling tender dealership user status'
    });
  }
};

// @desc    Reset tender dealership user password
// @route   POST /api/tender-dealership-user/:id/reset-password
// @access  Private (Dealership Admin/Primary User or Company Admin)
const resetTenderDealershipUserPassword = async (req, res) => {
  try {
    const TenderDealershipUser = req.getModel('TenderDealershipUser');
    
    // Find user
    const user = await TenderDealershipUser.findOne({
      _id: req.params.id,
      company_id: req.user.company_id
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Tender dealership user not found'
      });
    }

    // Reset password to default
    const defaultPassword = 'Welcome@123';
    user.password = defaultPassword;
    await user.save();

    // Send email notification with new password
    try {
      const Company = require('../models/Company');
      const company = await Company.findById(req.user.company_id);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
      
      const TenderDealership = req.getModel('TenderDealership');
      const dealership = await TenderDealership.findById(user.tenderDealership_id);
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #3b82f6;">Password Reset Notification</h1>
          <p>Hello ${user.username},</p>
          <p>Your password for ${dealership ? dealership.dealership_name : 'your dealership'} on ${company ? company.company_name : 'Auto ERP'} Tender Portal has been reset.</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Username:</strong> ${user.username}</p>
            <p><strong>New Password:</strong> ${defaultPassword}</p>
            <p><strong>Company ID:</strong> ${req.user.company_id}</p>
            <p><strong>Dealership ID:</strong> ${user.tenderDealership_id}</p>
          </div>
          
          <p>Please log in and change your password immediately for security purposes.</p>
          <p>You can access the tender portal at: <a href="${frontendUrl}/login">Login Here</a></p>
          
          <p>If you did not request this password reset, please contact your administrator immediately.</p>
          
          <p>Best regards,<br>${company ? company.company_name : 'Auto ERP'} Team</p>
        </div>
      `;

      await mailService.sendEmail({
        to: user.email,
        subject: `Password Reset - ${company ? company.company_name : 'Auto ERP'} Tender Portal`,
        html
      });
    } catch (emailError) {
      console.error('Error sending password reset email:', emailError);
      // Don't fail the request if email fails, just log it
    }

    // Log event
    await logEvent({
      user_id: req.user.id,
      company_id: req.user.company_id,
      action: 'UPDATE',
      resource_type: 'TenderDealershipUser',
      resource_id: user._id,
      description: `Reset password for tender dealership user: ${user.username}`,
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: 'Password reset successfully. Email notification sent to user.'
    });

  } catch (error) {
    console.error('Reset tender dealership user password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting tender dealership user password'
    });
  }
};

module.exports = {
  getTenderDealershipUsers,
  getTenderDealershipUser,
  createTenderDealershipUser,
  updateTenderDealershipUser,
  deleteTenderDealershipUser,
  toggleTenderDealershipUserStatus,
  resetTenderDealershipUserPassword
};
