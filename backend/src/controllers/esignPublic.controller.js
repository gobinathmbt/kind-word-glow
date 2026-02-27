const tokenService = require('../services/esign/token.service');
const auditService = require('../services/esign/audit.service');
const otpService = require('../services/esign/otp.service');
const notificationService = require('../services/esign/notification.service');

/**
 * Public E-Sign Controller
 * Handles public signing page operations without authentication
 */

/**
 * Access signing page
 * GET /api/esign/public/sign/:token
 */
const accessSigningPage = async (req, res) => {
  try {
    const { token } = req.params;
    
    // Validate token
    let decoded;
    try {
      decoded = tokenService.validateToken(token);
    } catch (error) {
      if (error.message.includes('expired')) {
        return res.status(401).json({ 
          error: 'This link has expired',
          code: 'TOKEN_EXPIRED'
        });
      }
      return res.status(401).json({ 
        error: 'Invalid or expired link',
        code: 'INVALID_TOKEN'
      });
    }
    
    const { documentId, recipientId, email } = decoded;
    
    // Get document from database
    const EsignDocument = req.getModel('EsignDocument');
    const document = await EsignDocument.findById(documentId);
    
    if (!document) {
      return res.status(404).json({ 
        error: 'Document not found',
        code: 'DOCUMENT_NOT_FOUND'
      });
    }
    
    // Check document status
    if (document.status === 'completed') {
      return res.status(400).json({ 
        error: 'This document has already been signed',
        code: 'DOCUMENT_COMPLETED'
      });
    }
    
    if (document.status === 'cancelled') {
      return res.status(400).json({ 
        error: 'This document has been cancelled',
        code: 'DOCUMENT_CANCELLED'
      });
    }
    
    if (document.status === 'rejected') {
      return res.status(400).json({ 
        error: 'This document has been declined',
        code: 'DOCUMENT_REJECTED'
      });
    }
    
    if (document.status === 'expired') {
      return res.status(400).json({ 
        error: 'This link has expired',
        code: 'DOCUMENT_EXPIRED'
      });
    }
    
    // Find recipient
    const recipient = document.recipients.id(recipientId);
    
    if (!recipient) {
      return res.status(404).json({ 
        error: 'Recipient not found',
        code: 'RECIPIENT_NOT_FOUND'
      });
    }
    
    // Check if recipient has already signed
    if (recipient.status === 'signed') {
      return res.status(400).json({ 
        error: 'You have already signed this document',
        code: 'ALREADY_SIGNED'
      });
    }
    
    // Check if recipient has rejected
    if (recipient.status === 'rejected') {
      return res.status(400).json({ 
        error: 'You have declined this document',
        code: 'ALREADY_REJECTED'
      });
    }
    
    // For hierarchy signature type, check if it's recipient's turn
    const template = document.template_snapshot;
    if (template.signature_type === 'hierarchy') {
      // Check if recipient is active
      if (recipient.status !== 'active' && recipient.status !== 'opened') {
        return res.status(403).json({ 
          error: 'Waiting for previous signer',
          code: 'NOT_YOUR_TURN'
        });
      }
    }
    
    // Update recipient status to 'opened' if currently 'active' or 'pending'
    if (recipient.status === 'active' || recipient.status === 'pending') {
      recipient.status = 'opened';
      await document.save();
    }
    
    // Update document status to 'opened' if currently 'distributed'
    if (document.status === 'distributed') {
      document.status = 'opened';
      await document.save();
    }
    
    // Capture IP address and user agent
    const geoLocationService = require('../services/esign/geoLocation.service');
    const ip_address = geoLocationService.extractIPAddress(req);
    const user_agent = req.get('user-agent');
    
    // Capture geo location (non-blocking, 1-second timeout)
    let geo_location = null;
    try {
      geo_location = await geoLocationService.captureGeoLocationFromRequest(req, 1000);
    } catch (error) {
      console.error('Geo location capture failed:', error);
      // Continue without geo location - don't block document access
    }
    
    // Log token validation attempt
    await auditService.logEvent(req, {
      event_type: 'token.validated',
      actor: {
        type: 'signer',
        email: recipient.email,
      },
      resource: {
        type: 'document',
        id: documentId,
      },
      action: 'Token validated successfully',
      metadata: {
        recipient_id: recipientId,
        ip_address,
        user_agent,
        geo_location,
      },
    });
    
    // Inject delimiter values into HTML
    let html_content = template.html_content;
    for (const [key, value] of Object.entries(document.payload)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html_content = html_content.replace(regex, value || '');
    }
    
    // Return document data
    res.json({
      success: true,
      document: {
        id: document._id,
        html_content,
        status: document.status,
        expires_at: document.expires_at,
      },
      recipient: {
        id: recipient._id,
        email: recipient.email,
        name: recipient.name,
        signature_order: recipient.signature_order,
        status: recipient.status,
      },
      template: {
        name: template.name,
        mfa_config: template.mfa_config,
        require_scroll_completion: template.require_scroll_completion,
        delimiters: template.delimiters.filter(d => d.assigned_to === recipient.signature_order),
      },
    });
    
  } catch (error) {
    console.error('Access signing page error:', error);
    res.status(500).json({ 
      error: 'Failed to access signing page',
      message: error.message 
    });
  }
};

