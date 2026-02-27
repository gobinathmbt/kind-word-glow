const { sqsUtils } = require('../config/sqs');
const notificationService = require('../services/esign/notification.service');
const encryptionService = require('../services/esign/encryption.service');
const auditService = require('../services/esign/audit.service');

/**
 * E-Sign Notification Job Queue
 * 
 * Handles asynchronous notification delivery using AWS SQS
 * 
 * Requirements: 24.1-24.7, 25.1-25.8
 */

// Queue configuration
const NOTIFICATION_QUEUE_NAME = 'esign-notification-queue';
let notificationQueueUrl = null;

/**
 * Initialize notification queue
 */
const initializeNotificationQueue = async () => {
  try {
    if (!notificationQueueUrl) {
      notificationQueueUrl = await sqsUtils.getQueueUrl(NOTIFICATION_QUEUE_NAME);
      console.log(`[Notification Queue] Initialized: ${notificationQueueUrl}`);
    }
    return notificationQueueUrl;
  } catch (error) {
    console.error('[Notification Queue] Failed to initialize:', error);
    throw error;
  }
};

/**
 * Enqueue notification job
 * @param {Object} notificationData - Notification data
 * @returns {Promise<Object>} Enqueue result
 */
const enqueueNotification = async (notificationData) => {
  try {
    await initializeNotificationQueue();
    
    const jobData = {
      type: 'notification',
      ...notificationData,
      enqueuedAt: new Date().toISOString(),
      attempts: 0,
    };
    
    const result = await sqsUtils.sendMessage(notificationQueueUrl, jobData);
    
    console.log(`[Notification Queue] Enqueued notification for ${notificationData.recipient}, MessageId: ${result.MessageId}`);
    
    return {
      success: true,
      messageId: result.MessageId,
      recipient: notificationData.recipient,
    };
  } catch (error) {
    console.error('[Notification Queue] Failed to enqueue notification:', error);
    throw error;
  }
};

/**
 * Enqueue multiple notifications as batch
 * @param {Array} notificationsData - Array of notification data objects
 * @returns {Promise<Object>} Batch enqueue result
 */
const enqueueNotificationBatch = async (notificationsData) => {
  try {
    await initializeNotificationQueue();
    
    const messages = notificationsData.map(notificationData => ({
      type: 'notification',
      ...notificationData,
      enqueuedAt: new Date().toISOString(),
      attempts: 0,
    }));
    
    const result = await sqsUtils.sendMessageBatch(notificationQueueUrl, messages);
    
    console.log(`[Notification Queue] Enqueued ${messages.length} notifications in batch`);
    
    return {
      success: true,
      count: messages.length,
      result,
    };
  } catch (error) {
    console.error('[Notification Queue] Failed to enqueue notification batch:', error);
    throw error;
  }
};

/**
 * Process notification job
 * @param {Object} jobData - Job data from SQS message
 * @returns {Promise<Object>} Processing result
 */
