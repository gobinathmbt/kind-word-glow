const ServiceBay = require('../models/ServiceBay');
const User = require('../models/User');
const Dealership = require('../models/Dealership');
const { logEvent } = require('./logs.controller');

// @desc    Get all service bays
// @route   GET /api/service-bay
// @access  Private (Company Super Admin)
const getServiceBays = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, dealership_id, is_active } = req.query;
    const skip = (page - 1) * limit;
    const numericLimit = parseInt(limit);
    const numericPage = parseInt(page);

    let filter = {
      company_id: req.user.company_id
    };

    // Handle dealership-based access
    if (!req.user.is_primary_admin && req.user.dealership_ids && req.user.dealership_ids.length > 0) {
      const dealershipObjectIds = req.user.dealership_ids.map(dealer => dealer._id);
      filter.dealership_id = { $in: dealershipObjectIds };
    }

    if (dealership_id) {
      filter.dealership_id = dealership_id;
    }

    if (is_active !== undefined) {
      filter.is_active = is_active === 'true';
    }

    if (search) {
      filter.$or = [
        { bay_name: { $regex: search, $options: 'i' } },
        { bay_description: { $regex: search, $options: 'i' } }
      ];
    }

    const [bays, total] = await Promise.all([
      ServiceBay.find(filter)
        .populate('dealership_id', 'dealership_name')
        .populate('bay_users', 'first_name last_name email username')
        .populate('primary_admin', 'first_name last_name email username')
        .populate('created_by', 'first_name last_name')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(numericLimit)
        .lean(),
      ServiceBay.countDocuments(filter)
    ]);

    const stats = {
      totalBays: total,
      activeBays: await ServiceBay.countDocuments({ ...filter, is_active: true }),
      inactiveBays: await ServiceBay.countDocuments({ ...filter, is_active: false })
    };

    res.status(200).json({
      success: true,
      data: bays,
      total,
      stats,
      pagination: {
        current_page: numericPage,
        total_pages: Math.ceil(total / numericLimit),
        total_records: total,
        per_page: numericLimit
      }
    });
  } catch (error) {
    console.error('Get service bays error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving service bays'
    });
  }
};

// @desc    Get service bay by ID
// @route   GET /api/service-bay/:id
// @access  Private (Company Super Admin)
const getServiceBay = async (req, res) => {
  try {
    const bay = await ServiceBay.findOne({
      _id: req.params.id,
      company_id: req.user.company_id
    })
      .populate('dealership_id', 'dealership_name dealership_address')
      .populate('bay_users', 'first_name last_name email username')
      .populate('primary_admin', 'first_name last_name email username')
      .populate('created_by', 'first_name last_name');

    if (!bay) {
      return res.status(404).json({
        success: false,
        message: 'Service bay not found'
      });
    }

    res.status(200).json({
      success: true,
      data: bay
    });
  } catch (error) {
    console.error('Get service bay error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving service bay'
    });
  }
};

// @desc    Create service bay
// @route   POST /api/service-bay
// @access  Private (Company Super Admin)
const createServiceBay = async (req, res) => {
  try {
    const {
      bay_name,
      bay_description,
      dealership_id,
      bay_users,
      primary_admin,
      bay_timings
    } = req.body;

    // Validate required fields
    if (!bay_name || !dealership_id || !primary_admin) {
      return res.status(400).json({
        success: false,
        message: 'Bay name, dealership, and primary admin are required'
      });
    }

    // Verify dealership exists and belongs to company
    const dealership = await Dealership.findOne({
      _id: dealership_id,
      company_id: req.user.company_id,
      is_active: true
    });

    if (!dealership) {
      return res.status(404).json({
        success: false,
        message: 'Dealership not found or inactive'
      });
    }

    // Verify primary admin exists and is company_admin
    const primaryAdminUser = await User.findOne({
      _id: primary_admin,
      company_id: req.user.company_id,
      role: 'company_admin',
      is_active: true
    });

    if (!primaryAdminUser) {
      return res.status(404).json({
        success: false,
        message: 'Primary admin must be an active company admin user'
      });
    }

    // Verify all bay users exist and are company_admin
    if (bay_users && bay_users.length > 0) {
      const users = await User.find({
        _id: { $in: bay_users },
        company_id: req.user.company_id,
        role: 'company_admin',
        is_active: true
      });

      if (users.length !== bay_users.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more bay users are invalid or not company admins'
        });
      }
    }

    // Create default bay timings if not provided
    const defaultTimings = bay_timings || [
      { day_of_week: 'monday', start_time: '09:00', end_time: '18:00', is_working_day: true },
      { day_of_week: 'tuesday', start_time: '09:00', end_time: '18:00', is_working_day: true },
      { day_of_week: 'wednesday', start_time: '09:00', end_time: '18:00', is_working_day: true },
      { day_of_week: 'thursday', start_time: '09:00', end_time: '18:00', is_working_day: true },
      { day_of_week: 'friday', start_time: '09:00', end_time: '18:00', is_working_day: true },
      { day_of_week: 'saturday', start_time: '09:00', end_time: '14:00', is_working_day: true },
      { day_of_week: 'sunday', start_time: '09:00', end_time: '18:00', is_working_day: false }
    ];

    const bay = new ServiceBay({
      bay_name,
      bay_description,
      dealership_id,
      company_id: req.user.company_id,
      bay_users: bay_users || [],
      primary_admin,
      bay_timings: defaultTimings,
      bay_holidays: [],
      created_by: req.user.id
    });

    await bay.save();

    await logEvent({
      event_type: 'service_bay_operation',
      event_action: 'bay_created',
      event_description: `Service bay ${bay_name} created`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role,
      metadata: {
        bay_id: bay._id,
        bay_name,
        dealership_id
      }
    });

    res.status(201).json({
      success: true,
      message: 'Service bay created successfully',
      data: bay
    });
  } catch (error) {
    console.error('Create service bay error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating service bay'
    });
  }
};

