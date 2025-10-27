const GroupPermission = require('../models/GroupPermission');
const User = require('../models/User');
const Permission = require('../models/Permission');
const { logEvent } = require('./logs.controller');

// @desc    Get all group permissions for company
// @route   GET /api/company/group-permissions
// @access  Private (Company Super Admin)
const getGroupPermissions = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const skip = (page - 1) * limit;

    let filter = { 
      company_id: req.user.company_id,
      is_active: true 
    };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const groupPermissions = await GroupPermission.find(filter)
      .populate('created_by', 'first_name last_name email')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await GroupPermission.countDocuments(filter);

    // Get user count for each group permission
    const groupPermissionsWithCount = await Promise.all(
      groupPermissions.map(async (gp) => {
        const userCount = await User.countDocuments({
          group_permissions: gp._id,
          company_id: req.user.company_id
        });
        return {
          ...gp.toObject(),
          user_count: userCount
        };
      })
    );

    res.status(200).json({
      success: true,
      data: groupPermissionsWithCount,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_records: total,
        per_page: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get group permissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving group permissions'
    });
  }
};

// @desc    Get single group permission
// @route   GET /api/company/group-permissions/:id
// @access  Private (Company Super Admin)
const getGroupPermission = async (req, res) => {
  try {
    const groupPermission = await GroupPermission.findOne({
      _id: req.params.id,
      company_id: req.user.company_id
    }).populate('created_by', 'first_name last_name email');

    if (!groupPermission) {
      return res.status(404).json({
        success: false,
        message: 'Group permission not found'
      });
    }

    res.status(200).json({
      success: true,
      data: groupPermission
    });

  } catch (error) {
    console.error('Get group permission error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving group permission'
    });
  }
};

// @desc    Create group permission
// @route   POST /api/company/group-permissions
// @access  Private (Company Super Admin)
const createGroupPermission = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;

    // Validate required fields
    if (!name || !description) {
      return res.status(400).json({
        success: false,
        message: 'Name and description are required'
      });
    }

    // Check if name already exists for this company
    const existingGroup = await GroupPermission.findOne({
      name: name.trim(),
      company_id: req.user.company_id
    });

    if (existingGroup) {
      return res.status(400).json({
        success: false,
        message: 'A group permission with this name already exists'
      });
    }

    // Validate permissions if provided
    if (permissions && permissions.length > 0) {
      const validPermissions = await Permission.find({
        internal_name: { $in: permissions },
        is_active: true
      });

      if (validPermissions.length !== permissions.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more permissions are invalid'
        });
      }
    }

    const groupPermission = await GroupPermission.create({
      name: name.trim(),
      description: description.trim(),
      company_id: req.user.company_id,
      permissions: permissions || [],
      created_by: req.user.id
    });

    await logEvent({
      event_type: 'permission_management',
      event_action: 'group_permission_created',
      event_description: `Group permission "${name}" created`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role
    });

    res.status(201).json({
      success: true,
      data: groupPermission,
      message: 'Group permission created successfully'
    });

  } catch (error) {
    console.error('Create group permission error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating group permission'
    });
  }
};

// @desc    Update group permission
// @route   PUT /api/company/group-permissions/:id
// @access  Private (Company Super Admin)
const updateGroupPermission = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;

    const groupPermission = await GroupPermission.findOne({
      _id: req.params.id,
      company_id: req.user.company_id
    });

    if (!groupPermission) {
      return res.status(404).json({
        success: false,
        message: 'Group permission not found'
      });
    }

    // Check if new name conflicts with existing
    if (name && name !== groupPermission.name) {
      const existingGroup = await GroupPermission.findOne({
        name: name.trim(),
        company_id: req.user.company_id,
        _id: { $ne: req.params.id }
      });

      if (existingGroup) {
        return res.status(400).json({
          success: false,
          message: 'A group permission with this name already exists'
        });
      }
    }

    // Validate permissions if provided
    if (permissions) {
      const validPermissions = await Permission.find({
        internal_name: { $in: permissions },
        is_active: true
      });

      if (validPermissions.length !== permissions.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more permissions are invalid'
        });
      }
      groupPermission.permissions = permissions;
    }

    if (name) groupPermission.name = name.trim();
    if (description) groupPermission.description = description.trim();

    await groupPermission.save();

    await logEvent({
      event_type: 'permission_management',
      event_action: 'group_permission_updated',
      event_description: `Group permission "${groupPermission.name}" updated`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role
    });

    res.status(200).json({
      success: true,
      data: groupPermission,
      message: 'Group permission updated successfully'
    });

  } catch (error) {
    console.error('Update group permission error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating group permission'
    });
  }
};

// @desc    Delete group permission
// @route   DELETE /api/company/group-permissions/:id
// @access  Private (Company Super Admin)
const deleteGroupPermission = async (req, res) => {
  try {
    const groupPermission = await GroupPermission.findOne({
      _id: req.params.id,
      company_id: req.user.company_id
    });

    if (!groupPermission) {
      return res.status(404).json({
        success: false,
        message: 'Group permission not found'
      });
    }

    // Check if any users are using this group permission
    const usersCount = await User.countDocuments({
      group_permissions: req.params.id,
      company_id: req.user.company_id
    });

    if (usersCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete group permission. ${usersCount} user(s) are currently assigned to this group.`
      });
    }

    groupPermission.is_active = false;
    await groupPermission.save();

    await logEvent({
      event_type: 'permission_management',
      event_action: 'group_permission_deleted',
      event_description: `Group permission "${groupPermission.name}" deleted`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role
    });

    res.status(200).json({
      success: true,
      message: 'Group permission deleted successfully'
    });

  } catch (error) {
    console.error('Delete group permission error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting group permission'
    });
  }
};

// @desc    Assign group permission to user
// @route   PUT /api/company/users/:userId/group-permission
// @access  Private (Company Super Admin)
const assignGroupPermissionToUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { group_permission_id } = req.body;

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

    // If group_permission_id is null, remove the assignment
    if (!group_permission_id) {
      user.group_permissions = null;
      await user.save();

      await logEvent({
        event_type: 'permission_management',
        event_action: 'group_permission_removed',
        event_description: `Group permission removed from user ${user.email}`,
        user_id: req.user.id,
        company_id: req.user.company_id,
        user_role: req.user.role
      });

      return res.status(200).json({
        success: true,
        data: user.group_permissions,
        message: 'Group permission removed from user'
      });
    }

    // Validate group permission exists and belongs to company
    const groupPermission = await GroupPermission.findOne({
      _id: group_permission_id,
      company_id: req.user.company_id,
      is_active: true
    });

    if (!groupPermission) {
      return res.status(404).json({
        success: false,
        message: 'Group permission not found'
      });
    }

    user.group_permissions = group_permission_id;
    await user.save();

    await logEvent({
      event_type: 'permission_management',
      event_action: 'group_permission_assigned',
      event_description: `Group permission "${groupPermission.name}" assigned to user ${user.email}`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role
    });

    res.status(200).json({
      success: true,
      data: user.group_permissions,
      message: 'Group permission assigned successfully'
    });

  } catch (error) {
    console.error('Assign group permission error:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning group permission'
    });
  }
};

module.exports = {
  getGroupPermissions,
  getGroupPermission,
  createGroupPermission,
  updateGroupPermission,
  deleteGroupPermission,
  assignGroupPermissionToUser
};