const notificationService = require('./notification.service');
const webhookService = require('./webhook.service');
const auditService = require('./audit.service');
const delimiterService = require('./delimiter.service');
const encryptionService = require('./encryption.service');

/**
 * Post-Signature Processing Service
 * 
 * Handles all post-signature actions asynchronously after document completion:
 * - Send completion notifications per template configuration
 * - Send post-sign email with signed PDF attachment
 * - Replace delimiters in notification content with actual payload values
 * - Execute API callbacks with retry logic
 * - Log all actions to audit log
 * 
 * Requirements: 13.1, 13.2, 13.9, 13.10, 25.8
 */

/**
 * Execute all post-signature actions for a completed document
 * This function runs asynchronously without blocking the signer's success page
 * 
 * @param {Object} req - Express request object (for model registry and audit logging)
 * @param {Object} document - Completed document object
 * @returns {Promise<Object>} Result summary
 */
async function executePostSignatureActions(req, document) {
  console.log(`Starting post-signature processing for document ${document._id}`);
  
  const results = {
    documentId: document._id.toString(),
    completionNotifications: { sent: false, error: null },
    postSignEmail: { sent: false, error: null },
    apiCallback: { sent: false, error: null },
    startTime: new Date(),
    endTime: null,
  };
  
  try {
    // Get template configuration from snapshot
    const template = document.template_snapshot;
    
    // 1. Send completion notifications (Req 13.1, 25.8)
    if (template.notification_config?.send_on_complete) {
      try {
        await sendCompletionNotifications(req, document, template);
        results.completionNotifications.sent = true;
        console.log('Completion notifications sent successfully');
      } catch (error) {
        console.error('Error sending completion notifications:', error);
        results.completionNotifications.error = error.message;
        
        // Log failure to audit
        await auditService.logNotificationEvent(req, 'notification.failed', document, {
          notification_type: 'completion',
          error: error.message,
        });
      }
    }
    
    // 2. Send post-sign email with PDF attachment (Req 13.2)
    if (template.notification_config?.post_sign_email_enabled && 
        template.notification_config?.post_sign_recipients?.length > 0) {
      try {
        await sendPostSignEmail(req, document, template);
        results.postSignEmail.sent = true;
        console.log('Post-sign email sent successfully');
      } catch (error) {
        console.error('Error sending post-sign email:', error);
        results.postSignEmail.error = error.message;
        
        // Log failure to audit
        await auditService.logNotificationEvent(req, 'notification.failed', document, {
          notification_type: 'post_sign_email',
          error: error.message,
        });
      }
    }
    
    // 3. Execute API callback (Req 13.3-13.8)
    if (document.callback_url) {
      try {
        await executeApiCallback(req, document, template);
        results.apiCallback.sent = true;
        console.log('API callback executed successfully');
      } catch (error) {
        console.error('Error executing API callback:', error);
        results.apiCallback.error = error.message;
      }
    }
    
    // Log successful completion of post-signature processing (Req 13.10)
    await auditService.logEvent(req, {
      event_type: 'document.post_signature_completed',
      actor: { type: 'system' },
      resource: { type: 'document', id: document._id.toString() },
      action: 'Post-signature processing completed',
      metadata: {
        completion_notifications_sent: results.completionNotifications.sent,
        post_sign_email_sent: results.postSignEmail.sent,
        api_callback_sent: results.apiCallback.sent,
      },
    });
    
  } catch (error) {
    console.error('Critical error in post-signature processing:', error);
    
    // Log critical failure
    await auditService.logEvent(req, {
      event_type: 'document.post_signature_failed',
      actor: { type: 'system' },
      resource: { type: 'document', id: document._id.toString() },
      action: 'Post-signature processing failed',
      metadata: { error: error.message },
    });
  } finally {
    results.endTime = new Date();
    console.log(`Post-signature processing completed in ${results.endTime - results.startTime}ms`);
  }
  
  return results;
}

/**
 * Send completion notifications to configured recipients
 * Replaces delimiters in notification content with actual payload values (Req 25.8)
 * 
 * @param {Object} req - Express request object
 * @param {Object} document - Document object
 * @param {Object} template - Template snapshot
 */
async function sendCompletionNotifications(req, document, template) {
  // Get active email provider
  const EsignProviderConfig = req.getModel('EsignProviderConfig');
  const emailProvider = await EsignProviderConfig.findOne({
    company_id: document.company_id,
    provider_type: 'email',
    is_active: true,
  });
  
  if (!emailProvider) {
    throw new Error('No active email provider configured');
  }
  
  // Decrypt credentials
  const credentials = encryptionService.decryptCredentials(emailProvider.credentials);
  
  // Determine recipients for completion notification
  const recipients = getCompletionNotificationRecipients(document, template);
  
  if (recipients.length === 0) {
    console.log('No recipients configured for completion notifications');
    return;
  }
  
  // Send notification to each recipient
  for (const recipientEmail of recipients) {
    try {
      // Build email content with delimiter replacement (Req 25.8)
      const emailData = buildCompletionEmail(
        recipientEmail,
        document,
        template,
        credentials
      );
      
      // Send with retry logic
      await notificationService.sendWithRetry(
        () => notificationService.sendEmail(
          emailProvider.provider,
          credentials,
          emailProvider.settings,
          emailData
        ),
        3,
        'exponential'
      );
      
      // Log successful send (Req 13.10)
      await auditService.logNotificationEvent(req, 'notification.sent', document, {
        recipient_email: recipientEmail,
        notification_type: 'completion',
      });
      
    } catch (error) {
      console.error(`Failed to send completion notification to ${recipientEmail}:`, error);
      
      // Log failure (Req 13.10)
      await auditService.logNotificationEvent(req, 'notification.failed', document, {
        recipient_email: recipientEmail,
        notification_type: 'completion',
        error: error.message,
      });
    }
  }
}

