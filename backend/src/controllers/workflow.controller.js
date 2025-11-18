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

// Helper validation function for Vehicle Outbound workflows
const validateVehicleOutboundConfig = (workflow, testPayload) => {
  const errors = [];

  // Find Export Fields Node to get selected fields
  const exportFieldsNode = workflow.flow_data?.nodes?.find(node => node.type === 'exportFieldsNode');
  const exportFieldsConfig = exportFieldsNode?.data?.config;

  if (!exportFieldsConfig || !exportFieldsConfig.selected_fields) {
    errors.push("Export Fields not configured");
    return { valid: false, errors };
  }

  const selectedFields = exportFieldsConfig.selected_fields;

  // Check if selected_fields is schema-based format (object) or old format (array)
  const isSchemaBasedFormat = typeof selectedFields === 'object' && !Array.isArray(selectedFields);

  if (!isSchemaBasedFormat) {
    errors.push("Export Fields configuration format is invalid");
    return { valid: false, errors };
  }

  // Count total selected fields across all schemas
  let totalSelectedFields = 0;
  const selectedFieldsBySchema = {};

  for (const [schemaType, fieldNames] of Object.entries(selectedFields)) {
    if (Array.isArray(fieldNames) && fieldNames.length > 0) {
      selectedFieldsBySchema[schemaType] = fieldNames;
      totalSelectedFields += fieldNames.length;
    }
  }

  if (totalSelectedFields === 0) {
    errors.push("No fields selected in Export Fields configuration");
    return { valid: false, errors };
  }

  // Find Data Mapping Node to get field mappings
  const dataMappingNode = workflow.flow_data?.nodes?.find(node => node.type === 'dataMappingNode');
  const dataMappingConfig = dataMappingNode?.data?.config;

  if (!dataMappingConfig || !dataMappingConfig.mappings) {
    errors.push("Data Mapping not configured");
    return { valid: false, errors };
  }

  const mappings = dataMappingConfig.mappings;

  if (mappings.length === 0) {
    errors.push("No field mappings configured in Data Mapping");
    return { valid: false, errors };
  }

  // Get destination schema node to check for array fields with nested children
  const destinationSchemaNode = workflow.flow_data?.nodes?.find(node => node.type === 'destinationSchemaNode');
  const destinationSchemas = [];
  
  if (destinationSchemaNode?.data?.destinationSchemaData?.schemas) {
    destinationSchemas.push(...destinationSchemaNode.data.destinationSchemaData.schemas);
  }

  // Helper function to check if a field is an array parent with nested children
  const isArrayParentWithNestedChildren = (schemaType, fieldName) => {
    const schema = destinationSchemas.find(s => s.schema_type === schemaType);
    if (!schema || !schema.fields) return false;
    
    const field = schema.fields.find(f => f.field_name === fieldName);
    if (!field || !field.is_array) return false;
    
    // Check if there are nested children
    const hasNestedChildren = schema.fields.some(f => 
      f.is_nested && f.parent_field === fieldName
    );
    
    return hasNestedChildren;
  };

  // Validate that all selected fields from Export Fields have corresponding mappings
  // (excluding array parent fields with nested children)
  for (const [schemaType, fieldNames] of Object.entries(selectedFieldsBySchema)) {
    for (const fieldName of fieldNames) {
      // Skip validation for array parent fields with nested children
      if (isArrayParentWithNestedChildren(schemaType, fieldName)) {
        continue;
      }

      // Check if this field has a mapping
      const hasMapping = mappings.some(mapping =>
        mapping.target_field === fieldName &&
        mapping.schema_type === schemaType &&
        mapping.source_field &&
        mapping.source_field.trim() !== ''
      );

      if (!hasMapping) {
        errors.push(`Field "${fieldName}" from schema "${schemaType}" is selected in Export Fields but not mapped in Data Mapping`);
      }
    }
  }

  // Validate that all mappings have both source and target fields
  mappings.forEach((mapping, index) => {
    if (!mapping.source_field || mapping.source_field.trim() === '') {
      errors.push(`Mapping ${index + 1}: External field (source_field) is missing`);
    }
    if (!mapping.target_field || mapping.target_field.trim() === '') {
      errors.push(`Mapping ${index + 1}: Internal field (target_field) is missing`);
    }
  });

  // Check if test payload is provided and validate against mappings
  if (testPayload && typeof testPayload === 'object') {
    mappings.forEach((mapping) => {
      if (mapping.is_required && mapping.source_field) {
        // Check if the source field exists in test payload
        const fieldValue = getNestedFieldValue(testPayload, mapping.source_field);
        if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
          errors.push(`Required field "${mapping.source_field}" is missing or empty in test payload`);
        }
      }
    });
  }

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

      // Get the actual type name
      let fieldType = 'string';
      if (schematype instanceof mongoose.Schema.Types.String) {
        fieldType = 'string';
      } else if (schematype instanceof mongoose.Schema.Types.Number) {
        fieldType = 'number';
      } else if (schematype instanceof mongoose.Schema.Types.Boolean) {
        fieldType = 'boolean';
      } else if (schematype instanceof mongoose.Schema.Types.Date) {
        fieldType = 'date';
      } else if (schematype instanceof mongoose.Schema.Types.Array) {
        fieldType = 'array';
      } else if (schematype instanceof mongoose.Schema.Types.ObjectId) {
        fieldType = 'objectid';
      } else if (schematype instanceof mongoose.Schema.Types.Mixed) {
        fieldType = 'mixed';
      }

      fields.push({
        field_name: pathname,
        field_type: fieldType,
        is_required: schematype.isRequired || false,
        is_array: schematype instanceof mongoose.Schema.Types.Array,
        enum_values: schematype.enumValues || null,
        description: schematype.options.description || null,
      });

      // Extract nested fields from array types
      if (schematype instanceof mongoose.Schema.Types.Array) {
        const nestedFields = extractNestedFieldsFromArray(schematype, pathname);
        fields.push(...nestedFields);
      }
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

