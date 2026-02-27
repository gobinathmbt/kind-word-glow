const tokenService = require('../services/esign/token.service');
const auditService = require('../services/esign/audit.service');
const notificationService = require('../services/esign/notification.service');

/**
 * Kiosk E-Sign Controller
 * Handles in-person signing at kiosk locations
 */

/**
 * Access kiosk signing page
 * GET /api/esign/kiosk/:token
 */
const accessKioskPage = async (req, res) => {
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
    
    const { documentId, recipientId } = decoded;
    
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
        error: 'This document has already been signed',
        code: 'ALREADY_SIGNED'
      });
    }
    
    // Inject delimiter values into HTML
    const template = document.template_snapshot;
    let html_content = template.html_content;
    for (const [key, value] of Object.entries(document.payload)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html_content = html_content.replace(regex, value || '');
    }
    
    // Log kiosk access
    await auditService.logEvent(req, {
      event_type: 'kiosk.accessed',
      actor: {
        type: 'signer',
        email: recipient.email,
      },
      resource: {
        type: 'document',
        id: documentId,
      },
      action: 'Kiosk signing page accessed',
      metadata: {
        recipient_id: recipientId,
      },
    });
    
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
        require_scroll_completion: template.require_scroll_completion,
        delimiters: template.delimiters.filter(d => d.assigned_to === recipient.signature_order),
      },
      kiosk_config: {
        session_timeout: 5 * 60 * 1000, // 5 minutes in milliseconds
        require_photo: true,
      },
    });
    
  } catch (error) {
    console.error('Access kiosk page error:', error);
    res.status(500).json({ 
      error: 'Failed to access kiosk page',
      message: error.message 
    });
  }
};

/**
 * Authenticate host
 * POST /api/esign/kiosk/:token/authenticate-host
 */
