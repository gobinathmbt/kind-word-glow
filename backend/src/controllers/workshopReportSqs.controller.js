const { SQS } = require("@aws-sdk/client-sqs");
const MasterAdmin = require('../models/MasterAdmin');
const { generateWorkshopReport } = require('./workshopReport.controller');
const { logEvent } = require('./logs.controller');

// Initialize SQS client for workshop reports
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
    console.error('Error initializing Workshop SQS client:', error);
    throw error;
  }
};

// Get workshop report queue URL from master admin settings
const getWorkshopReportQueueUrl = async () => {
  try {
    const masterAdmin = await MasterAdmin.findOne({ role: 'master_admin' });
    
    if (!masterAdmin || !masterAdmin.aws_settings || !masterAdmin.aws_settings.workshop_sqs_queue_url) {
      throw new Error('Workshop SQS Queue URL not configured in master admin');
    }

    return masterAdmin.aws_settings.workshop_sqs_queue_url;
  } catch (error) {
    console.error('Error getting workshop queue URL:', error);
    throw error;
  }
};

// Send workshop report generation to queue
const sendToWorkshopReportQueue = async (workshopData) => {
  try {
    const sqs = await getSQSClient();
    const queueUrl = await getWorkshopReportQueueUrl();
    
    const messageBody = JSON.stringify({
      ...workshopData,
      message_type: 'workshop_report_generation',
      timestamp: new Date().toISOString()
    });
    
    const params = {
      QueueUrl: queueUrl,
      MessageBody: messageBody,
      MessageGroupId: `workshop_${workshopData.company_id}`,
      MessageAttributes: {
        'message_type': {
          DataType: 'String',
          StringValue: 'workshop_report_generation'
        },
        'vehicle_type': {
          DataType: 'String', 
          StringValue: workshopData.vehicle_type
        }
      }
    };

    const result = await sqs.sendMessage(params);
    console.log(`✅ Workshop report generation queued: ${result.MessageId}`);
    
    return {
      success: true,
      messageId: result.MessageId,
      queueId: result.MessageId
    };
  } catch (error) {
    console.error('Error sending to workshop report queue:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Process workshop report from queue
const processWorkshopReportFromQueue = async (messageBody) => {
  try {
    const workshopData = JSON.parse(messageBody);
    console.log(`🏗️ Processing workshop report from queue: ${workshopData.vehicle_stock_id}`);
    
    // Validate message type
    if (workshopData.message_type !== 'workshop_report_generation') {
      console.log('⚠️ Ignoring non-workshop-report message');
      return { success: true, skipped: true };
    }

    // Generate workshop report
    const result = await generateWorkshopReport(workshopData);
    
    // Log the event
    await logEvent({
      event_type: 'workshop_operation',
      event_action: 'report_generated',
      event_description: `Workshop report generated for vehicle ${workshopData.vehicle_stock_id}`,
      company_id: workshopData.company_id,
      resource_type: 'vehicle',
      resource_id: workshopData.vehicle_id,
      metadata: {
        vehicle_stock_id: workshopData.vehicle_stock_id,
        vehicle_type: workshopData.vehicle_type,
        generated_by: workshopData.completed_by
      }
    });

    console.log(`✅ Workshop report generated successfully for vehicle ${workshopData.vehicle_stock_id}`);
    return {
      success: true,
      vehicle_id: workshopData.vehicle_id,
      vehicle_stock_id: workshopData.vehicle_stock_id,
      vehicle_type: workshopData.vehicle_type
    };

  } catch (error) {
    console.error('Error processing workshop report from queue:', error);
    
    // Log the error
    let workshopInfo = {};
    try {
      const workshopData = JSON.parse(messageBody);
      workshopInfo = {
        vehicle_stock_id: workshopData.vehicle_stock_id,
        vehicle_type: workshopData.vehicle_type,
        company_id: workshopData.company_id
      };
    } catch (parseError) {
      console.error('Could not parse message body for error logging');
    }
    
    await logEvent({
      event_type: 'system_error',
      event_action: 'workshop_report_generation_failed',
      event_description: `Failed to generate workshop report: ${error.message}`,
      company_id: workshopInfo.company_id || null,
      severity: 'error',
      status: 'failure',
      error_message: error.message,
      error_stack: error.stack,
      metadata: workshopInfo
    });

    return {
      success: false,
      error: error.message,
      workshop_info: workshopInfo
    };
  }
};

// Receive messages from workshop SQS queue
const receiveFromWorkshopQueue = async (maxMessages = 10) => {
  try {
    const sqs = await getSQSClient();
    const queueUrl = await getWorkshopReportQueueUrl();
    
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
    console.error('Error receiving from workshop SQS:', error);
    return {
      success: false,
      error: error.message,
      messages: []
    };
  }
};

// Delete processed message from workshop queue
const deleteMessageFromWorkshopQueue = async (receiptHandle) => {
  try {
    const sqs = await getSQSClient();
    const queueUrl = await getWorkshopReportQueueUrl();
    
    const params = {
      QueueUrl: queueUrl,
      ReceiptHandle: receiptHandle
    };

    await sqs.deleteMessage(params);
    return { success: true };
  } catch (error) {
    console.error('Error deleting message from workshop SQS:', error);
    return { success: false, error: error.message };
  }
};

// Process messages from workshop SQS queue
const processWorkshopQueueMessages = async () => {
  console.log('Checking workshop SQS queue for messages...');
  
  try {
    const receiveResult = await receiveFromWorkshopQueue();
    
    if (!receiveResult.success) {
      console.error('Failed to receive messages from workshop queue:', receiveResult.error);
      return {
        success: false,
        error: receiveResult.error,
        processed: 0,
        failed: 0
      };
    }

    const messages = receiveResult.messages;
    console.log(`Received ${messages.length} messages from workshop queue`);

    if (messages.length === 0) {
      return {
        success: true,
        processed: 0,
        failed: 0,
        message: 'No messages in workshop queue'
      };
    }

    let processedCount = 0;
    let failedCount = 0;
    const results = [];

    // Process each message
    for (const message of messages) {
      try {
        console.log(`Processing workshop message: ${message.MessageId}`);
        
        // Process workshop report message
        const processResult = await processWorkshopReportFromQueue(message.Body);
        
        if (processResult.success && !processResult.skipped) {
          // Delete message from queue after successful processing
          const deleteResult = await deleteMessageFromWorkshopQueue(message.ReceiptHandle);
          
          if (deleteResult.success) {
            processedCount++;
            const resultData = {
              message_id: message.MessageId,
              vehicle_stock_id: processResult.vehicle_stock_id,
              vehicle_type: processResult.vehicle_type,
              action: 'workshop_report_generated',
              status: 'success'
            };
            
            console.log(`Successfully processed workshop message: ${message.MessageId}`);
            results.push(resultData);
          } else {
            console.error(`Failed to delete workshop message ${message.MessageId} from queue`);
            failedCount++;
            results.push({
              message_id: message.MessageId,
              error: 'Failed to delete from workshop queue',
              status: 'failed'
            });
          }
        } else if (processResult.skipped) {
          // Delete skipped messages as well
          const deleteResult = await deleteMessageFromWorkshopQueue(message.ReceiptHandle);
          if (deleteResult.success) {
            console.log(`Skipped and deleted non-workshop message: ${message.MessageId}`);
            results.push({
              message_id: message.MessageId,
              status: 'skipped'
            });
          }
        } else {
          // PERMANENTLY DELETE MESSAGES THAT RESULT IN PROCESSING ERRORS
          console.error(`Workshop processing failed for message ${message.MessageId}, deleting permanently:`, processResult.error);
          
          const deleteResult = await deleteMessageFromWorkshopQueue(message.ReceiptHandle);
          
          if (deleteResult.success) {
            console.log(`Permanently deleted failed workshop message: ${message.MessageId}`);
            failedCount++;
            results.push({
              message_id: message.MessageId,
              error: processResult.error,
              status: 'failed_deleted'
            });
          } else {
            console.error(`Failed to delete failed workshop message ${message.MessageId} from queue`);
            failedCount++;
            results.push({
              message_id: message.MessageId,
              error: `Workshop processing failed: ${processResult.error}, and deletion also failed`,
              status: 'failed_deletion_error'
            });
          }
        }
      } catch (error) {
        // PERMANENTLY DELETE MESSAGES THAT CAUSE EXCEPTIONS
        console.error(`Error processing workshop message ${message.MessageId}, deleting permanently:`, error);
        
        try {
          const deleteResult = await deleteMessageFromWorkshopQueue(message.ReceiptHandle);
          
          if (deleteResult.success) {
            console.log(`Permanently deleted errored workshop message: ${message.MessageId}`);
            failedCount++;
            results.push({
              message_id: message.MessageId,
              error: error.message,
              status: 'error_deleted'
            });
          } else {
            console.error(`Failed to delete errored workshop message ${message.MessageId} from queue`);
            failedCount++;
            results.push({
              message_id: message.MessageId,
              error: `Processing error: ${error.message}, and deletion also failed`,
              status: 'error_deletion_error'
            });
          }
        } catch (deleteError) {
          console.error(`Critical error deleting workshop message ${message.MessageId}:`, deleteError);
          failedCount++;
          results.push({
            message_id: message.MessageId,
            error: `Processing error: ${error.message}, deletion error: ${deleteError.message}`,
            status: 'critical_error'
          });
        }
      }
    }

    console.log(`Workshop queue processing completed: ${processedCount} processed, ${failedCount} failed`);
    
    return {
      success: true,
      processed: processedCount,
      failed: failedCount,
      total: messages.length,
      results
    };

  } catch (error) {
    console.error('Error in workshop queue processing:', error);
    return {
      success: false,
      error: error.message,
      processed: 0,
      failed: 0
    };
  }
};

// Start workshop queue consumer with interval
let workshopQueueInterval;

const startWorkshopQueueConsumer = () => {
  console.log('Starting SQS workshop queue consumer...');
  
  // Process immediately
  processWorkshopQueueMessages();
  
  // Set up interval to process every 15 seconds
  workshopQueueInterval = setInterval(() => {
    processWorkshopQueueMessages();
  }, 15000); // 15 seconds
  
  console.log('Workshop queue consumer started - checking every 15 seconds');
};

const stopWorkshopQueueConsumer = () => {
  if (workshopQueueInterval) {
    clearInterval(workshopQueueInterval);
    workshopQueueInterval = null;
    console.log('Workshop queue consumer stopped');
  }
};

module.exports = {
  sendToWorkshopReportQueue,
  processWorkshopReportFromQueue,
  receiveFromWorkshopQueue,
  deleteMessageFromWorkshopQueue,
  processWorkshopQueueMessages,
  startWorkshopQueueConsumer,
  stopWorkshopQueueConsumer,
  getSQSClient,
  getWorkshopReportQueueUrl
};