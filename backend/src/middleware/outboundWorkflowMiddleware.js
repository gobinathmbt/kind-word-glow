const Workflow = require("../models/Workflow");
const mongoose = require("mongoose");

// Helper function to detect schema type from entity data and request path
const detectSchemaType = (entityData, requestPath) => {
  // Try to detect from request path first
  if (requestPath) {
    // Workshop schemas
    if (requestPath.includes('/workshop-report') || requestPath.includes('/workshopreport')) {
      return 'workshop_report';
    }
    if (requestPath.includes('/workshop-quote') || requestPath.includes('/workshopquote')) {
      return 'workshop_quote';
    }
    if (requestPath.includes('/workshop')) {
      return 'workshop_quote';
    }
    
    // Supplier schema
    if (requestPath.includes('/supplier')) {
      return 'supplier';
    }
    
    // Vehicle schemas - order matters, check specific types first
    if (requestPath.includes('/mastervehicle') || requestPath.includes('/master-vehicle')) {
      return 'master_vehicle';
    }
    if (requestPath.includes('/advertise') || requestPath.includes('/adpublishing') || requestPath.includes('/advertise-vehicle')) {
      return 'advertise_vehicle';
    }
    if (requestPath.includes('/vehicle') || requestPath.includes('/inspection') || requestPath.includes('/tradein')) {
      return 'vehicle';
    }
    
    // Organization schemas
    if (requestPath.includes('/dealership')) {
      return 'dealership';
    }
    if (requestPath.includes('/service-bay') || requestPath.includes('/servicebay')) {
      return 'service_bay';
    }
    if (requestPath.includes('/company')) {
      return 'company';
    }
    
    // User & Permission schemas
    if (requestPath.includes('/group-permission') || requestPath.includes('/grouppermission')) {
      return 'group_permission';
    }
    if (requestPath.includes('/users') || requestPath.includes('/user')) {
      return 'user';
    }
    
    // Communication schemas
    if (requestPath.includes('/conversation')) {
      return 'conversation';
    }
    if (requestPath.includes('/notification') && !requestPath.includes('/notification-config')) {
      return 'notification';
    }
    
    // Billing schemas
    if (requestPath.includes('/invoice')) {
      return 'invoice';
    }
    if (requestPath.includes('/subscription')) {
      return 'subscription';
    }
    
    // Configuration schemas
    if (requestPath.includes('/cost-configuration') || requestPath.includes('/costconfiguration')) {
      return 'cost_configuration';
    }
    if (requestPath.includes('/inspection-config') || requestPath.includes('/inspectionconfig')) {
      return 'inspection_config';
    }
    if (requestPath.includes('/tradein-config') || requestPath.includes('/tradeinconfig')) {
      return 'tradein_config';
    }
    if (requestPath.includes('/notification-config') || requestPath.includes('/notificationconfig')) {
      return 'notification_configuration';
    }
    if (requestPath.includes('/dropdown')) {
      return 'dropdown_master';
    }
    if (requestPath.includes('/integration')) {
      return 'integration';
    }
    
    // Workflow schemas
    if (requestPath.includes('/workflow-execution')) {
      return 'workflow_execution';
    }
    if (requestPath.includes('/workflow')) {
      return 'workflow';
    }
  }

  // Fallback: detect from entity data structure
  // Workshop schemas - check specific fields
  if (entityData.report_type !== undefined && entityData.quotes_data !== undefined && entityData.vehicle_stock_id !== undefined) {
    return 'workshop_report';
  }
  if (entityData.quote_type !== undefined && entityData.field_id !== undefined && entityData.field_name !== undefined) {
    return 'workshop_quote';
  }
  
  // Supplier schema - check for unique supplier fields
  if (entityData.supplier_shop_name !== undefined || (entityData.tags !== undefined && Array.isArray(entityData.tags) && entityData.email !== undefined && entityData.name !== undefined && !entityData.username)) {
    return 'supplier';
  }
  
  // Vehicle schemas - check vehicle_type field
  if (entityData.vehicle_stock_id !== undefined && entityData.vin !== undefined) {
    if (entityData.vehicle_type === 'master') {
      return 'master_vehicle';
    }
    if (entityData.vehicle_type === 'advertisement') {
      return 'advertise_vehicle';
    }
    // Default to vehicle schema for inspection/tradein types
    return 'vehicle';
  }
  
  // Organization schemas
  if (entityData.dealership_id !== undefined && entityData.dealership_name !== undefined && entityData.dealership_address !== undefined) {
    return 'dealership';
  }
  if (entityData.bay_name !== undefined && entityData.bay_timings !== undefined && Array.isArray(entityData.bay_timings)) {
    return 'service_bay';
  }
  if (entityData.company_name !== undefined && entityData.subscription_status !== undefined) {
    return 'company';
  }
  
  // User & Permission schemas
  if (entityData.username !== undefined && entityData.role !== undefined && entityData.email !== undefined && (entityData.role === 'company_super_admin' || entityData.role === 'company_admin')) {
    return 'user';
  }
  if (entityData.name !== undefined && entityData.permissions !== undefined && Array.isArray(entityData.permissions) && entityData.description !== undefined && !entityData.username) {
    return 'group_permission';
  }
  
  // Communication schemas
  if (entityData.quote_id !== undefined && entityData.messages !== undefined && Array.isArray(entityData.messages) && entityData.unread_count_company !== undefined) {
    return 'conversation';
  }
  if (entityData.recipient_id !== undefined && entityData.configuration_id !== undefined && entityData.is_read !== undefined) {
    return 'notification';
  }
  
  // Billing schemas
  if (entityData.invoice_number !== undefined && entityData.payment_status !== undefined) {
    return 'invoice';
  }
  if (entityData.plan_id !== undefined && entityData.subscription_status !== undefined) {
    return 'subscription';
  }
  
  // Configuration schemas
  if (entityData.cost_types !== undefined && Array.isArray(entityData.cost_types) && entityData.cost_setter !== undefined && Array.isArray(entityData.cost_setter)) {
    return 'cost_configuration';
  }
  if (entityData.config_name !== undefined && entityData.categories !== undefined && Array.isArray(entityData.categories) && entityData.settings !== undefined && entityData.settings.require_digital_signature !== undefined) {
    return 'inspection_config';
  }
  if (entityData.config_name !== undefined && entityData.categories !== undefined && Array.isArray(entityData.categories) && entityData.settings !== undefined && entityData.settings.require_customer_signature !== undefined) {
    return 'tradein_config';
  }
  if (entityData.trigger_type !== undefined && entityData.target_schema !== undefined && entityData.notification_channels !== undefined) {
    return 'notification_configuration';
  }
  if (entityData.dropdown_name !== undefined && entityData.values !== undefined && Array.isArray(entityData.values) && entityData.display_name !== undefined) {
    return 'dropdown_master';
  }
  if (entityData.integration_type !== undefined && entityData.environments !== undefined && entityData.active_environment !== undefined) {
    return 'integration';
  }
  
  // Workflow schemas
  if (entityData.workflow_id !== undefined && entityData.execution_status !== undefined && entityData.vehicle_results !== undefined) {
    return 'workflow_execution';
  }
  if (entityData.workflow_type !== undefined && entityData.flow_data !== undefined && (entityData.workflow_type === 'vehicle_inbound' || entityData.workflow_type === 'vehicle_outbound')) {
    return 'workflow';
  }

  // Return unknown if we can't detect
  return 'unknown';
};