/**
 * Send OTP for MFA
 * POST /api/esign/public/sign/:token/send-otp
 */
const sendOTP = async (req, res) => {
  try {
    const { token } = req.params;
    
    // Validate token
    let decoded;
    try {
      decoded = tokenService.validateToken(token);
    } catch (error) {
      return res.status(401).json({ 
        error: 'Invalid or expired link',
        code: 'INVALID_TOKEN'
      });
    }
    
    const { documentId, recipientId } = decoded;
    
    // Get document
    const EsignDocument = req.getModel('EsignDocument');
    const document = await EsignDocument.findById(documentId);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    const recipient = document.recipients.id(recipientId);
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }
    
    const template = document.template_snapshot;
    
    // Check if MFA is enabled
    if (!template.mfa_config.enabled) {
      return res.status(400).json({ 
        error: 'MFA is not enabled for this document',
        code: 'MFA_NOT_ENABLED'
      });
    }
    
    // Generate and send OTP
    const result = await otpService.generateAndSendOTP(
      req,
      recipientId,
      recipient.email,
      recipient.phone,
      template.mfa_config.channel,
      template.mfa_config.otp_expiry_min
    );
    
    if (!result.success) {
      return res.status(500).json({ 
        error: 'Failed to send OTP',
        message: result.error 
      });
    }
    
    // Log OTP generation
    await auditService.logOTPEvent(req, 'otp.generated', recipientId, {
      channel: template.mfa_config.channel,
      email: recipient.email,
      phone: recipient.phone,
    });
    
    res.json({
      success: true,
      message: 'OTP sent successfully',
      channel: template.mfa_config.channel,
      expires_in: template.mfa_config.otp_expiry_min * 60, // seconds
    });
    
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ 
      error: 'Failed to send OTP',
      message: error.message 
    });
  }
};

/**
 * Verify OTP
 * POST /api/esign/public/sign/:token/verify-otp
 */
const verifyOTP = async (req, res) => {
  try {
    const { token } = req.params;
    const { otp } = req.body;
    
    if (!otp) {
      return res.status(400).json({ error: 'OTP is required' });
    }
    
    // Validate token
    let decoded;
    try {
      decoded = tokenService.validateToken(token);
    } catch (error) {
      return res.status(401).json({ 
        error: 'Invalid or expired link',
        code: 'INVALID_TOKEN'
      });
    }
    
    const { documentId, recipientId } = decoded;
    
    // Verify OTP
    const result = await otpService.verifyOTP(req, recipientId, otp);
    
    if (!result.success) {
      // Log failed verification
      await auditService.logOTPEvent(req, 'otp.verification_failed', recipientId, {
        reason: result.error,
        attempts: result.attempts,
      });
      
      return res.status(400).json({ 
        error: result.error,
        code: result.code,
        attempts_remaining: result.attempts_remaining,
        locked_until: result.locked_until,
      });
    }
    
    // Generate new session token (short-lived, 1 hour)
    const newToken = tokenService.rotateToken(token, 'session');
    
    // Update recipient token in database
    const EsignDocument = req.getModel('EsignDocument');
    const document = await EsignDocument.findById(documentId);
    const recipient = document.recipients.id(recipientId);
    
    recipient.token = newToken;
    recipient.token_expires_at = tokenService.getTokenExpiry(newToken);
    await document.save();
    
    // Log successful verification
    await auditService.logOTPEvent(req, 'otp.verified', recipientId, {
      success: true,
    });
    
    // Log token rotation
    await auditService.logEvent(req, {
      event_type: 'token.rotated',
      actor: {
        type: 'signer',
        email: recipient.email,
      },
      resource: {
        type: 'document',
        id: documentId,
      },
      action: 'Token rotated after OTP verification',
      metadata: {
        recipient_id: recipientId,
        old_token_type: 'signing',
        new_token_type: 'session',
        company_id: document.company_id.toString(),
      },
    });
    
    res.json({
      success: true,
      message: 'OTP verified successfully',
      token: newToken,
    });
    
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ 
      error: 'Failed to verify OTP',
      message: error.message 
    });
  }
};

