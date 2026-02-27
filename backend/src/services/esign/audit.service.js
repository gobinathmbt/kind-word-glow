/**
 * Audit Service for centralized audit logging
 * 
 * Provides consistent audit logging for all e-sign operations
 * Integrates with EsignAuditLog model for immutable audit trails
 */

/**
 * Log an audit event
 * @param {Object} req - Express request object (for company context)
 * @param {Object} eventData - Event data
 * @param {string} eventData.event_type - Event type (e.g., 'document.created')
 * @param {Object} eventData.actor - Actor information
 * @param {Object} eventData.resource - Resource information
 * @param {string} eventData.action - Action description
 * @param {Object} eventData.metadata - Additional metadata
 * @returns {Promise<Object>} Created audit log entry
 */
const logEvent = async (req, eventData) => {
  try {
    const { event_type, actor, resource, action, metadata = {} } = eventData;
    
    // Validate required fields
    if (!event_type || !actor || !resource || !action) {
      throw new Error('Missing required audit log fields: event_type, actor, resource, action');
    }
    
    // Get company ID from request
    const company_id = req.company?._id || req.user?.company_id;
    
    if (!company_id) {
      throw new Error('Company ID not found in request context');
    }
    
    // Get EsignAuditLog model
    const EsignAuditLog = req.getModel('EsignAuditLog');
    
    // Extract request metadata
    const ip_address = req.ip || req.connection?.remoteAddress;
    const user_agent = req.get('user-agent');
    
    // Create audit log entry
    const auditLog = await EsignAuditLog.create({
      company_id,
      event_type,
      actor,
      resource,
      action,
      metadata,
      ip_address,
      user_agent,
      timestamp: new Date(),
    });
    
    return auditLog;
  } catch (error) {
    console.error('Audit logging error:', error);
    // Don't throw error to prevent audit logging from breaking main flow
    // But log the error for monitoring
    return null;
  }
};

/**
 * Log authentication event
 * @param {Object} req - Express request object
 * @param {string} eventType - Event type ('auth.login', 'auth.logout', 'auth.failed')
 * @param {Object} user - User object
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} Created audit log entry
 */
const logAuthEvent = async (req, eventType, user, metadata = {}) => {
  return logEvent(req, {
    event_type: eventType,
    actor: {
      type: 'user',
      id: user._id?.toString(),
      email: user.email,
    },
    resource: {
      type: 'document',
      id: 'auth',
    },
    action: eventType.replace('auth.', ''),
    metadata,
  });
};

/**
 * Log provider configuration event
 * @param {Object} req - Express request object
 * @param {string} eventType - Event type ('provider.created', 'provider.updated', etc.)
 * @param {Object} provider - Provider object
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} Created audit log entry
 */
const logProviderEvent = async (req, eventType, provider, metadata = {}) => {
  return logEvent(req, {
    event_type: eventType,
    actor: {
      type: 'user',
      id: req.user?._id?.toString(),
      email: req.user?.email,
    },
    resource: {
      type: 'provider',
      id: provider._id?.toString(),
    },
    action: `${provider.provider_type} provider ${eventType.replace('provider.', '')}`,
    metadata: {
      ...metadata,
      provider_type: provider.provider_type,
      provider: provider.provider,
    },
  });
};

/**
 * Log API key event
 * @param {Object} req - Express request object
 * @param {string} eventType - Event type ('api_key.generated', 'api_key.revoked', etc.)
 * @param {Object} apiKey - API key object
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} Created audit log entry
 */
const logAPIKeyEvent = async (req, eventType, apiKey, metadata = {}) => {
  return logEvent(req, {
    event_type: eventType,
    actor: {
      type: 'user',
      id: req.user?._id?.toString(),
      email: req.user?.email,
    },
    resource: {
      type: 'api_key',
      id: apiKey._id?.toString(),
    },
    action: `API key ${eventType.replace('api_key.', '')}`,
    metadata: {
      ...metadata,
      key_prefix: apiKey.key_prefix,
      scopes: apiKey.scopes,
    },
  });
};

/**
 * Log template event
 * @param {Object} req - Express request object
 * @param {string} eventType - Event type ('template.created', 'template.updated', etc.)
 * @param {Object} template - Template object
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} Created audit log entry
 */
const logTemplateEvent = async (req, eventType, template, metadata = {}) => {
  return logEvent(req, {
    event_type: eventType,
    actor: {
      type: 'user',
      id: req.user?._id?.toString(),
      email: req.user?.email,
    },
    resource: {
      type: 'template',
      id: template._id?.toString(),
    },
    action: `Template ${eventType.replace('template.', '')}`,
    metadata: {
      ...metadata,
      template_name: template.name,
      signature_type: template.signature_type,
      status: template.status,
    },
  });
};