// Helper function to get nested field value from object
const getNestedFieldValue = (obj, fieldPath) => {
  if (!fieldPath || !obj) return undefined;
  return fieldPath.split('.').reduce((current, key) => {
    if (current && Array.isArray(current) && current.length > 0) {
      // For arrays, get the first element
      return current[0] && current[0][key] !== undefined ? current[0][key] : undefined;
    }
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
};

// Helper function to check trigger condition
const checkTriggerCondition = (fieldValue, operator, expectedValue) => {
  switch (operator) {
    case 'equals':
      return String(fieldValue) === String(expectedValue);
    case 'not_equals':
      return String(fieldValue) !== String(expectedValue);
    case 'contains':
      return String(fieldValue).toLowerCase().includes(String(expectedValue).toLowerCase());
    case 'not_contains':
      return !String(fieldValue).toLowerCase().includes(String(expectedValue).toLowerCase());
    case 'greater_than':
      return Number(fieldValue) > Number(expectedValue);
    case 'less_than':
      return Number(fieldValue) < Number(expectedValue);
    case 'greater_than_or_equal':
      return Number(fieldValue) >= Number(expectedValue);
    case 'less_than_or_equal':
      return Number(fieldValue) <= Number(expectedValue);
    case 'is_true':
      return fieldValue === true || fieldValue === 'true';
    case 'is_false':
      return fieldValue === false || fieldValue === 'false';
    case 'is_empty':
      return !fieldValue || fieldValue === '' || (Array.isArray(fieldValue) && fieldValue.length === 0);
    case 'is_not_empty':
      return fieldValue && fieldValue !== '' && (!Array.isArray(fieldValue) || fieldValue.length > 0);
    default:
      return false;
  }
};

// Global outbound workflow middleware
const outboundWorkflowMiddleware = async (req, res, next) => {
  // Store original json method
  const originalJson = res.json;
  
  // Override res.json to capture response
  res.json = function(data) {
    originalJson.call(this, data);
    
    // Only process successful responses
    if (res.statusCode >= 200 && res.statusCode < 300 && data.success) {
      // Process outbound workflows asynchronously to not block the response
      setImmediate(() => {
        processOutboundWorkflowTriggers(req, res, data).catch(error => {
          console.error('Error processing outbound workflow triggers:', error);
        });
      });
    }
  };
  
  next();
};

// Process outbound workflow triggers based on request
const processOutboundWorkflowTriggers = async (req, res, responseData) => {
  try {
    const method = req.method.toLowerCase();
    
    // Only process POST, PUT, and PATCH requests (create/update operations)
    if (!['post', 'put', 'patch'].includes(method)) {
      return;
    }

    // Extract data from response
    const entityData = responseData.data;
    
    // Ensure we have data and company_id
    if (!entityData || !req.user?.company_id) {
      return;
    }

    // Convert to plain object if it's a Mongoose document
    const dataObject = entityData.toObject ? entityData.toObject() : entityData;

    // Trigger the outbound workflow check for any schema
    await checkAndTriggerOutboundWorkflows(dataObject, req.user.company_id, req.path);
    
  } catch (error) {
    console.error('Error in processOutboundWorkflowTriggers:', error);
  }
};

// Main function to check and trigger outbound workflows
const checkAndTriggerOutboundWorkflows = async (entityData, companyId, requestPath) => {
  try {
    // Find all active "Vehicle Outbound" workflows for this company
    const outboundWorkflows = await Workflow.find({
      company_id: companyId,
      workflow_type: 'vehicle_outbound',
      status: 'active'
    });

    if (outboundWorkflows.length === 0) {
      return;
    }

    for (const workflow of outboundWorkflows) {
      await evaluateAndTriggerWorkflow(workflow, entityData, companyId, requestPath);
    }
  } catch (error) {
    console.error('Error checking outbound workflow triggers:', error);
  }
};

// Evaluate and trigger a specific workflow
const evaluateAndTriggerWorkflow = async (workflow, entityData, companyId, requestPath) => {
  try {
    // Find the target schema node in the workflow
    const targetSchemaNode = workflow.flow_data?.nodes?.find(node => node.type === 'targetSchemaNode');

    if (!targetSchemaNode || !targetSchemaNode.data?.config) {
      return;
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
      return;
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

      let conditionMet = false;

      // Check if the current entity data matches the trigger's schema type
      const currentSchemaType = detectSchemaType(entityData, requestPath);
      
      if (trigger.schema_type === currentSchemaType) {
        // Check entity data directly for the configured schema
        const fieldValue = getNestedFieldValue(entityData, trigger.trigger_field);
        conditionMet = checkTriggerCondition(
          fieldValue,
          trigger.trigger_operator,
          trigger.trigger_value
        );
        
      } else if (hasMultipleSchemas && referenceField) {
        // Cross-schema validation: fetch related data using reference field
        conditionMet = await evaluateCrossSchemaCondition(
          trigger,
          entityData,
          referenceField,
          companyId,
          workflow.name
        );
      } else {
        // Schema type doesn't match current entity - skip this trigger
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
      await executeOutboundWorkflow(workflow, entityData, activatedTriggers, companyId);
    }
  } catch (error) {
    console.error(`Error evaluating workflow ${workflow.name}:`, error);
  }
};

// Evaluate cross-schema condition
const evaluateCrossSchemaCondition = async (trigger, entityData, referenceField, companyId, workflowName) => {
  try {
    // Get the reference value from entity data
    const referenceValue = getNestedFieldValue(entityData, referenceField);

    if (!referenceValue) {
      return false;
    }

    // Convert schema_type to model name with special handling
    let modelName;
    const schemaTypeMap = {
      'advertise_vehicle': 'AdvertiseVehicle',
      'conversation': 'Conversation',
      'cost_configuration': 'CostConfiguration',
      'dealership': 'Dealership',
      'dropdown_master': 'DropdownMaster',
      'group_permission': 'GroupPermission',
      'inspection_config': 'InspectionConfig',
      'integration': 'Integration',
      'master_vehicle': 'MasterVehicle',
      'notification_configuration': 'NotificationConfiguration',
      'service_bay': 'ServiceBay',
      'supplier': 'Supplier',
      'tradein_config': 'TradeinConfig',
      'user': 'User',
      'vehicle': 'Vehicle',
      'workflow': 'Workflow',
      'workshop_quote': 'WorkshopQuote',
      'workshop_report': 'WorkshopReport'
    };

    modelName = schemaTypeMap[trigger.schema_type];
    
    if (!modelName) {
      // Fallback to default conversion
      modelName = trigger.schema_type
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('');
    }

    let SchemaModel;
    try {
      SchemaModel = require(`../models/${modelName}`);
    } catch (error) {
      return false;
    }

    // Query the related schema using reference field
    const query = {
      company_id: companyId,
      [referenceField]: referenceValue
    };

    const relatedData = await SchemaModel.findOne(query);

    if (!relatedData) {
      return false;
    }

    // Check the trigger condition on the related data
    const fieldValue = getNestedFieldValue(relatedData, trigger.trigger_field);
    return checkTriggerCondition(
      fieldValue,
      trigger.trigger_operator,
      trigger.trigger_value
    );
  } catch (error) {
    return false;
  }
};

// Execute the outbound workflow
const executeOutboundWorkflow = async (workflow, entityData, activatedTriggers, companyId) => {
  try {
    // Console log which triggers were activated
    console.log('\n========================================');
    console.log(`[Workflow: ${workflow.name}] TRIGGER ACTIVATED`);
    console.log('========================================');
    console.log('Activated Triggers:');
    activatedTriggers.forEach((trigger, index) => {
      console.log(`  ${index + 1}. ${trigger.schema_type}.${trigger.trigger_field} ${trigger.trigger_operator} "${trigger.trigger_value}"`);
    });
    console.log('\nEntity Details:');
    // Log relevant fields based on what's available in the entity
    const entitySummary = {
      _id: entityData._id,
      company_id: entityData.company_id
    };
    
    // Vehicle schema fields (Vehicle, MasterVehicle, AdvertiseVehicle)
    if (entityData.vehicle_stock_id) entitySummary.vehicle_stock_id = entityData.vehicle_stock_id;
    if (entityData.vehicle_type) entitySummary.vehicle_type = entityData.vehicle_type;
    if (entityData.make) entitySummary.make = entityData.make;
    if (entityData.model) entitySummary.model = entityData.model;
    if (entityData.year) entitySummary.year = entityData.year;
    if (entityData.vin) entitySummary.vin = entityData.vin;
    if (entityData.plate_no) entitySummary.plate_no = entityData.plate_no;
    if (entityData.is_pricing_ready !== undefined) entitySummary.is_pricing_ready = entityData.is_pricing_ready;
    if (entityData.chassis_no) entitySummary.chassis_no = entityData.chassis_no;
    
    // Workshop Quote schema fields
    if (entityData.quote_type) entitySummary.quote_type = entityData.quote_type;
    if (entityData.field_id) entitySummary.field_id = entityData.field_id;
    if (entityData.field_name) entitySummary.field_name = entityData.field_name;
    if (entityData.status) entitySummary.status = entityData.status;
    if (entityData.quote_amount) entitySummary.quote_amount = entityData.quote_amount;
    
    // Workshop Report schema fields
    if (entityData.report_type) entitySummary.report_type = entityData.report_type;
    if (entityData.stage_name) entitySummary.stage_name = entityData.stage_name;
    
    // Supplier schema fields
    if (entityData.name && !entityData.username) entitySummary.name = entityData.name;
    if (entityData.email) entitySummary.email = entityData.email;
    if (entityData.supplier_shop_name) entitySummary.supplier_shop_name = entityData.supplier_shop_name;
    if (entityData.tags && Array.isArray(entityData.tags)) entitySummary.tags = entityData.tags;
    if (entityData.is_active !== undefined) entitySummary.is_active = entityData.is_active;
    
    // Dealership schema fields
    if (entityData.dealership_id) entitySummary.dealership_id = entityData.dealership_id;
    if (entityData.dealership_name) entitySummary.dealership_name = entityData.dealership_name;
    if (entityData.dealership_email) entitySummary.dealership_email = entityData.dealership_email;
    if (entityData.dealership_address) entitySummary.dealership_address = entityData.dealership_address;
    
    // Service Bay schema fields
    if (entityData.bay_name) entitySummary.bay_name = entityData.bay_name;
    if (entityData.bay_description) entitySummary.bay_description = entityData.bay_description;
    if (entityData.primary_admin) entitySummary.primary_admin = entityData.primary_admin;
    
    // Company schema fields
    if (entityData.company_name) entitySummary.company_name = entityData.company_name;
    if (entityData.subscription_status) entitySummary.subscription_status = entityData.subscription_status;
    if (entityData.contact_person) entitySummary.contact_person = entityData.contact_person;
    
    // User schema fields
    if (entityData.username) entitySummary.username = entityData.username;
    if (entityData.role) entitySummary.role = entityData.role;
    if (entityData.first_name) entitySummary.first_name = entityData.first_name;
    if (entityData.last_name) entitySummary.last_name = entityData.last_name;
    
    // Group Permission schema fields
    if (entityData.name && entityData.permissions && !entityData.username) {
      entitySummary.group_name = entityData.name;
      entitySummary.permissions = entityData.permissions;
    }
    if (entityData.description && entityData.permissions) entitySummary.description = entityData.description;
    
    // Conversation schema fields
    if (entityData.quote_id) entitySummary.quote_id = entityData.quote_id;
    if (entityData.supplier_id) entitySummary.supplier_id = entityData.supplier_id;
    if (entityData.last_message_at) entitySummary.last_message_at = entityData.last_message_at;
    if (entityData.unread_count_company !== undefined) entitySummary.unread_count_company = entityData.unread_count_company;
    
    // Notification schema fields
    if (entityData.recipient_id) entitySummary.recipient_id = entityData.recipient_id;
    if (entityData.title) entitySummary.title = entityData.title;
    if (entityData.type) entitySummary.type = entityData.type;
    if (entityData.is_read !== undefined) entitySummary.is_read = entityData.is_read;
    
    // Invoice schema fields
    if (entityData.invoice_number) entitySummary.invoice_number = entityData.invoice_number;
    if (entityData.payment_status) entitySummary.payment_status = entityData.payment_status;
    if (entityData.total_amount) entitySummary.total_amount = entityData.total_amount;
    
    // Subscription schema fields
    if (entityData.plan_id) entitySummary.plan_id = entityData.plan_id;
    
    // Cost Configuration schema fields
    if (entityData.cost_types && Array.isArray(entityData.cost_types)) {
      entitySummary.cost_types_count = entityData.cost_types.length;
    }
    if (entityData.cost_setter && Array.isArray(entityData.cost_setter)) {
      entitySummary.cost_setter_count = entityData.cost_setter.length;
    }
    
    // Inspection Config schema fields
    if (entityData.config_name && entityData.categories) {
      entitySummary.config_name = entityData.config_name;
      entitySummary.categories_count = Array.isArray(entityData.categories) ? entityData.categories.length : 0;
      if (entityData.is_default !== undefined) entitySummary.is_default = entityData.is_default;
    }
    
    // Tradein Config schema fields (similar to inspection config)
    if (entityData.config_name && entityData.version) {
      entitySummary.config_name = entityData.config_name;
      entitySummary.version = entityData.version;
    }
    
    // Dropdown Master schema fields
    if (entityData.dropdown_name) entitySummary.dropdown_name = entityData.dropdown_name;
    if (entityData.display_name) entitySummary.display_name = entityData.display_name;
    if (entityData.values && Array.isArray(entityData.values)) {
      entitySummary.values_count = entityData.values.length;
    }
    
    // Integration schema fields
    if (entityData.integration_type) entitySummary.integration_type = entityData.integration_type;
    if (entityData.active_environment) entitySummary.active_environment = entityData.active_environment;
    
    // Notification Configuration schema fields
    if (entityData.trigger_type) entitySummary.trigger_type = entityData.trigger_type;
    if (entityData.target_schema) entitySummary.target_schema = entityData.target_schema;
    if (entityData.notification_channels) entitySummary.notification_channels = entityData.notification_channels;
    
    // Workflow schema fields
    if (entityData.workflow_type) entitySummary.workflow_type = entityData.workflow_type;
    if (entityData.workflow_id) entitySummary.workflow_id = entityData.workflow_id;
    if (entityData.execution_status) entitySummary.execution_status = entityData.execution_status;
    
    console.log(JSON.stringify(entitySummary, null, 2));

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
          const referenceValue = getNestedFieldValue(entityData, destConfig.reference_field);
          console.log(`Reference Value from Entity: ${referenceValue}`);
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
        await processSchemaBasedExport(workflow, entityData, selectedFieldsConfig, companyId);
      } else if (Array.isArray(selectedFieldsConfig) && selectedFieldsConfig.length > 0) {
        await processLegacyExport(workflow, entityData, selectedFieldsConfig);
      } else {
        console.log('\nNo export fields configured');
      }
    } else {
      console.log('\nNo Export Fields node configured');
      console.log('Entity Details:');
      console.log({
        _id: entityData._id || 'N/A',
        company_id: entityData.company_id || 'N/A'
      });
    }
  } catch (error) {
    console.error(`Error executing outbound workflow ${workflow.name}:`, error);
  }
};

// Process schema-based export (new format)
const processSchemaBasedExport = async (workflow, entityData, selectedFieldsConfig, companyId) => {
  console.log('\nExport Fields Configuration (Selected Fields by Schema):');
  console.log('========================================');

  // Get destination schema node to access reference field
  const destinationSchemaNode = workflow.flow_data?.nodes?.find(node => node.type === 'destinationSchemaNode');
  const referenceField = destinationSchemaNode?.data?.config?.reference_field || '';

  // Detect the current entity's schema type
  const currentSchemaType = detectSchemaType(entityData, '');

  // Collect all data to be exported, organized by schema
  const exportDataBySchema = {};
  let allMappedData = {};

  // Process each schema's selected fields
  for (const [schemaType, fieldNames] of Object.entries(selectedFieldsConfig)) {
    if (!Array.isArray(fieldNames) || fieldNames.length === 0) continue;

    console.log(`\n[${schemaType.toUpperCase()}]`);

    let schemaData = null;

    // Fetch data based on schema type
    if (schemaType === currentSchemaType) {
      // Use the triggered entity data directly
      schemaData = entityData;
    } else {
      // Fetch related schema data using reference field
      schemaData = await fetchRelatedSchemaData(schemaType, entityData, referenceField, companyId);
      if (!schemaData) continue;
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

  // Apply data mapping
  const finalMappedData = applyDataMapping(workflow, allMappedData);

  // Make the outbound API call
  await makeOutboundAPICall(workflow, finalMappedData, entityData);
};

// Process legacy export (old format)
const processLegacyExport = async (workflow, entityData, selectedFields) => {
  // Filter entity data to only include selected fields
  const filteredEntityData = {};
  selectedFields.forEach(fieldName => {
    const fieldValue = getNestedFieldValue(entityData, fieldName);
    if (fieldValue !== undefined) {
      filteredEntityData[fieldName] = fieldValue;
    }
  });

  // Console log the selected fields
  console.log('\nExport Fields Configuration (Selected Fields):');
  console.log('========================================');
  const currentSchemaType = detectSchemaType(entityData, '');
  console.log(`[${currentSchemaType.toUpperCase()}]`);
  for (const [fieldName, fieldValue] of Object.entries(filteredEntityData)) {
    console.log(`  ${fieldName}: ${JSON.stringify(fieldValue)}`);
  }
  console.log('========================================\n');

  // Apply data mapping
  const mappedEntityData = applyDataMapping(workflow, filteredEntityData);

  // Make the outbound API call
  await makeOutboundAPICall(workflow, mappedEntityData, entityData);
};

// Fetch related schema data
const fetchRelatedSchemaData = async (schemaType, entityData, referenceField, companyId) => {
  try {
    // Convert schema_type to model name with special handling
    let modelName;
    const schemaTypeMap = {
      'advertise_vehicle': 'AdvertiseVehicle',
      'conversation': 'Conversation',
      'cost_configuration': 'CostConfiguration',
      'dealership': 'Dealership',
      'dropdown_master': 'DropdownMaster',
      'group_permission': 'GroupPermission',
      'inspection_config': 'InspectionConfig',
      'integration': 'Integration',
      'master_vehicle': 'MasterVehicle',
      'notification_configuration': 'NotificationConfiguration',
      'service_bay': 'ServiceBay',
      'supplier': 'Supplier',
      'tradein_config': 'TradeinConfig',
      'user': 'User',
      'vehicle': 'Vehicle',
      'workflow': 'Workflow',
      'workshop_quote': 'WorkshopQuote',
      'workshop_report': 'WorkshopReport'
    };

    modelName = schemaTypeMap[schemaType];
    
    if (!modelName) {
      // Fallback to default conversion
      modelName = schemaType
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('');
    }

    let SchemaModel;
    try {
      SchemaModel = require(`../models/${modelName}`);
    } catch (error) {
      console.log(`  Model "${modelName}" not found for schema type "${schemaType}" - skipping schema`);
      return null;
    }

    // Build query using reference field
    let query = { company_id: companyId };
    if (referenceField) {
      const referenceValue = getNestedFieldValue(entityData, referenceField);
      if (referenceValue) {
        query[referenceField] = referenceValue;
      }
    }

    const schemaData = await SchemaModel.findOne(query).lean();

    if (!schemaData) {
      console.log(`  No data found for this schema`);
      return null;
    }

    return schemaData;
  } catch (error) {
    console.log(`  Error fetching data: ${error.message}`);
    return null;
  }
};

// Apply data mapping
const applyDataMapping = (workflow, sourceData) => {
  // Find the Data Mapping node to apply field mappings
  const dataMappingNode = workflow.flow_data?.nodes?.find(node => node.type === 'dataMappingNode');
  let finalMappedData = {};

  if (dataMappingNode && dataMappingNode.data?.config?.mappings && dataMappingNode.data.config.mappings.length > 0) {
    const mappings = dataMappingNode.data.config.mappings;

    // Apply mappings to transform internal field names to external field names
    for (const [fieldName, fieldValue] of Object.entries(sourceData)) {
      const mapping = mappings.find(m => m.target_field === fieldName);
      if (mapping && mapping.source_field) {
        finalMappedData[mapping.source_field] = fieldValue;
      } else {
        finalMappedData[fieldName] = fieldValue;
      }
    }
  } else {
    finalMappedData = sourceData;
  }

  return finalMappedData;
};

// Make outbound API call
const makeOutboundAPICall = async (workflow, mappedData, entityData) => {
  const axios = require('axios');
  const executionStartTime = Date.now();

  try {
    // Find the Authentication node to get API endpoint
    const authNode = workflow.flow_data?.nodes?.find(node => node.type === 'authenticationNode');

    if (!authNode || !authNode.data?.config?.api_endpoint) {
      console.log('No API endpoint configured');
      return;
    }

    const authConfig = authNode.data.config;

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

    // Create execution log for Vehicle Outbound workflow
    const WorkflowExecution = require('../models/WorkflowExecution');
    const entityIdentifier = entityData.vehicle_stock_id || entityData._id || 'unknown';
    const workflowExecutionLog = new WorkflowExecution({
      workflow_id: workflow._id,
      company_id: workflow.company_id,
      execution_started_at: new Date(),
      request_payload: mappedData,
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

    // Make the POST request
    const response = await axios.post(authConfig.api_endpoint, mappedData, {
      headers,
      timeout: 30000,
      validateStatus: (status) => status >= 200 && status < 300
    });

    // Log success message
    console.log(`The details have been pushed successfully to the respective API endpoint: ${authConfig.api_endpoint}`);
    console.log("Payload pushed to the API endpoint:", JSON.stringify(mappedData, null, 2));

    // Update execution log with success details
    workflowExecutionLog.execution_status = 'success';
    workflowExecutionLog.successful_vehicles = 1;
    workflowExecutionLog.failed_vehicles = 0;
    workflowExecutionLog.vehicle_results = [{
      vehicle_stock_id: entityIdentifier,
      status: 'success',
      database_operation: 'none',
      vehicle_id: entityData._id,
      vehicle_type: entityData.vehicle_type || 'N/A',
      error_message: null,
      missing_fields: [],
      validation_errors: [],
    }];
    workflowExecutionLog.execution_summary = `Successfully pushed entity ${entityIdentifier} to API endpoint`;
    workflowExecutionLog.execution_completed_at = new Date();
    workflowExecutionLog.execution_duration_ms = Date.now() - executionStartTime;
    await workflowExecutionLog.save();

    // Send success email notification
    const { sendOutboundWorkflowEmail, updateWorkflowExecutionStats } = require('../controllers/workflow.controller');
    await sendOutboundWorkflowEmail(workflow, entityData, mappedData, {
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
    const WorkflowExecution = require('../models/WorkflowExecution');
    const entityIdentifier = entityData.vehicle_stock_id || entityData._id || 'unknown';
    const workflowExecutionLog = new WorkflowExecution({
      workflow_id: workflow._id,
      company_id: workflow.company_id,
      execution_started_at: new Date(),
      request_payload: mappedData,
      total_vehicles: 1,
      successful_vehicles: 0,
      failed_vehicles: 1,
      vehicle_results: [{
        vehicle_stock_id: entityIdentifier,
        status: 'failed',
        database_operation: 'none',
        vehicle_id: entityData._id,
        vehicle_type: entityData.vehicle_type || 'N/A',
        error_message: error.message,
        missing_fields: [],
        validation_errors: [error.message],
      }],
      error_message: error.message,
      error_stack: error.stack,
      execution_summary: `Failed to push entity ${entityIdentifier} to API endpoint: ${error.message}`,
      execution_completed_at: new Date(),
      execution_duration_ms: Date.now() - executionStartTime,
      execution_status: 'failed',
      authentication_used: 'none',
      authentication_passed: false,
    });

    await workflowExecutionLog.save();

    // Send failure email notification
    const { sendOutboundWorkflowEmail, updateWorkflowExecutionStats } = require('../controllers/workflow.controller');
    await sendOutboundWorkflowEmail(workflow, entityData, mappedData, {
      success: false,
      error: error.message
    });

    // Update workflow execution stats for failed execution
    await updateWorkflowExecutionStats(workflow._id, false);

    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = outboundWorkflowMiddleware;
