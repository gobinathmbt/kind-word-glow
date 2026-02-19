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
  
  // Add more detection logic as needed...
  
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

// Helper function to check condition
const checkCondition = (fieldValue, operator, expectedValue) => {
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
    case 'in':
      // Check if fieldValue is in the comma-separated expectedValue list
      const values = String(expectedValue).split(',').map(v => v.trim());
      return values.includes(String(fieldValue));
    case 'not_in':
      // Check if fieldValue is NOT in the comma-separated expectedValue list
      const notInValues = String(expectedValue).split(',').map(v => v.trim());
      return !notInValues.includes(String(fieldValue));
    default:
      return false;
  }
};

// Global email trigger middleware
const emailTriggerMiddleware = async (req, res, next) => {
  // Skip if already processed
  if (res._emailTriggerProcessed) {
    return next();
  }
  
  // Mark as processed
  res._emailTriggerProcessed = true;
  
  // Store original json method
  const originalJson = res.json;
  
  // Override res.json to capture response
  res.json = function(data) {
    // Call original json first
    originalJson.call(this, data);
    
    // Only process successful responses once
    if (res.statusCode >= 200 && res.statusCode < 300 && data.success && !this._emailTriggerExecuted) {
      // Mark as executed to prevent duplicate processing
      this._emailTriggerExecuted = true;
      
      // Process email trigger workflows asynchronously to not block the response
      setImmediate(() => {
        processEmailTriggerWorkflows(req, res, data).catch(error => {
          console.error('Error processing email trigger workflows:', error);
        });
      });
    }
  };
  
  next();
};

// Process email trigger workflows based on request
const processEmailTriggerWorkflows = async (req, res, responseData) => {
  try {
    const method = req.method.toLowerCase();
    
    // Map HTTP methods to trigger types
    let triggerType = null;
    if (method === 'post') {
      triggerType = 'create';
    } else if (method === 'put' || method === 'patch') {
      triggerType = 'update';
    } else if (method === 'delete') {
      triggerType = 'delete';
    }

    // Only process create, update, and delete operations
    if (!triggerType) {
      return;
    }

    // Extract data from response
    const entityData = responseData.data;
    
    // Ensure we have data and company_id
    if (!entityData || !req.user?.company_id) {
      return;
    }

    // Check if req.getModel is available
    if (!req.getModel) {
      console.warn('req.getModel not available in emailTriggerMiddleware - skipping workflow processing');
      return;
    }

    // Convert to plain object if it's a Mongoose document
    const dataObject = entityData.toObject ? entityData.toObject() : entityData;

    // Trigger the email trigger workflow check
    await checkAndTriggerEmailWorkflows(dataObject, req.user.company_id, req.path, triggerType, req);
    
  } catch (error) {
    console.error('Error in processEmailTriggerWorkflows:', error);
  }
};

// Main function to check and trigger email workflows
const checkAndTriggerEmailWorkflows = async (entityData, companyId, requestPath, triggerType, req) => {
  try {
    // Get Workflow model using req.getModel
    const Workflow = req.getModel('Workflow');
    
    // Find all active "Email Trigger" workflows for this company
    const emailWorkflows = await Workflow.find({
      company_id: companyId,
      workflow_type: 'email_trigger',
      status: 'active'
    });

    if (emailWorkflows.length === 0) {
      return;
    }

    for (const workflow of emailWorkflows) {
      await evaluateAndTriggerEmailWorkflow(workflow, entityData, companyId, requestPath, triggerType, req);
    }
  } catch (error) {
    console.error('Error checking email trigger workflows:', error);
  }
};

