const cron = require('node-cron');
const mongoose = require('mongoose');
const auditService = require('../services/esign/audit.service');
const encryptionService = require('../services/esign/encryption.service');

/**
 * E-Sign Document Expiry Cron Job
 * 
 * Runs every 15 minutes to check for expired documents and invalidate them
 * 
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7
 */

/**
 * Process document expiry for a single company
 * @param {Object} company - Company object
 * @returns {Promise<Object>} Expiry results
 */
const processCompanyExpiry = async (company) => {
  try {
    console.log(`[Expiry] Processing company: ${company.name} (${company._id})`);
    
    // Get company database connection
    const companyDb = await require('../config/dbConnectionManager').getCompanyConnection(company.db_name);
    
    // Get models for this company
    const EsignDocument = companyDb.model('EsignDocument');
    const EsignProviderConfig = companyDb.model('EsignProviderConfig');
    
    // Query documents with status "distributed", "opened", or "partially_signed"
    // that have expires_at timestamp in the past
    const now = new Date();
    const expiredDocuments = await EsignDocument.find({
      status: { $in: ['distributed', 'opened', 'partially_signed'] },
      expires_at: { $lt: now }
    }).lean();
    
    console.log(`[Expiry] Found ${expiredDocuments.length} expired documents for company ${company.name}`);
    
    if (expiredDocuments.length === 0) {
      return {
        company_id: company._id,
        company_name: company.name,
        documents_expired: 0,
        notifications_sent: 0,
      };
    }
    
    // Get active email provider for sending expiry notifications
    const emailProvider = await EsignProviderConfig.findOne({
      company_id: company._id,
      provider_type: 'email',
      is_active: true,
    });
    
    let notificationsSent = 0;
    const errors = [];
    
    // Create a mock request object for audit logging
    const mockReq = {
      company: company,
      user: null,
      getModel: (modelName) => companyDb.model(modelName),
      get: () => 'esign-expiry-cron',
      ip: 'system',
      connection: { remoteAddress: 'system' },
    };
    
    // Process each expired document
    for (const document of expiredDocuments) {
      try {
        // Update document status to "expired"
        await EsignDocument.updateOne(
          { _id: document._id },
          {
            $set: {
              status: 'expired',
            },
          }
        );
        
        // Invalidate all recipient tokens by clearing them
        await EsignDocument.updateOne(
          { _id: document._id },
          {
            $set: {
              'recipients.$[].token': null,
              'recipients.$[].token_expires_at': null,
            },
          }
        );
        
        console.log(`[Expiry] Expired document ${document._id} and invalidated tokens`);
        
        // Send expiry notifications per template configuration
        if (document.template_snapshot?.notification_config?.send_on_expire && emailProvider) {
          try {
            // Get pending recipients (not signed)
            const pendingRecipients = document.recipients.filter(
              r => r.status !== 'signed' && r.status !== 'rejected'
            );
            
            if (pendingRecipients.length > 0) {
              // Decrypt email provider credentials
              const credentials = encryptionService.decryptCredentials(emailProvider.credentials);
              
              // Send notification to each pending recipient
              const notificationService = require('../services/esign/notification.service');
              
              for (const recipient of pendingRecipients) {
                try {
                  const emailData = {
                    to: recipient.email,
                    subject: 'Document Signing Link Expired',
                    text: `The document "${document.template_snapshot.name}" has expired and can no longer be signed.`,
                    html: `
                      <p>Hello ${recipient.name},</p>
                      <p>The document <strong>"${document.template_snapshot.name}"</strong> has expired and can no longer be signed.</p>
                      <p>If you need to sign this document, please contact the sender to request a new signing link.</p>
                      <p>Thank you.</p>
                    `,
                    from: credentials.from_email || credentials.username,
                  };
                  
                  await notificationService.sendEmail(
                    emailProvider.provider,
                    credentials,
                    emailProvider.settings,
                    emailData
                  );
                  
                  notificationsSent++;
                  
                  console.log(`[Expiry] Sent expiry notification to ${recipient.email} for document ${document._id}`);
                } catch (notifError) {
                  console.error(`[Expiry] Failed to send notification to ${recipient.email}:`, notifError);
                  errors.push({
                    document_id: document._id,
                    recipient_email: recipient.email,
                    error: 'notification_failed',
                    message: notifError.message,
                  });
                }
              }
            }
          } catch (notifError) {
            console.error(`[Expiry] Failed to send notifications for document ${document._id}:`, notifError);
            errors.push({
              document_id: document._id,
              error: 'notification_setup_failed',
              message: notifError.message,
            });
          }
        }
        
        // Log expiry event to audit log
        await auditService.logEvent(mockReq, {
          event_type: 'document.expired',
          actor: {
            type: 'system',
          },
          resource: {
            type: 'document',
            id: document._id.toString(),
          },
          action: 'Document expired due to link expiry',
          metadata: {
            expires_at: document.expires_at,
            expired_at: now,
            previous_status: document.status,
            pending_recipients: document.recipients.filter(r => r.status !== 'signed' && r.status !== 'rejected').length,
          },
        });
        
      } catch (docError) {
        console.error(`[Expiry] Failed to process document ${document._id}:`, docError);
        errors.push({
          document_id: document._id,
          error: 'processing_failed',
          message: docError.message,
        });
      }
    }
    
    console.log(`[Expiry] Completed for company ${company.name}: ${expiredDocuments.length} documents expired, ${notificationsSent} notifications sent`);
    
    return {
      company_id: company._id,
      company_name: company.name,
      documents_expired: expiredDocuments.length,
      notifications_sent: notificationsSent,
      errors_count: errors.length,
      errors: errors.slice(0, 10), // Include first 10 errors
    };
  } catch (error) {
    console.error(`[Expiry] Error processing company ${company.name}:`, error);
    return {
      company_id: company._id,
      company_name: company.name,
      error: error.message,
      documents_expired: 0,
      notifications_sent: 0,
    };
  }
};

