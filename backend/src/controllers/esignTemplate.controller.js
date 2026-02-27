const auditService = require('../services/esign/audit.service');
const delimiterService = require('../services/esign/delimiter.service');
const sanitizationService = require('../services/esign/sanitization.service');

/**
 * Create new template
 * POST /api/company/esign/templates
 */
const createTemplate = async (req, res) => {
  try {
    const EsignTemplate = req.getModel('EsignTemplate');
    const companyId = req.user.company_id;
    const userId = req.user.id;

    const {
      name,
      description,
      html_content,
      signature_type,
      delimiters,
      recipients,
      mfa_config,
      link_expiry,
      preview_mode,
      notification_config,
      routing_rules,
      require_scroll_completion,
      short_link_enabled
    } = req.body;

    // Validate required fields
    if (!name || !html_content || !signature_type) {
      return res.status(400).json({
        success: false,
        message: 'name, html_content, and signature_type are required'
      });
    }

    // Validate signature_type
    const validSignatureTypes = ['single', 'multiple', 'hierarchy', 'send_to_all'];
    if (!validSignatureTypes.includes(signature_type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid signature_type. Must be one of: ${validSignatureTypes.join(', ')}`
      });
    }

    // Sanitize HTML content (Req 50.1-50.6)
    const sanitizationResult = sanitizationService.sanitizeAndValidate(html_content);
    const sanitizedHtml = sanitizationResult.sanitized;
    
    // Log if HTML was modified during sanitization
    if (sanitizationResult.changed) {
      console.log('HTML content was sanitized:', sanitizationResult.validation.issues);
    }

    // Create template
    const template = await EsignTemplate.create({
      company_id: companyId,
      name,
      description,
      html_content: sanitizedHtml,  // Use sanitized HTML
      signature_type,
      delimiters: delimiters || [],
      recipients: recipients || [],
      mfa_config: mfa_config || { enabled: false, channel: 'email', otp_expiry_min: 10 },
      link_expiry: link_expiry || { value: 7, unit: 'days' },
      preview_mode: preview_mode || false,
      notification_config: notification_config || {
        send_on_create: true,
        send_on_complete: true,
        send_on_reject: true,
        send_on_expire: true
      },
      routing_rules: routing_rules || [],
      require_scroll_completion: require_scroll_completion || false,
      short_link_enabled: short_link_enabled || false,
      status: 'draft',
      created_by: userId
    });

    // Log to audit
    await auditService.logEsignEvent({
      company_id: companyId,
      user_id: userId,
      action: 'template.created',
      event_type: 'template.created',
      resource: {
        type: 'template',
        id: template._id.toString()
      },
      metadata: {
        name: template.name,
        signature_type: template.signature_type
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.status(201).json({
      success: true,
      data: template,
      message: 'Template created successfully'
    });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating template',
      error: error.message
    });
  }
};

/**
 * List templates with pagination and filters
 * GET /api/company/esign/templates
 */
const listTemplates = async (req, res) => {
  try {
    const EsignTemplate = req.getModel('EsignTemplate');
    const companyId = req.user.company_id;

    const {
      page = 1,
      limit = 10,
      status,
      signature_type,
      search,
      sort_by = 'createdAt',
      sort_order = 'desc'
    } = req.query;

    // Build query
    const query = {
      company_id: companyId,
      is_deleted: false
    };

    if (status) query.status = status;
    if (signature_type) query.signature_type = signature_type;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = sort_order === 'asc' ? 1 : -1;

    // Execute query
    const [templates, total] = await Promise.all([
      EsignTemplate.find(query)
        .sort({ [sort_by]: sortOrder })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-html_content') // Exclude large HTML content from list
        .lean(),
      EsignTemplate.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: templates,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error listing templates:', error);
    res.status(500).json({
      success: false,
      message: 'Error listing templates',
      error: error.message
    });
  }
};

/**
 * Get single template details
 * GET /api/company/esign/templates/:id
 */
const getTemplate = async (req, res) => {
  try {
    const EsignTemplate = req.getModel('EsignTemplate');
    const { id } = req.params;
    const companyId = req.user.company_id;

    const template = await EsignTemplate.findOne({
      _id: id,
      company_id: companyId,
      is_deleted: false
    }).lean();

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error getting template:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting template',
      error: error.message
    });
  }
};

/**
 * Update template
 * PUT /api/company/esign/templates/:id
 */
const updateTemplate = async (req, res) => {
  try {
    const EsignTemplate = req.getModel('EsignTemplate');
    const { id } = req.params;
    const companyId = req.user.company_id;
    const userId = req.user.id;

    const template = await EsignTemplate.findOne({
      _id: id,
      company_id: companyId,
      is_deleted: false
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Update allowed fields
    const allowedFields = [
      'name',
      'description',
      'html_content',
      'signature_type',
      'delimiters',
      'recipients',
      'mfa_config',
      'link_expiry',
      'preview_mode',
      'notification_config',
      'routing_rules',
      'require_scroll_completion',
      'short_link_enabled'
    ];

    // Sanitize HTML content if provided (Req 50.1-50.6)
    if (req.body.html_content !== undefined) {
      const sanitizationResult = sanitizationService.sanitizeAndValidate(req.body.html_content);
      req.body.html_content = sanitizationResult.sanitized;
      
      // Log if HTML was modified during sanitization
      if (sanitizationResult.changed) {
        console.log('HTML content was sanitized during update:', sanitizationResult.validation.issues);
      }
    }

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        template[field] = req.body[field];
      }
    });

    // Increment version
    template.version += 1;

    await template.save();

    // Log to audit
    await auditService.logEsignEvent({
      company_id: companyId,
      user_id: userId,
      action: 'template.updated',
      event_type: 'template.updated',
      resource: {
        type: 'template',
        id: template._id.toString()
      },
      metadata: {
        name: template.name,
        version: template.version
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.json({
      success: true,
      data: template,
      message: 'Template updated successfully'
    });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating template',
      error: error.message
    });
  }
};

/**
 * Soft delete template
 * DELETE /api/company/esign/templates/:id
 */
const deleteTemplate = async (req, res) => {
  try {
    const EsignTemplate = req.getModel('EsignTemplate');
    const EsignDocument = req.getModel('EsignDocument');
    const { id } = req.params;
    const companyId = req.user.company_id;
    const userId = req.user.id;

    const template = await EsignTemplate.findOne({
      _id: id,
      company_id: companyId,
      is_deleted: false
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Check for active documents
    const activeDocuments = await EsignDocument.countDocuments({
      company_id: companyId,
      template_id: id,
      status: { $in: ['distributed', 'opened', 'partially_signed'] }
    });

    if (activeDocuments > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete template with active documents',
        active_documents: activeDocuments
      });
    }

    // Soft delete
    template.is_deleted = true;
    await template.save();

    // Log to audit
    await auditService.logEsignEvent({
      company_id: companyId,
      user_id: userId,
      action: 'template.deleted',
      event_type: 'template.deleted',
      resource: {
        type: 'template',
        id: template._id.toString()
      },
      metadata: {
        name: template.name
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting template',
      error: error.message
    });
  }
};

/**
 * Duplicate template
 * POST /api/company/esign/templates/:id/duplicate
 */
const duplicateTemplate = async (req, res) => {
  try {
    const EsignTemplate = req.getModel('EsignTemplate');
    const { id } = req.params;
    const companyId = req.user.company_id;
    const userId = req.user.id;

    const originalTemplate = await EsignTemplate.findOne({
      _id: id,
      company_id: companyId,
      is_deleted: false
    }).lean();

    if (!originalTemplate) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Create duplicate
    const duplicateData = {
      ...originalTemplate,
      _id: undefined,
      name: `${originalTemplate.name} (Copy)`,
      status: 'draft',
      version: 1,
      created_by: userId,
      createdAt: undefined,
      updatedAt: undefined
    };

    const duplicateTemplate = await EsignTemplate.create(duplicateData);

    // Log to audit
    await auditService.logEsignEvent({
      company_id: companyId,
      user_id: userId,
      action: 'template.duplicated',
      event_type: 'template.duplicated',
      resource: {
        type: 'template',
        id: duplicateTemplate._id.toString()
      },
      metadata: {
        original_template_id: id,
        original_name: originalTemplate.name,
        new_name: duplicateTemplate.name
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.status(201).json({
      success: true,
      data: duplicateTemplate,
      message: 'Template duplicated successfully'
    });
  } catch (error) {
    console.error('Error duplicating template:', error);
    res.status(500).json({
      success: false,
      message: 'Error duplicating template',
      error: error.message
    });
  }
};

/**
 * Activate template (with validation)
 * POST /api/company/esign/templates/:id/activate
 */
const activateTemplate = async (req, res) => {
  try {
    const EsignTemplate = req.getModel('EsignTemplate');
    const { id } = req.params;
    const companyId = req.user.company_id;
    const userId = req.user.id;

    const template = await EsignTemplate.findOne({
      _id: id,
      company_id: companyId,
      is_deleted: false
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Validate template before activation
    const validationErrors = validateTemplate(template);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Template validation failed',
        errors: validationErrors
      });
    }

    // Activate template
    template.status = 'active';
    await template.save();

    // Log to audit
    await auditService.logEsignEvent({
      company_id: companyId,
      user_id: userId,
      action: 'template.activated',
      event_type: 'template.activated',
      resource: {
        type: 'template',
        id: template._id.toString()
      },
      metadata: {
        name: template.name
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.json({
      success: true,
      data: template,
      message: 'Template activated successfully'
    });
  } catch (error) {
    console.error('Error activating template:', error);
    res.status(500).json({
      success: false,
      message: 'Error activating template',
      error: error.message
    });
  }
};

/**
 * Validate template configuration
 */
function validateTemplate(template) {
  const errors = [];

  // Validate HTML content is not empty
  if (!template.html_content || template.html_content.trim().length === 0) {
    errors.push('HTML content is required');
  }

  // Validate at least one delimiter exists
  if (!template.delimiters || template.delimiters.length === 0) {
    errors.push('At least one delimiter is required');
  }

  // Validate signature configuration is complete
  if (!template.recipients || template.recipients.length === 0) {
    errors.push('At least one recipient is required');
  }

  // Validate recipient count based on signature type (Req 4.1, 4.2, 4.3, 4.4)
  if (template.signature_type === 'single' && template.recipients.length !== 1) {
    errors.push('Single signature type requires exactly one recipient');
  }

  if (['multiple', 'hierarchy', 'send_to_all'].includes(template.signature_type) && template.recipients.length < 2) {
    errors.push(`${template.signature_type} signature type requires at least two recipients`);
  }

  // Validate recipient details (Req 4.1, 4.2, 4.3)
  template.recipients.forEach((recipient, index) => {
    if (!recipient.label || recipient.label.trim().length === 0) {
      errors.push(`Recipient at position ${index + 1} must have a label`);
    }
    
    if (recipient.signature_order === undefined || recipient.signature_order === null) {
      errors.push(`Recipient at position ${index + 1} must have a signature_order`);
    }
    
    if (!recipient.recipient_type || !['individual', 'group'].includes(recipient.recipient_type)) {
      errors.push(`Recipient at position ${index + 1} must have a valid recipient_type (individual or group)`);
    }
    
    if (!recipient.signature_type || !['remote', 'in_person'].includes(recipient.signature_type)) {
      errors.push(`Recipient at position ${index + 1} must have a valid signature_type (remote or in_person)`);
    }
    
    // Validate signing_group_id is provided when recipient_type is 'group'
    if (recipient.recipient_type === 'group' && !recipient.signing_group_id) {
      errors.push(`Recipient at position ${index + 1} with type 'group' must have a signing_group_id`);
    }
  });

  // Validate MFA configuration (Req 4.5, 4.6, 4.7, 4.8)
  if (template.mfa_config) {
    if (template.mfa_config.enabled) {
      if (!template.mfa_config.channel || !['email', 'sms', 'both'].includes(template.mfa_config.channel)) {
        errors.push('MFA channel must be one of: email, sms, both');
      }
      
      if (!template.mfa_config.otp_expiry_min || template.mfa_config.otp_expiry_min < 1) {
        errors.push('MFA OTP expiry must be at least 1 minute');
      }
      
      if (template.mfa_config.otp_expiry_min > 60) {
        errors.push('MFA OTP expiry cannot exceed 60 minutes');
      }
    }
  }

  // Validate link expiry configuration (Req 4.9)
  if (!template.link_expiry || !template.link_expiry.value || !template.link_expiry.unit) {
    errors.push('Link expiry configuration is required (value and unit)');
  } else {
    if (!['hours', 'days', 'weeks'].includes(template.link_expiry.unit)) {
      errors.push('Link expiry unit must be one of: hours, days, weeks');
    }
    
    if (template.link_expiry.value < 1) {
      errors.push('Link expiry value must be at least 1');
    }
    
    // Validate grace period if provided
    if (template.link_expiry.grace_period_hours !== undefined && template.link_expiry.grace_period_hours !== null) {
      if (template.link_expiry.grace_period_hours < 0) {
        errors.push('Grace period hours cannot be negative');
      }
      
      if (template.link_expiry.grace_period_hours > 168) { // 7 days
        errors.push('Grace period hours cannot exceed 168 hours (7 days)');
      }
    }
  }

  // Validate notification configuration (Req 4.11, 4.12, 4.13, 46.1-46.5)
  if (template.notification_config) {
    // Validate cc_emails format if provided
    if (template.notification_config.cc_emails && Array.isArray(template.notification_config.cc_emails)) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      template.notification_config.cc_emails.forEach((email, index) => {
        if (!emailRegex.test(email)) {
          errors.push(`CC email at position ${index + 1} is not a valid email address: ${email}`);
        }
      });
    }
    
    // Validate SMS content does not exceed 160 characters (Req 46.5)
    if (template.notification_config.custom_sms_template) {
      // Count characters after delimiter replacement (worst case: replace with empty string)
      const smsContent = template.notification_config.custom_sms_template;
      const contentWithoutDelimiters = smsContent.replace(/\{\{[a-zA-Z0-9_]+\}\}/g, '');
      
      if (contentWithoutDelimiters.length > 160) {
        errors.push(`SMS template content exceeds 160 characters (${contentWithoutDelimiters.length} characters without delimiters). Please shorten the message.`);
      }
      
      // Also check the full length with delimiters
      if (smsContent.length > 160) {
        errors.push(`SMS template exceeds 160 characters (${smsContent.length} characters). Consider using shorter delimiter names or reducing message length.`);
      }
    }
    
    // Validate notification config delimiters (Req 46.3, 46.4)
    const notificationValidation = delimiterService.validateNotificationDelimiters(
      template.notification_config,
      template.delimiters
    );

    if (!notificationValidation.valid) {
      notificationValidation.errors.forEach(error => {
        errors.push(error.message);
      });
    }
  }

  // Validate at least one required delimiter is defined
  const requiredDelimiters = template.delimiters.filter(d => d.required);
  if (requiredDelimiters.length === 0) {
    errors.push('At least one required delimiter should be defined');
  }

  // Validate routing rules (Req 78.1-78.10)
  if (template.routing_rules && template.routing_rules.length > 0) {
    const delimiterKeys = template.delimiters.map(d => d.key);
    const recipientOrders = template.recipients.map(r => r.signature_order);
    
    template.routing_rules.forEach((rule, index) => {
      // Validate triggered_by references valid recipient (Req 78.4)
      if (rule.triggered_by === undefined || rule.triggered_by === null) {
        errors.push(`Routing rule ${index + 1}: triggered_by is required`);
      } else if (!recipientOrders.includes(rule.triggered_by)) {
        errors.push(`Routing rule ${index + 1}: triggered_by (${rule.triggered_by}) does not reference a valid recipient signature_order`);
      }
      
      // Validate condition (Req 78.2)
      if (!rule.condition) {
        errors.push(`Routing rule ${index + 1}: condition is required`);
      } else {
        // Validate delimiter_key references valid delimiter (Req 78.6)
        if (!rule.condition.delimiter_key) {
          errors.push(`Routing rule ${index + 1}: condition.delimiter_key is required`);
        } else if (!delimiterKeys.includes(rule.condition.delimiter_key)) {
          errors.push(`Routing rule ${index + 1}: condition.delimiter_key (${rule.condition.delimiter_key}) does not reference a valid delimiter`);
        }
        
        // Validate operator (Req 78.2)
        const validOperators = ['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'is_empty'];
        if (!rule.condition.operator) {
          errors.push(`Routing rule ${index + 1}: condition.operator is required`);
        } else if (!validOperators.includes(rule.condition.operator)) {
          errors.push(`Routing rule ${index + 1}: condition.operator must be one of: ${validOperators.join(', ')}`);
        }
        
        // Validate value is provided for operators that need it
        if (rule.condition.operator !== 'is_empty' && rule.condition.value === undefined) {
          errors.push(`Routing rule ${index + 1}: condition.value is required for operator '${rule.condition.operator}'`);
        }
      }
      
      // Validate action (Req 78.3)
      if (!rule.action) {
        errors.push(`Routing rule ${index + 1}: action is required`);
      } else {
        const validActionTypes = ['activate_signer', 'skip_signer', 'add_signer', 'complete'];
        if (!rule.action.type) {
          errors.push(`Routing rule ${index + 1}: action.type is required`);
        } else if (!validActionTypes.includes(rule.action.type)) {
          errors.push(`Routing rule ${index + 1}: action.type must be one of: ${validActionTypes.join(', ')}`);
        }
        
        // Validate target_order for activate_signer and skip_signer (Req 78.7)
        if (['activate_signer', 'skip_signer'].includes(rule.action.type)) {
          if (rule.action.target_order === undefined || rule.action.target_order === null) {
            errors.push(`Routing rule ${index + 1}: action.target_order is required for action type '${rule.action.type}'`);
          } else if (!recipientOrders.includes(rule.action.target_order)) {
            errors.push(`Routing rule ${index + 1}: action.target_order (${rule.action.target_order}) does not reference a valid recipient signature_order`);
          }
        }
        
        // Validate email for add_signer (Req 78.8)
        if (rule.action.type === 'add_signer') {
          if (!rule.action.email) {
            errors.push(`Routing rule ${index + 1}: action.email is required for action type 'add_signer'`);
          } else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(rule.action.email)) {
              errors.push(`Routing rule ${index + 1}: action.email is not a valid email address`);
            }
          }
        }
      }
    });
  }

  return errors;
}

/**
 * Upload PDF and convert to HTML
 * POST /api/company/esign/templates/:id/upload-pdf
 */
const uploadPDF = async (req, res) => {
  try {
    const EsignTemplate = req.getModel('EsignTemplate');
    const { id } = req.params;
    const companyId = req.user.company_id;
    const userId = req.user.id;

    const template = await EsignTemplate.findOne({
      _id: id,
      company_id: companyId,
      is_deleted: false
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Check if file was uploaded
    if (!req.files || !req.files.pdf) {
      return res.status(400).json({
        success: false,
        message: 'PDF file is required'
      });
    }

    const pdfFile = req.files.pdf;

    // Validate file type
    if (pdfFile.mimetype !== 'application/pdf') {
      return res.status(400).json({
        success: false,
        message: 'File must be a PDF'
      });
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (pdfFile.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: 'PDF file size must not exceed 10MB'
      });
    }

    // Send PDF to PDF Service for conversion
    const pdfService = require('../services/esign/pdf.service');
    
    try {
      const htmlContent = await pdfService.convertPdfToHtml(pdfFile.data);

      // Sanitize converted HTML (Req 50.1-50.6)
      const sanitizationResult = sanitizationService.sanitizeAndValidate(htmlContent);
      const sanitizedHtml = sanitizationResult.sanitized;
      
      // Log if HTML was modified during sanitization
      if (sanitizationResult.changed) {
        console.log('Converted PDF HTML was sanitized:', sanitizationResult.validation.issues);
      }

      // Store sanitized HTML in template
      template.html_content = sanitizedHtml;
      await template.save();

      // Log to audit
      await auditService.logEsignEvent({
        company_id: companyId,
        user_id: userId,
        action: 'template.pdf_uploaded',
        event_type: 'template.pdf_uploaded',
        resource: {
          type: 'template',
          id: template._id.toString()
        },
        metadata: {
          name: template.name,
          file_size: pdfFile.size,
          file_name: pdfFile.name
        },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.json({
        success: true,
        data: {
          template_id: template._id,
          html_content: sanitizedHtml,
          sanitization: sanitizationResult.changed ? {
            changed: true,
            issues: sanitizationResult.validation.issues
          } : { changed: false }
        },
        message: 'PDF uploaded and converted successfully'
      });
    } catch (conversionError) {
      console.error('PDF conversion error:', conversionError);
      
      // Log conversion failure
      await auditService.logEsignEvent({
        company_id: companyId,
        user_id: userId,
        action: 'template.pdf_conversion_failed',
        event_type: 'template.pdf_conversion_failed',
        resource: {
          type: 'template',
          id: template._id.toString()
        },
        metadata: {
          name: template.name,
          error: conversionError.message
        },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      return res.status(500).json({
        success: false,
        message: 'PDF conversion failed',
        error: conversionError.message
      });
    }
  } catch (error) {
    console.error('Error uploading PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading PDF',
      error: error.message
    });
  }
};

/**
 * Extract delimiters from template HTML
 * POST /api/company/esign/templates/:id/extract-delimiters
 */
const extractDelimiters = async (req, res) => {
  try {
    const EsignTemplate = req.getModel('EsignTemplate');
    const { id } = req.params;
    const companyId = req.user.company_id;
    const userId = req.user.id;

    const template = await EsignTemplate.findOne({
      _id: id,
      company_id: companyId,
      is_deleted: false
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Scan HTML and populate delimiters
    const updatedDelimiters = delimiterService.scanAndPopulateDelimiters(
      template.html_content,
      template.delimiters
    );

    // Update template with new delimiters
    template.delimiters = updatedDelimiters;
    await template.save();

    // Validate notification config delimiters
    const notificationValidation = delimiterService.validateNotificationDelimiters(
      template.notification_config,
      updatedDelimiters
    );

    // Log to audit
    await auditService.logEsignEvent({
      company_id: companyId,
      user_id: userId,
      action: 'template.delimiters_extracted',
      event_type: 'template.delimiters_extracted',
      resource: {
        type: 'template',
        id: template._id.toString()
      },
      metadata: {
        name: template.name,
        delimiter_count: updatedDelimiters.filter(d => !d.unused).length,
        unused_count: updatedDelimiters.filter(d => d.unused).length
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.json({
      success: true,
      data: {
        delimiters: updatedDelimiters,
        validation: notificationValidation
      },
      message: 'Delimiters extracted successfully'
    });
  } catch (error) {
    console.error('Error extracting delimiters:', error);
    res.status(500).json({
      success: false,
      message: 'Error extracting delimiters',
      error: error.message
    });
  }
};

/**
 * Preview template with sample data
 * GET /api/company/esign/templates/:id/preview
 */
const previewTemplate = async (req, res) => {
  try {
    const EsignTemplate = req.getModel('EsignTemplate');
    const { id } = req.params;
    const companyId = req.user.company_id;

    const template = await EsignTemplate.findOne({
      _id: id,
      company_id: companyId,
      is_deleted: false
    }).lean();

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Get sample values from query params or use defaults
    const sampleValues = req.query.sample_values 
      ? JSON.parse(req.query.sample_values) 
      : {};

    // Render HTML with sample delimiter values
    let previewHtml = template.html_content;

    // Replace each delimiter with sample value, default value, or placeholder
    template.delimiters.forEach(delimiter => {
      const delimiterPattern = new RegExp(`{{${delimiter.key}}}`, 'g');
      
      let replacementValue;
      
      // Priority: custom sample value > default value > placeholder
      if (sampleValues[delimiter.key] !== undefined) {
        replacementValue = sampleValues[delimiter.key];
      } else if (delimiter.default_value) {
        replacementValue = delimiter.default_value;
      } else {
        replacementValue = `[${delimiter.key}]`;
      }

      previewHtml = previewHtml.replace(delimiterPattern, replacementValue);
    });

    res.json({
      success: true,
      data: {
        html: previewHtml,
        template_name: template.name,
        delimiters: template.delimiters
      }
    });
  } catch (error) {
    console.error('Error previewing template:', error);
    res.status(500).json({
      success: false,
      message: 'Error previewing template',
      error: error.message
    });
  }
};

/**
 * Get template payload schema for API integration
 * GET /api/company/esign/templates/:id/schema
 */
const getTemplateSchema = async (req, res) => {
  try {
    const EsignTemplate = req.getModel('EsignTemplate');
    const { id } = req.params;
    const companyId = req.user.company_id;

    const template = await EsignTemplate.findOne({
      _id: id,
      company_id: companyId,
      is_deleted: false
    }).lean();

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Generate JSON schema for payload
    const schema = {
      template_id: template._id.toString(),
      template_name: template.name,
      signature_type: template.signature_type,
      fields: {},
      required_fields: []
    };

    // Build schema from delimiters
    template.delimiters.forEach(delimiter => {
      // Skip unused delimiters
      if (delimiter.unused) return;

      const fieldSchema = {
        type: delimiter.type,
        required: delimiter.required,
        description: `Field for ${delimiter.key}`
      };

      // Add default value if exists
      if (delimiter.default_value) {
        fieldSchema.default = delimiter.default_value;
      }

      // Add example value based on type
      switch (delimiter.type) {
        case 'email':
          fieldSchema.example = 'user@example.com';
          fieldSchema.format = 'email';
          break;
        case 'phone':
          fieldSchema.example = '+1234567890';
          fieldSchema.format = 'phone';
          break;
        case 'date':
          fieldSchema.example = '2024-01-01';
          fieldSchema.format = 'date';
          break;
        case 'number':
          fieldSchema.example = 123;
          fieldSchema.format = 'number';
          break;
        case 'signature':
          fieldSchema.example = 'base64-encoded-signature-image';
          fieldSchema.format = 'base64';
          break;
        case 'initial':
          fieldSchema.example = 'base64-encoded-initial-image';
          fieldSchema.format = 'base64';
          break;
        default:
          fieldSchema.example = 'Sample text value';
          break;
      }

      // Add assigned recipient info if exists
      if (delimiter.assigned_to) {
        fieldSchema.assigned_to = delimiter.assigned_to;
        const recipient = template.recipients.find(r => r.signature_order === delimiter.assigned_to);
        if (recipient) {
          fieldSchema.recipient_label = recipient.label;
        }
      }

      schema.fields[delimiter.key] = fieldSchema;

      // Add to required fields list
      if (delimiter.required) {
        schema.required_fields.push(delimiter.key);
      }
    });

    // Add recipient configuration
    schema.recipients = template.recipients.map(recipient => ({
      signature_order: recipient.signature_order,
      label: recipient.label,
      recipient_type: recipient.recipient_type,
      signature_type: recipient.signature_type
    }));

    res.json({
      success: true,
      data: schema
    });
  } catch (error) {
    console.error('Error generating template schema:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating template schema',
      error: error.message
    });
  }
};

module.exports = {
  createTemplate,
  listTemplates,
  getTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  activateTemplate,
  uploadPDF,
  extractDelimiters,
  previewTemplate,
  getTemplateSchema
};