// Evaluate and trigger a specific email workflow
const evaluateAndTriggerEmailWorkflow = async (workflow, entityData, companyId, requestPath, triggerType, req) => {
  try {
    // Create a unique key for this workflow execution to prevent duplicates
    const executionKey = `${workflow._id}_${entityData._id}_${triggerType}_${Date.now()}`;
    
    // Check if this workflow was already triggered for this entity in the last second
    if (global._emailTriggerCache) {
      const cacheKey = `${workflow._id}_${entityData._id}_${triggerType}`;
      const lastExecution = global._emailTriggerCache[cacheKey];
      if (lastExecution && (Date.now() - lastExecution) < 1000) {
        // Skip if triggered within the last second
        return;
      }
    } else {
      global._emailTriggerCache = {};
    }
    
    // Find the Basic Info node to get trigger configuration
    const basicInfoNode = workflow.flow_data?.nodes?.find(node => node.type === 'basicInfoNode');

    if (!basicInfoNode || !basicInfoNode.data?.config) {
      return;
    }

    const basicConfig = basicInfoNode.data.config;
    const configuredTriggerType = basicConfig.trigger_type; // 'create', 'update', or 'delete'
    const targetSchema = basicConfig.target_schema;

    // Check if the trigger type matches
    if (configuredTriggerType !== triggerType) {
      return;
    }

    // Detect the current entity's schema type
    const currentSchemaType = detectSchemaType(entityData, requestPath);

    // Check if the target schema matches
    if (targetSchema !== currentSchemaType) {
      return;
    }
    
    // Update cache with current execution time
    const cacheKey = `${workflow._id}_${entityData._id}_${triggerType}`;
    global._emailTriggerCache[cacheKey] = Date.now();
    
    // Clean up old cache entries (older than 5 seconds)
    const now = Date.now();
    Object.keys(global._emailTriggerCache).forEach(key => {
      if (now - global._emailTriggerCache[key] > 5000) {
        delete global._emailTriggerCache[key];
      }
    });

    // Find the Condition node to get field conditions
    const conditionNode = workflow.flow_data?.nodes?.find(node => node.type === 'conditionNode');

    if (!conditionNode || !conditionNode.data?.config || !conditionNode.data.config.target_fields) {
      // No conditions configured - trigger immediately
      // Send email notifications (same approach as Vehicle Outbound workflow)
      await sendEmailTriggerWorkflowEmail(workflow, entityData, {
        success: true,
        triggerType,
        targetSchema,
        evaluatedConditions: []
      }, req);
      return;
    }

    const conditions = conditionNode.data.config.target_fields;

    if (conditions.length === 0) {
      // No conditions configured - trigger immediately
      
      // Send email notifications (same approach as Vehicle Outbound workflow)
      await sendEmailTriggerWorkflowEmail(workflow, entityData, {
        success: true,
        triggerType,
        targetSchema,
        evaluatedConditions: []
      }, req);
      return;
    }

    // Evaluate all conditions
    let allConditionsMet = true;
    const evaluatedConditions = [];

    for (let i = 0; i < conditions.length; i++) {
      const condition = conditions[i];

      // Skip incomplete conditions
      if (!condition.field_name || !condition.operator) {
        continue;
      }

      // Get the field value from entity data
      const fieldValue = getNestedFieldValue(entityData, condition.field_name);

      // Check the condition
      const conditionMet = checkCondition(
        fieldValue,
        condition.operator,
        condition.value
      );

      evaluatedConditions.push({
        field_name: condition.field_name,
        operator: condition.operator,
        value: condition.value,
        actual_value: fieldValue,
        result: conditionMet,
        logic: condition.condition
      });

      // Apply logic operator
      if (i === 0) {
        // First condition sets the initial state
        allConditionsMet = conditionMet;
      } else {
        // Subsequent conditions use their logic operator
        const logic = condition.condition || 'and';
        if (logic === 'and') {
          allConditionsMet = allConditionsMet && conditionMet;
        } else if (logic === 'or') {
          allConditionsMet = allConditionsMet || conditionMet;
        }
      }
    }

    // Only trigger if all conditions are met
    if (allConditionsMet) {
      // Send email notifications (same approach as Vehicle Outbound workflow)
      await sendEmailTriggerWorkflowEmail(workflow, entityData, {
        success: true,
        triggerType,
        targetSchema,
        evaluatedConditions
      }, req);
    }
  } catch (error) {
    console.error(`Error evaluating email workflow ${workflow.name}:`, error);
  }
};

