const mailService = require('../config/mailer');
const nodemailer = require('nodemailer');
const User = require('../models/User');

const replaceTemplateVariables = (template, data) => {
  if (!template) return '';
  
  let result = template;
  
  // Handle status color based on response
  const statusColor = data.response?.status === '200' ? '#d4edda' : '#f8d7da';
  result = result.replace(/\{\{status_color\}\}/g, statusColor);
  
  // Handle error section conditionals
  if (data.error && data.error.message) {
    result = result.replace(/\{\{error_section\}\}/g, `<p><strong>Error:</strong> ${data.error.message}</p>`);
    result = result.replace(/\{\{error_text\}\}/g, `Error: ${data.error.message}`);
  } else {
    result = result.replace(/\{\{error_section\}\}/g, '');
    result = result.replace(/\{\{error_text\}\}/g, '');
  }
  
  // Handle vehicle loops for multiple vehicles
  const vehicleLoopStartRegex = /\{\{vehicles_loop_start\}\}([\s\S]*?)\{\{vehicles_loop_end\}\}/g;
  const vehicleLoopMatch = result.match(vehicleLoopStartRegex);
  
  if (vehicleLoopMatch && data.vehicle_results && Array.isArray(data.vehicle_results)) {
    let vehiclesHtml = '';
    
    data.vehicle_results.forEach(vehicle => {
      let vehicleTemplate = vehicleLoopMatch[0]
        .replace(/\{\{vehicles_loop_start\}\}/g, '')
        .replace(/\{\{vehicles_loop_end\}\}/g, '');
      
      // Vehicle-specific colors
      const vehicleStatusColor = vehicle.status === 'success' ? '#f0fdf4' : '#fef2f2';
      const vehicleBorderColor = vehicle.status === 'success' ? '#22c55e' : '#ef4444';
      vehicleTemplate = vehicleTemplate.replace(/\{\{vehicle_status_color\}\}/g, vehicleStatusColor);
      vehicleTemplate = vehicleTemplate.replace(/\{\{vehicle_border_color\}\}/g, vehicleBorderColor);
      
      // Replace vehicle-specific variables
      Object.keys(vehicle).forEach(key => {
        const regex = new RegExp(`\\{\\{vehicle\\.${key}\\}\\}`, 'g');
        vehicleTemplate = vehicleTemplate.replace(regex, vehicle[key] || '');
      });
      
      // Handle vehicle error section
      if (vehicle.error_message) {
        vehicleTemplate = vehicleTemplate.replace(/\{\{vehicle_error_section\}\}/g, 
          `<p style="margin: 5px 0; color: #dc2626;"><strong>Error:</strong> ${vehicle.error_message}</p>`);
        vehicleTemplate = vehicleTemplate.replace(/\{\{vehicle_error_text\}\}/g, 
          `Error: ${vehicle.error_message}`);
      } else {
        vehicleTemplate = vehicleTemplate.replace(/\{\{vehicle_error_section\}\}/g, '');
        vehicleTemplate = vehicleTemplate.replace(/\{\{vehicle_error_text\}\}/g, '');
      }
      
      vehiclesHtml += vehicleTemplate;
    });
    
    result = result.replace(vehicleLoopStartRegex, vehiclesHtml);
  } else {
    // Remove loop markers if no vehicle results
    result = result.replace(vehicleLoopStartRegex, '');
  }
  
  // Replace {{vehicle.*}} variables for single vehicle
  if (data.vehicle) {
    Object.keys(data.vehicle).forEach(key => {
      // Replace {{vehicle.key}} format
      const regexWithPrefix = new RegExp(`\\{\\{vehicle\\.${key}\\}\\}`, 'g');
      result = result.replace(regexWithPrefix, data.vehicle[key] || '');
      
      // Also replace {{key}} format (without vehicle. prefix) for backward compatibility
      const regexWithoutPrefix = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regexWithoutPrefix, data.vehicle[key] || '');
    });
  }
  
  // Replace {{vehicles_summary.*}} variables
  if (data.vehicles_summary) {
    Object.keys(data.vehicles_summary).forEach(key => {
      const regex = new RegExp(`\\{\\{vehicles_summary\\.${key}\\}\\}`, 'g');
      result = result.replace(regex, data.vehicles_summary[key] || '0');
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

const sendGmailEmail = async (config, data, userEmails = {}) => {
  try {
    const subject = replaceTemplateVariables(config.subject, data);
    const html = replaceTemplateVariables(config.html_content, data);
    const text = replaceTemplateVariables(config.text_content, data);
    
    // Get recipient emails from user IDs
    const toEmails = userEmails.to || [];
    const ccEmails = userEmails.cc || [];
    
    // If no user-based recipients, fall back to legacy to_email field
    const recipients = toEmails.length > 0 ? toEmails.join(',') : config.to_email;
    
    const emailOptions = {
      to: recipients,
      subject,
      html,
      text,
    };
    
    // Add CC if present
    if (ccEmails.length > 0) {
      emailOptions.cc = ccEmails.join(',');
    }
    
    // Add attachments if present
    if (config.attachments && config.attachments.length > 0) {
      const validAttachments = config.attachments.filter(att => att.name && (att.url || att.path || att.content));
      if (validAttachments.length > 0) {
        emailOptions.attachments = validAttachments.map(att => {
          // Handle base64 content attachments (uploaded files)
          if (att.content && att.encoding === 'base64') {
            // Extract base64 data (remove data:mime;base64, prefix if present)
            const base64Data = att.content.includes('base64,') 
              ? att.content.split('base64,')[1] 
              : att.content;
            
            return {
              filename: att.name,
              content: base64Data,
              encoding: 'base64',
              contentType: att.type || 'application/octet-stream'
            };
          }
          // Handle URL/path attachments
          return {
            filename: att.name,
            path: att.url || att.path,
          };
        });
      }
    }
    
    const result = await mailService.sendEmail(emailOptions);
    
    return { success: true, result };
  } catch (error) {
    console.error('❌ Gmail send error:', error);
    return { success: false, error: error.message };
  }
};

const sendSendGridEmail = async (config, data, userEmails = {}) => {
  try {
    // SendGrid implementation would go here
    // For now, falling back to SMTP
    const subject = replaceTemplateVariables(config.subject, data);
    const html = replaceTemplateVariables(config.html_content, data);
    const text = replaceTemplateVariables(config.text_content, data);
    
    // Get recipient emails from user IDs
    const toEmails = userEmails.to || [];
    const ccEmails = userEmails.cc || [];
    
    // If no user-based recipients, fall back to legacy to_email field
    const recipients = toEmails.length > 0 ? toEmails.join(',') : config.to_email;
    
    const emailOptions = {
      to: recipients,
      subject,
      html,
      text,
    };
    
    // Add CC if present
    if (ccEmails.length > 0) {
      emailOptions.cc = ccEmails.join(',');
    }
    
    // Add attachments if present
    if (config.attachments && config.attachments.length > 0) {
      const validAttachments = config.attachments.filter(att => att.name && (att.url || att.path || att.content));
      if (validAttachments.length > 0) {
        emailOptions.attachments = validAttachments.map(att => {
          // Handle base64 content attachments (uploaded files)
          if (att.content && att.encoding === 'base64') {
            // Extract base64 data (remove data:mime;base64, prefix if present)
            const base64Data = att.content.includes('base64,') 
              ? att.content.split('base64,')[1] 
              : att.content;
            
            return {
              filename: att.name,
              content: base64Data,
              encoding: 'base64',
              contentType: att.type || 'application/octet-stream'
            };
          }
          // Handle URL/path attachments
          return {
            filename: att.name,
            path: att.url || att.path,
          };
        });
      }
    }
    
    const result = await mailService.sendEmail(emailOptions);
    
    return { success: true, result };
  } catch (error) {
    console.error('❌ SendGrid send error:', error);
    return { success: false, error: error.message };
  }
};


// Helper function to get user emails from user IDs or all users
const getUserEmailsFromConfig = async (emailConfig, companyId, excludeUserId = null) => {
  try {
    let users = [];
    
    // Check if to_email_type is 'all' or 'specific_users'
    if (emailConfig.to_email_type === 'all') {
      // Get all active users from the company
      const query = {
        company_id: companyId,
        is_active: true
      };
      
      // Exclude specific user if provided (e.g., the workflow creator or triggering user)
      if (excludeUserId) {
        query._id = { $ne: excludeUserId };
      }
      
      users = await User.find(query).select('_id first_name last_name email').lean();
      
    } else if (emailConfig.to_email_type === 'specific_users' && emailConfig.to_user_ids && emailConfig.to_user_ids.length > 0) {
      // Get specific users by IDs
      let userIds = emailConfig.to_user_ids;
      
      // Exclude specific user if provided
      if (excludeUserId) {
        userIds = userIds.filter(id => id.toString() !== excludeUserId.toString());
      }
      
      users = await User.find({
        _id: { $in: userIds },
        company_id: companyId,
        is_active: true
      }).select('_id first_name last_name email').lean();
    }
    
    // Extract TO email addresses
    const toEmails = users.map(user => user.email);
    
    // Get CC users if specified
    let ccEmails = [];
    if (emailConfig.cc_user_ids && emailConfig.cc_user_ids.length > 0) {
      const ccUsers = await User.find({
        _id: { $in: emailConfig.cc_user_ids },
        company_id: companyId,
        is_active: true
      }).select('_id first_name last_name email').lean();
      
      ccEmails = ccUsers.map(user => user.email);
    }
    
    return {
      to: toEmails,
      cc: ccEmails
    };
  } catch (error) {
    console.error('Error fetching user emails:', error);
    return { to: [], cc: [] };
  }
};

const sendWorkflowEmail = async (emailConfig, data, companyId = null, excludeUserId = null) => {
  // Enhanced validation and logging
  if (!emailConfig) {
    console.error('❌ Email configuration is null or undefined');
    return { success: false, error: 'Email configuration missing' };
  }
  
  // Default to 'gmail' if service is not specified
  if (!emailConfig.service) {
    console.warn('⚠️  Email service not specified, defaulting to Gmail');
    emailConfig.service = 'gmail';
  }
  
  try {
    // Get user emails based on configuration
    let userEmails = { to: [], cc: [] };
    
    // If companyId is provided and user-based email configuration exists
    if (companyId && (emailConfig.to_email_type === 'all' || emailConfig.to_email_type === 'specific_users')) {
      userEmails = await getUserEmailsFromConfig(emailConfig, companyId, excludeUserId);
      
      if (userEmails.to.length === 0) {
        console.warn('⚠️  No user emails found. Check user configuration.');
      }
    }
    
    if (emailConfig.service === 'gmail') {
      return await sendGmailEmail(emailConfig, data, userEmails);
    } else if (emailConfig.service === 'sendgrid') {
      return await sendSendGridEmail(emailConfig, data, userEmails);
    } else {
      return { success: false, error: `Unsupported email service: ${emailConfig.service}` };
    }
  } catch (error) {
    console.error('❌ Send workflow email error:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  replaceTemplateVariables,
  sendWorkflowEmail,
  sendGmailEmail,
  sendSendGridEmail,
  getUserEmailsFromConfig,
};
