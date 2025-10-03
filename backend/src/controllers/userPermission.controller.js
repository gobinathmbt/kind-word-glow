
const User = require('../models/User');
const Permission = require('../models/Permission');
const { logEvent } = require('./logs.controller');

// @desc    Get available permissions for company
// @route   GET /api/company/permissions/available
// @access  Private (Company Super Admin)
const getAvailablePermissions = async (req, res) => {
  try {
    const permissions = await Permission.find({ is_active: true })
      .select('_id module_name internal_name description')
      .sort({ module_name: 1, internal_name: 1 });

    res.status(200).json({
      success: true,
      data: permissions
    });

  } catch (error) {
    console.error('Get available permissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving available permissions'
    });
  }
};

// @desc    Get user permissions
// @route   GET /api/company/users/:userId/permissions
// @access  Private (Company Super Admin)
const getUserPermissions = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findOne({ 
      _id: userId, 
      company_id: req.user.company_id 
    }).select('permissions');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user.permissions || []
    });

  } catch (error) {
    console.error('Get user permissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving user permissions'
    });
  }
};

// @desc    Update user permissions
// @route   PUT /api/company/users/:userId/permissions
// @access  Private (Company Super Admin)
const updateUserPermissions = async (req, res) => {
  try {
    const { userId } = req.params;
    const { permissions } = req.body; // Array of internal names

    const user = await User.findOne({ 
      _id: userId, 
      company_id: req.user.company_id 
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Validate that all permission internal names exist and are active
    const validPermissions = await Permission.find({ 
      internal_name: { $in: permissions },
      is_active: true 
    });

    if (validPermissions.length !== permissions.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more permissions are invalid or inactive'
      });
    }

    // Update user permissions with internal names
    user.permissions = permissions;
    await user.save();

    await logEvent({
      event_type: 'user_management',
      event_action: 'user_permissions_updated',
      event_description: `Permissions updated for user ${user.email}`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role
    });

    res.status(200).json({
      success: true,
      data: user.permissions,
      message: 'User permissions updated successfully'
    });

  } catch (error) {
    console.error('Update user permissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user permissions'
    });
  }
};

// @desc    Get user modules
// @route   GET /api/company/users/:userId/modules
// @access  Private (Company Super Admin)
const getUserModules = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findOne({ 
      _id: userId, 
      company_id: req.user.company_id 
    }).select('module_access role');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Only allow module management for company_admin users
    if (user.role !== 'company_admin' && user.role !== 'company_super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Module management is only available for company admin users'
      });
    }

    res.status(200).json({
      success: true,
      data: user.module_access || []
    });

  } catch (error) {
    console.error('Get user modules error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving user modules'
    });
  }
};

// @desc    Update user modules
// @route   PUT /api/company/users/:userId/modules
// @access  Private (Company Super Admin)
const updateUserModules = async (req, res) => {
  try {
    const { userId } = req.params;
    const { modules } = req.body; // Array of module names

    const user = await User.findOne({
      _id: userId,
      company_id: req.user.company_id
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Only allow module management for company_admin users
    if (user.role !== 'company_admin' && user.role !== 'company_super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Module management is only available for company admin users'
      });
    }

    // Directly update user module access with whatever frontend sends
    user.module_access = modules;
    await user.save();

    await logEvent({
      event_type: 'user_management',
      event_action: 'user_modules_updated',
      event_description: `Module access updated for user ${user.email}`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role
    });

    res.status(200).json({
      success: true,
      data: user.module_access,
      message: 'User module access updated successfully'
    });

  } catch (error) {
    console.error('Update user modules error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user modules'
    });
  }
};

// ... keep existing code (getUsersWithPermissions function)

const getUsersWithPermissions = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    const skip = (page - 1) * limit;

    // Start with base filter for company
    let filter = { company_id: req.user.company_id };
    
    // If user is NOT primary admin, exclude primary admins and only show company admins
    if (!req.user.is_primary_admin) {
      filter.is_primary_admin = { $ne: true };
      filter.role = 'company_admin'; // or whatever your company admin role is called
    }
    
    // Add search functionality
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { first_name: { $regex: search, $options: 'i' } },
        { last_name: { $regex: search, $options: 'i' } }
      ];
    }

    // Add status filter
    if (status && status !== 'all') {
      if (status === 'active') {
        filter.is_active = true;
      } else if (status === 'inactive') {
        filter.is_active = false;
      }
    }

    const users = await User.find(filter)
      .select('_id username email first_name last_name role is_active permissions module_access is_primary_admin dealership_ids')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_records: total,
        per_page: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get users with permissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving users with permissions'
    });
  }
};

module.exports = {
  getAvailablePermissions,
  getUserPermissions,
  updateUserPermissions,
  getUserModules,
  updateUserModules,
  getUsersWithPermissions
};