/**
 * Send post-sign email with signed PDF attachment
 * Replaces delimiters in email content with actual payload values (Req 25.8)
 * 
 * @param {Object} req - Express request object
 * @param {Object} document - Document object
 * @param {Object} template - Template snapshot
 */
async function sendPostSignEmail(req, document, template) {
  // Get active email provider
  const EsignProviderConfig = req.getModel('EsignProviderConfig');
  const emailProvider = await EsignProviderConfig.findOne({
    company_id: document.company_id,
    provider_type: 'email',
    is_active: true,
  });
  
  if (!emailProvider) {
    throw new Error('No active email provider configured');
  }
  
  // Decrypt credentials
  const credentials = encryptionService.decryptCredentials(emailProvider.credentials);
  
  // Get post-sign recipients
  const recipients = template.notification_config.post_sign_recipients || [];
  
  if (recipients.length === 0) {
    console.log('No recipients configured for post-sign email');
    return;
  }
  
  // Download signed PDF from storage
  const pdfBuffer = await downloadSignedPdf(req, document);
  
  // Send email to each recipient
  for (const recipientEmail of recipients) {
    try {
      // Build email with PDF attachment
      const emailData = buildPostSignEmail(
        recipientEmail,
        document,
        template,
        credentials,
        pdfBuffer
      );
      
      // Send with retry logic
      await notificationService.sendWithRetry(
        () => notificationService.sendEmail(
          emailProvider.provider,
          credentials,
          emailProvider.settings,
          emailData
        ),
        3,
        'exponential'
      );
      
      // Log successful send (Req 13.10)
      await auditService.logNotificationEvent(req, 'notification.sent', document, {
        recipient_email: recipientEmail,
        notification_type: 'post_sign_email',
        has_attachment: true,
      });
      
    } catch (error) {
      console.error(`Failed to send post-sign email to ${recipientEmail}:`, error);
      
      // Log failure (Req 13.10)
      await auditService.logNotificationEvent(req, 'notification.failed', document, {
        recipient_email: recipientEmail,
        notification_type: 'post_sign_email',
        error: error.message,
      });
    }
  }
}

/**
 * Execute API callback with retry logic
 * 
 * @param {Object} req - Express request object
 * @param {Object} document - Document object
 * @param {Object} template - Template snapshot
 */
async function executeApiCallback(req, document, template) {
  // Get API key to retrieve secret for signature
  const EsignAPIKey = req.getModel('EsignAPIKey');
  const apiKey = await EsignAPIKey.findOne({
    company_id: document.company_id,
    is_active: true,
  }).sort({ last_used_at: -1 });
  
  if (!apiKey) {
    throw new Error('No active API key found for webhook signature');
  }
  
  // Get retry backoff configuration from template
  const retryBackoff = template.notification_config?.retry_backoff || 'exponential';
  
  // Send webhook using webhook service
  const result = await webhookService.sendDocumentCompletedWebhook(
    document,
    document.callback_url,
    apiKey.hashed_secret, // Note: In production, use actual secret
    { retryBackoff }
  );
  
  // Update document with callback status
  const EsignDocument = req.getModel('EsignDocument');
  await EsignDocument.updateOne(
    { _id: document._id },
    {
      callback_status: result.success ? 'success' : 'failed',
      callback_attempts: result.totalAttempts,
      callback_last_attempt: new Date(),
    }
  );
  
  // Log webhook result (Req 13.8, 13.10)
  await auditService.logEvent(req, {
    event_type: result.success ? 'webhook.sent' : 'webhook.failed',
    actor: { type: 'system' },
    resource: { type: 'document', id: document._id.toString() },
    action: result.success ? 'Webhook sent successfully' : 'Webhook failed after retries',
    metadata: {
      callback_url: document.callback_url,
      attempts: result.totalAttempts,
      final_status: result.finalStatus,
      error: result.error,
    },
  });
  
  if (!result.success) {
    throw new Error(`Webhook failed after ${result.totalAttempts} attempts: ${result.error}`);
  }
}

/**
 * Get recipients for completion notification
 * 
 * @param {Object} document - Document object
 * @param {Object} template - Template snapshot
 * @returns {Array<string>} Array of recipient email addresses
 */
