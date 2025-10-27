const Workflow = require("../models/Workflow");
const Company = require("../models/Company");
const Vehicle = require("../models/Vehicle");
const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

// Helper function to get MongoDB connection state name
const getMongoDBStateName = (state) => {
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
    99: "uninitialized",
  };
  return states[state] || "unknown";
};

// Helper function to process vehicle inbound workflow
const processVehicleInboundWorkflow = async (workflow, payload) => {
  const { payload_mapping } = workflow.config.inbound_config;

  // Map payload to vehicle schema
  const vehicleData = {};

  payload_mapping.forEach((mapping) => {
    if (payload[mapping.source_field] !== undefined) {
      vehicleData[mapping.target_field] = payload[mapping.source_field];
    } else if (mapping.default_value !== undefined) {
      vehicleData[mapping.target_field] = mapping.default_value;
    }
  });

  // Add company_id
  vehicleData.company_id = workflow.company_id;

  // Create or update vehicle
  const vehicle = new Vehicle(vehicleData);
  await vehicle.save();

  return {
    vehicle_id: vehicle._id,
    vehicle_stock_id: vehicle.vehicle_stock_id,
    created_at: vehicle.created_at,
  };
};

// Helper validation functions
const validateVehicleInboundConfig = (workflow, testPayload) => {
  const errors = [];
  const { payload_mapping, validation_rules } = workflow.config.inbound_config;

  if (!payload_mapping || payload_mapping.length === 0) {
    errors.push("No payload mapping configured");
  }

  // Check required fields
  payload_mapping.forEach((mapping) => {
    if (
      mapping.is_required &&
      testPayload &&
      !testPayload[mapping.source_field]
    ) {
      errors.push(
        `Required field ${mapping.source_field} missing in test payload`
      );
    }
  });

  return { valid: errors.length === 0, errors };
};


// Get all workflows for a company
const getWorkflows = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type, search } = req.query;
    const companyId = req.user.company_id;

    let query = { company_id: companyId };

    if (status) {
      query.status = status;
    }

    if (type) {
      query.workflow_type = type;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }

    const workflows = await Workflow.find(query)
      .populate("created_by", "first_name last_name email")
      .populate("last_modified_by", "first_name last_name email")
      .sort({ updated_at: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalWorkflows = await Workflow.countDocuments(query);

    res.json({
      success: true,
      data: {
        workflows,
        pagination: {
          total: totalWorkflows,
          page: parseInt(page),
          pages: Math.ceil(totalWorkflows / limit),
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Get workflows error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch workflows",
      error: error.message,
    });
  }
};

// Get workflow by ID
const getWorkflow = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company_id;

    const workflow = await Workflow.findOne({
      _id: id,
      company_id: companyId,
    })
      .populate("created_by", "first_name last_name email")
      .populate("last_modified_by", "first_name last_name email");

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: "Workflow not found",
      });
    }

    res.json({
      success: true,
      data: workflow,
    });
  } catch (error) {
    console.error("Get workflow error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch workflow",
      error: error.message,
    });
  }
};

// Create workflow
const createWorkflow = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errors.array(),
      });
    }
    const companyId = req.user.company_id;
    const userId = req.user.id;

    const workflowData = {
      ...req.body,
      company_id: companyId,
      created_by: userId,
      last_modified_by: userId,
    };

    const workflow = new Workflow(workflowData);
    await workflow.save();

    await workflow.populate("created_by", "first_name last_name email");

    res.status(201).json({
      success: true,
      message: "Workflow created successfully",
      data: workflow,
    });
  } catch (error) {
    console.error("Create workflow error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create workflow",
      error: error.message,
    });
  }
};

// Update workflow
const updateWorkflow = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company_id;
    const userId = req.user.id;

    const workflow = await Workflow.findOne({
      _id: id,
      company_id: companyId,
    });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: "Workflow not found",
      });
    }

    // Update workflow data
    Object.keys(req.body).forEach((key) => {
      if (key !== "company_id" && key !== "created_by") {
        workflow[key] = req.body[key];
      }
    });

    workflow.last_modified_by = userId;
    workflow.updated_at = new Date();

    await workflow.save();
    await workflow.populate("created_by", "first_name last_name email");
    await workflow.populate("last_modified_by", "first_name last_name email");

    res.json({
      success: true,
      message: "Workflow updated successfully",
      data: workflow,
    });
  } catch (error) {
    console.error("Update workflow error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update workflow",
      error: error.message,
    });
  }
};

// Delete workflow
const deleteWorkflow = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company_id;

    const workflow = await Workflow.findOneAndDelete({
      _id: id,
      company_id: companyId,
    });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: "Workflow not found",
      });
    }

    res.json({
      success: true,
      message: "Workflow deleted successfully",
    });
  } catch (error) {
    console.error("Delete workflow error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete workflow",
      error: error.message,
    });
  }
};

