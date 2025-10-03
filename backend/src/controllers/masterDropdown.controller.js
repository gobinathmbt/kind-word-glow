
const MasterDropdown = require('../models/MasterDropdown');
const { logEvent } = require('./logs.controller');

// @desc    Get all master dropdowns with pagination and search
// @route   GET /api/master/dropdowns
// @access  Private (Master Admin)
const getDropdowns = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = 'all' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const query = {};
    if (status !== 'all') {
      query.is_active = status === 'active';
    }
    if (search) {
      query.$or = [
        { dropdown_name: { $regex: search, $options: 'i' } },
        { display_name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const [dropdowns, total] = await Promise.all([
      MasterDropdown.find(query).sort({ created_at: -1 }).skip(skip).limit(limitNum),
      MasterDropdown.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: dropdowns,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Master: Get dropdowns error:', error);
    res.status(500).json({ success: false, message: 'Error retrieving dropdowns' });
  }
};

// @desc    Get all active master dropdowns for permissions module selection
// @route   GET /api/master/dropdowns/modules
// @access  Private (Master Admin)
const getMasterdropdownvalues = async (req, res) => {
  try {
    const { dropdown_name } = req.body; // this will be an array

    if (!dropdown_name || !Array.isArray(dropdown_name)) {
      return res.status(400).json({
        success: false,
        message: "dropdown_name must be an array",
      });
    }

    // Fetch only matching dropdowns
    const dropdowns = await MasterDropdown.find({
      dropdown_name: { $in: dropdown_name },
      is_active: true,
    })
      .lean();

    res.status(200).json({
      success: true,
      data: dropdowns, // return full data of matched dropdowns
    });
  } catch (error) {
    console.error("Master: Get modules for permissions error:", error);
    res.status(500).json({ success: false, message: "Error retrieving modules" });
  }
};

// @desc    Create new master dropdown
// @route   POST /api/master/dropdowns
// @access  Private (Master Admin)
const createDropdown = async (req, res) => {
  try {
    // Duplicate check across collection
    const existing = await MasterDropdown.findOne({
      $or: [{ dropdown_name: req.body.dropdown_name }, { display_name: req.body.display_name }],
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Dropdown name or display name already exists',
      });
    }

    const dropdown = new MasterDropdown({
      ...req.body,
      created_by: req.user.id,
    });

    // Initialize display_order for existing values if provided
    if (Array.isArray(dropdown.values) && dropdown.values.length) {
      dropdown.values = dropdown.values.map((v, idx) => ({
        ...v.toObject?.() || v,
        display_order: v.display_order ?? idx,
        created_by: req.user.id,
      }));
    }

    await dropdown.save();

    await logEvent({
      event_type: 'master_dropdown_management',
      event_action: 'dropdown_created',
      event_description: `Master dropdown ${dropdown.display_name} created`,
      user_id: req.user.id,
      user_role: req.user.role,
      resource_type: 'master_dropdown',
      resource_id: dropdown._id.toString(),
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
    });

    res.status(201).json({ success: true, data: dropdown });
  } catch (error) {
    console.error('Master: Create dropdown error:', error);
    res.status(500).json({ success: false, message: 'Error creating dropdown' });
  }
};

// @desc    Update master dropdown
// @route   PUT /api/master/dropdowns/:id
// @access  Private (Master Admin)
const updateDropdown = async (req, res) => {
  try {
    // Duplicate check excluding current
    if (req.body.dropdown_name || req.body.display_name) {
      const dup = await MasterDropdown.findOne({
        _id: { $ne: req.params.id },
        $or: [
          ...(req.body.dropdown_name ? [{ dropdown_name: req.body.dropdown_name }] : []),
          ...(req.body.display_name ? [{ display_name: req.body.display_name }] : []),
        ],
      });
      if (dup) {
        return res.status(400).json({
          success: false,
          message: 'Dropdown name or display name already exists',
        });
      }
    }

    const dropdown = await MasterDropdown.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!dropdown) {
      return res.status(404).json({ success: false, message: 'Dropdown not found' });
    }

    res.status(200).json({ success: true, data: dropdown });
  } catch (error) {
    console.error('Master: Update dropdown error:', error);
    res.status(500).json({ success: false, message: 'Error updating dropdown' });
  }
};

// @desc    Delete master dropdown
// @route   DELETE /api/master/dropdowns/:id
// @access  Private (Master Admin)
const deleteDropdown = async (req, res) => {
  try {
    const dropdown = await MasterDropdown.findByIdAndDelete(req.params.id);
    if (!dropdown) {
      return res.status(404).json({ success: false, message: 'Dropdown not found' });
    }

    res.status(200).json({ success: true, message: 'Dropdown deleted successfully' });
  } catch (error) {
    console.error('Master: Delete dropdown error:', error);
    res.status(500).json({ success: false, message: 'Error deleting dropdown' });
  }
};

// @desc    Add value to master dropdown
// @route   POST /api/master/dropdowns/:id/values
// @access  Private (Master Admin)
const addValue = async (req, res) => {
  try {
    const dropdown = await MasterDropdown.findById(req.params.id);
    if (!dropdown) {
      return res.status(404).json({ success: false, message: 'Dropdown not found' });
    }

    // Duplicate check for value
    const exists = dropdown.values.find(v =>
      v.option_value.toLowerCase() === req.body.option_value.toLowerCase() ||
      (req.body.display_value &&
        v.display_value &&
        v.display_value.toLowerCase() === req.body.display_value.toLowerCase())
    );
    if (exists) {
      return res.status(400).json({ success: false, message: 'Option value or display value already exists' });
    }

    // Determine next display_order
    const maxOrder = dropdown.values.reduce((max, v) => Math.max(max, v.display_order || 0), 0);
    const newValue = {
      ...req.body,
      display_order: req.body.display_order ?? (maxOrder + 1),
      created_by: req.user.id,
    };

    // If setting as default, unset existing defaults
    if (newValue.is_default) {
      dropdown.values.forEach(v => { v.is_default = false; });
    }

    dropdown.values.push(newValue);
    await dropdown.save();

    res.status(201).json({ success: true, data: dropdown });
  } catch (error) {
    console.error('Master: Add value error:', error);
    res.status(500).json({ success: false, message: 'Error adding dropdown value' });
  }
};

// @desc    Update value in master dropdown
// @route   PUT /api/master/dropdowns/:id/values/:valueId
// @access  Private (Master Admin)
const updateValue = async (req, res) => {
  try {
    const dropdown = await MasterDropdown.findById(req.params.id);
    if (!dropdown) {
      return res.status(404).json({ success: false, message: 'Dropdown not found' });
    }

    const value = dropdown.values.id(req.params.valueId);
    if (!value) {
      return res.status(404).json({ success: false, message: 'Value not found' });
    }

    // Duplicate check excluding current value
    if (req.body.option_value || req.body.display_value) {
      const dup = dropdown.values.find(v =>
        v._id.toString() !== req.params.valueId &&
        (
          (req.body.option_value && v.option_value.toLowerCase() === req.body.option_value.toLowerCase()) ||
          (req.body.display_value && v.display_value && v.display_value.toLowerCase() === req.body.display_value.toLowerCase())
        )
      );
      if (dup) {
        return res.status(400).json({ success: false, message: 'Option value or display value already exists' });
      }
    }

    // If setting as default, unset other defaults
    if (req.body.is_default) {
      dropdown.values.forEach(v => {
        if (v._id.toString() !== req.params.valueId) v.is_default = false;
      });
    }

    Object.assign(value, req.body);
    dropdown.markModified('values');
    await dropdown.save();

    res.status(200).json({ success: true, data: dropdown });
  } catch (error) {
    console.error('Master: Update value error:', error);
    res.status(500).json({ success: false, message: 'Error updating dropdown value' });
  }
};

// @desc    Reorder values in master dropdown
// @route   PUT /api/master/dropdowns/:id/reorder/values
// @access  Private (Master Admin)
const reorderValues = async (req, res) => {
  try {
    const { valueIds } = req.body;
    if (!Array.isArray(valueIds)) {
      return res.status(400).json({ success: false, message: 'valueIds must be an array' });
    }

    const dropdown = await MasterDropdown.findById(req.params.id);
    if (!dropdown) {
      return res.status(404).json({ success: false, message: 'Dropdown not found' });
    }

    valueIds.forEach((valueId, index) => {
      const v = dropdown.values.id(valueId);
      if (v) v.display_order = index;
    });

    dropdown.markModified('values');
    await dropdown.save();

    // Return sorted values
    const updated = await MasterDropdown.findById(req.params.id);
    updated.values.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error('Master: Reorder values error:', error);
    res.status(500).json({ success: false, message: 'Error reordering values' });
  }
};

// @desc    Delete value from master dropdown
// @route   DELETE /api/master/dropdowns/:id/values/:valueId
// @access  Private (Master Admin)
const deleteValue = async (req, res) => {
  try {
    const dropdown = await MasterDropdown.findById(req.params.id);
    if (!dropdown) {
      return res.status(404).json({ success: false, message: 'Dropdown not found' });
    }

    dropdown.values.pull(req.params.valueId);
    await dropdown.save();

    res.status(200).json({ success: true, data: dropdown });
  } catch (error) {
    console.error('Master: Delete value error:', error);
    res.status(500).json({ success: false, message: 'Error deleting dropdown value' });
  }
};

// @desc    Get master inspection categories (static)
// @route   GET /api/master/dropdowns/master_inspection
// @access  Private (Master Admin)
const getMasterInspection = async (_req, res) => {
  try {
    const masterCategories = [
      { category_id: 'at_arrival', category_name: 'At Arrival', description: 'Initial vehicle inspection upon arrival' },
      { category_id: 'after_reconditioning', category_name: 'After Reconditioning', description: 'Inspection after vehicle reconditioning' },
      { category_id: 'after_grooming', category_name: 'After Grooming', description: 'Final inspection after grooming' },
    ];

    res.status(200).json({ success: true, data: masterCategories });
  } catch (error) {
    console.error('Master: Get master inspection error:', error);
    res.status(500).json({ success: false, message: 'Error retrieving master inspection categories' });
  }
};

module.exports = {
  getDropdowns,
  getMasterdropdownvalues,
  createDropdown,
  updateDropdown,
  deleteDropdown,
  addValue,
  updateValue,
  deleteValue,
  reorderValues,
  getMasterInspection,
};