// @desc    Update service bay
// @route   PUT /api/service-bay/:id
// @access  Private (Company Super Admin)
const updateServiceBay = async (req, res) => {
  try {
    const bay = await ServiceBay.findOne({
      _id: req.params.id,
      company_id: req.user.company_id
    });

    if (!bay) {
      return res.status(404).json({
        success: false,
        message: 'Service bay not found'
      });
    }

    const {
      bay_name,
      bay_description,
      dealership_id,
      bay_users,
      primary_admin,
      bay_timings
    } = req.body;

    if (bay_name) bay.bay_name = bay_name;
    if (bay_description !== undefined) bay.bay_description = bay_description;
    
    if (dealership_id) {
      const dealership = await Dealership.findOne({
        _id: dealership_id,
        company_id: req.user.company_id,
        is_active: true
      });

      if (!dealership) {
        return res.status(404).json({
          success: false,
          message: 'Dealership not found or inactive'
        });
      }

      bay.dealership_id = dealership_id;
    }

    if (primary_admin) {
      const primaryAdminUser = await User.findOne({
        _id: primary_admin,
        company_id: req.user.company_id,
        role: 'company_admin',
        is_active: true
      });

      if (!primaryAdminUser) {
        return res.status(404).json({
          success: false,
          message: 'Primary admin must be an active company admin user'
        });
      }

      bay.primary_admin = primary_admin;
    }

    if (bay_users) {
      const users = await User.find({
        _id: { $in: bay_users },
        company_id: req.user.company_id,
        role: 'company_admin',
        is_active: true
      });

      if (users.length !== bay_users.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more bay users are invalid or not company admins'
        });
      }

      bay.bay_users = bay_users;
    }

    if (bay_timings) {
      bay.bay_timings = bay_timings;
    }

    await bay.save();

    await logEvent({
      event_type: 'service_bay_operation',
      event_action: 'bay_updated',
      event_description: `Service bay ${bay.bay_name} updated`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role,
      metadata: {
        bay_id: bay._id,
        bay_name: bay.bay_name
      }
    });

    res.status(200).json({
      success: true,
      message: 'Service bay updated successfully',
      data: bay
    });
  } catch (error) {
    console.error('Update service bay error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating service bay'
    });
  }
};

// @desc    Delete service bay
// @route   DELETE /api/service-bay/:id
// @access  Private (Company Super Admin)
const deleteServiceBay = async (req, res) => {
  try {
    const bay = await ServiceBay.findOne({
      _id: req.params.id,
      company_id: req.user.company_id
    });

    if (!bay) {
      return res.status(404).json({
        success: false,
        message: 'Service bay not found'
      });
    }

    await bay.deleteOne();

    await logEvent({
      event_type: 'service_bay_operation',
      event_action: 'bay_deleted',
      event_description: `Service bay ${bay.bay_name} deleted`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role,
      metadata: {
        bay_id: bay._id,
        bay_name: bay.bay_name
      }
    });

    res.status(200).json({
      success: true,
      message: 'Service bay deleted successfully'
    });
  } catch (error) {
    console.error('Delete service bay error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting service bay'
    });
  }
};