/**
 * Submit signature
 * POST /api/esign/public/sign/:token/submit
 */
const submitSignature = async (req, res) => {
  try {
    const { token } = req.params;
    const { signature_image, signature_type, intent_confirmation, field_data } = req.body;
    
    // Validate required fields
    if (!signature_image || !signature_type || !intent_confirmation) {
      return res.status(400).json({ 
        error: 'Missing required fields: signature_image, signature_type, intent_confirmation' 
      });
    }
    
    // Validate token
    let decoded;
    try {
      decoded = tokenService.validateToken(token);
    } catch (error) {
      return res.status(401).json({ 
        error: 'Invalid or expired link',
        code: 'INVALID_TOKEN'
      });
    }
    
    const { documentId, recipientId } = decoded;
    
    // Get document
    const EsignDocument = req.getModel('EsignDocument');
    const document = await EsignDocument.findById(documentId);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    const recipient = document.recipients.id(recipientId);
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }
    
    // Check if already signed
    if (recipient.status === 'signed') {
      return res.status(400).json({ 
        error: 'You have already signed this document',
        code: 'ALREADY_SIGNED'
      });
    }
    
    // Capture IP address, user agent, and geo location
    const geoLocationService = require('../services/esign/geoLocation.service');
    const ip_address = geoLocationService.extractIPAddress(req);
    const user_agent = req.get('user-agent');
    
    let geo_location = null;
    try {
      geo_location = await geoLocationService.captureGeoLocationFromRequest(req, 1000);
    } catch (error) {
      console.error('Geo location capture failed:', error);
    }
    
    // Update recipient with signature data
    recipient.signature_image = signature_image;
    recipient.signature_type = signature_type;
    recipient.intent_confirmation = intent_confirmation;
    recipient.signed_at = new Date();
    recipient.ip_address = ip_address;
    recipient.user_agent = user_agent;
    recipient.geo_location = geo_location;
    recipient.status = 'signed';
    
    // Store field data if provided
    if (field_data) {
      // Validate that field data only contains fields assigned to this recipient
      const template = document.template_snapshot;
      const assignedFields = template.delimiters
        .filter(d => d.assigned_to === recipient.signature_order)
        .map(d => d.key);
      
      for (const key of Object.keys(field_data)) {
        if (!assignedFields.includes(key)) {
          return res.status(403).json({ 
            error: `Field '${key}' is not assigned to you`,
            code: 'UNAUTHORIZED_FIELD'
          });
        }
      }
      
      // Merge field data into document payload
      document.payload = { ...document.payload, ...field_data };
    }
    
    // Update document status based on signature type
    const template = document.template_snapshot;
    
    if (template.signature_type === 'single') {
      // Single signature - mark as signed immediately
      document.status = 'signed';
    } else if (template.signature_type === 'hierarchy') {
      // Sequential signing - check if all previous signers have signed
      const allSigned = document.recipients.every(r => 
        r.signature_order <= recipient.signature_order ? r.status === 'signed' : true
      );
      
      if (allSigned) {
        // Find next recipient
        const nextRecipient = document.recipients.find(r => 
          r.signature_order === recipient.signature_order + 1
        );
        
        if (nextRecipient) {
          // Activate next recipient
          nextRecipient.status = 'active';
          document.status = 'partially_signed';
          
          // Generate token for next recipient
          const nextToken = tokenService.generateToken({
            documentId: document._id.toString(),
            recipientId: nextRecipient._id.toString(),
            email: nextRecipient.email,
            companyId: document.company_id.toString(),
          }, 'signing', template.link_expiry);
          
          nextRecipient.token = nextToken;
          nextRecipient.token_expires_at = tokenService.getTokenExpiry(nextToken);
          
          // Send notification to next recipient
          try {
            await notificationService.sendSigningNotification(
              req,
              document,
              nextRecipient,
              nextToken
            );
          } catch (error) {
            console.error('Failed to send notification to next recipient:', error);
          }
        } else {
          // No more recipients - mark as signed
          document.status = 'signed';
        }
      } else {
        document.status = 'partially_signed';
      }
    } else {
      // Multiple or send_to_all - check if all recipients have signed
      const allSigned = document.recipients.every(r => r.status === 'signed');
      
      if (allSigned) {
        document.status = 'signed';
      } else {
        document.status = 'partially_signed';
      }
    }
    
    await document.save();
    
    // Log signature submission
    await auditService.logRecipientEvent(req, 'signature.submitted', document, recipient, {
      signature_type,
      ip_address,
      user_agent,
      geo_location,
    });
    
    res.json({
      success: true,
      message: 'Signature submitted successfully',
      document_status: document.status,
    });
    
  } catch (error) {
    console.error('Submit signature error:', error);
    res.status(500).json({ 
      error: 'Failed to submit signature',
      message: error.message 
    });
  }
};

