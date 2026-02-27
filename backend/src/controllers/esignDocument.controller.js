const auditService = require('../services/esign/audit.service');
const notificationService = require('../services/esign/notification.service');
const encryptionService = require('../services/esign/encryption.service');
const tokenService = require('../services/esign/token.service');

/**
 * E-Sign Document Controller
 * 
 * Handles document management operations for company admins
 * Requires auth, tenantContext, and moduleAccess middleware
 */

/**
 * Approve Preview Document
 * POST /api/company/esign/documents/:id/approve
 * 
 * Requirements: 23.4, 23.5
 */
exports.approveDocument = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check user role (Company_Admin only)
    if (!['company_super_admin', 'company_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Only company admins can approve documents',
      });
    }
    
    const EsignDocument = req.getModel('EsignDocument');
    
    // Find document
    const document = await EsignDocument.findOne({
      _id: id,
      company_id: req.user.company_id,
    });
    
    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
      });
    }
    
    // Check if document is in draft_preview status
    if (document.status !== 'draft_preview') {
      return res.status(400).json({
        success: false,
        error: 'Invalid document status',
        message: 'Only documents in draft_preview status can be approved',
        current_status: document.status,
      });
    }
    
    // Update status to distributed
    document.status = 'distributed';
    await document.save();
    
    // Log approval
    await auditService.logDocumentEvent(req, 'document.approved', document, {
      approved_by: req.user.email,
    });
    
    // Send notifications to all active recipients
    await sendDocumentNotifications(req, document);
    
    return res.status(200).json({
      success: true,
      document_id: document._id.toString(),
      status: 'distributed',
      message: 'Document approved and distributed successfully',
    });
  } catch (error) {
    console.error('Approve document error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to approve document',
      message: error.message,
    });
  }
};

/**
 * Reject Preview Document
 * POST /api/company/esign/documents/:id/reject
 * 
 * Requirements: 23.6
 */
exports.rejectDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    // Check user role (Company_Admin only)
    if (!['company_super_admin', 'company_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Only company admins can reject documents',
      });
    }
    
    const EsignDocument = req.getModel('EsignDocument');
    
    // Find document
    const document = await EsignDocument.findOne({
      _id: id,
      company_id: req.user.company_id,
    });
    
    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
      });
    }
    
    // Check if document is in draft_preview status
    if (document.status !== 'draft_preview') {
      return res.status(400).json({
        success: false,
        error: 'Invalid document status',
        message: 'Only documents in draft_preview status can be rejected',
        current_status: document.status,
      });
    }
    
    // Update status to cancelled
    document.status = 'cancelled';
    document.error_reason = reason || 'Rejected during preview';
    await document.save();
    
    // Log rejection
    await auditService.logDocumentEvent(req, 'document.rejected', document, {
      rejected_by: req.user.email,
      reason: reason || 'No reason provided',
    });
    
    return res.status(200).json({
      success: true,
      document_id: document._id.toString(),
      status: 'cancelled',
      message: 'Document rejected successfully',
    });
  } catch (error) {
    console.error('Reject document error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to reject document',
      message: error.message,
    });
  }
};

/**
 * List Documents
 * GET /api/company/esign/documents
 * 
 * Requirements: 15.1-15.9, 54.1-54.7
 */