/**
 * Log document event
 * @param {Object} req - Express request object
 * @param {string} eventType - Event type ('document.created', 'document.signed', etc.)
 * @param {Object} document - Document object
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} Created audit log entry
 */
const logDocumentEvent = async (req, eventType, document, metadata = {}) => {
  const actorType = req.api_key ? 'api' : req.user ? 'user' : 'signer';
  
  return logEvent(req, {
    event_type: eventType,
    actor: {
      type: actorType,
      id: req.user?._id?.toString() || req.api_key?._id?.toString(),
      email: req.user?.email,
      api_key_prefix: req.api_key?.key_prefix,
    },
    resource: {
      type: 'document',
      id: document._id?.toString(),
    },
    action: `Document ${eventType.replace('document.', '')}`,
    metadata: {
      ...metadata,
      template_id: document.template_id?.toString(),
      status: document.status,
    },
  });
};

/**
 * Log recipient event
 * @param {Object} req - Express request object
 * @param {string} eventType - Event type ('signature.submitted', 'signature.rejected', etc.)
 * @param {Object} document - Document object
 * @param {Object} recipient - Recipient object
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} Created audit log entry
 */
const logRecipientEvent = async (req, eventType, document, recipient, metadata = {}) => {
  return logEvent(req, {
    event_type: eventType,
    actor: {
      type: 'signer',
      email: recipient.email,
    },
    resource: {
      type: 'recipient',
      id: recipient._id?.toString(),
    },
    action: `Recipient ${eventType.replace('signature.', '')}`,
    metadata: {
      ...metadata,
      document_id: document._id?.toString(),
      recipient_email: recipient.email,
      signature_order: recipient.signature_order,
    },
  });
};

/**
 * Log OTP event
 * @param {Object} req - Express request object
 * @param {string} eventType - Event type ('otp.generated', 'otp.verified', etc.)
 * @param {string} recipientId - Recipient ID
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} Created audit log entry
 */
const logOTPEvent = async (req, eventType, recipientId, metadata = {}) => {
  return logEvent(req, {
    event_type: eventType,
    actor: {
      type: 'system',
    },
    resource: {
      type: 'recipient',
      id: recipientId,
    },
    action: `OTP ${eventType.replace('otp.', '')}`,
    metadata,
  });
};

/**
 * Log PDF event
 * @param {Object} req - Express request object
 * @param {string} eventType - Event type ('pdf.generated', 'pdf.stored', etc.)
 * @param {Object} document - Document object
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} Created audit log entry
 */
const logPDFEvent = async (req, eventType, document, metadata = {}) => {
  return logEvent(req, {
    event_type: eventType,
    actor: {
      type: 'system',
    },
    resource: {
      type: 'document',
      id: document._id?.toString(),
    },
    action: `PDF ${eventType.replace('pdf.', '')}`,
    metadata: {
      ...metadata,
      pdf_hash: document.pdf_hash,
    },
  });
};

/**
 * Log notification event
 * @param {Object} req - Express request object
 * @param {string} eventType - Event type ('notification.sent', 'notification.failed')
 * @param {Object} document - Document object
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} Created audit log entry
 */
const logNotificationEvent = async (req, eventType, document, metadata = {}) => {
  return logEvent(req, {
    event_type: eventType,
    actor: {
      type: 'system',
    },
    resource: {
      type: 'document',
      id: document._id?.toString(),
    },
    action: `Notification ${eventType.replace('notification.', '')}`,
    metadata,
  });
};

/**
 * Log webhook event
 * @param {Object} req - Express request object
 * @param {string} eventType - Event type ('webhook.sent', 'webhook.failed')
 * @param {Object} document - Document object
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} Created audit log entry
 */
const logWebhookEvent = async (req, eventType, document, metadata = {}) => {
  return logEvent(req, {
    event_type: eventType,
    actor: {
      type: 'system',
    },
    resource: {
      type: 'document',
      id: document._id?.toString(),
    },
    action: `Webhook ${eventType.replace('webhook.', '')}`,
    metadata,
  });
};

module.exports = {
  logEvent,
  logAuthEvent,
  logProviderEvent,
  logAPIKeyEvent,
  logTemplateEvent,
  logDocumentEvent,
  logRecipientEvent,
  logOTPEvent,
  logPDFEvent,
  logNotificationEvent,
  logWebhookEvent,
};
