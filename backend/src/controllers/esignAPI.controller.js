const crypto = require('crypto');
const tokenService = require('../services/esign/token.service');
const notificationService = require('../services/esign/notification.service');
const auditService = require('../services/esign/audit.service');
const encryptionService = require('../services/esign/encryption.service');

/**
 * External API Controller for E-Sign
 * 
 * Handles document initiation, status polling, and webhooks for external systems
 * All endpoints require API key authentication
 */

/**
 * Initiate Document
 * POST /api/v1/esign/documents/initiate
 * 
 * Requirements: 7.1-7.12, 42.1-42.6
 */
exports.initiateDocument = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { template_id, payload, recipients, callback_url } = req.body;
    
    // Validate required fields
    if (!template_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: template_id',
      });
    }
    
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid payload',
      });
    }
    
    // Get models
    const EsignTemplate = req.getModel('EsignTemplate');
    const EsignDocument = req.getModel('EsignDocument');
    
    // Validate template exists and is active (Req 7.2, 7.3)
    const template = await EsignTemplate.findOne({
      _id: template_id,
      company_id: req.company_id,
      is_deleted: false,
    });
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
        message: 'The specified template does not exist or has been deleted',
      });
    }
    
    if (template.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Template is not active',
        message: 'The template must be in active status to create documents',
      });
    }
    
    // Validate required delimiters are present (Req 7.4)
    const requiredDelimiters = template.delimiters.filter(d => d.required);
    const missingDelimiters = [];
    
    for (const delimiter of requiredDelimiters) {
      if (!payload[delimiter.key] || payload[delimiter.key] === '') {
        missingDelimiters.push(delimiter.key);
      }
    }
    
    if (missingDelimiters.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required delimiters',
        message: `The following required delimiters are missing: ${missingDelimiters.join(', ')}`,
        missing_delimiters: missingDelimiters,
      });
    }
    
    // Validate delimiter types (Req 7.5, 42.1-42.6)
    const validationErrors = validateDelimiterTypes(template.delimiters, payload);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Delimiter validation failed',
        message: 'One or more delimiter values do not match their configured types',
        validation_errors: validationErrors,
      });
    }
    
    // Prepare recipients from template or request
    const documentRecipients = prepareRecipients(template, recipients);
    
    // Calculate document expiration (Req 7.8)
    const expiresAt = tokenService.calculateExpiry(
      template.link_expiry.value,
      template.link_expiry.unit
    );
    
    // Create document with template snapshot (Req 7.6)
    const document = await EsignDocument.create({
      company_id: req.company_id,
      template_id: template._id,
      template_snapshot: template.toObject(),
      status: 'new',
      payload,
      recipients: documentRecipients,
      expires_at: expiresAt,
      callback_url: callback_url || template.notification_config?.callback_url,
      callback_status: callback_url ? 'pending' : undefined,
      idempotency_key: req.idempotencyKey,
      created_by: {
        type: 'api',
        id: req.api_key._id.toString(),
      },
    });
    
    // Generate tokens for recipients (Req 7.7)
    for (const recipient of document.recipients) {
      const token = tokenService.generateToken(
        {
          documentId: document._id.toString(),
          recipientId: recipient._id.toString(),
          email: recipient.email,
          companyId: req.company_id.toString(), // Include company ID in token
        },
        'signing',
        `${template.link_expiry.value}${template.link_expiry.unit.charAt(0)}`
      );
      
      recipient.token = token;
      recipient.token_expires_at = expiresAt;
      
      // Set initial status based on signature type
      if (template.signature_type === 'hierarchy') {
        recipient.status = recipient.signature_order === 1 ? 'active' : 'pending';
      } else {
        recipient.status = 'active';
      }
    }
    
    await document.save();
    
    // Log document creation
    await auditService.logDocumentEvent(req, 'document.created', document, {
      api_key_prefix: req.api_key.key_prefix,
      template_name: template.name,
    });
    
    // Handle preview mode or immediate distribution (Req 23.1-23.6)
    if (template.preview_mode) {
      // Preview mode: set status to draft_preview, return preview URL
      document.status = 'draft_preview';
      await document.save();
      
      const previewToken = tokenService.generatePreviewToken({
        documentId: document._id.toString(),
        recipientId: 'preview',
        email: 'preview@system',
      });
      
      const response = {
        success: true,
        document_id: document._id.toString(),
        status: 'draft_preview',
        preview_url: `${process.env.FRONTEND_URL}/esign/preview/${previewToken}`,
        message: 'Document created in preview mode. Approval required before distribution.',
      };
      
      const duration = Date.now() - startTime;
      console.log(`Document initiation completed in ${duration}ms`);
      
      return res.status(201).json(response);
    } else {
      // Immediate distribution: send notifications, set status to distributed
      document.status = 'distributed';
      await document.save();
      
      // Send notifications asynchronously (don't wait)
      sendDocumentNotifications(req, document, template).catch(error => {
        console.error('Error sending notifications:', error);
      });
      
      // Generate short links if enabled
      const shortLinkService = require('../services/esign/shortLink.service');
      const recipientUrls = [];
      
      for (const recipient of document.recipients) {
        const recipientUrl = {
          email: recipient.email,
          name: recipient.name,
          signing_url: `${process.env.FRONTEND_URL}/sign/${recipient.token}`,
        };
        
        // Generate short link if enabled
        if (template.short_link_enabled) {
          try {
            const shortCode = await shortLinkService.createShortLink(
              req,
              document._id.toString(),
              recipient._id.toString(),
              recipient.token,
              expiresAt
            );
            recipientUrl.short_url = `${process.env.FRONTEND_URL}/s/${shortCode}`;
          } catch (error) {
            console.error('Failed to generate short link:', error);
            // Continue without short link
          }
        }
        
        recipientUrls.push(recipientUrl);
      }
      
      const response = {
        success: true,
        document_id: document._id.toString(),
        status: 'distributed',
        recipients: recipientUrls,
        expires_at: expiresAt.toISOString(),
        message: 'Document created and distributed successfully',
      };
      
      const duration = Date.now() - startTime;
      console.log(`Document initiation completed in ${duration}ms`);
      
      // Ensure completion within 5 seconds (Req 7.12)
      if (duration > 5000) {
        console.warn(`Document initiation took ${duration}ms, exceeding 5 second target`);
      }
      
      return res.status(201).json(response);
    }
  } catch (error) {
    console.error('Document initiation error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Document initiation failed',
      message: error.message,
    });
  }
};

