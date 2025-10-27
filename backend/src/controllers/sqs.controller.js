const { SQS } = require("@aws-sdk/client-sqs");
const Vehicle = require('../models/Vehicle');
const Company = require('../models/Company');
const MasterAdmin = require('../models/MasterAdmin');
const { logEvent } = require('./logs.controller');

// Initialize SQS client with master admin settings
const getSQSClient = async () => {
  try {
    const masterAdmin = await MasterAdmin.findOne({ role: 'master_admin' });
    
    if (!masterAdmin || !masterAdmin.aws_settings) {
      throw new Error('AWS settings not configured in master admin');
    }

    const { access_key_id, secret_access_key, region } = masterAdmin.aws_settings;

    if (!access_key_id || !secret_access_key || !region) {
      throw new Error('Incomplete AWS settings in master admin');
    }

    return new SQS({
      region,
      credentials: {
        accessKeyId: access_key_id,
        secretAccessKey: secret_access_key,
      },
    });
  } catch (error) {
    console.error('Error initializing SQS client:', error);
    throw error;
  }
};

// Get queue URL from master admin settings (MAIN VEHICLE PROCESSING QUEUE)
const getQueueUrl = async () => {
  try {
    const masterAdmin = await MasterAdmin.findOne({ role: 'master_admin' });
    
    if (!masterAdmin || !masterAdmin.aws_settings || !masterAdmin.aws_settings.sqs_queue_url) {
      throw new Error('SQS Queue URL not configured in master admin');
    }

    return masterAdmin.aws_settings.sqs_queue_url;
  } catch (error) {
    console.error('Error getting queue URL:', error);
    throw error;
  }
};

// Complete schema fields based on the Vehicle model
const SCHEMA_FIELDS = [
  // Basic required fields
  'vehicle_stock_id', 'company_id', 'dealership_id', 'vehicle_type', 'vehicle_hero_image',
  'vin', 'plate_no', 'make', 'model', 'year', 'chassis_no',
  
  // Optional basic fields
  'variant', 'model_no', 'body_style', 'name', 'vehicle_category',
  
  // Results and reports
  'inspection_result', 'trade_in_result', 'inspection_report_pdf', 'tradein_report_pdf',
  'last_inspection_config_id', 'last_tradein_config_id',
  
  // Nested object fields
  'vehicle_other_details', 'vehicle_source', 'vehicle_registration', 
  'vehicle_import_details', 'vehicle_attachments', 'vehicle_eng_transmission',
  'vehicle_specifications', 'vehicle_odometer', 
  'vehicle_ownership',
  
  // Workshop fields
  'is_workshop', 'workshop_progress', 'workshop_report_ready', 'workshop_report_preparing',
  
  // Status fields
  'status', 'queue_status', 'queue_id', 'processing_attempts', 'last_processing_error',
  
  // Custom fields container
  'custom_fields'
];

// Required fields validation
const REQUIRED_FIELDS = [
  'vehicle_stock_id',
  'company_id', 
  'vehicle_type',
  'vehicle_hero_image',
  'vin',
  'plate_no',
  'make',
  'model',
  'year',
  'chassis_no'
];

