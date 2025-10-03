const Dealership = require('../models/Dealership');
const { logEvent } = require('./logs.controller');

// @desc    Get dealerships with pagination and search
// @route   GET /api/dealership
// @access  Private (Company Admin/Super Admin)
const getDealerships = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    const skip = (page - 1) * limit;

    let filter = {
      company_id: req.user.company_id
    };

    // Handle status filter
    if (status && status !== 'all') {
      filter.is_active = status === 'active';
    }

    if (search) {
      filter.$or = [
        { dealership_name: { $regex: search, $options: 'i' } },
        { dealership_address: { $regex: search, $options: 'i' } },
        { dealership_email: { $regex: search, $options: 'i' } },
        { dealership_id: { $regex: search, $options: 'i' } }
      ];
    }

    const dealerships = await Dealership.find(filter)
      .populate('created_by', 'first_name last_name email')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Dealership.countDocuments(filter);

    // Get stats
    const totalDealerships = await Dealership.countDocuments({ company_id: req.user.company_id });
    const activeDealerships = await Dealership.countDocuments({ 
      company_id: req.user.company_id, 
      is_active: true 
    });
    const inactiveDealerships = await Dealership.countDocuments({ 
      company_id: req.user.company_id, 
      is_active: false 
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
    console.error('Get dealerships error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving dealerships'
    });
  }
};

// @desc    Get single dealership
// @route   GET /api/dealership/:id
// @access  Private (Company Admin/Super Admin)
const getDealership = async (req, res) => {
  try {
    const dealership = await Dealership.findOne({
      _id: req.params.id,
      company_id: req.user.company_id
    }).populate('created_by', 'first_name last_name email');

    if (!dealership) {
      return res.status(404).json({
        success: false,
        message: 'Dealership not found'
      });
    }

    res.status(200).json({
      success: true,
      data: dealership
    });

  } catch (error) {
    console.error('Get dealership error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving dealership'
    });
  }
};

// @desc    Create new dealership
// @route   POST /api/dealership
// @access  Private (Company Super Admin)
const createDealership = async (req, res) => {
  try {
    const { dealership_name, dealership_address, dealership_email } = req.body;

    // Validate required fields
    if (!dealership_name || !dealership_address) {
      return res.status(400).json({
        success: false,
        message: 'Dealership name and address are required'
      });
    }

    // Check if dealership name already exists for this company
    const existingDealership = await Dealership.findOne({
      dealership_name,
      company_id: req.user.company_id
    });

    if (existingDealership) {
      return res.status(400).json({
        success: false,
        message: 'A dealership with this name already exists'
      });
    }

    // Check if email already exists for this company (if provided)
    if (dealership_email) {
      const existingEmail = await Dealership.findOne({
        dealership_email,
        company_id: req.user.company_id
      });

      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'A dealership with this email already exists'
        });
      }
    }

    const dealership = new Dealership({
      dealership_name,
      dealership_address,
      dealership_email,
      company_id: req.user.company_id,
      created_by: req.user.id
    });

    await dealership.save();

    // Populate created_by for response
    await dealership.populate('created_by', 'first_name last_name email');

    // Log the event
    await logEvent({
      event_type: 'dealership_operation',
      event_action: 'dealership_created',
      event_description: `New dealership created: ${dealership_name}`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role,
      metadata: {
        dealership_id: dealership.dealership_id,
        dealership_name
      }
    });

    res.status(201).json({
      success: true,
      message: 'Dealership created successfully',
      data: dealership
    });

  } catch (error) {
    console.error('Create dealership error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating dealership'
    });
  }
};

