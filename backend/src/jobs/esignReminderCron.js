const cron = require('node-cron');
const mongoose = require('mongoose');
const auditService = require('../services/esign/audit.service');
const encryptionService = require('../services/esign/encryption.service');

/**
 * E-Sign Pre-Expiry Reminder Cron Job
 * 
 * Runs every 15 minutes to send reminder notifications before documents expire
 * 
 * Requirements: 61.1, 61.2, 61.3, 61.4, 61.5, 61.6
 */

/**
 * Process pre-expiry reminders for a single company
 * @param {Object} company - Company object
 * @returns {Promise<Object>} Reminder results
 */
const processCompanyReminders = async (company) => {
  try {
    console.log(`[Reminder] Processing company: ${company.name} (${company._id})`);
    
    // Get company database connection
    const companyDb = await require('../config/dbConnectionManager').getCompanyConnection(company.db_name);
    
    // Get models for this company
    const EsignDocument = companyDb.model('EsignDocument');
    const EsignProviderConfig = companyDb.model('EsignProviderConfig');
    
    // Query documents with status "distributed", "opened", or "partially_signed"
    const now = new Date();
    const documentsToCheck = await EsignDocument.find({
      status: { $in: ['distributed', 'opened', 'partially_signed'] },
      expires_at: { $gt: now } // Not yet expired
    }).lean();
    
    console.log(`[Reminder] Found ${documentsToCheck.length} active documents for company ${company.name}`);
    
    if (documentsToCheck.length === 0) {
      return {
        company_id: company._id,
        company_name: company.name,
        reminders_sent: 0,
      };
    }
    
    // Get active email provider for sending reminder notifications
    const emailProvider = await EsignProviderConfig.findOne({
      company_id: company._id,
      provider_type: 'email',
      is_active: true,
    });
    
    if (!emailProvider) {
      console.log(`[Reminder] No active email provider found for company ${company.name}`);
      return {
        company_id: company._id,
        company_name: company.name,
        reminders_sent: 0,
        error: 'no_email_provider',
      };
    }
    
    let remindersSent = 0;
    const errors = [];
    
    // Create a mock request object for audit logging
    const mockReq = {
      company: company,
      user: null,
      getModel: (modelName) => companyDb.model(modelName),
      get: () => 'esign-reminder-cron',
      ip: 'system',
      connection: { remoteAddress: 'system' },
    };
    
    // Process each document
    for (const document of documentsToCheck) {
      try {
        // Get reminder intervals from template snapshot
        const reminderIntervals = document.template_snapshot?.notification_config?.reminder_intervals || [];
        
        if (reminderIntervals.length === 0) {
          continue; // No reminders configured for this template
        }
        
        // Calculate time until expiry in hours
        const timeUntilExpiry = (document.expires_at.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        // Check each reminder interval
        for (const interval of reminderIntervals) {
          const hoursBeforeExpiry = interval.hours_before_expiry;
          
          // Check if we're within the reminder window (±7.5 minutes = half of 15-minute cron interval)
          const reminderWindowMinutes = 7.5;
          const reminderWindowHours = reminderWindowMinutes / 60;
          
          const isInReminderWindow = 
            timeUntilExpiry <= hoursBeforeExpiry + reminderWindowHours &&
            timeUntilExpiry >= hoursBeforeExpiry - reminderWindowHours;
          
          if (!isInReminderWindow) {
            continue; // Not time for this reminder yet
          }
          
          // Check if reminder already sent for this interval
          const alreadySent = (document.reminders_sent || []).some(
            r => r.hours_before_expiry === hoursBeforeExpiry
          );
          
          if (alreadySent) {
            console.log(`[Reminder] Reminder already sent for document ${document._id} at ${hoursBeforeExpiry}h before expiry`);
            continue;
          }
          
          // Get pending recipients (not signed)
          const pendingRecipients = document.recipients.filter(
            r => r.status !== 'signed' && r.status !== 'rejected'
          );
          
          if (pendingRecipients.length === 0) {
            continue; // No pending recipients
          }
          
          // Decrypt email provider credentials
          const credentials = encryptionService.decryptCredentials(emailProvider.credentials);
          
          // Send reminder to each pending recipient
          const notificationService = require('../services/esign/notification.service');
          
          for (const recipient of pendingRecipients) {
            try {
              // Generate reminder message
              const expiryDate = document.expires_at.toLocaleString();
              const hoursRemaining = Math.floor(timeUntilExpiry);
              
              const emailData = {
                to: recipient.email,
                subject: `Reminder: Document Signing Required - Expires in ${hoursRemaining} hours`,
                text: `Hello ${recipient.name},\n\nThis is a reminder that the document "${document.template_snapshot.name}" is waiting for your signature.\n\nThe document will expire in approximately ${hoursRemaining} hours (${expiryDate}).\n\nPlease sign the document as soon as possible to avoid expiration.\n\nThank you.`,
                html: `
                  <p>Hello ${recipient.name},</p>
                  <p>This is a reminder that the document <strong>"${document.template_snapshot.name}"</strong> is waiting for your signature.</p>
                  <p><strong>The document will expire in approximately ${hoursRemaining} hours</strong> (${expiryDate}).</p>
                  <p>Please sign the document as soon as possible to avoid expiration.</p>
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
              
              remindersSent++;
              
              console.log(`[Reminder] Sent reminder to ${recipient.email} for document ${document._id} (${hoursBeforeExpiry}h before expiry)`);
            } catch (notifError) {
              console.error(`[Reminder] Failed to send reminder to ${recipient.email}:`, notifError);
              errors.push({
                document_id: document._id,
                recipient_email: recipient.email,
                hours_before_expiry: hoursBeforeExpiry,
                error: 'notification_failed',
                message: notifError.message,
              });
            }
          }
          
          // Track sent reminder to avoid duplicates
          await EsignDocument.updateOne(
            { _id: document._id },
            {
              $push: {
                reminders_sent: {
                  sent_at: now,
                  hours_before_expiry: hoursBeforeExpiry,
                },
              },
            }
          );
          
          // Log reminder event to audit log
          await auditService.logEvent(mockReq, {
            event_type: 'document.reminder_sent',
            actor: {
              type: 'system',
            },
            resource: {
              type: 'document',
              id: document._id.toString(),
            },
            action: 'Pre-expiry reminder sent',
            metadata: {
              hours_before_expiry: hoursBeforeExpiry,
              expires_at: document.expires_at,
              time_until_expiry_hours: timeUntilExpiry,
              pending_recipients: pendingRecipients.length,
              recipients_notified: pendingRecipients.map(r => r.email),
            },
          });
          
          console.log(`[Reminder] Tracked reminder for document ${document._id} at ${hoursBeforeExpiry}h before expiry`);
        }
      } catch (docError) {
        console.error(`[Reminder] Failed to process document ${document._id}:`, docError);
        errors.push({
          document_id: document._id,
          error: 'processing_failed',
          message: docError.message,
        });
      }
    }
    
    console.log(`[Reminder] Completed for company ${company.name}: ${remindersSent} reminders sent`);
    
    return {
      company_id: company._id,
      company_name: company.name,
      reminders_sent: remindersSent,
      errors_count: errors.length,
      errors: errors.slice(0, 10), // Include first 10 errors
    };
  } catch (error) {
    console.error(`[Reminder] Error processing company ${company.name}:`, error);
    return {
      company_id: company._id,
      company_name: company.name,
      error: error.message,
      reminders_sent: 0,
    };
  }
};

/**
 * Run pre-expiry reminder check for all companies
 */
const runReminderCheck = async () => {
  try {
    console.log('[Reminder] Starting pre-expiry reminder check job');
    const startTime = Date.now();
    
    // Get all active companies from master database
    const Company = mongoose.model('Company');
    const companies = await Company.find({ is_active: true }).lean();
    
    console.log(`[Reminder] Found ${companies.length} active companies`);
    
    // Process each company sequentially
    const results = [];
    for (const company of companies) {
      const result = await processCompanyReminders(company);
      results.push(result);
    }
    
    // Calculate totals
    const totals = results.reduce(
      (acc, result) => {
        if (!result.error) {
          acc.reminders_sent += result.reminders_sent || 0;
          acc.errors_count += result.errors_count || 0;
        }
        if (result.error) {
          acc.companies_failed++;
        }
        return acc;
      },
      {
        reminders_sent: 0,
        errors_count: 0,
        companies_failed: 0,
      }
    );
    
    const duration = Date.now() - startTime;
    
    console.log('[Reminder] Pre-expiry reminder check job completed');
    console.log(`[Reminder] Duration: ${duration}ms`);
    console.log(`[Reminder] Companies processed: ${companies.length}`);
    console.log(`[Reminder] Companies failed: ${totals.companies_failed}`);
    console.log(`[Reminder] Reminders sent: ${totals.reminders_sent}`);
    console.log(`[Reminder] Errors: ${totals.errors_count}`);
    
    return {
      success: true,
      duration_ms: duration,
      companies_processed: companies.length,
      ...totals,
      results,
    };
  } catch (error) {
    console.error('[Reminder] Pre-expiry reminder check job failed:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};


const startReminderCronJob = () => {
  // Run every 15 minutes
  const cronSchedule = '*/15 * * * *';
  
  console.log(`[Reminder] Scheduling pre-expiry reminder cron job: ${cronSchedule}`);
  
  cron.schedule(cronSchedule, async () => {
    console.log('[Reminder] Pre-expiry reminder cron job triggered');
    await runReminderCheck();
  });
  
  console.log('[Reminder] Pre-expiry reminder cron job scheduled');
};

/**
 * Run reminder check immediately (for testing or manual trigger)
 */
const runReminderCheckNow = async () => {
  console.log('[Reminder] Running pre-expiry reminder check immediately');
  return await runReminderCheck();
};

module.exports = {
  startReminderCronJob,
  runReminderCheckNow,
  processCompanyReminders,
};
