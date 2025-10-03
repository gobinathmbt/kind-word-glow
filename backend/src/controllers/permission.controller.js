
const Permission = require('../models/Permission');
const { logEvent } = require('./logs.controller');

// @desc    Get all permissions
// @route   GET /api/master/permissions
// @access  Private (Master Admin)
const getPermissions = async (req, res) => {
  try {
    const { page = 1, limit = 50, search, status } = req.query;
    const skip = (page - 1) * limit;

    let filter = {};
    
    if (search && search.trim()) {
      filter.$or = [
        { module_name: { $regex: search.trim(), $options: 'i' } },
        { internal_name: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    if (status !== undefined && status !== '' && status !== 'all') {
      filter.is_active = status === 'true';
    }

    const permissions = await Permission.find(filter)
      .populate('created_by', 'first_name last_name email')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Permission.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      data: permissions,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_records: total,
        per_page: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get permissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving permissions'
    });
  }
};

// @desc    Get single permission
// @route   GET /api/master/permissions/:id
// @access  Private (Master Admin)
const getPermission = async (req, res) => {
  try {
    const permission = await Permission.findById(req.params.id)
      .populate('created_by', 'first_name last_name email');
    
    if (!permission) {
      return res.status(404).json({
        success: false,
        message: 'Permission not found'
      });
    }

    res.status(200).json({
      success: true,
      data: permission
    });

  } catch (error) {
    console.error('Get permission error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving permission'
    });
  }
};

// @desc    Create new permission
// @route   POST /api/master/permissions
// @access  Private (Master Admin)
const createPermission = async (req, res) => {
  try {
    const { module_name, internal_name, description } = req.body;

    // Check if internal_name already exists
    const existingPermission = await Permission.findOne({ internal_name: internal_name.toLowerCase().replace(/\s+/g, '_') });
    if (existingPermission) {
      return res.status(400).json({
        success: false,
        message: 'Permission with this internal name already exists'
      });
    }

    const permission = new Permission({
      module_name,
      internal_name: internal_name.toLowerCase().replace(/\s+/g, '_'),
      description,
      created_by: req.user.id
    });

    await permission.save();

    await logEvent({
      event_type: 'permission_management',
      event_action: 'permission_created',
      event_description: `Permission ${permission.module_name} created`,
      user_id: req.user.id,
      user_role: req.user.role
    });

    res.status(201).json({
      success: true,
      data: permission,
      message: 'Permission created successfully'
    });

  } catch (error) {
    console.error('Create permission error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating permission'
    });
  }
};

// @desc    Update permission
// @route   PUT /api/master/permissions/:id
// @access  Private (Master Admin)
const updatePermission = async (req, res) => {
  try {
    const { module_name, internal_name, description, is_active } = req.body;

    // Check if internal_name already exists for other permissions
    const existingPermission = await Permission.findOne({ 
      internal_name, 
      _id: { $ne: req.params.id } 
    });
    
    if (existingPermission) {
      return res.status(400).json({
        success: false,
        message: 'Permission with this internal name already exists'
      });
    }

    const permission = await Permission.findByIdAndUpdate(
      req.params.id,
      {
        module_name,
        internal_name: internal_name.toLowerCase().replace(/\s+/g, '_'),
        description,
        is_active
      },
      { new: true, runValidators: true }
    );

    if (!permission) {
      return res.status(404).json({
        success: false,
        message: 'Permission not found'
      });
    }

    await logEvent({
      event_type: 'permission_management',
      event_action: 'permission_updated',
      event_description: `Permission ${permission.module_name} updated`,
      user_id: req.user.id,
      user_role: req.user.role
    });

    res.status(200).json({
      success: true,
      data: permission,
      message: 'Permission updated successfully'
    });

  } catch (error) {
    console.error('Update permission error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating permission'
    });
  }
};

// @desc    Delete permission
// @route   DELETE /api/master/permissions/:id
// @access  Private (Master Admin)
const deletePermission = async (req, res) => {
  try {
    const permission = await Permission.findByIdAndDelete(req.params.id);

    if (!permission) {
      return res.status(404).json({
        success: false,
        message: 'Permission not found'
      });
    }

    await logEvent({
      event_type: 'permission_management',
      event_action: 'permission_deleted',
      event_description: `Permission ${permission.module_name} deleted`,
      user_id: req.user.id,
      user_role: req.user.role
    });

    res.status(200).json({
      success: true,
      message: 'Permission deleted successfully'
    });

  } catch (error) {
    console.error('Delete permission error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting permission'
    });
  }
};

// @desc    Toggle permission status
// @route   PATCH /api/master/permissions/:id/status
// @access  Private (Master Admin)
const togglePermissionStatus = async (req, res) => {
  try {
    const { is_active } = req.body;
    
    const permission = await Permission.findByIdAndUpdate(
      req.params.id,
      { is_active },
      { new: true }
    );

    if (!permission) {
      return res.status(404).json({
        success: false,
        message: 'Permission not found'
      });
    }

    await logEvent({
      event_type: 'permission_management',
      event_action: 'permission_status_updated',
      event_description: `Permission ${permission.module_name} ${is_active ? 'activated' : 'deactivated'}`,
      user_id: req.user.id,
      user_role: req.user.role
    });

    res.status(200).json({
      success: true,
      data: permission,
      message: `Permission ${is_active ? 'activated' : 'deactivated'} successfully`
    });

  } catch (error) {
    console.error('Toggle permission status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating permission status'
    });
  }
};

module.exports = {
  getPermissions,
  getPermission,
  createPermission,
  updatePermission,
  deletePermission,
  togglePermissionStatus
};