// Enhanced payload validation function
const validatePayloadStructure = (vehicleData) => {
  const errors = [];
  const warnings = [];
  
  try {
    // Check for required fields
    const missingRequired = REQUIRED_FIELDS.filter(field => 
      !vehicleData.hasOwnProperty(field) || 
      vehicleData[field] === null || 
      vehicleData[field] === undefined || 
      vehicleData[field] === ''
    );
    
    if (missingRequired.length > 0) {
      errors.push(`Missing required fields: ${missingRequired.join(', ')}`);
    }

    // Validate data types for critical fields
    if (vehicleData.vehicle_stock_id && typeof vehicleData.vehicle_stock_id !== 'number') {
      errors.push('vehicle_stock_id must be a number');
    }
    
    if (vehicleData.year && (typeof vehicleData.year !== 'number' || vehicleData.year < 1900 || vehicleData.year > new Date().getFullYear() + 2)) {
      errors.push('year must be a valid number between 1900 and current year + 2');
    }
    
    if (vehicleData.vehicle_type && !['inspection', 'tradein', 'advertisement'].includes(vehicleData.vehicle_type)) {
      errors.push('vehicle_type must be one of: inspection, tradein, advertisement');
    }

    // Validate array fields
    if (vehicleData.vehicle_attachments && !Array.isArray(vehicleData.vehicle_attachments)) {
      errors.push('vehicle_attachments must be an array');
    }
    
    if (vehicleData.vehicle_odometer && !Array.isArray(vehicleData.vehicle_odometer)) {
      errors.push('vehicle_odometer must be an array');
    }
    
    if (vehicleData.inspection_result && !Array.isArray(vehicleData.inspection_result)) {
      errors.push('inspection_result must be an array');
    }
    
    if (vehicleData.trade_in_result && !Array.isArray(vehicleData.trade_in_result)) {
      errors.push('trade_in_result must be an array');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
    
  } catch (error) {
    return {
      isValid: false,
      errors: [`Payload validation error: ${error.message}`],
      warnings: []
    };
  }
};

// Enhanced function to separate schema fields from custom fields
const separateSchemaAndCustomFields = (vehicleData) => {
  const schemaFields = {};
  const customFields = {};
  
  Object.keys(vehicleData).forEach(key => {
    // Check if field exists in schema
    if (SCHEMA_FIELDS.includes(key)) {
      // Validate nested object structure if it's a schema field
      if (typeof vehicleData[key] === 'object' && vehicleData[key] !== null && !Array.isArray(vehicleData[key])) {
        schemaFields[key] = validateNestedObjectStructure(key, vehicleData[key]);
      } else {
        schemaFields[key] = vehicleData[key];
      }
    } else {
      // Add to custom fields
      customFields[key] = vehicleData[key];
    }
  });
  
  // Add custom fields to schema if any exist
  if (Object.keys(customFields).length > 0) {
    schemaFields.custom_fields = customFields;
  }
  
  return { schemaFields, customFields };
};

const validateNestedObjectStructure = (fieldName, fieldValue) => {
  const nestedFieldDefinitions = {
    'vehicle_other_details': ['status', 'trader_acquisition', 'odometer_certified', 'odometer_status', 'purchase_price', 'exact_expenses', 'estimated_expenses', 'gst_inclusive', 'retail_price', 'sold_price', 'included_in_exports'],
    'vehicle_source': ['supplier', 'purchase_date', 'purchase_type', 'purchase_notes'],
    'vehicle_registration': ['registered_in_local', 'year_first_registered_local', 're_registered', 'first_registered_year', 'license_expiry_date', 'wof_cof_expiry_date', 'last_registered_country', 'road_user_charges_apply', 'outstanding_road_user_charges', 'ruc_end_distance'],
    'vehicle_import_details': ['delivery_port', 'vessel_name', 'voyage', 'etd', 'eta', 'date_on_yard', 'imported_as_damaged'],
    'vehicle_eng_transmission': ['engine_no', 'engine_type', 'transmission_type', 'primary_fuel_type', 'no_of_cylinders', 'turbo', 'engine_size', 'engine_size_unit', 'engine_features'],
    'vehicle_specifications': ['number_of_seats', 'number_of_doors', 'interior_color', 'exterior_primary_color', 'exterior_secondary_color', 'steering_type', 'wheels_composition', 'sunroof', 'interior_trim', 'seat_material', 'tyre_size', 'interior_features', 'exterior_features'],

    'vehicle_ownership': ['origin', 'no_of_previous_owners', 'security_interest_on_ppsr', 'comments']
  };

  if (nestedFieldDefinitions[fieldName] && typeof fieldValue === 'object') {
    const validatedObject = {};
    
    // Only include fields that are defined in the schema
    Object.keys(fieldValue).forEach(subKey => {
      if (nestedFieldDefinitions[fieldName].includes(subKey)) {
        validatedObject[subKey] = fieldValue[subKey];
      }
    });
    
    return validatedObject;
  }
  
  return fieldValue;
};

// Validate required fields
const validateRequiredFields = (vehicleData) => {
  const missingFields = [];
  
  REQUIRED_FIELDS.forEach(field => {
    if (!vehicleData[field] || vehicleData[field] === '') {
      missingFields.push(field);
    }
  });
  
  return missingFields;
};

// Validate company exists and is active
const validateCompany = async (companyId) => {
  try {
    if (!companyId) {
      return { valid: false, error: 'Company ID is required' };
    }

    const company = await Company.findById(companyId);
    
    if (!company) {
      return { valid: false, error: 'Company not found' };
    }
    
    if (!company.is_active || company.subscription_status !== 'active') {
      return { valid: false, error: 'Company is not active or subscription expired' };
    }
    
    return { valid: true, company };
  } catch (error) {
    return { valid: false, error: 'Invalid company ID format' };
  }
};

// Enhanced basic validation function with payload structure validation
const performBasicValidation = async (vehicleData) => {
  // First validate payload structure
  const payloadValidation = validatePayloadStructure(vehicleData);
  if (!payloadValidation.isValid) {
    return {
      valid: false,
      error: payloadValidation.errors.join('; '),
      warnings: payloadValidation.warnings
    };
  }

  // Validate company
  const companyValidation = await validateCompany(vehicleData.company_id);
  if (!companyValidation.valid) {
    return {
      valid: false,
      error: companyValidation.error
    };
  }

  // Validate vehicle stock ID and type combination
  const vehicleValidation = await validateVehicleStockId(
    vehicleData.vehicle_stock_id,
    vehicleData.company_id,
    vehicleData.vehicle_type
  );
  
  if (!vehicleValidation.valid) {
    return {
      valid: false,
      error: vehicleValidation.error
    };
  }

  return {
    valid: true,
    company: companyValidation.company,
    vehicleExists: vehicleValidation.exists,
    existingVehicle: vehicleValidation.existingVehicle,
    warnings: payloadValidation.warnings || []
  };
};

// Validate vehicle_stock_id and vehicle_type combination
const validateVehicleStockId = async (vehicleStockId, companyId, vehicleType) => {
  try {
    if (!vehicleStockId) {
      return { valid: false, error: 'Vehicle stock ID is required' };
    }

    if (!vehicleType) {
      return { valid: false, error: 'Vehicle type is required' };
    }

    if (!['inspection', 'tradein', 'advertisement'].includes(vehicleType)) {
      return { valid: false, error: 'Invalid vehicle type. Must be "inspection", "tradein", or "advertisement"' };
    }

    // Check if this exact combination already exists
    const existingVehicle = await Vehicle.findOne({
      vehicle_stock_id: vehicleStockId,
      company_id: companyId,
      vehicle_type: vehicleType
    });

    return { 
      valid: true, 
      exists: !!existingVehicle,
      existingVehicle: existingVehicle
    };
  } catch (error) {
    return { valid: false, error: 'Error validating vehicle stock ID' };
  }
};

// Enhanced send to queue function with payload validation
const sendToQueue = async (vehicleData, messageGroupId = null) => {
  try {
    // Validate payload before sending to queue
    const validation = await performBasicValidation(vehicleData);
    if (!validation.valid) {
      return {
        success: false,
        error: `Payload validation failed: ${validation.error}`
      };
    }

    // Log warnings if any
    if (validation.warnings && validation.warnings.length > 0) {
      console.warn(`Payload warnings for vehicle ${vehicleData.vehicle_stock_id}:`, validation.warnings);
    }

    // Separate schema fields from custom fields with validation
    const { schemaFields } = separateSchemaAndCustomFields(vehicleData);
    
    const sqs = await getSQSClient();
    const queueUrl = await getQueueUrl();
    
    const messageBody = JSON.stringify(schemaFields);
    
    const params = {
      QueueUrl: queueUrl,
      MessageBody: messageBody,
      MessageGroupId: messageGroupId || `company_${vehicleData.company_id}`,
    };

    const result = await sqs.sendMessage(params);
    return {
      success: true,
      messageId: result.MessageId,
      queueId: result.MessageId,
      warnings: validation.warnings
    };
  } catch (error) {
    console.error('Error sending to SQS:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Process single vehicle data with enhanced validation
const processSingleVehicle = async (vehicleData) => {
  try {
    console.log(`Processing single vehicle: ${vehicleData.vehicle_stock_id} - ${vehicleData.vehicle_type}`);

    // Enhanced payload and business validation
    const validation = await performBasicValidation(vehicleData);
    if (!validation.valid) {
      console.log(`Validation failed for vehicle ${vehicleData.vehicle_stock_id}: ${validation.error}`);
      return {
        success: false,
        vehicle_stock_id: vehicleData.vehicle_stock_id,
        error: validation.error
      };
    }

    // Send to queue with validated payload
    const queueResult = await sendToQueue(vehicleData);
    
    if (!queueResult.success) {
      console.log(`Queue error for vehicle ${vehicleData.vehicle_stock_id}: ${queueResult.error}`);
      return {
        success: false,
        vehicle_stock_id: vehicleData.vehicle_stock_id,
        error: `Queue error: ${queueResult.error}`
      };
    }

    console.log(`Vehicle ${vehicleData.vehicle_stock_id} successfully sent to queue`);
    const result = {
      success: true,
      vehicle_stock_id: vehicleData.vehicle_stock_id,
      queue_id: queueResult.queueId,
      message: 'Vehicle data sent to processing queue',
      exists: validation.vehicleExists
    };

    // Include warnings if any
    if (queueResult.warnings && queueResult.warnings.length > 0) {
      result.warnings = queueResult.warnings;
    }

    return result;

  } catch (error) {
    console.error(`Error processing vehicle ${vehicleData.vehicle_stock_id}:`, error);
    return {
      success: false,
      vehicle_stock_id: vehicleData.vehicle_stock_id || 'unknown',
      error: error.message
    };
  }
};

// Enhanced process vehicle from queue with proper field separation
const processVehicleFromQueue = async (messageBody) => {
  try {
    const vehicleData = JSON.parse(messageBody);
    console.log(`Processing vehicle from queue: ${vehicleData.vehicle_stock_id} - ${vehicleData.vehicle_type}`);
    
    // The data should already be validated and separated when sent to queue
    // But we'll ensure proper structure anyway
    const { schemaFields } = separateSchemaAndCustomFields(vehicleData);
    
    // Check if vehicle already exists with same stock_id, company_id, and vehicle_type
    const existingVehicle = await Vehicle.findOne({
      vehicle_stock_id: schemaFields.vehicle_stock_id,
      company_id: schemaFields.company_id,
      vehicle_type: schemaFields.vehicle_type
    });

    let vehicle;
    let action;

    if (existingVehicle) {
      // Update existing vehicle
      Object.assign(existingVehicle, schemaFields);
      existingVehicle.queue_status = 'processed';
      existingVehicle.processing_attempts += 1;
      existingVehicle.last_processing_error = null;
      existingVehicle.updated_at = new Date();
      vehicle = await existingVehicle.save();
      action = 'updated';
      console.log(`Updated existing vehicle: ${vehicle.vehicle_stock_id} - ${vehicle.vehicle_type}`);
    } else {
      // Create new vehicle
      vehicle = new Vehicle({
        ...schemaFields,
        queue_status: 'processed',
        processing_attempts: 1,
        status: 'completed'
      });
      await vehicle.save();
      action = 'created';
      console.log(`Created new vehicle: ${vehicle.vehicle_stock_id} - ${vehicle.vehicle_type}`);
    }

    // Log the event
    await logEvent({
      event_type: 'vehicle_operation',
      event_action: `vehicle_${action}`,
      event_description: `Vehicle ${vehicle.vehicle_stock_id} (${vehicle.vehicle_type}) ${action} from queue`,
      company_id: vehicle.company_id,
      resource_type: 'vehicle',
      resource_id: vehicle._id.toString(),
      metadata: {
        vehicle_stock_id: vehicle.vehicle_stock_id,
        vehicle_type: vehicle.vehicle_type,
        processing_attempts: vehicle.processing_attempts
      }
    });

    return {
      success: true,
      vehicle_id: vehicle._id,
      vehicle_stock_id: vehicle.vehicle_stock_id,
      vehicle_type: vehicle.vehicle_type,
      action: action
    };

  } catch (error) {
    console.error('Error processing vehicle from queue:', error);
    
    // Try to extract vehicle info from the message for logging
    let vehicleInfo = {};
    try {
      const vehicleData = JSON.parse(messageBody);
      vehicleInfo = {
        vehicle_stock_id: vehicleData.vehicle_stock_id,
        vehicle_type: vehicleData.vehicle_type,
        company_id: vehicleData.company_id
      };
    } catch (parseError) {
      console.error('Could not parse message body for error logging');
    }
    
    // Log the error
    await logEvent({
      event_type: 'system_error',
      event_action: 'queue_processing_failed',
      event_description: `Failed to process vehicle from queue: ${error.message}`,
      company_id: vehicleInfo.company_id || null,
      severity: 'error',
      status: 'failure',
      error_message: error.message,
      error_stack: error.stack,
      metadata: vehicleInfo
    });

    return {
      success: false,
      error: error.message,
      vehicle_info: vehicleInfo
    };
  }
};

// Process bulk vehicle data with enhanced validation
const processBulkVehicles = async (vehiclesArray, companyId) => {
  console.log(`Processing ${vehiclesArray.length} vehicles for company ${companyId}`);
  
  const results = {
    success_records: [],
    failure_records: [],
    total_processed: vehiclesArray.length,
    queue_ids: [],
    warnings: []
  };

  // Validate company once for all vehicles
  const companyValidation = await validateCompany(companyId);
  if (!companyValidation.valid) {
    console.log(`Company validation failed: ${companyValidation.error}`);
    // All records fail if company is invalid
    vehiclesArray.forEach(vehicle => {
      results.failure_records.push({
        vehicle_stock_id: vehicle.vehicle_stock_id || 'unknown',
        error: companyValidation.error
      });
    });
    return results;
  }

  // Process each vehicle with enhanced validation
  for (const vehicleData of vehiclesArray) {
    // Ensure company_id is set
    vehicleData.company_id = companyId;
    
    const result = await processSingleVehicle(vehicleData);
    
    if (result.success) {
      const successRecord = {
        vehicle_stock_id: result.vehicle_stock_id,
        queue_id: result.queue_id,
        exists: result.exists
      };
      
      if (result.warnings && result.warnings.length > 0) {
        successRecord.warnings = result.warnings;
        results.warnings.push({
          vehicle_stock_id: result.vehicle_stock_id,
          warnings: result.warnings
        });
      }
      
      results.success_records.push(successRecord);
      results.queue_ids.push(result.queue_id);
    } else {
      results.failure_records.push({
        vehicle_stock_id: result.vehicle_stock_id,
        error: result.error
      });
    }
  }

  console.log(`Bulk processing completed: ${results.success_records.length} success, ${results.failure_records.length} failed`);
  return results;
};

// Receive messages from SQS queue
const receiveFromQueue = async (maxMessages = 10) => {
  try {
    const sqs = await getSQSClient();
    const queueUrl = await getQueueUrl();
    
    const params = {
      QueueUrl: queueUrl,
      MaxNumberOfMessages: maxMessages,
      WaitTimeSeconds: 20, // Long polling
      VisibilityTimeout: 300, // 5 minutes to process
      MessageAttributeNames: ['All'],
      AttributeNames: ['All']
    };

    const result = await sqs.receiveMessage(params);
    return {
      success: true,
      messages: result.Messages || []
    };
  } catch (error) {
    console.error('Error receiving from SQS:', error);
    return {
      success: false,
      error: error.message,
      messages: []
    };
  }
};

// Delete processed message from queue
const deleteMessageFromQueue = async (receiptHandle) => {
  try {
    const sqs = await getSQSClient();
    const queueUrl = await getQueueUrl();
    
    const params = {
      QueueUrl: queueUrl,
      ReceiptHandle: receiptHandle
    };

    await sqs.deleteMessage(params);
    return { success: true };
  } catch (error) {
    console.error('Error deleting message from SQS:', error);
    return { success: false, error: error.message };
  }
};

// Process messages from SQS queue (ONLY VEHICLE PROCESSING)
const processQueueMessages = async () => {
  console.log('Checking SQS queue for vehicle messages...');
  
  try {
    const receiveResult = await receiveFromQueue();
    
    if (!receiveResult.success) {
      console.error('Failed to receive messages from queue:', receiveResult.error);
      return {
        success: false,
        error: receiveResult.error,
        processed: 0,
        failed: 0
      };
    }

    const messages = receiveResult.messages;
    console.log(`Received ${messages.length} messages from vehicle queue`);

    if (messages.length === 0) {
      return {
        success: true,
        processed: 0,
        failed: 0,
        message: 'No messages in vehicle queue'
      };
    }

    let processedCount = 0;
    let failedCount = 0;
    const results = [];

    // Process each message
    for (const message of messages) {
      try {
        console.log(`Processing vehicle message: ${message.MessageId}`);
        
        // Process regular vehicle message only
        const processResult = await processVehicleFromQueue(message.Body);
        
        if (processResult.success) {
          // Delete message from queue after successful processing
          const deleteResult = await deleteMessageFromQueue(message.ReceiptHandle);
          
          if (deleteResult.success) {
            processedCount++;
            const resultData = {
              message_id: message.MessageId,
              vehicle_stock_id: processResult.vehicle_stock_id,
              vehicle_type: processResult.vehicle_type,
              action: processResult.action,
              status: 'success'
            };
            
            console.log(`Successfully processed vehicle message: ${message.MessageId}`);
            results.push(resultData);
          } else {
            console.error(`Failed to delete message ${message.MessageId} from queue`);
            failedCount++;
            results.push({
              message_id: message.MessageId,
              error: 'Failed to delete from queue',
              status: 'failed'
            });
          }
        } else {
          // PERMANENTLY DELETE MESSAGES THAT RESULT IN PROCESSING ERRORS
          console.error(`Processing failed for message ${message.MessageId}, deleting permanently:`, processResult.error);
          
          const deleteResult = await deleteMessageFromQueue(message.ReceiptHandle);
          
          if (deleteResult.success) {
            console.log(`Permanently deleted failed message: ${message.MessageId}`);
            failedCount++;
            results.push({
              message_id: message.MessageId,
              error: processResult.error,
              status: 'failed_deleted'
            });
          } else {
            console.error(`Failed to delete failed message ${message.MessageId} from queue`);
            failedCount++;
            results.push({
              message_id: message.MessageId,
              error: `Processing failed: ${processResult.error}, and deletion also failed`,
              status: 'failed_deletion_error'
            });
          }
        }
      } catch (error) {
        // PERMANENTLY DELETE MESSAGES THAT CAUSE EXCEPTIONS
        console.error(`Error processing message ${message.MessageId}, deleting permanently:`, error);
        
        try {
          const deleteResult = await deleteMessageFromQueue(message.ReceiptHandle);
          
          if (deleteResult.success) {
            console.log(`Permanently deleted errored message: ${message.MessageId}`);
            failedCount++;
            results.push({
              message_id: message.MessageId,
              error: error.message,
              status: 'error_deleted'
            });
          } else {
            console.error(`Failed to delete errored message ${message.MessageId} from queue`);
            failedCount++;
            results.push({
              message_id: message.MessageId,
              error: `Processing error: ${error.message}, and deletion also failed`,
              status: 'error_deletion_error'
            });
          }
        } catch (deleteError) {
          console.error(`Critical error deleting message ${message.MessageId}:`, deleteError);
          failedCount++;
          results.push({
            message_id: message.MessageId,
            error: `Processing error: ${error.message}, deletion error: ${deleteError.message}`,
            status: 'critical_error'
          });
        }
      }
    }

    console.log(`Vehicle queue processing completed: ${processedCount} processed, ${failedCount} failed`);
    
    return {
      success: true,
      processed: processedCount,
      failed: failedCount,
      total: messages.length,
      results
    };

  } catch (error) {
    console.error('Error in vehicle queue processing:', error);
    return {
      success: false,
      error: error.message,
      processed: 0,
      failed: 0
    };
  }
};

// Start queue consumer with interval
let queueInterval;

const startQueueConsumer = () => {
  console.log('Starting SQS vehicle queue consumer...');
  
  // Process immediately
  processQueueMessages();
  
  // Set up interval to process every 10 seconds
  queueInterval = setInterval(() => {
    processQueueMessages();
  }, 10000); // 10 seconds
  
  console.log('Vehicle queue consumer started - checking every 10 seconds');
};

const stopQueueConsumer = () => {
  if (queueInterval) {
    clearInterval(queueInterval);
    queueInterval = null;
    console.log('Vehicle queue consumer stopped');
  }
};

module.exports = {
  sendToQueue,
  processSingleVehicle,
  processBulkVehicles,
  processVehicleFromQueue,
  validateRequiredFields,
  validateCompany,
  validateVehicleStockId,
  performBasicValidation,
  validatePayloadStructure,
  separateSchemaAndCustomFields,
  receiveFromQueue,
  deleteMessageFromQueue,
  processQueueMessages,
  startQueueConsumer,
  stopQueueConsumer,
};