// Toggle workflow status
const toggleWorkflowStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const companyId = req.user.company_id;
    const userId = req.user.id;

    if (!["active", "inactive", "draft"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be active, inactive, or draft",
      });
    }

    const workflow = await Workflow.findOne({
      _id: id,
      company_id: companyId,
    });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: "Workflow not found",
      });
    }

    workflow.status = status;
    workflow.last_modified_by = userId;
    workflow.updated_at = new Date();

    await workflow.save();

    res.json({
      success: true,
      message: `Workflow ${
        status === "active"
          ? "activated"
          : status === "inactive"
          ? "deactivated"
          : "set to draft"
      } successfully`,
      data: { status: workflow.status },
    });
  } catch (error) {
    console.error("Toggle workflow status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update workflow status",
      error: error.message,
    });
  }
};

// Get workflow statistics
const getWorkflowStats = async (req, res) => {
  try {
    const companyId = req.user.company_id;

    const stats = await Workflow.aggregate([
      { $match: { company_id: companyId } },
      {
        $group: {
          _id: null,
          total_workflows: { $sum: 1 },
          active_workflows: {
            $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
          },
          inactive_workflows: {
            $sum: { $cond: [{ $eq: ["$status", "inactive"] }, 1, 0] },
          },
          draft_workflows: {
            $sum: { $cond: [{ $eq: ["$status", "draft"] }, 1, 0] },
          },
          total_executions: { $sum: "$execution_stats.total_executions" },
          successful_executions: {
            $sum: "$execution_stats.successful_executions",
          },
          failed_executions: { $sum: "$execution_stats.failed_executions" },
        },
      },
    ]);

    const workflowsByType = await Workflow.aggregate([
      { $match: { company_id: companyId } },
      {
        $group: {
          _id: "$workflow_type",
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        overview: stats[0] || {
          total_workflows: 0,
          active_workflows: 0,
          inactive_workflows: 0,
          draft_workflows: 0,
          total_executions: 0,
          successful_executions: 0,
          failed_executions: 0,
        },
        by_type: workflowsByType,
      },
    });
  } catch (error) {
    console.error("Get workflow stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch workflow statistics",
      error: error.message,
    });
  }
};

// Get vehicle schema fields for mapping
const getVehicleSchemaFields = async (req, res) => {
  try {
    // Get Vehicle schema fields dynamically
    const vehicleSchema = Vehicle.schema;
    const fields = [];

    vehicleSchema.eachPath((pathname, schematype) => {
      if (pathname === "_id" || pathname === "__v") return;

      fields.push({
        field_name: pathname,
        field_type: schematype.constructor.name.toLowerCase(),
        is_required: schematype.isRequired || false,
        is_array: schematype instanceof mongoose.Schema.Types.Array,
        enum_values: schematype.enumValues || null,
        description: schematype.options.description || null,
      });
    });

    res.json({
      success: true,
      data: { fields },
    });
  } catch (error) {
    console.error("Get vehicle schema fields error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch vehicle schema fields",
      error: error.message,
    });
  }
};

// Execute workflow (for custom endpoints)
const executeWorkflow = async (req, res) => {
  try {
    const { endpoint } = req.params;
    const payload = req.body;

    const workflow = await Workflow.findOne({
      custom_endpoint: endpoint,
      status: "active",
    });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: "Workflow endpoint not found or inactive",
      });
    }

    // Update execution stats
    workflow.execution_stats.total_executions += 1;
    workflow.execution_stats.last_execution = new Date();

    try {
      // Process based on workflow type
      let result;

      if (workflow.workflow_type === "vehicle_inbound") {
        result = await processVehicleInboundWorkflow(workflow, payload);
      }

      workflow.execution_stats.successful_executions += 1;
      workflow.execution_stats.last_execution_status = "success";

      await workflow.save();

      res.json({
        success: true,
        message: "Workflow executed successfully",
        data: result,
      });
    } catch (executionError) {
      workflow.execution_stats.failed_executions += 1;
      workflow.execution_stats.last_execution_status = "failed";
      workflow.execution_stats.last_execution_error = executionError.message;

      await workflow.save();

      res.status(500).json({
        success: false,
        message: "Workflow execution failed",
        error: executionError.message,
      });
    }
  } catch (error) {
    console.error("Execute workflow error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to execute workflow",
      error: error.message,
    });
  }
};

// Test workflow configuration
const testWorkflow = async (req, res) => {
  try {
    const { id } = req.params;
    const { test_payload } = req.body;
    const companyId = req.user.company_id;

    const workflow = await Workflow.findOne({
      _id: id,
      company_id: companyId,
    });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: "Workflow not found",
      });
    }

    // Validate configuration based on workflow type
    let validationResult;

    switch (workflow.workflow_type) {
      case "vehicle_inbound":
        validationResult = validateVehicleInboundConfig(workflow, test_payload);
        break;
      default:
        validationResult = { valid: false, errors: ["Invalid workflow type"] };
    }

    res.json({
      success: true,
      data: {
        validation_result: validationResult,
        test_executed: validationResult.valid,
      },
    });
  } catch (error) {
    console.error("Test workflow error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to test workflow",
      error: error.message,
    });
  }
};

module.exports = {
  getWorkflows,
  getWorkflow,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  toggleWorkflowStatus,
  getWorkflowStats,
  getVehicleSchemaFields,
  executeWorkflow,
  testWorkflow,

  // Helper functions (if needed externally)
  getMongoDBStateName,
  processVehicleInboundWorkflow,
  validateVehicleInboundConfig,
};