/**
 * Get Document Status
 * GET /api/v1/esign/documents/:id/status
 * 
 * Requirements: 47.1-47.5
 */
exports.getDocumentStatus = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { id } = req.params;
    
    const EsignDocument = req.getModel('EsignDocument');
    
    // Find document
    const document = await EsignDocument.findOne({
      _id: id,
      company_id: req.company_id,
    });
    
    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
      });
    }
    
    // Build recipient status (Req 47.2)
    const recipientStatus = document.recipients.map(recipient => ({
      email: recipient.email,
      name: recipient.name,
      signature_order: recipient.signature_order,
      status: recipient.status,
      signed_at: recipient.signed_at,
      opened_at: recipient.status === 'opened' ? recipient.updatedAt : undefined,
    }));
    
    // Build response (Req 47.1, 47.3, 47.4)
    const response = {
      success: true,
      document_id: document._id.toString(),
      status: document.status,
      recipients: recipientStatus,
      created_at: document.createdAt,
      expires_at: document.expires_at,
      completed_at: document.completed_at,
      pdf_url: document.status === 'completed' ? document.pdf_url : undefined,
      certificate_url: document.status === 'completed' ? document.certificate_url : undefined,
    };
    
    const duration = Date.now() - startTime;
    
    // Ensure response within 500ms (Req 47.5)
    if (duration > 500) {
      console.warn(`Status polling took ${duration}ms, exceeding 500ms target`);
    }
    
    return res.status(200).json(response);
  } catch (error) {
    console.error('Get document status error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve document status',
      message: error.message,
    });
  }
};

