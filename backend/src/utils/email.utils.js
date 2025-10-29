const mailService = require('../config/mailer');
const nodemailer = require('nodemailer');

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
      const regex = new RegExp(`\\{\\{vehicle\\.${key}\\}\\}`, 'g');
      result = result.replace(regex, data.vehicle[key] || '');
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