/**
 * Decline signature
 * POST /api/esign/public/sign/:token/decline
 */
const declineSignature = async (req, res) => {
  try {
    const { token } = req.params;
    const { reason } = req.body;
    
    // Validate token
    let decoded;
    try {
      decoded = tokenService.validateToken(token);
    } catch (error) {
      return res.status(401).json({ 
        error: 'Invalid or expired link',
        code: 'INVALID_TOKEN'
      });
    }
    
    const { documentId, recipientId } = decoded;
    
    // Get document
    const EsignDocument = req.getModel('EsignDocument');
    const document = await EsignDocument.findById(documentId);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    const recipient = document.recipients.id(recipientId);
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }
    
    // Update recipient status
    recipient.status = 'rejected';
    
    // Update document status
    document.status = 'rejected';
    
    // Invalidate all recipient tokens
    document.recipients.forEach(r => {
      r.token = null;
      r.token_expires_at = null;
    });
    
    await document.save();
    
    // Log rejection
    await auditService.logRecipientEvent(req, 'signature.rejected', document, recipient, {
      reason: reason || 'No reason provided',
    });
    
    // Send rejection notifications
    const template = document.template_snapshot;
    if (template.notification_config.send_on_reject) {
      try {
        await notificationService.sendRejectionNotification(req, document, recipient, reason);
      } catch (error) {
        console.error('Failed to send rejection notification:', error);
      }
    }
    
    res.json({
      success: true,
      message: 'Document declined successfully',
    });
    
  } catch (error) {
    console.error('Decline signature error:', error);
    res.status(500).json({ 
      error: 'Failed to decline signature',
      message: error.message 
    });
  }
};

/**
 * Delegate signing
 * POST /api/esign/public/sign/:token/delegate
 */
