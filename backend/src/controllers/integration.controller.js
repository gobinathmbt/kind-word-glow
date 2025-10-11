const Integration = require("../models/Integration");
const { logEvent } = require("./logs.controller");

// @desc    Get all integrations for a company
// @route   GET /api/integrations
// @access  Private (Company Admin/Super Admin)
const getIntegrations = async (req, res) => {
  try {
    const { page = 1, limit = 20, integration_type, is_active } = req.query;

    const skip = (page - 1) * limit;
    const numericLimit = parseInt(limit);

    // Build filter
    let filter = {
      company_id: req.user.company_id,
    };

    if (integration_type) {
      filter.integration_type = integration_type;
    }

    if (is_active !== undefined) {
      filter.is_active = is_active === "true";
    }

    // Fetch integrations with pagination
    const [integrations, total] = await Promise.all([
      Integration.find(filter)
        .populate("created_by", "first_name last_name email")
        .populate("updated_by", "first_name last_name email")
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(numericLimit)
        .lean(),
      Integration.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: integrations,
      total,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / numericLimit),
        total_records: total,
        per_page: numericLimit,
      },
    });
  } catch (error) {
    console.error("Get integrations error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving integrations",
    });
  }
};

// @desc    Get integration by ID
// @route   GET /api/integrations/:id
// @access  Private (Company Admin/Super Admin)
const getIntegration = async (req, res) => {
  try {
    const { id } = req.params;

    const integration = await Integration.findOne({
      _id: id,
      company_id: req.user.company_id,
    })
      .populate("created_by", "first_name last_name email")
      .populate("updated_by", "first_name last_name email")
      .lean();

    if (!integration) {
      return res.status(404).json({
        success: false,
        message: "Integration not found",
      });
    }

    res.status(200).json({
      success: true,
      data: integration,
    });
  } catch (error) {
    console.error("Get integration error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving integration",
    });
  }
};

// @desc    Create new integration
// @route   POST /api/integrations
// @access  Private (Company Admin/Super Admin)
const createIntegration = async (req, res) => {
  try {
    const { integration_type, display_name, configuration, environments, active_environment } = req.body;

    // Validate required fields
    if (!integration_type || !display_name) {
      return res.status(400).json({
        success: false,
        message: "Integration type and display name are required",
      });
    }

    // Check if integration already exists
    const existingIntegration = await Integration.findOne({
      company_id: req.user.company_id,
      integration_type,
    });

    if (existingIntegration) {
      return res.status(400).json({
        success: false,
        message: "Integration of this type already exists for your company",
      });
    }

    // Create integration
    const integration = await Integration.create({
      company_id: req.user.company_id,
      integration_type,
      display_name,
      environments: environments || {
        development: { configuration: {}, is_active: false },
        testing: { configuration: {}, is_active: false },
        production: { configuration: configuration || {}, is_active: true }
      },
      active_environment: active_environment || 'production',
      configuration: configuration || {}, // Backward compatibility
      created_by: req.user.id,
    });

    // Log the event
    await logEvent({
      event_type: "integration",
      event_action: "create",
      event_description: `Created ${integration_type} integration`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role,
      metadata: {
        integration_id: integration._id,
        integration_type,
      },
    });

    res.status(201).json({
      success: true,
      message: "Integration created successfully",
      data: integration,
    });
  } catch (error) {
    console.error("Create integration error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating integration",
    });
  }
};

// @desc    Update integration
// @route   PUT /api/integrations/:id
// @access  Private (Company Admin/Super Admin)
const updateIntegration = async (req, res) => {
  try {
    const { id } = req.params;
    const { display_name, configuration, is_active, environments, active_environment } = req.body;

    const integration = await Integration.findOne({
      _id: id,
      company_id: req.user.company_id,
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        message: "Integration not found",
      });
    }

    // Update fields
    if (display_name) integration.display_name = display_name;
    if (configuration) integration.configuration = configuration;
    if (typeof is_active !== 'undefined') integration.is_active = is_active;
    if (environments) integration.environments = environments;
    if (active_environment) integration.active_environment = active_environment;
    integration.updated_by = req.user.id;

    await integration.save();

    // Log the event
    await logEvent({
      event_type: "integration",
      event_action: "update",
      event_description: `Updated ${integration.integration_type} integration`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role,
      metadata: {
        integration_id: integration._id,
        integration_type: integration.integration_type,
      },
    });

    res.status(200).json({
      success: true,
      message: "Integration updated successfully",
      data: integration,
    });
  } catch (error) {
    console.error("Update integration error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating integration",
    });
  }
};

// @desc    Delete integration
// @route   DELETE /api/integrations/:id
// @access  Private (Company Admin/Super Admin)
const deleteIntegration = async (req, res) => {
  try {
    const { id } = req.params;

    const integration = await Integration.findOneAndDelete({
      _id: id,
      company_id: req.user.company_id,
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        message: "Integration not found",
      });
    }

    // Log the event
    await logEvent({
      event_type: "integration",
      event_action: "delete",
      event_description: `Deleted ${integration.integration_type} integration`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role,
      metadata: {
        integration_id: integration._id,
        integration_type: integration.integration_type,
      },
    });

    res.status(200).json({
      success: true,
      message: "Integration deleted successfully",
    });
  } catch (error) {
    console.error("Delete integration error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting integration",
    });
  }
};

// @desc    Toggle integration status
// @route   PATCH /api/integrations/:id/status
// @access  Private (Company Admin/Super Admin)
const toggleIntegrationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: "is_active must be a boolean value",
      });
    }

    const integration = await Integration.findOneAndUpdate(
      {
        _id: id,
        company_id: req.user.company_id,
      },
      {
        is_active,
        updated_by: req.user.id,
        updated_at: new Date(),
      },
      { new: true }
    );

    if (!integration) {
      return res.status(404).json({
        success: false,
        message: "Integration not found",
      });
    }

    // Log the event
    await logEvent({
      event_type: "integration",
      event_action: "status_toggle",
      event_description: `${is_active ? 'Activated' : 'Deactivated'} ${integration.integration_type} integration`,
      user_id: req.user.id,
      company_id: req.user.company_id,
      user_role: req.user.role,
      metadata: {
        integration_id: integration._id,
        integration_type: integration.integration_type,
        is_active,
      },
    });

    res.status(200).json({
      success: true,
      message: `Integration ${is_active ? 'activated' : 'deactivated'} successfully`,
      data: integration,
    });
  } catch (error) {
    console.error("Toggle integration status error:", error);
    res.status(500).json({
      success: false,
      message: "Error toggling integration status",
    });
  }
};

module.exports = {
  getIntegrations,
  getIntegration,
  createIntegration,
  updateIntegration,
  deleteIntegration,
  toggleIntegrationStatus,
};