exports.listDocuments = async (req, res) => {
  try {
    const {
      status,
      template_id,
      recipient_email,
      date_from,
      date_to,
      page = 1,
      limit = 20,
      sort_by = 'createdAt',
      sort_order = 'desc',
    } = req.query;
    
    const EsignDocument = req.getModel('EsignDocument');
    
    // Build query
    const query = {
      company_id: req.user.company_id,
    };
    
    if (status) {
      query.status = Array.isArray(status) ? { $in: status } : status;
    }
    
    if (template_id) {
      query.template_id = template_id;
    }
    
    if (recipient_email) {
      query['recipients.email'] = { $regex: recipient_email, $options: 'i' };
    }
    
    if (date_from || date_to) {
      query.createdAt = {};
      if (date_from) query.createdAt.$gte = new Date(date_from);
      if (date_to) query.createdAt.$lte = new Date(date_to);
    }
    
    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = { [sort_by]: sort_order === 'asc' ? 1 : -1 };
    
    const [documents, total] = await Promise.all([
      EsignDocument.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      EsignDocument.countDocuments(query),
    ]);
    
    return res.status(200).json({
      success: true,
      documents,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('List documents error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to list documents',
      message: error.message,
    });
  }
};

/**
 * Get Document Details
 * GET /api/company/esign/documents/:id
 * 
 * Requirements: 15.6
 */
exports.getDocument = async (req, res) => {
  try {
    const { id } = req.params;
    
    const EsignDocument = req.getModel('EsignDocument');
    
    const document = await EsignDocument.findOne({
      _id: id,
      company_id: req.user.company_id,
    }).lean();
    
    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
      });
    }
    
    return res.status(200).json({
      success: true,
      document,
    });
  } catch (error) {
    console.error('Get document error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve document',
      message: error.message,
    });
  }
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Send document notifications to all active recipients
 */
async function sendDocumentNotifications(req, document) {
  try {
    // Get template from snapshot
    const template = document.template_snapshot;
    
    // Get active email provider
    const EsignProviderConfig = req.getModel('EsignProviderConfig');
    const emailProvider = await EsignProviderConfig.findOne({
      company_id: req.user.company_id,
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
        const signingUrl = `${process.env.FRONTEND_URL}/sign/${recipient.token}`;
        
        const emailData = {
          to: recipient.email,
          subject: template.notification_config?.custom_email_subject || 'Document Ready for Signature',
          html: buildNotificationEmail(document, recipient, template, signingUrl),
          from: credentials.from_email || credentials.username,
        };
        
        await notificationService.sendWithRetry(
          () => notificationService.sendEmail(emailProvider.provider, credentials, emailProvider.settings, emailData),
          3,
          'exponential'
        );
        
        await auditService.logNotificationEvent(req, 'notification.sent', document, {
          recipient_email: recipient.email,
          notification_type: 'document_distributed',
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
 * Build notification email HTML
 */
function buildNotificationEmail(document, recipient, template, signingUrl) {
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

module.exports = exports;

/**
 * Verify PDF Integrity
 * GET /api/company/esign/documents/:id/verify
 * 
 * Requirements: 12.7, 12.8, 30.1-30.7
 */
exports.verifyDocument = async (req, res) => {
  try {
    const { id } = req.params;
    
    const pdfService = require('../services/esign/pdf.service');
    
    // Verify PDF integrity
    const verificationResult = await pdfService.verifyPdfIntegrity(id, req);
    
    return res.status(200).json({
      success: true,
      verification: verificationResult,
    });
  } catch (error) {
    console.error('Verify document error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to verify document',
      message: error.message,
    });
  }
};

/**
 * Download Evidence Package
 * GET /api/company/esign/documents/:id/evidence-package
 * 
 * Requirements: 86.1-86.5
 */
exports.downloadEvidencePackage = async (req, res) => {
  try {
    const { id } = req.params;
    
    const evidencePackageService = require('../services/esign/evidencePackage.service');
    
    // Generate evidence package
    const zipBuffer = await evidencePackageService.generateEvidencePackage(id, req);
    
    // Set response headers for file download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="evidence_package_${id}.zip"`);
    res.setHeader('Content-Length', zipBuffer.length);
    
    return res.send(zipBuffer);
  } catch (error) {
    console.error('Download evidence package error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to generate evidence package',
      message: error.message,
    });
  }
};

/**
 * Resend Document
 * POST /api/company/esign/documents/:id/resend
 * 
 * Requirements: 16.1-16.6
 */
exports.resendDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { recipient_id } = req.body;
    
    const EsignDocument = req.getModel('EsignDocument');
    
    // Find document
    const document = await EsignDocument.findOne({
      _id: id,
      company_id: req.user.company_id,
    });
    
    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
      });
    }
    
    // Check if document can be resent
    if (['completed', 'cancelled', 'expired'].includes(document.status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid document status',
        message: `Cannot resend document with status: ${document.status}`,
      });
    }
    
    // Find recipient
    const recipient = document.recipients.id(recipient_id);
    
    if (!recipient) {
      return res.status(404).json({
        success: false,
        error: 'Recipient not found',
      });
    }
    
    // Generate new token (respecting original expiry)
    const newToken = tokenService.generateToken({
      documentId: document._id.toString(),
      recipientId: recipient._id.toString(),
      email: recipient.email,
    });
    
    // Invalidate old token and set new one
    recipient.token = newToken;
    recipient.token_expires_at = document.expires_at;
    await document.save();
    
    // Send notification
    const signingUrl = `${process.env.FRONTEND_URL}/sign/${newToken}`;
    
    const EsignProviderConfig = req.getModel('EsignProviderConfig');
    const emailProvider = await EsignProviderConfig.findOne({
      company_id: req.user.company_id,
      provider_type: 'email',
      is_active: true,
    });
    
    if (emailProvider) {
      const credentials = encryptionService.decrypt(emailProvider.credentials);
      
      const emailData = {
        to: recipient.email,
        subject: 'Document Resent - Action Required',
        html: `
          <html>
            <body>
              <h2>Document Resent</h2>
              <p>Hello ${recipient.name},</p>
              <p>This is a reminder to sign the document: ${document.template_snapshot?.name}</p>
              <p><strong>Expires:</strong> ${document.expires_at.toLocaleString()}</p>
              <p>
                <a href="${signingUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                  Sign Document
                </a>
              </p>
            </body>
          </html>
        `,
        from: credentials.from_email || credentials.username,
      };
      
      await notificationService.sendEmail(emailProvider.provider, credentials, emailProvider.settings, emailData);
    }
    
    // Log resend
    await auditService.logDocumentEvent(req, 'document.resent', document, {
      recipient_email: recipient.email,
      resent_by: req.user.email,
    });
    
    return res.status(200).json({
      success: true,
      message: 'Document resent successfully',
      recipient_email: recipient.email,
    });
  } catch (error) {
    console.error('Resend document error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to resend document',
      message: error.message,
    });
  }
};