const delegateSigning = async (req, res) => {
  try {
    const { token } = req.params;
    const { delegate_email, delegate_name, delegate_phone, reason } = req.body;
    
    // Validate required fields
    if (!delegate_email || !delegate_name) {
      return res.status(400).json({ 
        error: 'Missing required fields: delegate_email, delegate_name' 
      });
    }
    
    // Validate token
    let decoded;
    try {
      decoded = tokenService.validateToken(token);
    } catch (error) {
      return res.status(401).json({ 
        error: 'Invalid or expired link',
        code: 'INVALID_TOKEN'
      });
    }
    
    const { documentId, recipientId } = decoded;
    
    // Get document
    const EsignDocument = req.getModel('EsignDocument');
    const document = await EsignDocument.findById(documentId);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    const recipient = document.recipients.id(recipientId);
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }
    
    // Store delegation information
    const originalEmail = recipient.email;
    recipient.delegated_from = originalEmail;
    recipient.delegation_reason = reason || 'No reason provided';
    recipient.email = delegate_email;
    recipient.name = delegate_name;
    if (delegate_phone) {
      recipient.phone = delegate_phone;
    }
    
    // Generate new token for delegate
    const template = document.template_snapshot;
    const delegateToken = tokenService.generateToken({
      documentId: document._id.toString(),
      recipientId: recipient._id.toString(),
      email: delegate_email,
      companyId: document.company_id.toString(),
    }, 'signing', template.link_expiry);
    
    recipient.token = delegateToken;
    recipient.token_expires_at = tokenService.getTokenExpiry(delegateToken);
    
    await document.save();
    
    // Log delegation
    await auditService.logEvent(req, {
      event_type: 'signature.delegated',
      actor: {
        type: 'signer',
        email: originalEmail,
      },
      resource: {
        type: 'recipient',
        id: recipientId,
      },
      action: 'Signing delegated to another person',
      metadata: {
        original_email: originalEmail,
        delegate_email,
        delegate_name,
        reason: reason || 'No reason provided',
      },
    });
    
    // Send notification to delegate
    try {
      await notificationService.sendSigningNotification(
        req,
        document,
        recipient,
        delegateToken
      );
    } catch (error) {
      console.error('Failed to send notification to delegate:', error);
    }
    
    res.json({
      success: true,
      message: 'Signing delegated successfully',
      delegate_email,
    });
    
  } catch (error) {
    console.error('Delegate signing error:', error);
    res.status(500).json({ 
      error: 'Failed to delegate signing',
      message: error.message 
    });
  }
};

/**
 * Mark scroll completion
 * GET /api/esign/public/sign/:token/scroll-complete
 */
const markScrollComplete = async (req, res) => {
  try {
    const { token } = req.params;
    
    // Validate token
    let decoded;
    try {
      decoded = tokenService.validateToken(token);
    } catch (error) {
      return res.status(401).json({ 
        error: 'Invalid or expired link',
        code: 'INVALID_TOKEN'
      });
    }
    
    const { documentId, recipientId } = decoded;
    
    // Get document
    const EsignDocument = req.getModel('EsignDocument');
    const document = await EsignDocument.findById(documentId);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    const recipient = document.recipients.id(recipientId);
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }
    
    // Mark scroll as completed
    recipient.scroll_completed_at = new Date();
    await document.save();
    
    res.json({
      success: true,
      message: 'Scroll completion marked',
    });
    
  } catch (error) {
    console.error('Mark scroll complete error:', error);
    res.status(500).json({ 
      error: 'Failed to mark scroll completion',
      message: error.message 
    });
  }
};

/**
 * Short link redirect
 * GET /api/esign/public/s/:shortCode
 */
const shortLinkRedirect = async (req, res) => {
  try {
    const { shortCode } = req.params;
    
    // Company context is now set up by middleware
    if (!req.companyDb) {
      return res.status(404).json({ 
        error: 'Short link not found',
        code: 'SHORT_LINK_NOT_FOUND'
      });
    }
    
    // Look up short link in Main DB
    const shortLinkService = require('../services/esign/shortLink.service');
    const result = await shortLinkService.getShortLink(req, shortCode);
    
    if (!result) {
      return res.status(404).json({ 
        error: 'Short link not found',
        code: 'SHORT_LINK_NOT_FOUND'
      });
    }
    
    if (result.expired) {
      return res.status(410).json({ 
        error: 'This link has expired',
        code: 'SHORT_LINK_EXPIRED'
      });
    }
    
    // Redirect to full signing URL
    const fullUrl = `/api/esign/public/sign/${result.shortLink.fullToken}`;
    res.redirect(fullUrl);
    
  } catch (error) {
    console.error('Short link redirect error:', error);
    res.status(500).json({ 
      error: 'Failed to process short link',
      message: error.message 
    });
  }
};

module.exports = {
  accessSigningPage,
  sendOTP,
  verifyOTP,
  submitSignature,
  declineSignature,
  delegateSigning,
  markScrollComplete,
  shortLinkRedirect,
};
