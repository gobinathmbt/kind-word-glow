const Supplier = require("../models/Supplier");
const { logEvent } = require("./logs.controller");

// @desc    Get suppliers with pagination and search
// @route   GET /api/supplier
// @access  Private (Company Admin/Super Admin)
const getSuppliers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, tags, status } = req.query;
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
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { supplier_shop_name: { $regex: search, $options: "i" } },
        { address: { $regex: search, $options: "i" } }
      ];
    }

    if (tags && tags.length > 0) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      filter.tags = { $in: tagArray };
    }

    const suppliers = await Supplier.find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Supplier.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: suppliers,
      total,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_records: total,
        per_page: parseInt(limit)
      }
    });
  } catch (error) {
    console.error("Get suppliers error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving suppliers"
    });
  }
};

// @desc    Get single supplier
// @route   GET /api/supplier/:id
// @access  Private (Company Admin/Super Admin)
const getSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findOne({
      _id: req.params.id,
      company_id: req.user.company_id
    });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found"
      });
    }

    res.status(200).json({
      success: true,
      data: supplier
    });
  } catch (error) {
    console.error("Get supplier error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving supplier"
    });
  }
};

// @desc    Create new supplier
// @route   POST /api/supplier
// @access  Private (Company Admin/Super Admin)
const createSupplier = async (req, res) => {
  try {
    const {
      name,
      email,
      address,
      supplier_shop_name,
      tags,
      is_active = true
    } = req.body;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Name and email are required"
      });
    }

    // Check if email already exists for this company
    const existingSupplier = await Supplier.findOne({
      email,
      company_id: req.user.company_id
    });

    if (existingSupplier) {
      return res.status(400).json({
        success: false,
        message: "A supplier with this email already exists"
      });
    }

    // Process tags - save only display names as strings
    const processedTags = Array.isArray(tags) ? tags : [];

    const supplier = new Supplier({
      name,
      email,
      address,
      supplier_shop_name,
      tags: processedTags,
      is_active,
      company_id: req.user.company_id,
      created_by: req.user.id
    });

    await supplier.save();

    // Log the event
    await logEvent({
      event_type: "supplier_operation",
      event_action: "supplier_created",
      event_description: `New supplier created: ${name}`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role,
      metadata: {
        supplier_id: supplier._id,
        name,
        email
      }
    });

    res.status(201).json({
      success: true,
      message: "Supplier created successfully",
      data: supplier
    });
  } catch (error) {
    console.error("Create supplier error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating supplier"
    });
  }
};

// @desc    Update supplier
// @route   PUT /api/supplier/:id
// @access  Private (Company Admin/Super Admin)
const updateSupplier = async (req, res) => {
  try {
    const {
      name,
      email,
      address,
      supplier_shop_name,
      tags,
      is_active
    } = req.body;

    // Check if email exists for another supplier in this company
    if (email) {
      const existingSupplier = await Supplier.findOne({
        email,
        company_id: req.user.company_id,
        _id: { $ne: req.params.id }
      });

      if (existingSupplier) {
        return res.status(400).json({
          success: false,
          message: "A supplier with this email already exists"
        });
      }
    }

    // Process tags - save only display names as strings
    const processedTags = Array.isArray(tags) ? tags : [];

    const updateData = {
      name,
      email,
      address,
      supplier_shop_name,
      tags: processedTags
    };

    // Only update is_active if it's provided
    if (is_active !== undefined) {
      updateData.is_active = is_active;
    }

    const supplier = await Supplier.findOneAndUpdate(
      { _id: req.params.id, company_id: req.user.company_id },
      updateData,
      { new: true, runValidators: true }
    );

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found"
      });
    }

    // Log the event
    await logEvent({
      event_type: "supplier_operation",
      event_action: "supplier_updated",
      event_description: `Supplier updated: ${supplier.name}`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role,
      metadata: {
        supplier_id: supplier._id,
        name: supplier.name,
        email: supplier.email
      }
    });

    res.status(200).json({
      success: true,
      message: "Supplier updated successfully",
      data: supplier
    });
  } catch (error) {
    console.error("Update supplier error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating supplier"
    });
  }
};

// @desc    Delete supplier
// @route   DELETE /api/supplier/:id
// @access  Private (Company Admin/Super Admin)
const deleteSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findOneAndUpdate(
      { _id: req.params.id, company_id: req.user.company_id },
      { is_active: false },
      { new: true }
    );

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found"
      });
    }

    // Log the event
    await logEvent({
      event_type: "supplier_operation",
      event_action: "supplier_deleted",
      event_description: `Supplier deleted: ${supplier.name}`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role,
      metadata: {
        supplier_id: supplier._id,
        name: supplier.name,
        email: supplier.email
      }
    });

    res.status(200).json({
      success: true,
      message: "Supplier deleted successfully"
    });
  } catch (error) {
    console.error("Delete supplier error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting supplier"
    });
  }
};

// @desc    Search suppliers by tags (for quote modal)
// @route   POST /api/supplier/search-by-tags
// @access  Private (Company Admin/Super Admin)
const searchSuppliersByTags = async (req, res) => {
  try {
    const { tags = [], search = "" } = req.body;
    let filter = { 
      company_id: req.user.company_id,
      is_active: true 
    };

    // Handle tags array (case-insensitive, trim)
    if (tags.length > 0) {
      const normalizedTags = tags.map(tag => tag.trim().toLowerCase());
      filter.tags = { 
        $in: normalizedTags.map(tag => new RegExp(`^${tag}$`, "i"))
      };
    }

    // Handle search term (case-insensitive, trims spaces)
    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { supplier_shop_name: searchRegex },
        { tags: searchRegex } // <-- Search in tags as well
      ];
    }

    const suppliers = await Supplier.find(filter)
      .select('_id name email supplier_shop_name tags')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      data: suppliers
    });
  } catch (error) {
    console.error("Search suppliers by tags error:", error);
    res.status(500).json({
      success: false,
      message: "Error searching suppliers"
    });
  }
};


module.exports = {
  getSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  searchSuppliersByTags
};