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
  const executionStartTime = Date.now();
  let workflowExecutionLog = null;
  
  try {
    const { endpoint } = req.params;
    let payload = req.body;
    
    // Normalize payload - support both single vehicle and bulk vehicles
    const vehicles = Array.isArray(payload) ? payload : [payload];
    
    // Find workflow by custom endpoint
    const workflow = await Workflow.findOne({ custom_endpoint: endpoint }).populate('company_id');
    
    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: "Workflow not found",
      });
    }
    
    // Check if workflow is active
    if (workflow.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Workflow is not active",
      });
    }
    
    // Initialize execution log
    const WorkflowExecution = require('../models/WorkflowExecution');
    workflowExecutionLog = new WorkflowExecution({
      workflow_id: workflow._id,
      company_id: workflow.company_id._id,
      execution_started_at: new Date(),
      request_payload: payload,
      total_vehicles: vehicles.length,
      successful_vehicles: 0,
      failed_vehicles: 0,
      vehicle_results: [],
      database_changes: {
        vehicles_created: 0,
        vehicles_updated: 0,
        created_vehicle_ids: [],
        updated_vehicle_ids: [],
      },
    });
    
    // Validate workflow type
    if (workflow.workflow_type !== "vehicle_inbound") {
      workflowExecutionLog.execution_status = 'failed';
      workflowExecutionLog.error_message = `Workflow type ${workflow.workflow_type} not supported`;
      workflowExecutionLog.execution_completed_at = new Date();
      workflowExecutionLog.execution_duration_ms = Date.now() - executionStartTime;
      await workflowExecutionLog.save();
      
      return res.status(400).json({
        success: false,
        message: `Workflow type ${workflow.workflow_type} not supported`,
      });
    }
    
    // STEP 1: AUTHENTICATION
    const { verifyJWTToken, extractBearerToken, verifyStaticToken, verifyStandardAuth } = require('../utils/jwt.utils');
    const authNode = workflow.flow_data.nodes.find(node => node.type === 'authenticationNode');
    const authConfig = authNode?.data?.config || { type: 'none' };
    
    workflowExecutionLog.authentication_used = authConfig.type;
    
    if (authConfig.type !== 'none') {
      let authPassed = false;
      let authError = '';
      
      if (authConfig.type === 'jwt_token') {
        const authHeader = req.headers.authorization;
        const token = extractBearerToken(authHeader);
        
        if (!token) {
          authError = 'Missing Bearer token in Authorization header';
        } else {
          authPassed = verifyJWTToken(token, authConfig.jwt_token);
          if (!authPassed) {
            authError = 'Invalid JWT token';
          }
        }
      } else if (authConfig.type === 'standard') {
        const apiKey = req.headers['x-api-key'];
        const apiSecret = req.headers['x-api-secret'];
        
        if (!apiKey || !apiSecret) {
          authError = 'Missing x-api-key or x-api-secret headers';
        } else {
          authPassed = verifyStandardAuth(apiKey, apiSecret, authConfig.api_key, authConfig.api_secret);
          if (!authPassed) {
            authError = 'Invalid API credentials';
          }
        }
      } else if (authConfig.type === 'static') {
        const authHeader = req.headers.authorization;
        const token = extractBearerToken(authHeader) || req.headers['x-static-token'];
        
        if (!token) {
          authError = 'Missing authentication token';
        } else {
          authPassed = verifyStaticToken(token, authConfig.static_token);
          if (!authPassed) {
            authError = 'Invalid static token';
          }
        }
      }
      
      workflowExecutionLog.authentication_passed = authPassed;
      
      if (!authPassed) {
        workflowExecutionLog.execution_status = 'failed';
        workflowExecutionLog.error_message = authError;
        workflowExecutionLog.execution_completed_at = new Date();
        workflowExecutionLog.execution_duration_ms = Date.now() - executionStartTime;
        await workflowExecutionLog.save();
        
        return res.status(401).json({
          success: false,
          message: 'Authentication failed',
          error: authError,
        });
      }
    } else {
      workflowExecutionLog.authentication_passed = true;
    }
    
    // STEP 2: DATA MAPPING & VEHICLE PROCESSING
    const Vehicle = require('../models/Vehicle');
    const AdvertiseVehicle = require('../models/AdvertiseVehicle');
    const MasterVehicle = require('../models/MasterVehicle');
    const Company = require('../models/Company');
    
    const getVehicleModel = (vehicleType) => {
      switch (vehicleType) {
        case "advertisement":
          return AdvertiseVehicle;
        case "master":
          return MasterVehicle;
        case "inspection":
        case "tradein":
        default:
          return Vehicle;
      }
    };
    
    const mappingNode = workflow.flow_data.nodes.find(node => node.type === 'dataMappingNode');
    const mappings = mappingNode?.data?.config?.mappings || [];
    
    const vehicleResults = [];
    
    for (const vehiclePayload of vehicles) {
      const vehicleResult = {
        vehicle_stock_id: vehiclePayload.vehicle_stock_id || 'unknown',
        status: 'failed',
        database_operation: 'none',
        error_message: null,
        missing_fields: [],
        validation_errors: [],
      };
      
      try {
        // Map payload to vehicle data
        const vehicleData = {};
        const customFields = {};
        
        for (const mapping of mappings) {
          const sourceValue = vehiclePayload[mapping.source_field];
          
          if (mapping.is_required && (sourceValue === undefined || sourceValue === null || sourceValue === '')) {
            vehicleResult.missing_fields.push(mapping.source_field);
          }
          
          if (sourceValue !== undefined && sourceValue !== null) {
            if (mapping.is_custom) {
              customFields[mapping.custom_field_key || mapping.source_field] = sourceValue;
            } else {
              vehicleData[mapping.target_field] = sourceValue;
            }
          }
        }
        
        if (Object.keys(customFields).length > 0) {
          vehicleData.custom_fields = customFields;
        }
        
        // Validate required fields
        if (vehicleResult.missing_fields.length > 0) {
          vehicleResult.error_message = `Missing required fields: ${vehicleResult.missing_fields.join(', ')}`;
          vehicleResults.push(vehicleResult);
          workflowExecutionLog.failed_vehicles += 1;
          continue;
        }
        
        // Validate vehicle_type
        const validVehicleTypes = ['inspection', 'tradein', 'advertisement', 'master'];
        if (!vehicleData.vehicle_type || !validVehicleTypes.includes(vehicleData.vehicle_type)) {
          vehicleResult.error_message = `Invalid vehicle_type. Must be one of: ${validVehicleTypes.join(', ')}`;
          vehicleResult.validation_errors.push('Invalid vehicle_type');
          vehicleResults.push(vehicleResult);
          workflowExecutionLog.failed_vehicles += 1;
          continue;
        }
        
        // Validate company_id
        const company = await Company.findById(vehicleData.company_id);
        if (!company) {
          vehicleResult.error_message = 'Invalid company_id';
          vehicleResult.validation_errors.push('Company not found');
          vehicleResults.push(vehicleResult);
          workflowExecutionLog.failed_vehicles += 1;
          continue;
        }
        
        // Get correct model based on vehicle_type
        const VehicleModel = getVehicleModel(vehicleData.vehicle_type);
        
        // Check if vehicle exists (by vehicle_stock_id, company_id, and vehicle_type)
        const existingVehicle = await VehicleModel.findOne({
          vehicle_stock_id: vehicleData.vehicle_stock_id,
          company_id: vehicleData.company_id,
          vehicle_type: vehicleData.vehicle_type,
        });
        
        let savedVehicle;
        if (existingVehicle) {
          // Update existing vehicle
          Object.assign(existingVehicle, vehicleData);
          existingVehicle.updated_at = new Date();
          savedVehicle = await existingVehicle.save();
          
          vehicleResult.database_operation = 'updated';
          workflowExecutionLog.database_changes.vehicles_updated += 1;
          workflowExecutionLog.database_changes.updated_vehicle_ids.push(savedVehicle._id);
        } else {
          // Create new vehicle
          savedVehicle = await VehicleModel.create(vehicleData);
          
          vehicleResult.database_operation = 'created';
          workflowExecutionLog.database_changes.vehicles_created += 1;
          workflowExecutionLog.database_changes.created_vehicle_ids.push(savedVehicle._id);
        }
        
        vehicleResult.status = 'success';
        vehicleResult.vehicle_id = savedVehicle._id;
        vehicleResult.vehicle_type = savedVehicle.vehicle_type;
        vehicleResults.push(vehicleResult);
        workflowExecutionLog.successful_vehicles += 1;
        
      } catch (error) {
        console.error('Vehicle processing error:', error);
        vehicleResult.error_message = error.message;
        if (error.errors) {
          vehicleResult.validation_errors = Object.keys(error.errors).map(key => 
            `${key}: ${error.errors[key].message}`
          );
        }
        vehicleResults.push(vehicleResult);
        workflowExecutionLog.failed_vehicles += 1;
      }
    }
    
    workflowExecutionLog.vehicle_results = vehicleResults;
    
    // Determine overall execution status
    if (workflowExecutionLog.successful_vehicles === workflowExecutionLog.total_vehicles) {
      workflowExecutionLog.execution_status = 'success';
    } else if (workflowExecutionLog.successful_vehicles > 0) {
      workflowExecutionLog.execution_status = 'partial_success';
    } else {
      workflowExecutionLog.execution_status = 'failed';
    }
    
    // STEP 3: SEND EMAIL NOTIFICATIONS
    const { sendWorkflowEmail } = require('../utils/email.utils');
    
    const conditionNode = workflow.flow_data.nodes.find(node => node.type === 'enhancedConditionNode');
    const emailSuccessNode = workflow.flow_data.nodes.find(node => 
      node.id.includes('success') && node.type === 'enhancedEmailNode'
    );
    const emailErrorNode = workflow.flow_data.nodes.find(node => 
      node.id.includes('error') && node.type === 'enhancedEmailNode'
    );
    
    const emailData = {
      vehicle: vehicleResults[0] || {},
      response: {
        status: workflowExecutionLog.execution_status === 'success' ? '200' : '500',
        message: workflowExecutionLog.execution_status === 'success' 
          ? `Successfully processed ${workflowExecutionLog.successful_vehicles}/${workflowExecutionLog.total_vehicles} vehicles`
          : `Failed to process ${workflowExecutionLog.failed_vehicles}/${workflowExecutionLog.total_vehicles} vehicles`,
      },
      error: {
        message: workflowExecutionLog.execution_status !== 'success' 
          ? vehicleResults.filter(v => v.status === 'failed').map(v => 
              `Vehicle ${v.vehicle_stock_id}: ${v.error_message}`
            ).join('; ')
          : '',
      },
      company: {
        name: workflow.company_id.company_name,
      },
      timestamp: new Date().toISOString(),
      vehicles_summary: {
        total: workflowExecutionLog.total_vehicles,
        successful: workflowExecutionLog.successful_vehicles,
        failed: workflowExecutionLog.failed_vehicles,
        created: workflowExecutionLog.database_changes.vehicles_created,
        updated: workflowExecutionLog.database_changes.vehicles_updated,
      },
      failed_vehicles: vehicleResults.filter(v => v.status === 'failed'),
    };
    
    workflowExecutionLog.email_status = { success_email: {}, error_email: {} };
    
    if (workflowExecutionLog.execution_status === 'success' && emailSuccessNode?.data?.config) {
      const emailResult = await sendWorkflowEmail(emailSuccessNode.data.config, emailData);
      workflowExecutionLog.email_status.success_email = {
        sent: emailResult.success,
        error: emailResult.error || null,
        sent_at: new Date(),
      };
      workflowExecutionLog.email_sent = emailResult.success;
    }
    
    if (workflowExecutionLog.execution_status !== 'success' && emailErrorNode?.data?.config) {
      const emailResult = await sendWorkflowEmail(emailErrorNode.data.config, emailData);
      workflowExecutionLog.email_status.error_email = {
        sent: emailResult.success,
        error: emailResult.error || null,
        sent_at: new Date(),
      };
      workflowExecutionLog.email_sent = emailResult.success;
    }
    
    // Create execution summary
    const successCount = workflowExecutionLog.successful_vehicles;
    const failedCount = workflowExecutionLog.failed_vehicles;
    const createdCount = workflowExecutionLog.database_changes.vehicles_created;
    const updatedCount = workflowExecutionLog.database_changes.vehicles_updated;
    
    workflowExecutionLog.execution_summary = 
      `Processed ${workflowExecutionLog.total_vehicles} vehicles: ` +
      `${successCount} successful, ${failedCount} failed. ` +
      `Database: ${createdCount} created, ${updatedCount} updated.`;
    
    // Complete execution log
    workflowExecutionLog.execution_completed_at = new Date();
    workflowExecutionLog.execution_duration_ms = Date.now() - executionStartTime;
    await workflowExecutionLog.save();
    
    // Update workflow stats
    workflow.execution_stats.total_executions += 1;
    if (workflowExecutionLog.execution_status === 'success') {
      workflow.execution_stats.successful_executions += 1;
    } else {
      workflow.execution_stats.failed_executions += 1;
    }
    workflow.execution_stats.last_execution = new Date();
    workflow.execution_stats.last_execution_status = workflowExecutionLog.execution_status;
    workflow.execution_stats.last_execution_error = workflowExecutionLog.error_message || '';
    await workflow.save();
    
    // Return response
    return res.status(workflowExecutionLog.execution_status === 'success' ? 200 : 207).json({
      success: workflowExecutionLog.execution_status !== 'failed',
      message: workflowExecutionLog.execution_summary,
      execution_id: workflowExecutionLog._id,
      data: {
        total_vehicles: workflowExecutionLog.total_vehicles,
        successful_vehicles: workflowExecutionLog.successful_vehicles,
        failed_vehicles: workflowExecutionLog.failed_vehicles,
        database_changes: workflowExecutionLog.database_changes,
        vehicle_results: vehicleResults,
        execution_time_ms: workflowExecutionLog.execution_duration_ms,
      },
    });
    
  } catch (error) {
    console.error('Execute workflow error:', error);
    
    // Log error to execution log
    if (workflowExecutionLog) {
      workflowExecutionLog.execution_status = 'failed';
      workflowExecutionLog.error_message = error.message;
      workflowExecutionLog.error_stack = error.stack;
      workflowExecutionLog.execution_completed_at = new Date();
      workflowExecutionLog.execution_duration_ms = Date.now() - executionStartTime;
      await workflowExecutionLog.save();
    }
    
    return res.status(500).json({
      success: false,
      message: "Error executing workflow",
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

// @desc    Get workflow execution logs
// @route   GET /api/workflow-execute/logs/:workflowId
const getWorkflowExecutionLogs = async (req, res) => {
  try {
    const { workflowId } = req.params;
    const { page = 1, limit = 20, status } = req.query;
    
    const skip = (page - 1) * limit;
    const numericLimit = parseInt(limit);
    
    const WorkflowExecution = require('../models/WorkflowExecution');
    
    const filter = { workflow_id: workflowId };
    if (status && status !== 'all') {
      filter.execution_status = status;
    }
    
    const [logs, total] = await Promise.all([
      WorkflowExecution.find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(numericLimit)
        .lean(),
      WorkflowExecution.countDocuments(filter),
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        logs,
        total,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / numericLimit),
          total_records: total,
          per_page: numericLimit,
        },
      },
    });
  } catch (error) {
    console.error('Get workflow execution logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving workflow execution logs',
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
  getWorkflowExecutionLogs,
  getMongoDBStateName,
  processVehicleInboundWorkflow,
  validateVehicleInboundConfig,
};