/**
 * Send Reminder
 * POST /api/company/esign/documents/:id/remind
 * 
 * Requirements: 16.4
 */
exports.remindDocument = async (req, res) => {
  try {
    const { id } = req.params;
    
    const EsignDocument = req.getModel('EsignDocument');
    
    // Find document
    const document = await EsignDocument.findOne({
      _id: id,
      company_id: req.user.company_id,
    });
    
    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
      });
    }
    
    // Get pending recipients
    const pendingRecipients = document.recipients.filter(r => 
      ['pending', 'active', 'opened'].includes(r.status)
    );
    
    if (pendingRecipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No pending recipients',
        message: 'All recipients have already signed or document is not active',
      });
    }
    
    // Send reminders
    const EsignProviderConfig = req.getModel('EsignProviderConfig');
    const emailProvider = await EsignProviderConfig.findOne({
      company_id: req.user.company_id,
      provider_type: 'email',
      is_active: true,
    });
    
    if (emailProvider) {
      const credentials = encryptionService.decrypt(emailProvider.credentials);
      
      for (const recipient of pendingRecipients) {
        const signingUrl = `${process.env.FRONTEND_URL}/sign/${recipient.token}`;
        
        const emailData = {
          to: recipient.email,
          subject: 'Reminder: Document Awaiting Signature',
          html: `
            <html>
              <body>
                <h2>Reminder: Document Awaiting Signature</h2>
                <p>Hello ${recipient.name},</p>
                <p>This is a reminder that you have a document waiting for your signature.</p>
                <p><strong>Document:</strong> ${document.template_snapshot?.name}</p>
                <p><strong>Expires:</strong> ${document.expires_at.toLocaleString()}</p>
                <p>
                  <a href="${signingUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                    Sign Document
                  </a>
                </p>
              </body>
            </html>
          `,
          from: credentials.from_email || credentials.username,
        };
        
        await notificationService.sendEmail(emailProvider.provider, credentials, emailProvider.settings, emailData);
      }
    }
    
    // Log reminder
    await auditService.logDocumentEvent(req, 'document.reminded', document, {
      reminded_by: req.user.email,
      recipient_count: pendingRecipients.length,
    });
    
    return res.status(200).json({
      success: true,
      message: 'Reminders sent successfully',
      recipient_count: pendingRecipients.length,
    });
  } catch (error) {
    console.error('Remind document error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to send reminders',
      message: error.message,
    });
  }
};

