/**
 * Delimiter Service for E-Sign Templates
 * 
 * This service handles delimiter extraction, validation, and management
 * for e-sign templates. Delimiters are placeholders in HTML content
 * that are replaced with actual data when documents are created.
 * 
 * Delimiter format: {{key_name}}
 */

/**
 * Extract delimiters from HTML content
 * @param {string} htmlContent - HTML content to scan
 * @returns {Array} Array of delimiter keys found in HTML
 */
const extractDelimitersFromHtml = (htmlContent) => {
  if (!htmlContent || typeof htmlContent !== 'string') {
    return [];
  }

  const regex = /\{\{([a-zA-Z0-9_]+)\}\}/g;
  const matches = [];
  let match;

  while ((match = regex.exec(htmlContent)) !== null) {
    matches.push(match[1]);
  }

  // Return unique delimiter keys
  return [...new Set(matches)];
};

/**
 * Scan HTML and populate delimiters array
 * Preserves existing delimiter configuration when re-scanning
 * @param {string} htmlContent - HTML content to scan
 * @param {Array} existingDelimiters - Existing delimiter configurations
 * @returns {Array} Updated delimiters array
 */
const scanAndPopulateDelimiters = (htmlContent, existingDelimiters = []) => {
  // Extract delimiter keys from HTML
  const htmlDelimiterKeys = extractDelimitersFromHtml(htmlContent);

  // Create a map of existing delimiters for quick lookup
  const existingDelimiterMap = new Map();
  existingDelimiters.forEach(delimiter => {
    existingDelimiterMap.set(delimiter.key, delimiter);
  });

  // Build updated delimiters array
  const updatedDelimiters = [];

  htmlDelimiterKeys.forEach(key => {
    if (existingDelimiterMap.has(key)) {
      // Preserve existing configuration
      updatedDelimiters.push(existingDelimiterMap.get(key));
    } else {
      // Add new delimiter with default configuration
      updatedDelimiters.push({
        key,
        type: 'text',
        required: false,
        default_value: '',
        assigned_to: null,
        position: null
      });
    }
  });

  // Mark unused delimiters (delimiters that exist in config but not in HTML)
  existingDelimiters.forEach(delimiter => {
    if (!htmlDelimiterKeys.includes(delimiter.key)) {
      // Add delimiter with unused flag
      updatedDelimiters.push({
        ...delimiter,
        unused: true
      });
    }
  });

  return updatedDelimiters;
};

/**
 * Validate delimiters in email templates exist in HTML content
 * @param {string} emailTemplate - Email template content
 * @param {Array} htmlDelimiters - Delimiters defined in HTML
 * @returns {Object} Validation result with missing delimiters
 */
const validateEmailTemplateDelimiters = (emailTemplate, htmlDelimiters) => {
  if (!emailTemplate) {
    return { valid: true, missingDelimiters: [] };
  }

  // Extract delimiters from email template
  const emailDelimiterKeys = extractDelimitersFromHtml(emailTemplate);

  // Get HTML delimiter keys
  const htmlDelimiterKeys = htmlDelimiters.map(d => d.key);

  // Find missing delimiters
  const missingDelimiters = emailDelimiterKeys.filter(
    key => !htmlDelimiterKeys.includes(key)
  );

  return {
    valid: missingDelimiters.length === 0,
    missingDelimiters
  };
};

/**
 * Validate all delimiters in notification config
 * @param {Object} notificationConfig - Notification configuration
 * @param {Array} htmlDelimiters - Delimiters defined in HTML
 * @returns {Object} Validation result
 */