/**
 * Run document expiry check for all companies
 */
const runExpiryCheck = async () => {
  try {
    console.log('[Expiry] Starting document expiry check job');
    const startTime = Date.now();
    
    // Get all active companies from master database
    const Company = mongoose.model('Company');
    const companies = await Company.find({ is_active: true }).lean();
    
    console.log(`[Expiry] Found ${companies.length} active companies`);
    
    // Process each company sequentially
    const results = [];
    for (const company of companies) {
      const result = await processCompanyExpiry(company);
      results.push(result);
    }
    
    // Calculate totals
    const totals = results.reduce(
      (acc, result) => {
        if (!result.error) {
          acc.documents_expired += result.documents_expired || 0;
          acc.notifications_sent += result.notifications_sent || 0;
          acc.errors_count += result.errors_count || 0;
        }
        if (result.error) {
          acc.companies_failed++;
        }
        return acc;
      },
      {
        documents_expired: 0,
        notifications_sent: 0,
        errors_count: 0,
        companies_failed: 0,
      }
    );
    
    const duration = Date.now() - startTime;
    
    console.log('[Expiry] Document expiry check job completed');
    console.log(`[Expiry] Duration: ${duration}ms`);
    console.log(`[Expiry] Companies processed: ${companies.length}`);
    console.log(`[Expiry] Companies failed: ${totals.companies_failed}`);
    console.log(`[Expiry] Documents expired: ${totals.documents_expired}`);
    console.log(`[Expiry] Notifications sent: ${totals.notifications_sent}`);
    console.log(`[Expiry] Errors: ${totals.errors_count}`);
    
    return {
      success: true,
      duration_ms: duration,
      companies_processed: companies.length,
      ...totals,
      results,
    };
  } catch (error) {
    console.error('[Expiry] Document expiry check job failed:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};


const startExpiryCronJob = () => {
  // Run every 15 minutes
  const cronSchedule = '*/15 * * * *';
  
  console.log(`[Expiry] Scheduling document expiry cron job: ${cronSchedule}`);
  
  cron.schedule(cronSchedule, async () => {
    console.log('[Expiry] Document expiry cron job triggered');
    await runExpiryCheck();
  });
  
  console.log('[Expiry] Document expiry cron job scheduled');
};

/**
 * Run expiry check immediately (for testing or manual trigger)
 */
const runExpiryCheckNow = async () => {
  console.log('[Expiry] Running document expiry check immediately');
  return await runExpiryCheck();
};

module.exports = {
  startExpiryCronJob,
  runExpiryCheckNow,
  processCompanyExpiry,
};
