const cron = require('node-cron');
const mongoose = require('mongoose');
const notificationService = require('../services/esign/notification.service');
const encryptionService = require('../services/esign/encryption.service');
const auditService = require('../services/esign/audit.service');

/**
 * E-Sign Notification Cron Job (Alternative to SQS)
 * 
 * Runs every minute to process pending notifications
 * This is a simpler alternative to SQS for smaller deployments
 * 
 * Requirements: 24.1-24.7, 25.1-25.8
 */

// In-memory queue for pending notifications (for cron-based approach)
// In production with multiple instances, use Redis or database-backed queue
const pendingNotifications = [];

/**
 * Add notification to pending queue
 * @param {Object} notificationData - Notification data
 */
const addNotificationToQueue = (notificationData) => {
  pendingNotifications.push({
    ...notificationData,
    enqueuedAt: new Date(),
    attempts: 0,
  });
  
  console.log(`[Notification Cron] Added notification to queue for ${notificationData.recipient} (queue size: ${pendingNotifications.length})`);
};

/**
 * Add multiple notifications to pending queue
 * @param {Array} notificationsData - Array of notification data objects
 */
const addNotificationBatchToQueue = (notificationsData) => {
  notificationsData.forEach(notificationData => {
    addNotificationToQueue(notificationData);
  });
  
  console.log(`[Notification Cron] Added ${notificationsData.length} notifications to queue (queue size: ${pendingNotifications.length})`);
};

/**
 * Process a single notification
 * @param {Object} notificationData - Notification data
 * @returns {Promise<Object>} Processing result
 */
const processNotification = async (notificationData) => {
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
  } = notificationData;
  
  try {
    console.log(`[Notification Cron] Processing ${notificationType} notification for ${recipient} via ${channel} (attempt ${attempts + 1})`);
    
    // Get company database connection
    const companyDb = await require('../config/dbConnectionManager').getCompanyConnection(companyDbName);
    
    // Get company from master database
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
      get: () => 'esign-notification-cron',
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
    
    console.log(`[Notification Cron] ${notificationType} notification sent successfully to ${recipient} via ${channel}`);
    
    return {
      success: true,
      recipient,
      channel,
      notificationType,
      messageId: result.messageId,
      attempts: attempts + 1,
    };
  } catch (error) {
    console.error(`[Notification Cron] Notification delivery failed for ${recipient}:`, error);
    
    // Log failed delivery to audit log
    try {
      const companyDb = await require('../config/dbConnectionManager').getCompanyConnection(companyDbName);
      const Company = mongoose.model('Company');
      const company = await Company.findById(companyId);
      
      const mockReq = {
        company: company,
        user: null,
        getModel: (modelName) => companyDb.model(modelName),
        get: () => 'esign-notification-cron',
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
      console.error('[Notification Cron] Failed to log delivery failure:', auditError);
    }
    
    throw error;
  }
};

/**
 * Process pending notifications
 */
const processPendingNotifications = async () => {
  if (pendingNotifications.length === 0) {
    return {
      processed: 0,
      succeeded: 0,
      failed: 0,
    };
  }
  
  console.log(`[Notification Cron] Processing ${pendingNotifications.length} pending notifications`);
  
  const maxBatchSize = 10; // Process max 10 notifications per run
  const batch = pendingNotifications.splice(0, maxBatchSize);
  
  let succeeded = 0;
  let failed = 0;
  const failedNotifications = [];
  
  for (const notification of batch) {
    try {
      await processNotification(notification);
      succeeded++;
    } catch (error) {
      console.error('[Notification Cron] Failed to process notification:', error);
      
      // Retry logic
      const maxRetries = 3;
      if (notification.attempts < maxRetries - 1) {
        notification.attempts++;
        failedNotifications.push(notification);
        console.log(`[Notification Cron] Will retry notification (attempt ${notification.attempts + 1}/${maxRetries})`);
      } else {
        console.log(`[Notification Cron] Max retries exceeded for notification to ${notification.recipient}`);
      }
      
      failed++;
    }
  }
  
  // Re-add failed notifications to queue for retry
  failedNotifications.forEach(notification => {
    pendingNotifications.push(notification);
  });
  
  console.log(`[Notification Cron] Processed ${batch.length} notifications: ${succeeded} succeeded, ${failed} failed, ${failedNotifications.length} queued for retry`);
  
  return {
    processed: batch.length,
    succeeded,
    failed,
    queued_for_retry: failedNotifications.length,
    remaining_in_queue: pendingNotifications.length,
  };
};

/**
 * Run notification processing
 */
const runNotificationProcessing = async () => {
  try {
    console.log('[Notification Cron] Starting notification processing job');
    const startTime = Date.now();
    
    const result = await processPendingNotifications();
    
    const duration = Date.now() - startTime;
    
    console.log('[Notification Cron] Notification processing job completed');
    console.log(`[Notification Cron] Duration: ${duration}ms`);
    console.log(`[Notification Cron] Processed: ${result.processed}`);
    console.log(`[Notification Cron] Succeeded: ${result.succeeded}`);
    console.log(`[Notification Cron] Failed: ${result.failed}`);
    console.log(`[Notification Cron] Remaining in queue: ${result.remaining_in_queue}`);
    
    return {
      success: true,
      duration_ms: duration,
      ...result,
    };
  } catch (error) {
    console.error('[Notification Cron] Notification processing job failed:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Start the notification processing cron job
 * Runs every minute (* * * * *)
 */
const startNotificationCronJob = () => {
  // Run every minute
  const cronSchedule = '* * * * *';
  
  console.log(`[Notification Cron] Scheduling notification processing cron job: ${cronSchedule}`);
  
  cron.schedule(cronSchedule, async () => {
    console.log('[Notification Cron] Notification processing cron job triggered');
    await runNotificationProcessing();
  });
  
  console.log('[Notification Cron] Notification processing cron job scheduled');
};

/**
 * Run notification processing immediately (for testing or manual trigger)
 */
const runNotificationProcessingNow = async () => {
  console.log('[Notification Cron] Running notification processing immediately');
  return await runNotificationProcessing();
};

/**
 * Get queue statistics
 */
const getQueueStats = () => {
  return {
    pending_count: pendingNotifications.length,
    oldest_notification: pendingNotifications.length > 0 ? pendingNotifications[0].enqueuedAt : null,
  };
};

module.exports = {
  addNotificationToQueue,
  addNotificationBatchToQueue,
  processNotification,
  processPendingNotifications,
  startNotificationCronJob,
  runNotificationProcessingNow,
  getQueueStats,
};