/**
 * Download Document
 * GET /api/v1/esign/documents/:id/download
 * 
 * Requirements: 18.1, 18.2, 18.6, 18.7
 */
exports.downloadDocument = async (req, res) => {
  try {
    const { id } = req.params;
    
    const EsignDocument = req.getModel('EsignDocument');
    
    // Find document
    const document = await EsignDocument.findOne({
      _id: id,
      company_id: req.company_id,
    });
    
    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
      });
    }
    
    // Check if document is completed
    if (document.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Document not completed',
        message: 'Only completed documents can be downloaded',
        current_status: document.status,
      });
    }
    
    // Check if PDF exists
    if (!document.pdf_url) {
      return res.status(404).json({
        success: false,
        error: 'PDF not available',
        message: 'The signed PDF has not been generated yet',
      });
    }
    
    // Log download request
    await auditService.logPDFEvent(req, 'pdf.downloaded', document, {
      api_key_prefix: req.api_key.key_prefix,
    });
    
    // Return PDF URL (presigned URL generation would be handled by storage service)
    return res.status(200).json({
      success: true,
      document_id: document._id.toString(),
      pdf_url: document.pdf_url,
      pdf_hash: document.pdf_hash,
      certificate_url: document.certificate_url,
    });
  } catch (error) {
    console.error('Download document error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to download document',
      message: error.message,
    });
  }
};

/**
 * Cancel Document
 * POST /api/v1/esign/documents/:id/cancel
 * 
 * Requirements: 17.1-17.5
 */
exports.cancelDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const EsignDocument = req.getModel('EsignDocument');
    
    // Find document
    const document = await EsignDocument.findOne({
      _id: id,
      company_id: req.company_id,
    });
    
    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
      });
    }
    
    // Check if document can be cancelled
    if (document.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel completed document',
        message: 'Completed documents cannot be cancelled',
      });
    }
    
    if (['cancelled', 'rejected', 'expired'].includes(document.status)) {
      return res.status(400).json({
        success: false,
        error: 'Document already terminated',
        message: `Document is already in ${document.status} status`,
      });
    }
    
    // Update document status
    document.status = 'cancelled';
    await document.save();
    
    // Invalidate all recipient tokens (handled by status check in signing page)
    
    // Log cancellation
    await auditService.logDocumentEvent(req, 'document.cancelled', document, {
      api_key_prefix: req.api_key.key_prefix,
      reason: reason || 'Cancelled via API',
    });
    
    // Send cancellation notifications asynchronously
    sendCancellationNotifications(req, document).catch(error => {
      console.error('Error sending cancellation notifications:', error);
    });
    
    return res.status(200).json({
      success: true,
      document_id: document._id.toString(),
      status: 'cancelled',
      message: 'Document cancelled successfully',
    });
  } catch (error) {
    console.error('Cancel document error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to cancel document',
      message: error.message,
    });
  }
};

/**
 * Get Template Schema
 * GET /api/v1/esign/templates/:id/schema
 * 
 * Requirements: 26.1-26.5
 */
exports.getTemplateSchema = async (req, res) => {
  try {
    const { id } = req.params;
    
    const EsignTemplate = req.getModel('EsignTemplate');
    
    // Find template
    const template = await EsignTemplate.findOne({
      _id: id,
      company_id: req.company_id,
      is_deleted: false,
    });
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }
    
    // Build schema
    const schema = {
      template_id: template._id.toString(),
      template_name: template.name,
      signature_type: template.signature_type,
      delimiters: template.delimiters.map(delimiter => ({
        key: delimiter.key,
        type: delimiter.type,
        required: delimiter.required,
        default_value: delimiter.default_value,
        example: generateExampleValue(delimiter.type),
      })),
      recipients: template.recipients.map(recipient => ({
        signature_order: recipient.signature_order,
        label: recipient.label,
        recipient_type: recipient.recipient_type,
      })),
    };
    
    return res.status(200).json({
      success: true,
      schema,
    });
  } catch (error) {
    console.error('Get template schema error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve template schema',
      message: error.message,
    });
  }
};

