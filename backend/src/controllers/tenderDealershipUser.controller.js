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
// @access  Private (Primary Tender Dealership User only)
const getTenderDealershipUsers = async (req, res) => {
  try {
    const TenderDealershipUser = req.getModel('TenderDealershipUser');
    const { page = 1, limit = 10, search, status } = req.query;
    const skip = (page - 1) * limit;

    let filter = {
      company_id: req.dealershipUser.company_id,
      tenderDealership_id: req.dealershipUser.tenderDealership_id,
      role: { $ne: 'primary_tender_dealership_user' } // Exclude primary users
    };

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
      company_id: req.dealershipUser.company_id,
      tenderDealership_id: req.dealershipUser.tenderDealership_id,
      role: { $ne: 'primary_tender_dealership_user' }
    });
    const activeUsers = await TenderDealershipUser.countDocuments({ 
      company_id: req.dealershipUser.company_id,
      tenderDealership_id: req.dealershipUser.tenderDealership_id,
      role: { $ne: 'primary_tender_dealership_user' },
      isActive: true 
    });
    const inactiveUsers = await TenderDealershipUser.countDocuments({ 
      company_id: req.dealershipUser.company_id,
      tenderDealership_id: req.dealershipUser.tenderDealership_id,
      role: { $ne: 'primary_tender_dealership_user' },
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
// @access  Private (Primary Tender Dealership User only)
const getTenderDealershipUser = async (req, res) => {
  try {
    const TenderDealershipUser = req.getModel('TenderDealershipUser');
    
    const user = await TenderDealershipUser.findOne({
      _id: req.params.id,
      company_id: req.dealershipUser.company_id,
      tenderDealership_id: req.dealershipUser.tenderDealership_id
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
// @access  Private (Primary Tender Dealership User only)
const createTenderDealershipUser = async (req, res) => {
  try {
    const TenderDealershipUser = req.getModel('TenderDealershipUser');
    
    // Validate required fields
    const { username, email, role } = req.body;
    
    if (!username || !email || !role) {
      return res.status(400).json({
        success: false,
        message: 'Username, email, and role are required',
        errors: [
          !username && { field: 'username', message: 'Username is required' },
          !email && { field: 'email', message: 'Email is required' },
          !role && { field: 'role', message: 'Role is required' }
        ].filter(Boolean)
      });
    }

    // Check for duplicate username within company
    const existingUser = await TenderDealershipUser.findOne({
      company_id: req.dealershipUser.company_id,
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
      _id: req.dealershipUser.tenderDealership_id,
      company_id: req.dealershipUser.company_id
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
      tenderDealership_id: req.dealershipUser.tenderDealership_id,
      company_id: req.dealershipUser.company_id,
      role,
      isActive: true,
      created_by: req.dealershipUser.id
    };

    const user = await TenderDealershipUser.create(userData);

    // Send email notification with credentials
    try {
      const Company = require('../models/Company');
      const company = await Company.findById(req.dealershipUser.company_id);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
      
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Welcome Email</title>
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
              <div style="display:inline-block;background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.35);color:#22c55e;font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;padding:5px 14px;border-radius:100px;margin-bottom:16px;">Tender Portal</div>
              <h1 style="margin:0;font-size:28px;font-weight:800;color:#ffffff;line-height:1.2;letter-spacing:-0.5px;">
                Your Tender Portal<br/>
                <span style="color:#22c55e;">Account is Ready</span>
              </h1>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:40px 48px 0 48px;background:#ffffff;">
              <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#111827;">Hello,</p>
              <p style="margin:0 0 30px;font-size:14px;color:#6b7280;line-height:1.75;">
                An account has been created for you at <strong style="color:#111827;">${dealership.dealership_name}</strong> on the <strong style="color:#111827;">${company ? company.company_name : 'Auto ERP'}</strong> Tender Portal. Below are your login credentials — please keep them secure.
              </p>

              <!-- Credentials Box -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:22px;">
                <tr>
                  <td style="background:linear-gradient(180deg,#22c55e,#16a34a);width:4px;border-radius:4px 0 0 4px;"></td>
                  <td style="background:#f0fdf4;border:1px solid #bbf7d0;border-left:none;border-radius:0 14px 14px 0;padding:26px 26px 22px;">
                    <p style="margin:0 0 18px;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#16a34a;">🔐 Your Login Credentials</p>

                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;"><tr>
                      <td style="font-size:11px;color:#6b7280;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;width:130px;vertical-align:middle;">Username</td>
                      <td style="font-size:14px;color:#111827;font-weight:700;font-family:'Courier New',monospace;background:#fff;border:1px solid #d1fae5;padding:6px 14px;border-radius:8px;">${user.email}</td>
                    </tr></table>

                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;"><tr>
                      <td style="font-size:11px;color:#6b7280;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;width:130px;vertical-align:middle;">Password</td>
                      <td style="font-size:14px;color:#111827;font-weight:700;font-family:'Courier New',monospace;background:#fff;border:1px solid #d1fae5;padding:6px 14px;border-radius:8px;">${defaultPassword}</td>
                    </tr></table>

                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;"><tr>
                      <td style="font-size:11px;color:#6b7280;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;width:130px;vertical-align:middle;">Company ID</td>
                      <td style="font-size:14px;color:#111827;font-weight:700;font-family:'Courier New',monospace;background:#fff;border:1px solid #d1fae5;padding:6px 14px;border-radius:8px;">${req.dealershipUser.company_id}</td>
                    </tr></table>

                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;"><tr>
                      <td style="font-size:11px;color:#6b7280;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;width:130px;vertical-align:middle;">Dealership ID</td>
                      <td style="font-size:14px;color:#111827;font-weight:700;font-family:'Courier New',monospace;background:#fff;border:1px solid #d1fae5;padding:6px 14px;border-radius:8px;">${req.dealershipUser.tenderDealership_id}</td>
                    </tr></table>

                    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                      <td style="font-size:11px;color:#6b7280;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;width:130px;vertical-align:middle;">Role</td>
                      <td><span style="display:inline-block;background:#dcfce7;color:#15803d;font-size:12px;font-weight:700;padding:4px 14px;border-radius:100px;">${role}</span></td>
                    </tr></table>
                  </td>
                </tr>
              </table>

              <!-- Security Notice -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;margin-bottom:30px;">
                <tr><td style="padding:14px 18px;font-size:13px;color:#92400e;line-height:1.6;">
                  <strong>⚠️ Security Notice:</strong> Please log in and <strong>change your password immediately</strong> to protect your account.
                </td></tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:40px;">
                <tr><td align="center">
                  <a href="${frontendUrl}/login" style="display:inline-block;background:linear-gradient(135deg,#22c55e 0%,#16a34a 100%);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:17px 52px;border-radius:100px;letter-spacing:0.3px;box-shadow:0 8px 20px rgba(34,197,94,0.35);">
                    🚀 &nbsp; Access the Tender Portal
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
                    <p style="margin:0 0 3px;font-size:14px;font-weight:700;color:#f9fafb;">${company ? company.company_name : 'Auto ERP'} Team</p>
                    <p style="margin:0;font-size:12px;color:#9ca3af;">This is an automated message. Please do not reply directly.</p>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <span style="display:inline-block;background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.25);color:#22c55e;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:5px 12px;border-radius:100px;">Secure Mail</span>
                  </td>
                </tr>
              </table>
              <div style="height:1px;background:rgba(255,255,255,0.07);margin:20px 0;"></div>
              <p style="margin:0;font-size:11px;color:#6b7280;text-align:center;line-height:1.7;">
                © 2025 ${company ? company.company_name : 'Auto ERP'}. All rights reserved.&nbsp;|&nbsp;
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
        subject: `Your ${company ? company.company_name : 'Auto ERP'} Tender Portal Account`,
        html
      });
    } catch (emailError) {
      console.error('Error sending email notification:', emailError);
      // Don't fail the request if email fails, just log it
    }

    // Log event
    await logEvent({
      user_id: req.dealershipUser.id,
      company_id: req.dealershipUser.company_id,
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
// @access  Private (Primary Tender Dealership User only)
const updateTenderDealershipUser = async (req, res) => {
  try {
    const TenderDealershipUser = req.getModel('TenderDealershipUser');
    
    // Find user
    const user = await TenderDealershipUser.findOne({
      _id: req.params.id,
      company_id: req.dealershipUser.company_id,
      tenderDealership_id: req.dealershipUser.tenderDealership_id
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
        company_id: req.dealershipUser.company_id,
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
      user_id: req.dealershipUser.id,
      company_id: req.dealershipUser.company_id,
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
// @access  Private (Primary Tender Dealership User only)
const deleteTenderDealershipUser = async (req, res) => {
  try {
    const TenderDealershipUser = req.getModel('TenderDealershipUser');
    
    // Find user
    const user = await TenderDealershipUser.findOne({
      _id: req.params.id,
      company_id: req.dealershipUser.company_id,
      tenderDealership_id: req.dealershipUser.tenderDealership_id
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
      user_id: req.dealershipUser.id,
      company_id: req.dealershipUser.company_id,
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
// @access  Private (Primary Tender Dealership User only)
const toggleTenderDealershipUserStatus = async (req, res) => {
  try {
    const TenderDealershipUser = req.getModel('TenderDealershipUser');
    
    // Find user
    const user = await TenderDealershipUser.findOne({
      _id: req.params.id,
      company_id: req.dealershipUser.company_id,
      tenderDealership_id: req.dealershipUser.tenderDealership_id
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
      user_id: req.dealershipUser.id,
      company_id: req.dealershipUser.company_id,
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



module.exports = {
  getTenderDealershipUsers,
  getTenderDealershipUser,
  createTenderDealershipUser,
  updateTenderDealershipUser,
  deleteTenderDealershipUser,
  toggleTenderDealershipUserStatus,
};
