
const DropdownMaster = require('../models/DropdownMaster');
const { logEvent } = require('./logs.controller');

// @desc    Get all dropdowns for company with pagination and search
// @route   GET /api/dropdown
// @access  Private (Company Admin/Super Admin)
const getDropdowns = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = 'all', dealership_id } = req.query;
    const skip = (page - 1) * limit;

    // Build search query
    let searchQuery = {
      company_id: req.user.company_id
    };

    // If user is not primary admin, filter by their dealership
    if (!req.user.is_primary_admin && req.user.dealership_id) {
      searchQuery.dealership_id = req.user.dealership_id;
    }

    // If dealership_id is explicitly provided in query, use it
    if (dealership_id && dealership_id !== 'all') {
      searchQuery.dealership_id = dealership_id;
    }

    // Filter by status
    if (status !== 'all') {
      searchQuery.is_active = status === 'active';
    }

    if (search) {
      searchQuery.$or = [
        { dropdown_name: { $regex: search, $options: 'i' } },
        { display_name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const dropdowns = await DropdownMaster.find(searchQuery)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await DropdownMaster.countDocuments(searchQuery);

    res.status(200).json({
      success: true,
      data: dropdowns,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get dropdowns error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving dropdowns'
    });
  }
};

// @desc    Create new dropdown
// @route   POST /api/dropdown
// @access  Private (Company Super Admin)
const createDropdown = async (req, res) => {
  try {
    // Build search query for duplicates
    let duplicateQuery = {
      company_id: req.user.company_id,
      $or: [
        { dropdown_name: req.body.dropdown_name },
        { display_name: req.body.display_name }
      ]
    };

    // If user is not primary admin, check duplicates within their dealership
    if (!req.user.is_primary_admin && req.user.dealership_id) {
      duplicateQuery.dealership_id = req.user.dealership_id;
    }

    // If dealership_id is provided in request, include it in duplicate check
    if (req.body.dealership_id) {
      duplicateQuery.dealership_id = req.body.dealership_id;
    }

    // Check for duplicate dropdown_name or display_name
    const existingDropdown = await DropdownMaster.findOne(duplicateQuery);

    if (existingDropdown) {
      return res.status(400).json({
        success: false,
        message: 'Dropdown name or display name already exists'
      });
    }

    const dropdown = new DropdownMaster({
      ...req.body,
      company_id: req.user.company_id,
      created_by: req.user.id
    });

    // If user is not primary admin, assign their dealership
    if (!req.user.is_primary_admin && req.user.dealership_id) {
      dropdown.dealership_id = req.user.dealership_id;
    }

    await dropdown.save();

    await logEvent({
      event_type: 'dropdown_management',
      event_action: 'dropdown_created',
      event_description: `Dropdown ${dropdown.display_name} created`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role
    });

    res.status(201).json({
      success: true,
      data: dropdown
    });

  } catch (error) {
    console.error('Create dropdown error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating dropdown'
    });
  }
};

// @desc    Update dropdown
// @route   PUT /api/dropdown/:id
// @access  Private (Company Super Admin)
const updateDropdown = async (req, res) => {
  try {
    // Check for duplicate dropdown_name or display_name within company (excluding current dropdown)
    if (req.body.dropdown_name || req.body.display_name) {
      const existingDropdown = await DropdownMaster.findOne({
        _id: { $ne: req.params.id },
        company_id: req.user.company_id,
        $or: [
          ...(req.body.dropdown_name ? [{ dropdown_name: req.body.dropdown_name }] : []),
          ...(req.body.display_name ? [{ display_name: req.body.display_name }] : [])
        ]
      });

      if (existingDropdown) {
        return res.status(400).json({
          success: false,
          message: 'Dropdown name or display name already exists'
        });
      }
    }

    const dropdown = await DropdownMaster.findOneAndUpdate(
      { _id: req.params.id, company_id: req.user.company_id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!dropdown) {
      return res.status(404).json({
        success: false,
        message: 'Dropdown not found'
      });
    }

    res.status(200).json({
      success: true,
      data: dropdown
    });

  } catch (error) {
    console.error('Update dropdown error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating dropdown'
    });
  }
};

// @desc    Delete dropdown
// @route   DELETE /api/dropdown/:id
// @access  Private (Company Super Admin)
const deleteDropdown = async (req, res) => {
  try {
    const dropdown = await DropdownMaster.findOneAndDelete({
      _id: req.params.id,
      company_id: req.user.company_id
    });

    if (!dropdown) {
      return res.status(404).json({
        success: false,
        message: 'Dropdown not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Dropdown deleted successfully'
    });

  } catch (error) {
    console.error('Delete dropdown error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting dropdown'
    });
  }
};