// @desc    Update dealership
// @route   PUT /api/dealership/:id
// @access  Private (Company Super Admin)
const updateDealership = async (req, res) => {
  try {
    const { dealership_name, dealership_address, dealership_email, is_active } = req.body;

    // Check if dealership name exists for another dealership in this company
    if (dealership_name) {
      const existingDealership = await Dealership.findOne({
        dealership_name,
        company_id: req.user.company_id,
        _id: { $ne: req.params.id }
      });

      if (existingDealership) {
        return res.status(400).json({
          success: false,
          message: 'A dealership with this name already exists'
        });
      }
    }

    // Check if email exists for another dealership in this company (if provided)
    if (dealership_email) {
      const existingEmail = await Dealership.findOne({
        dealership_email,
        company_id: req.user.company_id,
        _id: { $ne: req.params.id }
      });

      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'A dealership with this email already exists'
        });
      }
    }

    const dealership = await Dealership.findOneAndUpdate(
      { _id: req.params.id, company_id: req.user.company_id },
      {
        dealership_name,
        dealership_address,
        dealership_email,
        is_active,
        updated_at: new Date()
      },
      { new: true, runValidators: true }
    ).populate('created_by', 'first_name last_name email');

    if (!dealership) {
      return res.status(404).json({
        success: false,
        message: 'Dealership not found'
      });
    }

    // Log the event
    await logEvent({
      event_type: 'dealership_operation',
      event_action: 'dealership_updated',
      event_description: `Dealership updated: ${dealership.dealership_name}`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role,
      metadata: {
        dealership_id: dealership.dealership_id,
        dealership_name: dealership.dealership_name
      }
    });

    res.status(200).json({
      success: true,
      message: 'Dealership updated successfully',
      data: dealership
    });

  } catch (error) {
    console.error('Update dealership error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating dealership'
    });
  }
};

// @desc    Delete dealership (soft delete)
// @route   DELETE /api/dealership/:id
// @access  Private (Company Super Admin)
const deleteDealership = async (req, res) => {
  try {
    const dealership = await Dealership.findOneAndUpdate(
      { _id: req.params.id, company_id: req.user.company_id },
      { is_active: false, updated_at: new Date() },
      { new: true }
    );

    if (!dealership) {
      return res.status(404).json({
        success: false,
        message: 'Dealership not found'
      });
    }

    // Log the event
    await logEvent({
      event_type: 'dealership_operation',
      event_action: 'dealership_deleted',
      event_description: `Dealership deleted: ${dealership.dealership_name}`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role,
      metadata: {
        dealership_id: dealership.dealership_id,
        dealership_name: dealership.dealership_name
      }
    });

    res.status(200).json({
      success: true,
      message: 'Dealership deleted successfully'
    });

  } catch (error) {
    console.error('Delete dealership error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting dealership'
    });
  }
};

// @desc    Toggle dealership status
// @route   PATCH /api/dealership/:id/status
// @access  Private (Company Super Admin)
const toggleDealershipStatus = async (req, res) => {
  try {
    const { is_active } = req.body;

    const dealership = await Dealership.findOneAndUpdate(
      { _id: req.params.id, company_id: req.user.company_id },
      { is_active, updated_at: new Date() },
      { new: true }
    );

    if (!dealership) {
      return res.status(404).json({
        success: false,
        message: 'Dealership not found'
      });
    }

    // Log the event
    await logEvent({
      event_type: 'dealership_operation',
      event_action: 'dealership_status_updated',
      event_description: `Dealership ${dealership.dealership_name} status changed to ${is_active ? 'active' : 'inactive'}`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role,
      metadata: {
        dealership_id: dealership.dealership_id,
        dealership_name: dealership.dealership_name,
        new_status: is_active
      }
    });

    res.status(200).json({
      success: true,
      data: dealership,
      message: `Dealership ${is_active ? 'activated' : 'deactivated'} successfully`
    });

  } catch (error) {
    console.error('Toggle dealership status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating dealership status'
    });
  }
};

// @desc    Get dealerships for dropdown (active only)
// @route   GET /api/dealership/dropdown
// @access  Private (Company Admin/Super Admin)
const getDealershipsDropdown = async (req, res) => {
  try {
    const dealerships = await Dealership.find({
      company_id: req.user.company_id,
      is_active: true
    })
    .select('_id dealership_id dealership_name dealership_address')
    .sort({ dealership_name: 1 });

    res.status(200).json({
      success: true,
      data: dealerships
    });

  } catch (error) {
    console.error('Get dealerships dropdown error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving dealerships'
    });
  }
};

module.exports = {
  getDealerships,
  getDealership,
  createDealership,
  updateDealership,
  deleteDealership,
  toggleDealershipStatus,
  getDealershipsDropdown
};