function getCompletionNotificationRecipients(document, template) {
  const recipients = [];
  
  // Add CC emails from notification config
  if (template.notification_config?.cc_emails) {
    recipients.push(...template.notification_config.cc_emails);
  }
  
  // Add all signers who completed the document
  document.recipients.forEach(recipient => {
    if (recipient.status === 'signed' && recipient.email) {
      recipients.push(recipient.email);
    }
  });
  
  // Remove duplicates
  return [...new Set(recipients)];
}

/**
 * Build completion email with delimiter replacement
 * 
 * @param {string} recipientEmail - Recipient email address
 * @param {Object} document - Document object
 * @param {Object} template - Template snapshot
 * @param {Object} credentials - Email provider credentials
 * @returns {Object} Email data
 */
function buildCompletionEmail(recipientEmail, document, template, credentials) {
  // Get custom email template or use default
  const customSubject = template.notification_config?.custom_email_subject;
  const customBody = template.notification_config?.custom_email_template;
  
  // Default subject and body
  let subject = 'Document Signing Completed';
  let htmlBody = `
    <html>
      <body>
        <h2>Document Signing Completed</h2>
        <p>The document "${template.name}" has been successfully signed by all parties.</p>
        <p><strong>Completed:</strong> ${document.completed_at.toLocaleString()}</p>
        <p><strong>Signers:</strong></p>
        <ul>
          ${document.recipients.map(r => `<li>${r.name} (${r.email}) - Signed at ${r.signed_at?.toLocaleString()}</li>`).join('')}
        </ul>
      </body>
    </html>
  `;
  
  // Replace delimiters in custom templates (Req 25.8)
  if (customSubject) {
    subject = delimiterService.replaceDelimiters(customSubject, document.payload);
  }
  
  if (customBody) {
    htmlBody = delimiterService.replaceDelimiters(customBody, document.payload);
  }
  
  return {
    to: recipientEmail,
    subject,
    html: htmlBody,
    text: htmlBody.replace(/<[^>]*>/g, ''), // Strip HTML tags for text version
    from: credentials.from_email || credentials.username,
  };
}

/**
 * Build post-sign email with PDF attachment
 * 
 * @param {string} recipientEmail - Recipient email address
 * @param {Object} document - Document object
 * @param {Object} template - Template snapshot
 * @param {Object} credentials - Email provider credentials
 * @param {Buffer} pdfBuffer - Signed PDF buffer
 * @returns {Object} Email data
 */
function buildPostSignEmail(recipientEmail, document, template, credentials, pdfBuffer) {
  // Get custom email template or use default
  const customSubject = template.notification_config?.post_sign_email_subject;
  const customBody = template.notification_config?.post_sign_email_template;
  
  // Default subject and body
  let subject = 'Signed Document Attached';
  let htmlBody = `
    <html>
      <body>
        <h2>Signed Document</h2>
        <p>Please find the signed document "${template.name}" attached to this email.</p>
        <p><strong>Completed:</strong> ${document.completed_at.toLocaleString()}</p>
      </body>
    </html>
  `;
  
  // Replace delimiters in custom templates (Req 25.8)
  if (customSubject) {
    subject = delimiterService.replaceDelimiters(customSubject, document.payload);
  }
  
  if (customBody) {
    htmlBody = delimiterService.replaceDelimiters(customBody, document.payload);
  }
  
  // Generate filename with delimiter replacement
  const filename = `${template.name.replace(/[^a-zA-Z0-9]/g, '_')}_signed.pdf`;
  
  return {
    to: recipientEmail,
    subject,
    html: htmlBody,
    text: htmlBody.replace(/<[^>]*>/g, ''),
    from: credentials.from_email || credentials.username,
    attachments: [
      {
        filename,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  };
}

/**
 * Download signed PDF from storage
 * 
 * @param {Object} req - Express request object
 * @param {Object} document - Document object
 * @returns {Promise<Buffer>} PDF buffer
 */
async function downloadSignedPdf(req, document) {
  if (!document.pdf_url) {
    throw new Error('Document PDF URL not found');
  }
  
  // Get active storage provider
  const EsignProviderConfig = req.getModel('EsignProviderConfig');
  const storageProvider = await EsignProviderConfig.findOne({
    company_id: document.company_id,
    provider_type: 'storage',
    is_active: true,
  });
  
  if (!storageProvider) {
    throw new Error('No active storage provider configured');
  }
  
  // Get storage adapter
  const StorageAdapterFactory = require('./storage/StorageAdapterFactory');
  const adapter = StorageAdapterFactory.createAdapter(
    storageProvider.provider,
    encryptionService.decryptCredentials(storageProvider.credentials),
    storageProvider.settings
  );
  
  // Extract storage key from URL
  // Assuming URL format: https://bucket.s3.region.amazonaws.com/path/to/file.pdf
  const urlParts = new URL(document.pdf_url);
  const storageKey = urlParts.pathname.substring(1); // Remove leading slash
  
  // Download PDF
  const pdfBuffer = await adapter.download(storageKey);
  
  return pdfBuffer;
}

module.exports = {
  executePostSignatureActions,
  sendCompletionNotifications,
  sendPostSignEmail,
  executeApiCallback,
};