/**
 * Initiate Bulk Documents
 * POST /api/v1/esign/bulk/initiate
 * 
 * Requirements: 81.1-81.10
 */
exports.initiateBulkDocuments = async (req, res) => {
  try {
    const { template_id, column_mapping, callback_url } = req.body;
    
    // Validate required fields
    if (!template_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: template_id',
      });
    }
    
    if (!column_mapping || typeof column_mapping !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid column_mapping',
        message: 'column_mapping must be an object mapping CSV columns to delimiter keys',
      });
    }
    
    // Check if CSV file is uploaded
    if (!req.files || !req.files.csv_file) {
      return res.status(400).json({
        success: false,
        error: 'Missing CSV file',
        message: 'Please upload a CSV file with key "csv_file"',
      });
    }
    
    const csvFile = req.files.csv_file;
    
    // Validate file type
    if (!csvFile.name.endsWith('.csv')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file type',
        message: 'Only CSV files are supported',
      });
    }
    
    // Get models
    const EsignTemplate = req.getModel('EsignTemplate');
    const EsignBulkJob = req.getModel('EsignBulkJob');
    
    // Validate template exists and is active
    const template = await EsignTemplate.findOne({
      _id: template_id,
      company_id: req.company_id,
      is_deleted: false,
    });
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }
    
    if (template.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Template is not active',
      });
    }
    
    // Parse CSV file
    const csvData = csvFile.data.toString('utf8');
    const rows = parseCSV(csvData);
    
    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Empty CSV file',
        message: 'The CSV file contains no data rows',
      });
    }
    
    // Create bulk job (Req 81.3)
    const bulkJob = await EsignBulkJob.create({
      company_id: req.company_id,
      template_id: template._id,
      name: `Bulk Job - ${template.name} - ${new Date().toISOString()}`,
      status: 'queued',
      total_items: rows.length,
      processed_items: 0,
      successful_items: 0,
      failed_items: 0,
      items: rows.map((row, index) => ({
        row_number: index + 1,
        status: 'pending',
        payload: mapRowToPayload(row, column_mapping),
      })),
      csv_file_name: csvFile.name,
      created_by: {
        type: 'api',
        id: req.api_key._id.toString(),
      },
    });
    
    // Log bulk job creation
    await auditService.logEvent(req, {
      event_type: 'bulk_job.created',
      actor: {
        type: 'api',
        api_key_prefix: req.api_key.key_prefix,
      },
      resource: {
        type: 'bulk_job',
        id: bulkJob._id.toString(),
      },
      action: 'Bulk job created',
      metadata: {
        template_id: template._id.toString(),
        total_items: rows.length,
      },
    });
    
    // Process bulk job asynchronously (Req 81.4)
    processBulkJob(req, bulkJob, template, callback_url).catch(error => {
      console.error('Error processing bulk job:', error);
    });
    
    return res.status(201).json({
      success: true,
      job_id: bulkJob._id.toString(),
      status: 'queued',
      total_items: bulkJob.total_items,
      message: 'Bulk job created and queued for processing',
    });
  } catch (error) {
    console.error('Bulk initiation error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Bulk initiation failed',
      message: error.message,
    });
  }
};

/**
 * Get Bulk Job Status
 * GET /api/v1/esign/bulk/:jobId/status
 * 
 * Requirements: 81.1-81.10
 */