const processNotificationJob = async (jobData) => {
  const {
    notificationType,
    recipient,
    channel,
    subject,
    message,
    htmlMessage,
    companyId,
    companyDbName,
    documentId,
    attempts = 0,
  } = jobData;
  
  try {
    console.log(`[Notification Queue] Processing ${notificationType} notification for ${recipient} via ${channel} (attempt ${attempts + 1})`);
    
    // Get company database connection
    const companyDb = await require('../config/dbConnectionManager').getCompanyConnection(companyDbName);
    
    // Get company from master database
    const mongoose = require('mongoose');
    const Company = mongoose.model('Company');
    const company = await Company.findById(companyId);
    
    if (!company) {
      throw new Error(`Company not found: ${companyId}`);
    }
    
    // Get provider configuration
    const EsignProviderConfig = companyDb.model('EsignProviderConfig');
    const providerType = channel === 'sms' ? 'sms' : 'email';
    const provider = await EsignProviderConfig.findOne({
      company_id: companyId,
      provider_type: providerType,
      is_active: true,
    });
    
    if (!provider) {
      throw new Error(`No active ${providerType} provider configured for company ${companyId}`);
    }
    
    // Decrypt credentials
    const credentials = encryptionService.decryptCredentials(provider.credentials);
    
    // Create mock request object for audit logging
    const mockReq = {
      company: company,
      user: null,
      getModel: (modelName) => companyDb.model(modelName),
      get: () => 'esign-notification-queue',
      ip: 'system',
      connection: { remoteAddress: 'system' },
    };
    
    // Send notification based on channel
    let result;
    if (channel === 'email') {
      const emailData = {
        to: recipient,
        subject: subject,
        text: message,
        html: htmlMessage || message,
        from: credentials.from_email || credentials.username,
      };
      
      result = await notificationService.sendEmail(
        provider.provider,
        credentials,
        provider.settings,
        emailData
      );
    } else if (channel === 'sms') {
      const smsData = {
        to: recipient,
        message: message,
      };
      
      result = await notificationService.sendSMS(
        provider.provider,
        credentials,
        provider.settings,
        smsData
      );
    } else {
      throw new Error(`Unsupported notification channel: ${channel}`);
    }
    
    // Log successful delivery to audit log
    await auditService.logEvent(mockReq, {
      event_type: `notification.${notificationType}.sent`,
      actor: {
        type: 'system',
      },
      resource: {
        type: 'document',
        id: documentId || 'unknown',
      },
      action: `${notificationType} notification sent via ${channel}`,
      metadata: {
        recipient,
        channel,
        provider: provider.provider,
        message_id: result.messageId,
        attempts: attempts + 1,
      },
    });
    
    console.log(`[Notification Queue] ${notificationType} notification sent successfully to ${recipient} via ${channel}`);
    
    return {
      success: true,
      recipient,
      channel,
      notificationType,
      messageId: result.messageId,
      attempts: attempts + 1,
    };
  } catch (error) {
    console.error(`[Notification Queue] Notification delivery failed for ${recipient}:`, error);
    
    // Log failed delivery to audit log
    try {
      const companyDb = await require('../config/dbConnectionManager').getCompanyConnection(companyDbName);
      const mongoose = require('mongoose');
      const Company = mongoose.model('Company');
      const company = await Company.findById(companyId);
      
      const mockReq = {
        company: company,
        user: null,
        getModel: (modelName) => companyDb.model(modelName),
        get: () => 'esign-notification-queue',
        ip: 'system',
        connection: { remoteAddress: 'system' },
      };
      
      await auditService.logEvent(mockReq, {
        event_type: `notification.${notificationType}.failed`,
        actor: {
          type: 'system',
        },
        resource: {
          type: 'document',
          id: documentId || 'unknown',
        },
        action: `${notificationType} notification delivery failed`,
        metadata: {
          recipient,
          channel,
          error: error.message,
          attempts: attempts + 1,
        },
      });
    } catch (auditError) {
      console.error('[Notification Queue] Failed to log delivery failure:', auditError);
    }
    
    throw error;
  }
};

/**
 * Poll and process notification jobs
 * @param {number} maxMessages - Maximum messages to process per poll (default: 10)
 * @param {number} waitTimeSeconds - Long polling wait time (default: 20)
 * @returns {Promise<Object>} Processing results
 */