// @desc    Toggle service bay status
// @route   PATCH /api/service-bay/:id/status
// @access  Private (Company Super Admin)
const toggleServiceBayStatus = async (req, res) => {
  try {
    const bay = await ServiceBay.findOne({
      _id: req.params.id,
      company_id: req.user.company_id
    });

    if (!bay) {
      return res.status(404).json({
        success: false,
        message: 'Service bay not found'
      });
    }

    bay.is_active = req.body.is_active;
    await bay.save();

    await logEvent({
      event_type: 'service_bay_operation',
      event_action: 'bay_status_toggled',
      event_description: `Service bay ${bay.bay_name} status changed to ${bay.is_active ? 'active' : 'inactive'}`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role,
      metadata: {
        bay_id: bay._id,
        bay_name: bay.bay_name,
        new_status: bay.is_active
      }
    });

    res.status(200).json({
      success: true,
      message: `Service bay ${bay.is_active ? 'activated' : 'deactivated'} successfully`,
      data: bay
    });
  } catch (error) {
    console.error('Toggle service bay status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating service bay status'
    });
  }
};

// @desc    Add/Update bay holiday
// @route   POST /api/service-bay/:id/holiday
// @access  Private (Company Admin - Bay User)
const addBayHoliday = async (req, res) => {
  try {
    const { date, reason } = req.body;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required'
      });
    }

    const bay = await ServiceBay.findOne({
      _id: req.params.id,
      company_id: req.user.company_id,
      bay_users: req.user.id
    });

    if (!bay) {
      return res.status(404).json({
        success: false,
        message: 'Service bay not found or you are not authorized'
      });
    }

    // Check if holiday already exists for this date
    const holidayDate = new Date(date);
    holidayDate.setHours(0, 0, 0, 0);
    
    const existingHolidayIndex = bay.bay_holidays.findIndex(h => {
      const hDate = new Date(h.date);
      hDate.setHours(0, 0, 0, 0);
      return hDate.getTime() === holidayDate.getTime();
    });

    if (existingHolidayIndex !== -1) {
      bay.bay_holidays[existingHolidayIndex].reason = reason || '';
      bay.bay_holidays[existingHolidayIndex].marked_by = req.user.id;
      bay.bay_holidays[existingHolidayIndex].marked_at = new Date();
    } else {
      bay.bay_holidays.push({
        date: holidayDate,
        reason: reason || '',
        marked_by: req.user.id
      });
    }

    await bay.save();

    res.status(200).json({
      success: true,
      message: 'Holiday marked successfully',
      data: bay
    });
  } catch (error) {
    console.error('Add bay holiday error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding holiday'
    });
  }
};

// @desc    Remove bay holiday
// @route   DELETE /api/service-bay/:id/holiday/:holidayId
// @access  Private (Company Admin - Bay User)
const removeBayHoliday = async (req, res) => {
  try {
    const bay = await ServiceBay.findOne({
      _id: req.params.id,
      company_id: req.user.company_id,
      bay_users: req.user.id
    });

    if (!bay) {
      return res.status(404).json({
        success: false,
        message: 'Service bay not found or you are not authorized'
      });
    }

    bay.bay_holidays = bay.bay_holidays.filter(
      h => h._id.toString() !== req.params.holidayId
    );

    await bay.save();

    res.status(200).json({
      success: true,
      message: 'Holiday removed successfully',
      data: bay
    });
  } catch (error) {
    console.error('Remove bay holiday error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing holiday'
    });
  }
};

// @desc    Get bays for dropdown (for booking)
// @route   GET /api/service-bay/dropdown
// @access  Private (Company Admin/Super Admin)
const getBaysDropdown = async (req, res) => {
  try {
    const { is_primary_admin, company_id, dealership_ids } = req.user;

    let filter = {
      company_id,
      is_active: true
    };

    if (!is_primary_admin) {
      const allowedDealershipIds = dealership_ids.map(d => d._id);
      filter.dealership_id = { $in: allowedDealershipIds };
    }

    const bays = await ServiceBay.find(filter)
      .select('bay_name dealership_id bay_timings bay_users primary_admin bay_description')
      .populate('dealership_id', 'dealership_name')
      .populate('primary_admin', 'email first_name last_name')
      .populate('bay_users', 'email first_name last_name')
      .lean();

    const transformedBays = bays.map(bay => ({
      ...bay,
      user_count: bay.bay_users ? bay.bay_users.length : 0,
      primary_admin_email: bay.primary_admin ? bay.primary_admin.email : 'N/A',
      primary_admin_name: bay.primary_admin
        ? `${bay.primary_admin.first_name || ''} ${bay.primary_admin.last_name || ''}`.trim()
        : 'N/A'
    }));

    res.status(200).json({
      success: true,
      data: transformedBays
    });
  } catch (error) {
    console.error('Get bays dropdown error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving bays'
    });
  }
};

module.exports = {
  getServiceBays,
  getServiceBay,
  createServiceBay,
  updateServiceBay,
  deleteServiceBay,
  toggleServiceBayStatus,
  addBayHoliday,
  removeBayHoliday,
  getBaysDropdown
};