// Helper function to extract nested fields from array schema
const extractNestedFieldsFromArray = (schematype, parentPath) => {
  const nestedFields = [];
  
  // Check if this is an array with a schema (subdocument array)
  if (schematype instanceof mongoose.Schema.Types.Array && schematype.schema) {
    const arraySchema = schematype.schema;
    
    // Iterate through the nested schema paths
    arraySchema.eachPath((nestedPath, nestedSchematype) => {
      if (nestedPath === "_id" || nestedPath === "__v") return;
      
      // Get the field type
      let nestedFieldType = 'string';
      if (nestedSchematype instanceof mongoose.Schema.Types.String) {
        nestedFieldType = 'string';
      } else if (nestedSchematype instanceof mongoose.Schema.Types.Number) {
        nestedFieldType = 'number';
      } else if (nestedSchematype instanceof mongoose.Schema.Types.Boolean) {
        nestedFieldType = 'boolean';
      } else if (nestedSchematype instanceof mongoose.Schema.Types.Date) {
        nestedFieldType = 'date';
      } else if (nestedSchematype instanceof mongoose.Schema.Types.Array) {
        nestedFieldType = 'array';
      } else if (nestedSchematype instanceof mongoose.Schema.Types.ObjectId) {
        nestedFieldType = 'objectid';
      } else if (nestedSchematype instanceof mongoose.Schema.Types.Mixed) {
        nestedFieldType = 'mixed';
      }

      nestedFields.push({
        field_name: `${parentPath}.${nestedPath}`,
        field_type: nestedFieldType,
        is_required: nestedSchematype.isRequired || false,
        is_array: nestedSchematype instanceof mongoose.Schema.Types.Array,
        is_nested: true,
        parent_field: parentPath,
        enum_values: nestedSchematype.enumValues || null,
        description: nestedSchematype.options.description || null,
      });
    });
  }

  return nestedFields;
};

// Get all available schemas
const getAvailableSchemas = async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');

    // Get all model files from the models directory
    const modelsPath = path.join(__dirname, '../models');
    const modelFiles = fs.readdirSync(modelsPath).filter(file => file.endsWith('.js'));

    const schemas = modelFiles
      .map(file => {
        const modelName = file.replace('.js', '');

        // Convert model name to schema type format
        // e.g., "Vehicle" -> "vehicle", "MasterVehicle" -> "master_vehicle"
        const schemaType = modelName
          .replace(/([A-Z])/g, '_$1')
          .toLowerCase()
          .replace(/^_/, '');

        return {
          schema_type: schemaType,
          schema_name: modelName,
          display_name: modelName.replace(/([A-Z])/g, ' $1').trim()
        };
      })
      .filter(schema => schema !== null);

    res.json({
      success: true,
      data: { schemas },
    });
  } catch (error) {
    console.error("Get available schemas error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch available schemas",
      error: error.message,
    });
  }
};

// Get schema fields for target schema node
const getSchemaFields = async (req, res) => {
  try {
    const { schemaType } = req.params;

    // Convert schema_type back to model name
    // e.g., "vehicle" -> "Vehicle", "master_vehicle" -> "MasterVehicle"
    const modelName = schemaType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');

    let SchemaModel;
    try {
      SchemaModel = require(`../models/${modelName}`);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: `Schema model "${modelName}" not found`,
      });
    }

    const schema = SchemaModel.schema;
    const fields = [];

    schema.eachPath((pathname, schematype) => {
      if (pathname === "_id" || pathname === "__v") return;

      // Get the actual type name
      let fieldType = 'string';
      if (schematype instanceof mongoose.Schema.Types.String) {
        fieldType = 'string';
      } else if (schematype instanceof mongoose.Schema.Types.Number) {
        fieldType = 'number';
      } else if (schematype instanceof mongoose.Schema.Types.Boolean) {
        fieldType = 'boolean';
      } else if (schematype instanceof mongoose.Schema.Types.Date) {
        fieldType = 'date';
      } else if (schematype instanceof mongoose.Schema.Types.Array) {
        fieldType = 'array';
      } else if (schematype instanceof mongoose.Schema.Types.ObjectId) {
        fieldType = 'objectid';
      } else if (schematype instanceof mongoose.Schema.Types.Mixed) {
        fieldType = 'mixed';
      }

      fields.push({
        field_name: pathname,
        field_type: fieldType,
        is_required: schematype.isRequired || false,
        is_array: schematype instanceof mongoose.Schema.Types.Array,
        enum_values: schematype.enumValues || null,
        description: schematype.options.description || null,
      });

      // Extract nested fields from array types
      if (schematype instanceof mongoose.Schema.Types.Array) {
        const nestedFields = extractNestedFieldsFromArray(schematype, pathname);
        fields.push(...nestedFields);
      }
    });

    res.json({
      success: true,
      data: { fields },
    });
  } catch (error) {
    console.error("Get schema fields error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch schema fields",
      error: error.message,
    });
  }
};