exports.getBulkJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const EsignBulkJob = req.getModel('EsignBulkJob');
    
    // Find bulk job
    const bulkJob = await EsignBulkJob.findOne({
      _id: jobId,
      company_id: req.company_id,
    }).lean();
    
    if (!bulkJob) {
      return res.status(404).json({
        success: false,
        error: 'Bulk job not found',
      });
    }
    
    // Build response (Req 81.6)
    const response = {
      success: true,
      job_id: bulkJob._id.toString(),
      status: bulkJob.status,
      total_items: bulkJob.total_items,
      processed_items: bulkJob.processed_items,
      successful_items: bulkJob.successful_items,
      failed_items: bulkJob.failed_items,
      progress_percentage: Math.round((bulkJob.processed_items / bulkJob.total_items) * 100),
      created_at: bulkJob.createdAt,
      started_at: bulkJob.started_at,
      completed_at: bulkJob.completed_at,
      errors: bulkJob.items
        .filter(item => item.status === 'failed')
        .map(item => ({
          row_number: item.row_number,
          error: item.error_message,
        })),
    };
    
    return res.status(200).json(response);
  } catch (error) {
    console.error('Get bulk job status error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve bulk job status',
      message: error.message,
    });
  }
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate delimiter types
 */
function validateDelimiterTypes(delimiters, payload) {
  const errors = [];
  
  for (const delimiter of delimiters) {
    const value = payload[delimiter.key];
    
    // Skip validation if value is empty and not required
    if (!value && !delimiter.required) {
      continue;
    }
    
    switch (delimiter.type) {
      case 'email':
        if (!isValidEmail(value)) {
          errors.push({
            delimiter: delimiter.key,
            type: 'email',
            message: `Invalid email format for ${delimiter.key}`,
          });
        }
        break;
      
      case 'phone':
        if (!isValidPhone(value)) {
          errors.push({
            delimiter: delimiter.key,
            type: 'phone',
            message: `Invalid phone format for ${delimiter.key}`,
          });
        }
        break;
      
      case 'date':
        if (!isValidDate(value)) {
          errors.push({
            delimiter: delimiter.key,
            type: 'date',
            message: `Invalid date format for ${delimiter.key}`,
          });
        }
        break;
      
      case 'number':
        if (!isValidNumber(value)) {
          errors.push({
            delimiter: delimiter.key,
            type: 'number',
            message: `Invalid number format for ${delimiter.key}`,
          });
        }
        break;
    }
  }
  
  return errors;
}

/**
 * Prepare recipients from template configuration
 */
function prepareRecipients(template, recipientsOverride) {
  // If recipients are provided in request, use them
  // Otherwise, use template configuration
  
  if (recipientsOverride && Array.isArray(recipientsOverride)) {
    return recipientsOverride.map((recipient, index) => ({
      email: recipient.email,
      phone: recipient.phone,
      name: recipient.name,
      signature_order: recipient.signature_order || index + 1,
      status: 'pending',
    }));
  }
  
  // Use template recipients configuration
  return template.recipients.map(recipientConfig => ({
    email: '', // Will be filled from payload
    phone: '',
    name: recipientConfig.label,
    signature_order: recipientConfig.signature_order,
    status: 'pending',
  }));
}

/**
 * Send document notifications
 */