/**
 * Cancel Document
 * POST /api/company/esign/documents/:id/cancel
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
      company_id: req.user.company_id,
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
      });
    }
    
    // Update status
    document.status = 'cancelled';
    document.error_reason = reason || 'Cancelled by admin';
    
    // Invalidate all recipient tokens
    document.recipients.forEach(recipient => {
      recipient.token = null;
      recipient.token_expires_at = null;
    });
    
    await document.save();
    
    // Send cancellation notifications
    const pendingRecipients = document.recipients.filter(r => 
      ['pending', 'active', 'opened'].includes(r.status)
    );
    
    const EsignProviderConfig = req.getModel('EsignProviderConfig');
    const emailProvider = await EsignProviderConfig.findOne({
      company_id: req.user.company_id,
      provider_type: 'email',
      is_active: true,
    });
    
    if (emailProvider && pendingRecipients.length > 0) {
      const credentials = encryptionService.decrypt(emailProvider.credentials);
      
      for (const recipient of pendingRecipients) {
        const emailData = {
          to: recipient.email,
          subject: 'Document Cancelled',
          html: `
            <html>
              <body>
                <h2>Document Cancelled</h2>
                <p>Hello ${recipient.name},</p>
                <p>The document "${document.template_snapshot?.name}" has been cancelled.</p>
                ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
                <p>No further action is required from you.</p>
              </body>
            </html>
          `,
          from: credentials.from_email || credentials.username,
        };
        
        await notificationService.sendEmail(emailProvider.provider, credentials, emailProvider.settings, emailData);
      }
    }
    
    // Log cancellation
    await auditService.logDocumentEvent(req, 'document.cancelled', document, {
      cancelled_by: req.user.email,
      reason: reason || 'No reason provided',
    });
    
    return res.status(200).json({
      success: true,
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
 * Download Signed PDF
 * GET /api/company/esign/documents/:id/download
 * 
 * Requirements: 18.1-18.7
 */
exports.downloadDocument = async (req, res) => {
  try {
    const { id } = req.params;
    
    const EsignDocument = req.getModel('EsignDocument');
    
    // Find document
    const document = await EsignDocument.findOne({
      _id: id,
      company_id: req.user.company_id,
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
      });
    }
    
    if (!document.pdf_url) {
      return res.status(404).json({
        success: false,
        error: 'PDF not available',
      });
    }
    
    // Get storage provider
    const StorageAdapterFactory = require('../services/esign/storage/StorageAdapterFactory');
    const encryptionService = require('../services/esign/encryption.service');
    
    const EsignProviderConfig = req.getModel('EsignProviderConfig');
    const storageProvider = await EsignProviderConfig.findOne({
      company_id: req.user.company_id,
      provider_type: 'storage',
      is_active: true,
    });
    
    if (!storageProvider) {
      return res.status(500).json({
        success: false,
        error: 'No active storage provider configured',
      });
    }
    
    // Decrypt credentials
    const credentials = encryptionService.decrypt(storageProvider.credentials);
    
    // Create storage adapter
    const storageAdapter = StorageAdapterFactory.createAdapter(
      storageProvider.provider,
      credentials,
      storageProvider.settings
    );
    
    // Generate presigned URL (1 hour expiry)
    const pathMatch = document.pdf_url.match(/esign\/documents\/[^?]+/);
    const path = pathMatch ? pathMatch[0] : document.pdf_url;
    
    const presignedUrl = await storageAdapter.generatePresignedUrl(path, 3600);
    
    // Log download
    await auditService.logPDFEvent(req, 'pdf.downloaded', document, {
      downloaded_by: req.user.email,
    });
    
    // Redirect to presigned URL
    return res.redirect(presignedUrl);
  } catch (error) {
    console.error('Download document error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to download document',
      message: error.message,
    });
  }
};