// Get common fields between multiple schemas
const getCommonFields = async (req, res) => {
  try {
    const { schemaTypes } = req.body;

    if (!schemaTypes || !Array.isArray(schemaTypes) || schemaTypes.length < 2) {
      return res.status(400).json({
        success: false,
        message: "At least two schema types are required",
      });
    }

    // Fetch fields for all schemas
    const allSchemaFields = [];

    for (const schemaType of schemaTypes) {
      // Convert schema_type back to model name
      const modelName = schemaType
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('');

      let SchemaModel;
      try {
        SchemaModel = require(`../models/${modelName}`);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: `Schema model "${modelName}" not found`,
        });
      }

      const schema = SchemaModel.schema;
      const fields = [];

      schema.eachPath((pathname, schematype) => {
        if (pathname === "_id" || pathname === "__v") return;

        // Get the actual type name
        let fieldType = 'string';
        if (schematype instanceof mongoose.Schema.Types.String) {
          fieldType = 'string';
        } else if (schematype instanceof mongoose.Schema.Types.Number) {
          fieldType = 'number';
        } else if (schematype instanceof mongoose.Schema.Types.Boolean) {
          fieldType = 'boolean';
        } else if (schematype instanceof mongoose.Schema.Types.Date) {
          fieldType = 'date';
        } else if (schematype instanceof mongoose.Schema.Types.Array) {
          fieldType = 'array';
        } else if (schematype instanceof mongoose.Schema.Types.ObjectId) {
          fieldType = 'objectid';
        } else if (schematype instanceof mongoose.Schema.Types.Mixed) {
          fieldType = 'mixed';
        }

        fields.push({
          field_name: pathname,
          field_type: fieldType,
          is_required: schematype.isRequired || false,
          is_array: schematype instanceof mongoose.Schema.Types.Array,
          enum_values: schematype.enumValues || null,
          description: schematype.options.description || null,
        });
      });

      allSchemaFields.push({ schemaType, fields });
    }

    // Find common fields (fields that exist in all schemas with the same name)
    const firstSchemaFields = allSchemaFields[0].fields;
    const commonFields = firstSchemaFields.filter(field => {
      // Check if this field exists in all other schemas
      return allSchemaFields.slice(1).every(schemaData => {
        return schemaData.fields.some(f => f.field_name === field.field_name);
      });
    });

    res.json({
      success: true,
      data: {
        common_fields: commonFields,
        total_common_fields: commonFields.length
      },
    });
  } catch (error) {
    console.error("Get common fields error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch common fields",
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
    if (!["vehicle_inbound", "vehicle_outbound"].includes(workflow.workflow_type)) {
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

    // For vehicle outbound workflows, check the enable_authentication toggle
    const shouldAuthenticate = workflow.workflow_type === 'vehicle_outbound'
      ? (authConfig.enable_authentication && authConfig.type !== 'none')
      : (authConfig.type !== 'none');

    workflowExecutionLog.authentication_used = shouldAuthenticate ? authConfig.type : 'none';

    if (shouldAuthenticate) {
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

    // Prepare email data with full vehicle information
    const firstSuccessfulVehicle = vehicleResults.find(v => v.status === 'success');
    const firstVehiclePayload = vehicles[0] || {};

    const emailData = {
      // Single vehicle data (for single vehicle templates)
      vehicle: {
        ...firstVehiclePayload,
        vehicle_stock_id: firstSuccessfulVehicle?.vehicle_stock_id || firstVehiclePayload.vehicle_stock_id,
        status: firstSuccessfulVehicle?.status || 'unknown',
        database_operation: firstSuccessfulVehicle?.database_operation || 'none',
      },
      // All vehicles data (for multiple vehicle templates)
      vehicle_results: vehicleResults.map((result, index) => ({
        ...vehicles[index],
        ...result,
        vehicle_stock_id: result.vehicle_stock_id,
        status: result.status,
        database_operation: result.database_operation,
        error_message: result.error_message,
      })),
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
      case "vehicle_outbound":
        validationResult = validateVehicleOutboundConfig(workflow, test_payload);
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

// Helper function to check trigger conditions for outbound workflows
const checkTriggerCondition = (fieldValue, operator, triggerValue) => {
  switch (operator) {
    case 'equals':
      return fieldValue == triggerValue;
    case 'not_equals':
      return fieldValue != triggerValue;
    case 'contains':
      return typeof fieldValue === 'string' && fieldValue.includes(triggerValue);
    case 'starts_with':
      return typeof fieldValue === 'string' && fieldValue.startsWith(triggerValue);
    case 'ends_with':
      return typeof fieldValue === 'string' && fieldValue.endsWith(triggerValue);
    case 'is_empty':
      return !fieldValue || fieldValue === '';
    case 'is_not_empty':
      return fieldValue && fieldValue !== '';
    case 'greater_than':
      return Number(fieldValue) > Number(triggerValue);
    case 'less_than':
      return Number(fieldValue) < Number(triggerValue);
    case 'greater_than_or_equal':
      return Number(fieldValue) >= Number(triggerValue);
    case 'less_than_or_equal':
      return Number(fieldValue) <= Number(triggerValue);
    case 'is_true':
      return fieldValue === true || fieldValue === 'true';
    case 'is_false':
      return fieldValue === false || fieldValue === 'false';
    case 'before':
      return new Date(fieldValue) < new Date(triggerValue);
    case 'after':
      return new Date(fieldValue) > new Date(triggerValue);
    default:
      return false;
  }
};

// Helper function to get nested field value from object
const getNestedFieldValue = (obj, fieldPath) => {
  const keys = fieldPath.split('.');
  let current = obj;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];

    if (current && typeof current === 'object') {
      // If current value is an array, get the first element
      if (Array.isArray(current)) {
        current = current.length > 0 ? current[0] : undefined;
        if (!current) return undefined;
      }

      // Get the next value
      current = current[key];

      // If this is the last key and the value is an array, return the array
      // Otherwise, if it's an array and not the last key, continue with first element
      if (i === keys.length - 1) {
        return current;
      } else if (Array.isArray(current) && current.length > 0) {
        current = current[0];
      }
    } else {
      return undefined;
    }
  }

  return current;
};

// Helper function to update workflow execution stats
const updateWorkflowExecutionStats = async (workflowId, isSuccess, errorMessage = null) => {
  try {
    const workflow = await Workflow.findById(workflowId);

    if (!workflow) {
      console.error('Workflow not found for stats update:', workflowId);
      return;
    }

    // Update execution stats
    workflow.execution_stats.total_executions = (workflow.execution_stats.total_executions || 0) + 1;

    if (isSuccess) {
      workflow.execution_stats.successful_executions = (workflow.execution_stats.successful_executions || 0) + 1;
      workflow.execution_stats.last_execution_status = 'success';
      workflow.execution_stats.last_execution_error = '';
    } else {
      workflow.execution_stats.failed_executions = (workflow.execution_stats.failed_executions || 0) + 1;
      workflow.execution_stats.last_execution_status = 'failed';
      workflow.execution_stats.last_execution_error = errorMessage || 'Unknown error';
    }

    workflow.execution_stats.last_execution = new Date();

    await workflow.save();

    console.log(`Workflow execution stats updated for workflow ${workflowId}: Total=${workflow.execution_stats.total_executions}, Success=${workflow.execution_stats.successful_executions}, Failed=${workflow.execution_stats.failed_executions}`);
  } catch (error) {
    console.error('Error updating workflow execution stats:', error);
  }
};

// Helper function to send email notifications for outbound workflows
// Uses the same template and process as Vehicle Inbound for consistency
const sendOutboundWorkflowEmail = async (workflow, vehicleData, mappedData, apiResult) => {
  try {
    const { sendWorkflowEmail } = require('../utils/email.utils');

    // Find the email nodes in the workflow (same as Vehicle Inbound)
    const emailSuccessNode = workflow.flow_data?.nodes?.find(node =>
      node.id.includes('success') && node.type === 'enhancedEmailNode'
    );
    const emailErrorNode = workflow.flow_data?.nodes?.find(node =>
      node.id.includes('error') && node.type === 'enhancedEmailNode'
    );

    // Prepare email data using the same structure as Vehicle Inbound
    const emailData = {
      // Single vehicle data (for single vehicle templates) - same as Vehicle Inbound
      vehicle: {
        vehicle_stock_id: vehicleData.vehicle_stock_id || 'N/A',
        make: vehicleData.make || 'N/A',
        model: vehicleData.model || 'N/A',
        year: vehicleData.year || 'N/A',
        vin: vehicleData.vin || 'N/A',
        plate_no: vehicleData.plate_no || 'N/A',
        status: apiResult.success ? 'success' : 'failed',
        database_operation: 'api_push', // Outbound pushes to external API
        ...vehicleData
      },
      // All vehicles data (for multiple vehicle templates) - same format as Vehicle Inbound
      vehicle_results: [{
        ...vehicleData,
        vehicle_stock_id: vehicleData.vehicle_stock_id || 'N/A',
        status: apiResult.success ? 'success' : 'failed',
        database_operation: 'api_push',
        error_message: apiResult.error || null,
      }],
      // Mapped data that was sent to API (additional context for outbound)
      mapped_data: mappedData,
      // Response data - same structure as Vehicle Inbound
      response: {
        status: apiResult.success ? '200' : '500',
        message: apiResult.success
          ? `Successfully pushed vehicle data to ${apiResult.endpoint}`
          : `Failed to push vehicle data to ${apiResult.endpoint}`,
        endpoint: apiResult.endpoint,
        api_status: apiResult.status || 'N/A',
        api_data: apiResult.data || null
      },
      // Error data - same structure as Vehicle Inbound
      error: {
        message: apiResult.error || ''
      },
      // Company data - same structure as Vehicle Inbound
      company: {
        name: workflow.company_id?.company_name || 'N/A'
      },
      // Timestamp - same as Vehicle Inbound
      timestamp: new Date().toISOString(),
      // Summary for single vehicle - same structure as Vehicle Inbound
      vehicles_summary: {
        total: 1,
        successful: apiResult.success ? 1 : 0,
        failed: apiResult.success ? 0 : 1,
        created: 0, // Not applicable for outbound
        updated: 0  // Not applicable for outbound
      },
      // Failed vehicles array - same structure as Vehicle Inbound
      failed_vehicles: apiResult.success ? [] : [{
        ...vehicleData,
        vehicle_stock_id: vehicleData.vehicle_stock_id || 'N/A',
        status: 'failed',
        error_message: apiResult.error || 'Unknown error',
      }]
    };

    // Send appropriate email based on success/failure (same logic as Vehicle Inbound)
    if (apiResult.success && emailSuccessNode?.data?.config) {
      console.log('Sending success email for Vehicle Outbound workflow...');
      const emailResult = await sendWorkflowEmail(emailSuccessNode.data.config, emailData);
      if (emailResult.success) {
        console.log('Success email sent successfully');
      } else {
        console.error('Failed to send success email:', emailResult.error);
      }
    } else if (!apiResult.success && emailErrorNode?.data?.config) {
      console.log('Sending error email for Vehicle Outbound workflow...');
      const emailResult = await sendWorkflowEmail(emailErrorNode.data.config, emailData);
      if (emailResult.success) {
        console.log('Error email sent successfully');
      } else {
        console.error('Failed to send error email:', emailResult.error);
      }
    }
  } catch (error) {
    console.error('Error sending outbound workflow email:', error);
  }
};

// Helper function to check and trigger outbound workflows
const checkAndTriggerOutboundWorkflows = async (vehicleData, companyId) => {
  try {
    // Find all active "Vehicle Outbound" workflows for this company
    const outboundWorkflows = await Workflow.find({
      company_id: companyId,
      workflow_type: 'vehicle_outbound',
      status: 'active'
    });

    for (const workflow of outboundWorkflows) {
      // Find the target schema node in the workflow
      const targetSchemaNode = workflow.flow_data?.nodes?.find(node => node.type === 'targetSchemaNode');

      if (!targetSchemaNode || !targetSchemaNode.data?.config) {
        continue;
      }

      const config = targetSchemaNode.data.config;

      // Support both old single trigger format and new multiple triggers format
      let triggers = [];
      if (config.triggers && Array.isArray(config.triggers)) {
        triggers = config.triggers;
      } else if (config.schema_type && config.trigger_field && config.trigger_operator) {
        // Backward compatibility: convert old format to new format
        triggers = [{
          schema_type: config.schema_type,
          trigger_field: config.trigger_field,
          trigger_operator: config.trigger_operator,
          trigger_value: config.trigger_value,
          logic: 'AND',
          reference_field: config.reference_field || ''
        }];
      }

      // Skip if no valid triggers
      if (triggers.length === 0 || triggers.every(t => !t.schema_type || !t.trigger_field || !t.trigger_operator)) {
        continue;
      }

      // Get unique schema types from triggers
      const uniqueSchemaTypes = [...new Set(triggers.map(t => t.schema_type).filter(Boolean))];
      const hasMultipleSchemas = uniqueSchemaTypes.length > 1;

      // Get reference field for cross-schema validation
      const referenceField = config.reference_field || '';

      // Evaluate all trigger conditions with cross-schema support
      let triggerActivated = false;
      const activatedTriggers = [];

      for (let i = 0; i < triggers.length; i++) {
        const trigger = triggers[i];

        // Skip incomplete triggers
        if (!trigger.schema_type || !trigger.trigger_field || !trigger.trigger_operator) {
          continue;
        }

        let dataToCheck = null;
        let conditionMet = false;

        // Determine which schema to check
        if (trigger.schema_type === 'vehicle') {
          // Check vehicle data directly
          dataToCheck = vehicleData;
          const fieldValue = getNestedFieldValue(dataToCheck, trigger.trigger_field);
          conditionMet = checkTriggerCondition(
            fieldValue,
            trigger.trigger_operator,
            trigger.trigger_value
          );
        } else if (hasMultipleSchemas && referenceField) {
          // Cross-schema validation: fetch related data using reference field
          try {
            // Get the reference value from vehicle data
            const referenceValue = getNestedFieldValue(vehicleData, referenceField);

            if (!referenceValue) {
              console.log(`[Workflow ${workflow.name}] Reference field "${referenceField}" not found in vehicle data`);
              conditionMet = false;
            } else {
              // Convert schema_type to model name
              const modelName = trigger.schema_type
                .split('_')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join('');

              let SchemaModel;
              try {
                SchemaModel = require(`../models/${modelName}`);
              } catch (error) {
                console.error(`[Workflow ${workflow.name}] Schema model "${modelName}" not found`);
                conditionMet = false;
                continue;
              }

              // Query the related schema using reference field
              const query = {
                company_id: companyId,
                [referenceField]: referenceValue
              };

              const relatedData = await SchemaModel.findOne(query);

              if (!relatedData) {

                conditionMet = false;
              } else {
                // Check the trigger condition on the related data
                const fieldValue = getNestedFieldValue(relatedData, trigger.trigger_field);
                conditionMet = checkTriggerCondition(
                  fieldValue,
                  trigger.trigger_operator,
                  trigger.trigger_value
                );

              }
            }
          } catch (error) {
            console.error(`[Workflow ${workflow.name}] Error in cross-schema validation:`, error.message);
            conditionMet = false;
          }
        } else {
          // Schema type doesn't match vehicle and no cross-schema setup
          console.log(`[Workflow ${workflow.name}] Skipping trigger for schema "${trigger.schema_type}" - not applicable to vehicle data`);
          conditionMet = false;
        }

        // Track which triggers were activated
        if (conditionMet) {
          activatedTriggers.push({
            schema_type: trigger.schema_type,
            trigger_field: trigger.trigger_field,
            trigger_operator: trigger.trigger_operator,
            trigger_value: trigger.trigger_value
          });
        }

        // Apply logic operator
        if (i === 0) {
          // First trigger sets the initial state
          triggerActivated = conditionMet;
        } else {
          // Subsequent triggers use their logic operator
          const logic = trigger.logic || 'AND';
          if (logic === 'AND') {
            triggerActivated = triggerActivated && conditionMet;
          } else if (logic === 'OR') {
            triggerActivated = triggerActivated || conditionMet;
          }
        }
      }

      // Only process when trigger is activated
      if (triggerActivated) {
        // Console log which triggers were activated
        console.log('\n========================================');
        console.log(`[Workflow: ${workflow.name}] TRIGGER ACTIVATED`);
        console.log('========================================');
        console.log('Activated Triggers:');
        activatedTriggers.forEach((trigger, index) => {
          console.log(`  ${index + 1}. ${trigger.schema_type}.${trigger.trigger_field} ${trigger.trigger_operator} "${trigger.trigger_value}"`);
        });
        console.log('\nVehicle Details:');
        console.log(JSON.stringify({
          vehicle_stock_id: vehicleData.vehicle_stock_id,
          vehicle_type: vehicleData.vehicle_type,
          make: vehicleData.make,
          model: vehicleData.model,
          year: vehicleData.year,
          vin: vehicleData.vin,
          plate_no: vehicleData.plate_no,
          is_pricing_ready: vehicleData.is_pricing_ready,
          company_id: vehicleData.company_id
        }, null, 2));

        // Log Destination Schema details
        const destinationSchemaNode = workflow.flow_data?.nodes?.find(node => node.type === 'destinationSchemaNode');
        if (destinationSchemaNode && destinationSchemaNode.data?.config) {
          const destConfig = destinationSchemaNode.data.config;
          const allDestSchemas = [
            ...(destConfig.target_schemas || []),
            ...(destConfig.destination_schemas || [])
          ];

          console.log('\nDestination Schemas Selected:');
          if (allDestSchemas.length > 0) {
            allDestSchemas.forEach((schema, index) => {
              console.log(`  ${index + 1}. ${schema.schema_type}`);
            });

            // Log reference field if different schemas are used
            if (destConfig.reference_field) {
              console.log(`\nReference Field: ${destConfig.reference_field}`);
              const referenceValue = getNestedFieldValue(vehicleData, destConfig.reference_field);
              console.log(`Reference Value from Vehicle: ${referenceValue}`);
            }
          } else {
            console.log('  No destination schemas configured');
          }
        }

        // Find the Export Fields node to get selected_fields configuration
        const exportFieldsNode = workflow.flow_data?.nodes?.find(node => node.type === 'exportFieldsNode');

        if (exportFieldsNode && exportFieldsNode.data?.config?.selected_fields) {
          const selectedFieldsConfig = exportFieldsNode.data.config.selected_fields;

          // Check if selected_fields is an object (new schema-based format) or array (old format)
          const isSchemaBasedFormat = typeof selectedFieldsConfig === 'object' && !Array.isArray(selectedFieldsConfig);

          if (isSchemaBasedFormat && Object.keys(selectedFieldsConfig).length > 0) {
            // NEW FORMAT: Schema-based selected fields { schema_type: [field_names] }
            console.log('\nExport Fields Configuration (Selected Fields by Schema):');
            console.log('========================================');

            // Get destination schema node to access reference field
            const destinationSchemaNode = workflow.flow_data?.nodes?.find(node => node.type === 'destinationSchemaNode');
            const referenceField = destinationSchemaNode?.data?.config?.reference_field || '';

            // Collect all data to be exported, organized by schema
            const exportDataBySchema = {};
            let allMappedData = {};

            // Process each schema's selected fields
            for (const [schemaType, fieldNames] of Object.entries(selectedFieldsConfig)) {
              if (!Array.isArray(fieldNames) || fieldNames.length === 0) continue;

              console.log(`\n[${schemaType.toUpperCase()}]`);

              let schemaData = null;

              // Fetch data based on schema type
              if (schemaType === 'vehicle') {
                // Use the triggered vehicle data directly
                schemaData = vehicleData;
              } else {
                // Fetch related schema data using reference field
                try {
                  const modelName = schemaType
                    .split('_')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join('');

                  let SchemaModel;
                  try {
                    SchemaModel = require(`../models/${modelName}`);
                  } catch (error) {
                    console.log(`  Model "${modelName}" not found - skipping schema`);
                    continue;
                  }

                  // Build query using reference field
                  let query = { company_id: companyId };
                  if (referenceField) {
                    const referenceValue = getNestedFieldValue(vehicleData, referenceField);
                    if (referenceValue) {
                      query[referenceField] = referenceValue;
                    }
                  }

                  schemaData = await SchemaModel.findOne(query).lean();

                  if (!schemaData) {
                    console.log(`  No data found for this schema`);
                    continue;
                  }
                } catch (error) {
                  console.log(`  Error fetching data: ${error.message}`);
                  continue;
                }
              }

              // Extract and display selected fields for this schema
              const schemaExportData = {};
              fieldNames.forEach(fieldName => {
                const fieldValue = getNestedFieldValue(schemaData, fieldName);
                if (fieldValue !== undefined) {
                  schemaExportData[fieldName] = fieldValue;
                  console.log(`  ${fieldName}: ${JSON.stringify(fieldValue)}`);
                }
              });

              exportDataBySchema[schemaType] = schemaExportData;

              // Merge into allMappedData for API call
              Object.assign(allMappedData, schemaExportData);
            }

            console.log('\n========================================');

            // Find the Data Mapping node to apply field mappings
            const dataMappingNode = workflow.flow_data?.nodes?.find(node => node.type === 'dataMappingNode');
            let finalMappedData = {};

            if (dataMappingNode && dataMappingNode.data?.config?.mappings && dataMappingNode.data.config.mappings.length > 0) {
              const mappings = dataMappingNode.data.config.mappings;

              // Apply mappings to transform internal field names to external field names
              for (const [fieldName, fieldValue] of Object.entries(allMappedData)) {
                const mapping = mappings.find(m => m.target_field === fieldName);
                if (mapping && mapping.source_field) {
                  finalMappedData[mapping.source_field] = fieldValue;
                } else {
                  finalMappedData[fieldName] = fieldValue;
                }
              }
            } else {
              finalMappedData = allMappedData;
            }

            // Find the Authentication node to get API endpoint
            const authNode = workflow.flow_data?.nodes?.find(node => node.type === 'authenticationNode');

            if (authNode && authNode.data?.config?.api_endpoint) {
              const authConfig = authNode.data.config;

              if (authConfig.api_endpoint) {
                try {
                  // Create execution log for Vehicle Outbound workflow
                  const WorkflowExecution = require('../models/WorkflowExecution');
                  const workflowExecutionLog = new WorkflowExecution({
                    workflow_id: workflow._id,
                    company_id: workflow.company_id,
                    execution_started_at: new Date(),
                    request_payload: finalMappedData,
                    total_vehicles: 1,
                    successful_vehicles: 0,
                    failed_vehicles: 0,
                    vehicle_results: [],
                    database_changes: {
                      vehicles_created: 0,
                      vehicles_updated: 0,
                      created_vehicle_ids: [],
                      updated_vehicle_ids: [],
                    },
                    authentication_used: authConfig.enable_authentication ? authConfig.type : 'none',
                    authentication_passed: true,
                  });

                  await makeOutboundAPICall(authConfig, finalMappedData, workflow, vehicleData, workflowExecutionLog);
                } catch (apiError) {
                  console.error('Error making outbound API call:', apiError);
                }
              }
            }

          } else if (Array.isArray(selectedFieldsConfig) && selectedFieldsConfig.length > 0) {
            // OLD FORMAT: Simple array of field names (backward compatibility)
            const selectedFields = selectedFieldsConfig;

            // Filter vehicle data to only include selected fields
            const filteredVehicleData = {};
            selectedFields.forEach(fieldName => {
              const fieldValue = getNestedFieldValue(vehicleData, fieldName);
              if (fieldValue !== undefined) {
                filteredVehicleData[fieldName] = fieldValue;
              }
            });

            // Console log the selected fields
            console.log('\nExport Fields Configuration (Selected Fields):');
            console.log('========================================');
            console.log('[VEHICLE]');
            for (const [fieldName, fieldValue] of Object.entries(filteredVehicleData)) {
              console.log(`  ${fieldName}: ${JSON.stringify(fieldValue)}`);
            }
            console.log('========================================\n');

            // Find the Data Mapping node to get field mappings
            const dataMappingNode = workflow.flow_data?.nodes?.find(node => node.type === 'dataMappingNode');
            let mappedVehicleData = {};

            if (dataMappingNode && dataMappingNode.data?.config?.mappings && dataMappingNode.data.config.mappings.length > 0) {
              const mappings = dataMappingNode.data.config.mappings;

              selectedFields.forEach(fieldName => {
                const fieldValue = getNestedFieldValue(vehicleData, fieldName);
                if (fieldValue !== undefined) {
                  const mapping = mappings.find(m => m.target_field === fieldName);
                  if (mapping && mapping.source_field) {
                    mappedVehicleData[mapping.source_field] = fieldValue;
                  } else {
                    mappedVehicleData[fieldName] = fieldValue;
                  }
                }
              });
            } else {
              mappedVehicleData = filteredVehicleData;
            }

            // Find the Authentication node to get API endpoint
            const authNode = workflow.flow_data?.nodes?.find(node => node.type === 'authenticationNode');

            if (authNode && authNode.data?.config?.api_endpoint) {
              const authConfig = authNode.data.config;

              if (authConfig.api_endpoint) {
                try {
                  // Create execution log for Vehicle Outbound workflow
                  const WorkflowExecution = require('../models/WorkflowExecution');
                  const workflowExecutionLog = new WorkflowExecution({
                    workflow_id: workflow._id,
                    company_id: workflow.company_id,
                    execution_started_at: new Date(),
                    request_payload: mappedVehicleData,
                    total_vehicles: 1,
                    successful_vehicles: 0,
                    failed_vehicles: 0,
                    vehicle_results: [],
                    database_changes: {
                      vehicles_created: 0,
                      vehicles_updated: 0,
                      created_vehicle_ids: [],
                      updated_vehicle_ids: [],
                    },
                    authentication_used: authConfig.enable_authentication ? authConfig.type : 'none',
                    authentication_passed: true,
                  });

                  await makeOutboundAPICall(authConfig, mappedVehicleData, workflow, vehicleData, workflowExecutionLog);
                } catch (apiError) {
                  console.error('Error making outbound API call:', apiError);
                }
              }
            }
          } else {
            // No fields selected
            console.log('\nNo export fields configured');
          }
        } else {
          // Fallback: if no Export Fields configuration found, log basic info
          console.log('\nNo Export Fields node configured');
          console.log('Vehicle Details:');
          console.log({
            vehicle_stock_id: vehicleData.vehicle_stock_id || 'N/A',
            make: vehicleData.make || 'N/A',
            model: vehicleData.model || 'N/A'
          });
        }
      }
    }
  } catch (error) {
    console.error('Error checking outbound workflow triggers:', error);
  }
};

// Helper function to make outbound API calls
const makeOutboundAPICall = async (authConfig, mappedData, workflow, vehicleData, workflowExecutionLog) => {
  const axios = require('axios');
  const executionStartTime = Date.now();

  try {
    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
    };

    // Add authentication headers if authentication is enabled
    if (authConfig.enable_authentication && authConfig.type !== 'none') {
      if (authConfig.type === 'jwt_token' && authConfig.jwt_token) {
        headers['Authorization'] = `Bearer ${authConfig.jwt_token}`;
      } else if (authConfig.type === 'standard' && authConfig.api_key && authConfig.api_secret) {
        headers['x-api-key'] = authConfig.api_key;
        headers['x-api-secret'] = authConfig.api_secret;
      } else if (authConfig.type === 'static' && authConfig.static_token) {
        headers['Authorization'] = `Bearer ${authConfig.static_token}`;
      }
    }

    // Make the POST request
    const response = await axios.post(authConfig.api_endpoint, mappedData, {
      headers,
      timeout: 30000,
      validateStatus: (status) => status >= 200 && status < 300
    });

    // Log success message
    console.log(`The details have been pushed successfully to the respective API endpoint: ${authConfig.api_endpoint}`);

    // ✅ Log exactly what details were pushed (your requested behavior)
    console.log("Payload pushed to the API endpoint:", JSON.stringify(mappedData, null, 2));

    // Update execution log with success details
    if (workflowExecutionLog) {
      workflowExecutionLog.execution_status = 'success';
      workflowExecutionLog.successful_vehicles = 1;
      workflowExecutionLog.failed_vehicles = 0;
      workflowExecutionLog.vehicle_results = [{
        vehicle_stock_id: vehicleData.vehicle_stock_id || 'unknown',
        status: 'success',
        database_operation: 'none',
        vehicle_id: vehicleData._id,
        vehicle_type: vehicleData.vehicle_type,
        error_message: null,
        missing_fields: [],
        validation_errors: [],
      }];
      workflowExecutionLog.execution_summary = `Successfully pushed vehicle ${vehicleData.vehicle_stock_id || 'unknown'} to API endpoint`;
      workflowExecutionLog.execution_completed_at = new Date();
      workflowExecutionLog.execution_duration_ms = Date.now() - executionStartTime;
      await workflowExecutionLog.save();
    }

    // Send success email notification
    await sendOutboundWorkflowEmail(workflow, vehicleData, mappedData, {
      success: true,
      status: response.status,
      data: response.data,
      endpoint: authConfig.api_endpoint
    });

    // Update workflow execution stats for successful execution
    await updateWorkflowExecutionStats(workflow._id, true);

    return {
      success: true,
      status: response.status,
      data: response.data
    };
  } catch (error) {
    console.error('API call failed:', error.message);

    // Update execution log with failure details
    if (workflowExecutionLog) {
      workflowExecutionLog.execution_status = 'failed';
      workflowExecutionLog.successful_vehicles = 0;
      workflowExecutionLog.failed_vehicles = 1;
      workflowExecutionLog.vehicle_results = [{
        vehicle_stock_id: vehicleData.vehicle_stock_id || 'unknown',
        status: 'failed',
        database_operation: 'none',
        vehicle_id: vehicleData._id,
        vehicle_type: vehicleData.vehicle_type,
        error_message: error.message,
        missing_fields: [],
        validation_errors: [error.message],
      }];
      workflowExecutionLog.error_message = error.message;
      workflowExecutionLog.error_stack = error.stack;
      workflowExecutionLog.execution_summary = `Failed to push vehicle ${vehicleData.vehicle_stock_id || 'unknown'} to API endpoint: ${error.message}`;
      workflowExecutionLog.execution_completed_at = new Date();
      workflowExecutionLog.execution_duration_ms = Date.now() - executionStartTime;
      await workflowExecutionLog.save();
    }

    // Send error email notification
    await sendOutboundWorkflowEmail(workflow, vehicleData, mappedData, {
      success: false,
      error: error.message,
      endpoint: authConfig.api_endpoint
    });

    // Update workflow execution stats for failed execution
    await updateWorkflowExecutionStats(workflow._id, false, error.message);

    throw error;
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
  getAvailableSchemas,
  getSchemaFields,
  getCommonFields,
  executeWorkflow,
  testWorkflow,
  getWorkflowExecutionLogs,
  getMongoDBStateName,
  processVehicleInboundWorkflow,
  validateVehicleInboundConfig,
  validateVehicleOutboundConfig,
  checkAndTriggerOutboundWorkflows,
  updateWorkflowExecutionStats,
};