async function sendDocumentNotifications(req, document, template) {
  try {
    // Get active email provider
    const EsignProviderConfig = req.getModel('EsignProviderConfig');
    const emailProvider = await EsignProviderConfig.findOne({
      company_id: req.company_id,
      provider_type: 'email',
      is_active: true,
    });
    
    if (!emailProvider) {
      console.log('No active email provider configured');
      return;
    }
    
    // Decrypt credentials
    const credentials = encryptionService.decryptCredentials(emailProvider.credentials);
    
    // Send notification to each active recipient
    for (const recipient of document.recipients) {
      if (recipient.status === 'active') {
        const emailData = {
          to: recipient.email,
          subject: template.notification_config?.custom_email_subject || 'Document Ready for Signature',
          html: buildNotificationEmail(document, recipient, template),
          from: credentials.from_email || credentials.username,
        };
        
        await notificationService.sendWithRetry(
          () => notificationService.sendEmail(emailProvider.provider, credentials, emailProvider.settings, emailData),
          3,
          'exponential'
        );
        
        await auditService.logNotificationEvent(req, 'notification.sent', document, {
          recipient_email: recipient.email,
          notification_type: 'document_created',
        });
      }
    }
  } catch (error) {
    console.error('Error sending document notifications:', error);
    await auditService.logNotificationEvent(req, 'notification.failed', document, {
      error: error.message,
    });
  }
}

/**
 * Send cancellation notifications
 */
async function sendCancellationNotifications(req, document) {
  try {
    // Similar to sendDocumentNotifications but for cancellation
    console.log('Sending cancellation notifications for document:', document._id);
    // Implementation would be similar to sendDocumentNotifications
  } catch (error) {
    console.error('Error sending cancellation notifications:', error);
  }
}

/**
 * Build notification email HTML
 */
function buildNotificationEmail(document, recipient, template) {
  const signingUrl = `${process.env.FRONTEND_URL}/sign/${recipient.token}`;
  
  return `
    <html>
      <body>
        <h2>Document Ready for Signature</h2>
        <p>Hello ${recipient.name},</p>
        <p>You have been requested to sign a document.</p>
        <p><strong>Document:</strong> ${template.name}</p>
        <p><strong>Expires:</strong> ${document.expires_at.toLocaleString()}</p>
        <p>
          <a href="${signingUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Sign Document
          </a>
        </p>
        <p>Or copy this link: ${signingUrl}</p>
      </body>
    </html>
  `;
}

/**
 * Generate short code for short links
 */
function generateShortCode() {
  return crypto.randomBytes(4).toString('hex');
}

/**
 * Generate example value for delimiter type
 */
function generateExampleValue(type) {
  switch (type) {
    case 'email':
      return 'john.doe@example.com';
    case 'phone':
      return '+1234567890';
    case 'date':
      return '2024-01-15';
    case 'number':
      return '12345';
    case 'text':
    default:
      return 'Sample text';
  }
}

/**
 * Validation helper functions
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPhone(phone) {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
}

function isValidDate(date) {
  const parsedDate = new Date(date);
  return !isNaN(parsedDate.getTime());
}

function isValidNumber(value) {
  return !isNaN(parseFloat(value)) && isFinite(value);
}

/**
 * Parse CSV file
 * @param {string} csvData - CSV file content
 * @returns {Array<Object>} Array of row objects
 */
function parseCSV(csvData) {
  const lines = csvData.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    return [];
  }
  
  // Parse header row
  const headers = lines[0].split(',').map(h => h.trim());
  
  // Parse data rows
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    rows.push(row);
  }
  
  return rows;
}

/**
 * Map CSV row to payload using column mapping
 * @param {Object} row - CSV row object
 * @param {Object} columnMapping - Column mapping (CSV column -> delimiter key)
 * @returns {Object} Payload object
 */
function mapRowToPayload(row, columnMapping) {
  const payload = {};
  
  for (const [csvColumn, delimiterKey] of Object.entries(columnMapping)) {
    payload[delimiterKey] = row[csvColumn] || '';
  }
  
  return payload;
}

/**
 * Process bulk job asynchronously
 * @param {Object} req - Express request object
 * @param {Object} bulkJob - Bulk job object
 * @param {Object} template - Template object
 * @param {string} callbackUrl - Callback URL (optional)
 */