// Helper function to send email notifications for email trigger workflows
// Uses the same template and process as Vehicle Outbound for consistency
const sendEmailTriggerWorkflowEmail = async (workflow, entityData, triggerResult, req) => {
  const WorkflowExecution = req.getModel('WorkflowExecution');
  const executionStartTime = Date.now();
  
  try {
    const { sendWorkflowEmail } = require('../utils/email.utils');

    // Find the email nodes in the workflow (same as Vehicle Outbound)
    const emailSuccessNode = workflow.flow_data?.nodes?.find(node =>
      node.id.includes('success') && node.type === 'enhancedEmailNode'
    );
    const emailErrorNode = workflow.flow_data?.nodes?.find(node =>
      node.id.includes('error') && node.type === 'enhancedEmailNode'
    );

    // Prepare email data using the same structure as Vehicle Outbound
    // This ensures template compatibility across workflow types
    // IMPORTANT: Explicitly extract fields BEFORE spreading to ensure they're always defined
    const emailData = {
      // Entity data (mapped to vehicle structure for template compatibility)
      vehicle: {
        // Explicitly extract common vehicle fields with fallback values (same as Vehicle Outbound)
        vehicle_stock_id: entityData.vehicle_stock_id || entityData._id?.toString() || 'N/A',
        make: entityData.make || 'N/A',
        model: entityData.model || 'N/A',
        year: entityData.year || 'N/A',
        vin: entityData.vin || 'N/A',
        plate_no: entityData.plate_no || 'N/A',
        vehicle_type: entityData.vehicle_type || 'N/A',
        chassis_no: entityData.chassis_no || 'N/A',
        is_pricing_ready: entityData.is_pricing_ready !== undefined ? String(entityData.is_pricing_ready) : 'N/A',
        // Status and operation fields
        status: triggerResult.success ? 'success' : 'failed',
        database_operation: triggerResult.triggerType || 'trigger',
        // Spread all other fields AFTER explicit ones (this won't override the above)
        ...entityData
      },
      // All entities data (for multiple entity templates)
      vehicle_results: [{
        // Explicitly extract common vehicle fields with fallback values
        vehicle_stock_id: entityData.vehicle_stock_id || entityData._id?.toString() || 'N/A',
        make: entityData.make || 'N/A',
        model: entityData.model || 'N/A',
        year: entityData.year || 'N/A',
        vin: entityData.vin || 'N/A',
        plate_no: entityData.plate_no || 'N/A',
        vehicle_type: entityData.vehicle_type || 'N/A',
        chassis_no: entityData.chassis_no || 'N/A',
        is_pricing_ready: entityData.is_pricing_ready !== undefined ? String(entityData.is_pricing_ready) : 'N/A',
        // Status and operation fields
        status: triggerResult.success ? 'success' : 'failed',
        database_operation: triggerResult.triggerType || 'trigger',
        error_message: triggerResult.error || null,
        // Spread all other fields AFTER explicit ones
        ...entityData
      }],
      // Response data - same structure as Vehicle Outbound
      response: {
        status: triggerResult.success ? '200' : '500',
        message: triggerResult.success
          ? `Email trigger activated successfully for ${triggerResult.targetSchema}`
          : `Email trigger failed for ${triggerResult.targetSchema}`,
        trigger_type: triggerResult.triggerType,
        target_schema: triggerResult.targetSchema,
      },
      // Error data - same structure as Vehicle Outbound
      error: {
        message: triggerResult.error || ''
      },
      // Company data - same structure as Vehicle Outbound
      company: {
        name: workflow.company_id?.company_name || 'N/A'
      },
      // Timestamp - same as Vehicle Outbound
      timestamp: new Date().toISOString(),
      // Summary for single entity - same structure as Vehicle Outbound
      vehicles_summary: {
        total: 1,
        successful: triggerResult.success ? 1 : 0,
        failed: triggerResult.success ? 0 : 1,
        created: 0, // Not applicable for email trigger
        updated: 0  // Not applicable for email trigger
      },
      // Failed entities array - same structure as Vehicle Outbound
      failed_vehicles: triggerResult.success ? [] : [{
        // Explicitly extract common vehicle fields with fallback values
        vehicle_stock_id: entityData.vehicle_stock_id || entityData._id?.toString() || 'N/A',
        make: entityData.make || 'N/A',
        model: entityData.model || 'N/A',
        year: entityData.year || 'N/A',
        vin: entityData.vin || 'N/A',
        plate_no: entityData.plate_no || 'N/A',
        vehicle_type: entityData.vehicle_type || 'N/A',
        chassis_no: entityData.chassis_no || 'N/A',
        is_pricing_ready: entityData.is_pricing_ready !== undefined ? String(entityData.is_pricing_ready) : 'N/A',
        // Status and error fields
        status: 'failed',
        error_message: triggerResult.error || 'Unknown error',
        // Spread all other fields AFTER explicit ones
        ...entityData
      }]
    };

    // Initialize execution log variables
    let emailSentSuccessfully = false;
    let emailError = null;
    let emailType = null; // 'success' or 'error'

    // Send appropriate email based on success/failure (same logic as Vehicle Outbound)
    if (triggerResult.success && emailSuccessNode?.data?.config) {
      emailType = 'success';
      const excludeUserId = workflow.created_by?._id || workflow.created_by;
      const emailResult = await sendWorkflowEmail(emailSuccessNode.data.config, emailData, workflow.company_id._id || workflow.company_id, excludeUserId);
      emailSentSuccessfully = emailResult.success;
      emailError = emailResult.error;
      
      emailSentSuccessfully = emailResult.success;
      emailError = emailResult.error;
    } else if (!triggerResult.success && emailErrorNode?.data?.config) {
      emailType = 'error';
      const excludeUserId = workflow.created_by?._id || workflow.created_by;
      const emailResult = await sendWorkflowEmail(emailErrorNode.data.config, emailData, workflow.company_id._id || workflow.company_id, excludeUserId);
      emailSentSuccessfully = emailResult.success;
      emailError = emailResult.error;
    }

    // Create execution log for Email Trigger workflow
    const entityIdentifier = entityData.vehicle_stock_id || entityData._id || 'unknown';
    const workflowExecutionLog = new WorkflowExecution({
      workflow_id: workflow._id,
      company_id: workflow.company_id,
      execution_started_at: new Date(executionStartTime),
      execution_completed_at: new Date(),
      execution_duration_ms: Date.now() - executionStartTime,
      execution_status: triggerResult.success ? 'success' : 'failed',
      request_payload: {
        trigger_type: triggerResult.triggerType,
        target_schema: triggerResult.targetSchema,
        entity_data: entityData,
        evaluated_conditions: triggerResult.evaluatedConditions || []
      },
      total_vehicles: 1,
      successful_vehicles: triggerResult.success ? 1 : 0,
      failed_vehicles: triggerResult.success ? 0 : 1,
      vehicle_results: [{
        vehicle_stock_id: entityIdentifier,
        status: triggerResult.success ? 'success' : 'failed',
        database_operation: 'none', // Email trigger doesn't modify database
        vehicle_id: entityData._id,
        vehicle_type: entityData.vehicle_type || 'N/A',
        error_message: triggerResult.error || null,
        missing_fields: [],
        validation_errors: triggerResult.error ? [triggerResult.error] : [],
      }],
      database_changes: {
        vehicles_created: 0,
        vehicles_updated: 0,
        created_vehicle_ids: [],
        updated_vehicle_ids: [],
      },
      email_sent: emailSentSuccessfully,
      email_status: {
        success_email: emailType === 'success' ? {
          sent: emailSentSuccessfully,
          error: emailError || undefined,
          sent_at: emailSentSuccessfully ? new Date() : undefined,
        } : undefined,
        error_email: emailType === 'error' ? {
          sent: emailSentSuccessfully,
          error: emailError || undefined,
          sent_at: emailSentSuccessfully ? new Date() : undefined,
        } : undefined,
      },
      authentication_used: 'none', // Email trigger doesn't use API authentication
      authentication_passed: true,
      error_message: triggerResult.error || emailError || undefined,
      execution_summary: triggerResult.success
        ? `Email trigger activated successfully for ${triggerResult.targetSchema}. Email ${emailSentSuccessfully ? 'sent' : 'failed'}.`
        : `Email trigger failed for ${triggerResult.targetSchema}: ${triggerResult.error || 'Unknown error'}`,
    });

    await workflowExecutionLog.save();

    // Update workflow execution stats
    const { updateWorkflowExecutionStats } = require('../controllers/workflow.controller');
    await updateWorkflowExecutionStats(workflow._id, triggerResult.success && emailSentSuccessfully);

  } catch (error) {
    console.error('Error sending email trigger workflow email:', error);
    
    // Create failure execution log
    try {
      const entityIdentifier = entityData.vehicle_stock_id || entityData._id || 'unknown';
      const workflowExecutionLog = new WorkflowExecution({
        workflow_id: workflow._id,
        company_id: workflow.company_id,
        execution_started_at: new Date(executionStartTime),
        execution_completed_at: new Date(),
        execution_duration_ms: Date.now() - executionStartTime,
        execution_status: 'failed',
        request_payload: {
          trigger_type: triggerResult.triggerType,
          target_schema: triggerResult.targetSchema,
          entity_data: entityData,
          evaluated_conditions: triggerResult.evaluatedConditions || []
        },
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
        database_changes: {
          vehicles_created: 0,
          vehicles_updated: 0,
          created_vehicle_ids: [],
          updated_vehicle_ids: [],
        },
        email_sent: false,
        authentication_used: 'none',
        authentication_passed: true,
        error_message: error.message,
        error_stack: error.stack,
        execution_summary: `Email trigger workflow failed: ${error.message}`,
      });

      await workflowExecutionLog.save();

      // Update workflow execution stats for failed execution
      const { updateWorkflowExecutionStats } = require('../controllers/workflow.controller');
      await updateWorkflowExecutionStats(workflow._id, false);
    } catch (logError) {
      console.error('Error saving failure execution log:', logError);
    }
  }
};

module.exports = emailTriggerMiddleware;