const authenticateHost = async (req, res) => {
  try {
    const { token } = req.params;
    const { host_email, host_password } = req.body;
    
    if (!host_email || !host_password) {
      return res.status(400).json({ 
        error: 'Missing required fields: host_email, host_password' 
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
    
    // Authenticate host against User model in Main DB
    const User = req.getModel('User');
    const bcrypt = require('bcrypt');
    
    const host = await User.findOne({ 
      email: host_email,
      company_id: document.company_id,
      isActive: true,
    });
    
    if (!host || !bcrypt.compareSync(host_password, host.password)) {
      // Log failed authentication
      await auditService.logEvent(req, {
        event_type: 'kiosk.host_auth_failed',
        actor: {
          type: 'host',
          email: host_email,
        },
        resource: {
          type: 'document',
          id: documentId,
        },
        action: 'Host authentication failed',
        metadata: {
          recipient_id: recipientId,
        },
      });
      
      return res.status(401).json({ 
        error: 'Invalid host credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }
    
    // Generate session token (5 minutes)
    const sessionToken = tokenService.generateToken({
      documentId: documentId,
      recipientId: recipientId,
      hostId: host._id.toString(),
      email: decoded.email,
      companyId: document.company_id.toString(),
    }, 'kiosk_session', { value: 5, unit: 'minutes' });
    
    // Log successful authentication
    await auditService.logEvent(req, {
      event_type: 'kiosk.host_authenticated',
      actor: {
        type: 'host',
        id: host._id.toString(),
        email: host.email,
      },
      resource: {
        type: 'document',
        id: documentId,
      },
      action: 'Host authenticated for kiosk session',
      metadata: {
        recipient_id: recipientId,
        host_name: host.name,
      },
    });
    
    res.json({
      success: true,
      message: 'Host authenticated successfully',
      session_token: sessionToken,
      host: {
        id: host._id,
        name: host.name,
        email: host.email,
      },
    });
    
  } catch (error) {
    console.error('Authenticate host error:', error);
    res.status(500).json({ 
      error: 'Failed to authenticate host',
      message: error.message 
    });
  }
};

/**
 * Capture signer photo
 * POST /api/esign/kiosk/:token/capture-photo
 */
const capturePhoto = async (req, res) => {
  try {
    const { token } = req.params;
    const { photo_data } = req.body;
    
    if (!photo_data) {
      return res.status(400).json({ 
        error: 'Missing required field: photo_data' 
      });
    }
    
    // Validate token (should be session token with hostId)
    let decoded;
    try {
      decoded = tokenService.validateToken(token);
    } catch (error) {
      return res.status(401).json({ 
        error: 'Session expired. Please re-authenticate host.',
        code: 'SESSION_EXPIRED'
      });
    }
    
    if (!decoded.hostId) {
      return res.status(401).json({ 
        error: 'Invalid session token',
        code: 'INVALID_SESSION'
      });
    }
    
    const { documentId, recipientId, hostId } = decoded;
    
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
    
    // Store photo
    recipient.signer_photo = photo_data;
    await document.save();
    
    // Log photo capture
    await auditService.logEvent(req, {
      event_type: 'kiosk.photo_captured',
      actor: {
        type: 'host',
        id: hostId,
      },
      resource: {
        type: 'recipient',
        id: recipientId,
      },
      action: 'Signer photo captured',
      metadata: {
        document_id: documentId,
      },
    });
    
    res.json({
      success: true,
      message: 'Photo captured successfully',
    });
    
  } catch (error) {
    console.error('Capture photo error:', error);
    res.status(500).json({ 
      error: 'Failed to capture photo',
      message: error.message 
    });
  }
};

/**
 * Submit in-person signature
 * POST /api/esign/kiosk/:token/submit
 */
const submitKioskSignature = async (req, res) => {
  try {
    const { token } = req.params;
    const { signature_image, signature_type, kiosk_location, field_data } = req.body;
    
    // Validate required fields
    if (!signature_image || !signature_type) {
      return res.status(400).json({ 
        error: 'Missing required fields: signature_image, signature_type' 
      });
    }
    
    // Validate token (should be session token with hostId)
    let decoded;
    try {
      decoded = tokenService.validateToken(token);
    } catch (error) {
      return res.status(401).json({ 
        error: 'Session expired. Please re-authenticate host.',
        code: 'SESSION_EXPIRED'
      });
    }
    
    if (!decoded.hostId) {
      return res.status(401).json({ 
        error: 'Invalid session token',
        code: 'INVALID_SESSION'
      });
    }
    
    const { documentId, recipientId, hostId } = decoded;
    
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
        error: 'This document has already been signed',
        code: 'ALREADY_SIGNED'
      });
    }
    
    // Capture IP address and user agent
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
    recipient.intent_confirmation = "In-person signature captured at kiosk";
    recipient.signed_at = new Date();
    recipient.ip_address = ip_address;
    recipient.user_agent = user_agent;
    recipient.geo_location = geo_location;
    recipient.status = 'signed';
    recipient.kiosk_host_id = hostId;
    recipient.kiosk_location = kiosk_location || 'Kiosk location not specified';
    
    // Store field data if provided
    if (field_data) {
      const template = document.template_snapshot;
      const assignedFields = template.delimiters
        .filter(d => d.assigned_to === recipient.signature_order)
        .map(d => d.key);
      
      for (const key of Object.keys(field_data)) {
        if (!assignedFields.includes(key)) {
          return res.status(403).json({ 
            error: `Field '${key}' is not assigned to this recipient`,
            code: 'UNAUTHORIZED_FIELD'
          });
        }
      }
      
      document.payload = { ...document.payload, ...field_data };
    }
    
    // Update document status based on signature type
    const template = document.template_snapshot;
    
    if (template.signature_type === 'single') {
      document.status = 'signed';
    } else if (template.signature_type === 'hierarchy') {
      const allSigned = document.recipients.every(r => 
        r.signature_order <= recipient.signature_order ? r.status === 'signed' : true
      );
      
      if (allSigned) {
        const nextRecipient = document.recipients.find(r => 
          r.signature_order === recipient.signature_order + 1
        );
        
        if (nextRecipient) {
          nextRecipient.status = 'active';
          document.status = 'partially_signed';
          
          const nextToken = tokenService.generateToken({
            documentId: document._id.toString(),
            recipientId: nextRecipient._id.toString(),
            email: nextRecipient.email,
            companyId: document.company_id.toString(),
          }, 'signing', template.link_expiry);
          
          nextRecipient.token = nextToken;
          nextRecipient.token_expires_at = tokenService.getTokenExpiry(nextToken);
          
          try {
            await notificationService.sendEsignNotification(
              req.companyDb,
              document.company_id,
              'esign.document.recipient_activated',
              {
                document,
                recipient: nextRecipient,
                token: nextToken,
              }
            );
          } catch (error) {
            console.error('Failed to send notification to next recipient:', error);
          }
        } else {
          document.status = 'signed';
        }
      } else {
        document.status = 'partially_signed';
      }
    } else {
      const allSigned = document.recipients.every(r => r.status === 'signed');
      
      if (allSigned) {
        document.status = 'signed';
      } else {
        document.status = 'partially_signed';
      }
    }
    
    await document.save();
    
    // Evaluate conditional routing rules after signature (Req 78.1-78.10)
    const routingService = require('../services/esign/routing.service');
    try {
      const routingResult = await routingService.evaluateRoutingRules(req, document, recipient);
      
      if (routingResult.evaluated && routingResult.actions_taken.length > 0) {
        console.log(`Routing evaluation completed: ${routingResult.actions_taken.length} actions taken`);
        
        // Reload document to get updated state after routing actions
        const updatedDocument = await EsignDocument.findById(documentId);
        if (updatedDocument) {
          // Update document reference for subsequent operations
          Object.assign(document, updatedDocument.toObject());
        }
      }
    } catch (error) {
      console.error('Routing evaluation error:', error);
      // Log error but don't fail the signature submission
      await auditService.logEvent(req, {
        event_type: 'routing.evaluation_error',
        actor: { type: 'system' },
        resource: { type: 'document', id: document._id.toString() },
        action: 'Routing evaluation failed',
        metadata: { error: error.message },
      });
    }
    
    // Log kiosk signature submission
    await auditService.logRecipientEvent(req, 'signature.submitted_kiosk', document, recipient, {
      signature_type,
      ip_address,
      user_agent,
      geo_location,
      kiosk_host_id: hostId,
      kiosk_location: recipient.kiosk_location,
      has_photo: !!recipient.signer_photo,
    });
    
    res.json({
      success: true,
      message: 'In-person signature submitted successfully',
      document_status: document.status,
    });
    
  } catch (error) {
    console.error('Submit kiosk signature error:', error);
    res.status(500).json({ 
      error: 'Failed to submit signature',
      message: error.message 
    });
  }
};

module.exports = {
  accessKioskPage,
  authenticateHost,
  capturePhoto,
  submitKioskSignature,
};