async function processBulkJob(req, bulkJob, template, callbackUrl) {
  try {
    const EsignBulkJob = req.getModel('EsignBulkJob');
    const EsignDocument = req.getModel('EsignDocument');
    
    // Update job status to processing
    bulkJob.status = 'processing';
    bulkJob.started_at = new Date();
    await bulkJob.save();
    
    // Process each item (Req 81.5)
    for (const item of bulkJob.items) {
      try {
        item.status = 'processing';
        await bulkJob.save();
        
        // Validate payload
        const validationErrors = validateDelimiterTypes(template.delimiters, item.payload);
        if (validationErrors.length > 0) {
          throw new Error(`Validation failed: ${validationErrors.map(e => e.message).join(', ')}`);
        }
        
        // Calculate expiration
        const expiresAt = tokenService.calculateExpiry(
          template.link_expiry.value,
          template.link_expiry.unit
        );
        
        // Create document (Req 81.5)
        const document = await EsignDocument.create({
          company_id: req.company_id,
          template_id: template._id,
          template_snapshot: template.toObject(),
          status: 'new',
          payload: item.payload,
          recipients: prepareRecipients(template, null),
          expires_at: expiresAt,
          callback_url: callbackUrl,
          bulk_job_id: bulkJob._id,
          created_by: {
            type: 'api',
            id: req.api_key._id.toString(),
          },
        });
        
        // Generate tokens for recipients
        for (const recipient of document.recipients) {
          const token = tokenService.generateToken(
            {
              documentId: document._id.toString(),
              recipientId: recipient._id.toString(),
              email: recipient.email,
            },
            'signing',
            `${template.link_expiry.value}${template.link_expiry.unit.charAt(0)}`
          );
          
          recipient.token = token;
          recipient.token_expires_at = expiresAt;
          recipient.status = template.signature_type === 'hierarchy' && recipient.signature_order !== 1 
            ? 'pending' 
            : 'active';
        }
        
        await document.save();
        
        // Update item status
        item.status = 'completed';
        item.document_id = document._id;
        item.processed_at = new Date();
        
        bulkJob.processed_items++;
        bulkJob.successful_items++;
        await bulkJob.save();
        
        // Send notifications if not in preview mode
        if (!template.preview_mode) {
          document.status = 'distributed';
          await document.save();
          
          // Send notifications asynchronously
          sendDocumentNotifications(req, document, template).catch(error => {
            console.error('Error sending notifications:', error);
          });
        }
      } catch (error) {
        console.error(`Error processing bulk job item ${item.row_number}:`, error);
        
        // Update item status (Req 81.7)
        item.status = 'failed';
        item.error_message = error.message;
        item.processed_at = new Date();
        
        bulkJob.processed_items++;
        bulkJob.failed_items++;
        await bulkJob.save();
      }
    }
    
    // Update job status to completed (Req 81.8)
    bulkJob.status = bulkJob.failed_items === 0 ? 'completed' : 'failed';
    bulkJob.completed_at = new Date();
    await bulkJob.save();
    
    // Send webhook notification (Req 81.9)
    if (callbackUrl) {
      const webhookService = require('../services/esign/webhook.service');
      await webhookService.sendBulkJobCompletedWebhook(
        bulkJob,
        callbackUrl,
        req.api_key.hashed_secret
      );
    }
    
    // Log completion
    await auditService.logEvent(req, {
      event_type: 'bulk_job.completed',
      actor: {
        type: 'system',
      },
      resource: {
        type: 'bulk_job',
        id: bulkJob._id.toString(),
      },
      action: 'Bulk job completed',
      metadata: {
        total_items: bulkJob.total_items,
        successful_items: bulkJob.successful_items,
        failed_items: bulkJob.failed_items,
      },
    });
  } catch (error) {
    console.error('Error processing bulk job:', error);
    
    // Update job status to failed
    const EsignBulkJob = req.getModel('EsignBulkJob');
    await EsignBulkJob.updateOne(
      { _id: bulkJob._id },
      {
        status: 'failed',
        error_summary: error.message,
        completed_at: new Date(),
      }
    );
  }
}

module.exports = exports;