const pollNotificationJobs = async (maxMessages = 10, waitTimeSeconds = 20) => {
  try {
    await initializeNotificationQueue();
    
    console.log(`[Notification Queue] Polling for jobs (max: ${maxMessages}, wait: ${waitTimeSeconds}s)`);
    
    const messages = await sqsUtils.receiveMessages(notificationQueueUrl, maxMessages, waitTimeSeconds);
    
    if (messages.length === 0) {
      console.log('[Notification Queue] No messages received');
      return {
        processed: 0,
        succeeded: 0,
        failed: 0,
      };
    }
    
    console.log(`[Notification Queue] Received ${messages.length} messages`);
    
    let succeeded = 0;
    let failed = 0;
    
    // Process each message
    for (const message of messages) {
      try {
        const jobData = JSON.parse(message.Body);
        
        // Process the job
        await processNotificationJob(jobData);
        
        // Delete message from queue on success
        await sqsUtils.deleteMessage(notificationQueueUrl, message.ReceiptHandle);
        
        succeeded++;
        console.log(`[Notification Queue] Successfully processed and deleted message ${message.MessageId}`);
      } catch (error) {
        console.error(`[Notification Queue] Failed to process message ${message.MessageId}:`, error);
        
        // Parse job data to check retry count
        try {
          const jobData = JSON.parse(message.Body);
          const maxRetries = 3;
          
          if (jobData.attempts < maxRetries - 1) {
            // Re-enqueue with incremented attempt count
            jobData.attempts = (jobData.attempts || 0) + 1;
            
            // Calculate delay based on attempt (exponential backoff: 2s, 4s, 8s)
            const delaySeconds = Math.pow(2, jobData.attempts);
            
            await sqsUtils.sendMessage(notificationQueueUrl, jobData, delaySeconds);
            
            console.log(`[Notification Queue] Re-enqueued message with ${delaySeconds}s delay (attempt ${jobData.attempts + 1}/${maxRetries})`);
          } else {
            console.log(`[Notification Queue] Max retries exceeded for message ${message.MessageId}, not re-enqueueing`);
          }
          
          // Delete original message
          await sqsUtils.deleteMessage(notificationQueueUrl, message.ReceiptHandle);
        } catch (retryError) {
          console.error('[Notification Queue] Failed to handle retry logic:', retryError);
        }
        
        failed++;
      }
    }
    
    console.log(`[Notification Queue] Processed ${messages.length} messages: ${succeeded} succeeded, ${failed} failed`);
    
    return {
      processed: messages.length,
      succeeded,
      failed,
    };
  } catch (error) {
    console.error('[Notification Queue] Polling error:', error);
    return {
      processed: 0,
      succeeded: 0,
      failed: 0,
      error: error.message,
    };
  }
};

/**
 * Start notification queue worker
 * Continuously polls for jobs
 * @param {Object} options - Worker options
 */
const startNotificationWorker = (options = {}) => {
  const {
    maxMessages = 10,
    waitTimeSeconds = 20,
    pollInterval = 1000, // 1 second between polls
  } = options;
  
  console.log('[Notification Queue] Starting notification worker');
  console.log(`[Notification Queue] Worker config: maxMessages=${maxMessages}, waitTime=${waitTimeSeconds}s, pollInterval=${pollInterval}ms`);
  
  let isRunning = true;
  
  const poll = async () => {
    if (!isRunning) {
      console.log('[Notification Queue] Worker stopped');
      return;
    }
    
    try {
      await pollNotificationJobs(maxMessages, waitTimeSeconds);
    } catch (error) {
      console.error('[Notification Queue] Worker error:', error);
    }
    
    // Schedule next poll
    setTimeout(poll, pollInterval);
  };
  
  // Start polling
  poll();
  
  // Return stop function
  return {
    stop: () => {
      console.log('[Notification Queue] Stopping notification worker');
      isRunning = false;
    },
  };
};

/**
 * Get queue statistics
 * @returns {Promise<Object>} Queue statistics
 */
const getNotificationQueueStats = async () => {
  try {
    await initializeNotificationQueue();
    
    const attributes = await sqsUtils.getQueueAttributes(notificationQueueUrl);
    
    return {
      queueUrl: notificationQueueUrl,
      approximateNumberOfMessages: parseInt(attributes.ApproximateNumberOfMessages || '0'),
      approximateNumberOfMessagesNotVisible: parseInt(attributes.ApproximateNumberOfMessagesNotVisible || '0'),
      approximateNumberOfMessagesDelayed: parseInt(attributes.ApproximateNumberOfMessagesDelayed || '0'),
      createdTimestamp: attributes.CreatedTimestamp,
      lastModifiedTimestamp: attributes.LastModifiedTimestamp,
    };
  } catch (error) {
    console.error('[Notification Queue] Failed to get queue stats:', error);
    throw error;
  }
};

module.exports = {
  initializeNotificationQueue,
  enqueueNotification,
  enqueueNotificationBatch,
  processNotificationJob,
  pollNotificationJobs,
  startNotificationWorker,
  getNotificationQueueStats,
};
