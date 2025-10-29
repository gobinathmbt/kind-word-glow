const mailService = require('../config/mailer');
const nodemailer = require('nodemailer');

/**
 * Replace template variables with actual values
 * @param {string} template - Template string with {{variables}}
 * @param {object} data - Data object containing values
 * @returns {string} - Template with replaced values
 */
const replaceTemplateVariables = (template, data) => {
  if (!template) return '';
  
  let result = template;
  
  // Replace {{vehicle.*}} variables
  if (data.vehicle) {
    Object.keys(data.vehicle).forEach(key => {
      const regex = new RegExp(`\\{\\{vehicle\\.${key}\\}\\}`, 'g');
      result = result.replace(regex, data.vehicle[key] || '');
    });
  }
  
  // Replace {{response.*}} variables
  if (data.response) {
    Object.keys(data.response).forEach(key => {
      const regex = new RegExp(`\\{\\{response\\.${key}\\}\\}`, 'g');
      result = result.replace(regex, data.response[key] || '');
    });
  }
  
  // Replace {{error.*}} variables
  if (data.error) {
    Object.keys(data.error).forEach(key => {
      const regex = new RegExp(`\\{\\{error\\.${key}\\}\\}`, 'g');
      result = result.replace(regex, data.error[key] || '');
    });
  }
  
  // Replace {{company.*}} variables
  if (data.company) {
    Object.keys(data.company).forEach(key => {
      const regex = new RegExp(`\\{\\{company\\.${key}\\}\\}`, 'g');
      result = result.replace(regex, data.company[key] || '');
    });
  }
  
  // Replace {{timestamp}}
  result = result.replace(/\{\{timestamp\}\}/g, data.timestamp || new Date().toISOString());
  
  return result;
};

/**
 * Send email using Gmail
 * @param {object} config - Email configuration
 * @param {object} data - Data for template variables
 * @returns {Promise<object>} - Email send result
 */
const sendGmailEmail = async (config, data) => {
  try {
    const subject = replaceTemplateVariables(config.subject, data);
    const html = replaceTemplateVariables(config.html_content, data);
    const text = replaceTemplateVariables(config.text_content, data);
    
    const result = await mailService.sendEmail({
      to: config.to_email,
      subject,
      html,
      text,
    });
    
    return { success: true, result };
  } catch (error) {
    console.error('Gmail send error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send email using SendGrid
 * @param {object} config - Email configuration  
 * @param {object} data - Data for template variables
 * @returns {Promise<object>} - Email send result
 */
const sendSendGridEmail = async (config, data) => {
  try {
    // SendGrid implementation would go here
    // For now, falling back to SMTP
    const subject = replaceTemplateVariables(config.subject, data);
    const html = replaceTemplateVariables(config.html_content, data);
    const text = replaceTemplateVariables(config.text_content, data);
    
    const result = await mailService.sendEmail({
      to: config.to_email,
      subject,
      html,
      text,
    });
    
    return { success: true, result };
  } catch (error) {
    console.error('SendGrid send error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send workflow email notification
 * @param {object} emailConfig - Email node configuration
 * @param {object} data - Data for template variables
 * @returns {Promise<object>} - Email send result
 */
const sendWorkflowEmail = async (emailConfig, data) => {
  if (!emailConfig || !emailConfig.service) {
    return { success: false, error: 'Email configuration missing' };
  }
  
  try {
    if (emailConfig.service === 'gmail') {
      return await sendGmailEmail(emailConfig, data);
    } else if (emailConfig.service === 'sendgrid') {
      return await sendSendGridEmail(emailConfig, data);
    } else {
      return { success: false, error: `Unsupported email service: ${emailConfig.service}` };
    }
  } catch (error) {
    console.error('Send workflow email error:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  replaceTemplateVariables,
  sendWorkflowEmail,
  sendGmailEmail,
  sendSendGridEmail,
};