const validateNotificationDelimiters = (notificationConfig, htmlDelimiters) => {
  const errors = [];

  if (!notificationConfig) {
    return { valid: true, errors: [] };
  }

  // Validate custom email template
  if (notificationConfig.custom_email_template) {
    const emailValidation = validateEmailTemplateDelimiters(
      notificationConfig.custom_email_template,
      htmlDelimiters
    );

    if (!emailValidation.valid) {
      errors.push({
        field: 'custom_email_template',
        message: `Email template references undefined delimiters: ${emailValidation.missingDelimiters.join(', ')}`
      });
    }
  }

  // Validate custom email subject
  if (notificationConfig.custom_email_subject) {
    const subjectValidation = validateEmailTemplateDelimiters(
      notificationConfig.custom_email_subject,
      htmlDelimiters
    );

    if (!subjectValidation.valid) {
      errors.push({
        field: 'custom_email_subject',
        message: `Email subject references undefined delimiters: ${subjectValidation.missingDelimiters.join(', ')}`
      });
    }
  }

  // Validate custom SMS template
  if (notificationConfig.custom_sms_template) {
    const smsValidation = validateEmailTemplateDelimiters(
      notificationConfig.custom_sms_template,
      htmlDelimiters
    );

    if (!smsValidation.valid) {
      errors.push({
        field: 'custom_sms_template',
        message: `SMS template references undefined delimiters: ${smsValidation.missingDelimiters.join(', ')}`
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Replace delimiters in text with actual values
 * @param {string} text - Text containing delimiters
 * @param {Object} values - Object with delimiter values
 * @returns {string} Text with delimiters replaced
 */
const replaceDelimiters = (text, values = {}) => {
  if (!text || typeof text !== 'string') {
    return text;
  }

  let result = text;

  // Replace each delimiter with its value
  Object.keys(values).forEach(key => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    const value = values[key] !== undefined && values[key] !== null ? values[key] : '';
    result = result.replace(regex, value);
  });

  // Replace any remaining delimiters with empty string
  result = result.replace(/\{\{[a-zA-Z0-9_]+\}\}/g, '');

  return result;
};

/**
 * Validate delimiter values against their types
 * @param {Array} delimiters - Delimiter definitions
 * @param {Object} values - Delimiter values to validate
 * @returns {Object} Validation result
 */
const validateDelimiterValues = (delimiters, values) => {
  const errors = [];

  delimiters.forEach(delimiter => {
    const value = values[delimiter.key];

    // Check required delimiters
    if (delimiter.required && (value === undefined || value === null || value === '')) {
      errors.push({
        key: delimiter.key,
        message: `Required delimiter '${delimiter.key}' is missing`
      });
      return;
    }

    // Skip validation if value is not provided and not required
    if (value === undefined || value === null || value === '') {
      return;
    }

    // Validate based on type
    switch (delimiter.type) {
      case 'email':
        if (!isValidEmail(value)) {
          errors.push({
            key: delimiter.key,
            message: `Delimiter '${delimiter.key}' must be a valid email address`
          });
        }
        break;

      case 'phone':
        if (!isValidPhone(value)) {
          errors.push({
            key: delimiter.key,
            message: `Delimiter '${delimiter.key}' must be a valid phone number`
          });
        }
        break;

      case 'date':
        if (!isValidDate(value)) {
          errors.push({
            key: delimiter.key,
            message: `Delimiter '${delimiter.key}' must be a valid date`
          });
        }
        break;

      case 'number':
        if (!isValidNumber(value)) {
          errors.push({
            key: delimiter.key,
            message: `Delimiter '${delimiter.key}' must be a valid number`
          });
        }
        break;

      // text, signature, initial types don't need validation
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone format (basic validation)
 */
function isValidPhone(phone) {
  // Remove common phone number characters
  const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
  // Check if it's a valid number with 7-15 digits
  return /^\d{7,15}$/.test(cleaned);
}

/**
 * Validate date format
 */
function isValidDate(date) {
  // Try to parse as Date
  const parsed = new Date(date);
  return !isNaN(parsed.getTime());
}

/**
 * Validate number format
 */
function isValidNumber(number) {
  return !isNaN(parseFloat(number)) && isFinite(number);
}

/**
 * Get delimiter schema for API integration
 * @param {Array} delimiters - Delimiter definitions
 * @returns {Object} Schema object
 */
const getDelimiterSchema = (delimiters) => {
  const schema = {
    type: 'object',
    properties: {},
    required: []
  };

  delimiters.forEach(delimiter => {
    // Skip unused delimiters
    if (delimiter.unused) {
      return;
    }

    schema.properties[delimiter.key] = {
      type: getSchemaType(delimiter.type),
      description: `${delimiter.type} field`,
      default: delimiter.default_value || undefined
    };

    if (delimiter.required) {
      schema.required.push(delimiter.key);
    }

    // Add format for specific types
    if (delimiter.type === 'email') {
      schema.properties[delimiter.key].format = 'email';
    } else if (delimiter.type === 'date') {
      schema.properties[delimiter.key].format = 'date';
    }
  });

  return schema;
};

/**
 * Get JSON schema type from delimiter type
 */
function getSchemaType(delimiterType) {
  switch (delimiterType) {
    case 'number':
      return 'number';
    case 'date':
      return 'string';
    default:
      return 'string';
  }
}

module.exports = {
  extractDelimitersFromHtml,
  scanAndPopulateDelimiters,
  validateEmailTemplateDelimiters,
  validateNotificationDelimiters,
  replaceDelimiters,
  validateDelimiterValues,
  getDelimiterSchema
};