// @desc    Add value to dropdown
// @route   POST /api/dropdown/:id/values
// @access  Private (Company Super Admin)
const addValue = async (req, res) => {
  try {
    const dropdown = await DropdownMaster.findOne({
      _id: req.params.id,
      company_id: req.user.company_id
    });

    if (!dropdown) {
      return res.status(404).json({
        success: false,
        message: 'Dropdown not found'
      });
    }

    // Check for duplicate option_value or display_value
    const existingValue = dropdown.values.find(
      value =>
        value.option_value.toLowerCase() === req.body.option_value.toLowerCase() ||
        (req.body.display_value && value.display_value &&
          value.display_value.toLowerCase() === req.body.display_value.toLowerCase())
    );

    if (existingValue) {
      return res.status(400).json({
        success: false,
        message: 'Option value or display value already exists'
      });
    }

    // Set display_order to highest + 1
    const maxDisplayOrder = dropdown.values.reduce((max, value) =>
      Math.max(max, value.display_order || 0), 0
    );

    const newValue = {
      ...req.body,
      display_order: req.body.display_order || (maxDisplayOrder + 1),
      created_by: req.user.id
    };

    dropdown.values.push(newValue);
    await dropdown.save();

    res.status(201).json({
      success: true,
      data: dropdown
    });

  } catch (error) {
    console.error('Add dropdown value error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding dropdown value'
    });
  }
};

// @desc    Update dropdown value
// @route   PUT /api/dropdown/:id/values/:valueId
// @access  Private (Company Super Admin)
const updateValue = async (req, res) => {
  try {
    const dropdown = await DropdownMaster.findOne({
      _id: req.params.id,
      company_id: req.user.company_id
    });

    if (!dropdown) {
      return res.status(404).json({
        success: false,
        message: 'Dropdown not found'
      });
    }

    const value = dropdown.values.id(req.params.valueId);
    if (!value) {
      return res.status(404).json({
        success: false,
        message: 'Value not found'
      });
    }

    // Check for duplicate option_value or display_value (excluding current value)
    if (req.body.option_value || req.body.display_value) {
      const existingValue = dropdown.values.find(
        v => v._id.toString() !== req.params.valueId &&
          (
            (req.body.option_value && v.option_value.toLowerCase() === req.body.option_value.toLowerCase()) ||
            (req.body.display_value && v.display_value && v.display_value.toLowerCase() === req.body.display_value.toLowerCase())
          )
      );

      if (existingValue) {
        return res.status(400).json({
          success: false,
          message: 'Option value or display value already exists'
        });
      }
    }

    // If this value is being set as default, make all other values non-default
    if (req.body.is_default) {
      dropdown.values.forEach(v => {
        if (v._id.toString() !== req.params.valueId) {
          v.is_default = false;
        }
      });
    }

    Object.assign(value, req.body);
    await dropdown.save();

    res.status(200).json({
      success: true,
      data: dropdown
    });

  } catch (error) {
    console.error('Update dropdown value error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating dropdown value'
    });
  }
};

// @desc    Update values order
// @route   PUT /api/dropdown/:id/values/reorder
// @access  Private (Company Super Admin)
const reorderValues = async (req, res) => {
  try {
    const { valueIds } = req.body;
    console.log('Reordering values:', valueIds);
    const dropdown = await DropdownMaster.findOne({
      _id: req.params.id,
      company_id: req.user.company_id
    });

    if (!dropdown) {
      return res.status(404).json({
        success: false,
        message: 'Dropdown not found'
      });
    }

    // Update display_order for each value based on the new order
    valueIds.forEach((valueId, index) => {
      const value = dropdown.values.id(valueId);
      if (value) {
        value.display_order = index;
      }
    });

    // Mark the values array as modified to ensure Mongoose saves the changes
    dropdown.markModified('values');
    await dropdown.save();

    // Return the updated dropdown with sorted values
    const updatedDropdown = await DropdownMaster.findById(req.params.id);
    updatedDropdown.values.sort((a, b) => a.display_order - b.display_order);

    res.status(200).json({
      success: true,
      data: updatedDropdown
    });

  } catch (error) {
    console.error('Reorder values error:', error);
    res.status(500).json({
      success: false,
      message: 'Error reordering values'
    });
  }
};

// @desc    Delete dropdown value
// @route   DELETE /api/dropdown/:id/values/:valueId
// @access  Private (Company Super Admin)
const deleteValue = async (req, res) => {
  try {
    const dropdown = await DropdownMaster.findOne({
      _id: req.params.id,
      company_id: req.user.company_id
    });

    if (!dropdown) {
      return res.status(404).json({
        success: false,
        message: 'Dropdown not found'
      });
    }

    dropdown.values.pull(req.params.valueId);
    await dropdown.save();

    res.status(200).json({
      success: true,
      data: dropdown
    });

  } catch (error) {
    console.error('Delete dropdown value error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting dropdown value'
    });
  }
};

// @desc    Get master inspection categories
// @route   GET /api/dropdown/master_inspection
// @access  Private (Company Admin/Super Admin)
const getMasterInspection = async (req, res) => {
  try {
    // Return predefined master inspection categories
    const masterCategories = [
      {
        category_id: 'at_arrival',
        category_name: 'At Arrival',
        description: 'Initial vehicle inspection upon arrival'
      },
      {
        category_id: 'after_reconditioning',
        category_name: 'After Reconditioning',
        description: 'Inspection after vehicle reconditioning'
      },
      {
        category_id: 'after_grooming',
        category_name: 'After Grooming',
        description: 'Final inspection after grooming'
      }
    ];

    res.status(200).json({
      success: true,
      data: masterCategories
    });

  } catch (error) {
    console.error('Get master inspection error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving master inspection categories'
    });
  }
};

module.exports = {
  getDropdowns,
  createDropdown,
  updateDropdown,
  deleteDropdown,
  addValue,
  updateValue,
  deleteValue,
  reorderValues,
  getMasterInspection
};
