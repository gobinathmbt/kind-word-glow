const nodemailer = require('nodemailer');
const axios = require('axios');

/**
 * E-Sign Notification Service
 * 
 * Integrates with existing NotificationConfiguration model and provides
 * email/SMS sending capabilities for e-sign events.
 */

/**
 * Send email notification
 * @param {Object} provider - Email provider configuration
 * @param {Object} credentials - Decrypted provider credentials
 * @param {Object} settings - Provider settings
 * @param {Object} emailData - Email data (to, subject, html, text)
 * @returns {Promise<Object>} Send result
 */
async function sendEmail(provider, credentials, settings, emailData) {
  const { to, subject, html, text, from, attachments } = emailData;

  try {
    switch (provider) {
      case 'smtp':
        return await sendViaSMTP(credentials, settings, { to, subject, html, text, from, attachments });
      
      case 'sendgrid':
        return await sendViaSendGrid(credentials, { to, subject, html, text, from, attachments });
      
      case 'mailgun':
        return await sendViaMailgun(credentials, settings, { to, subject, html, text, from, attachments });
      
      default:
        throw new Error(`Unsupported email provider: ${provider}`);
    }
  } catch (error) {
    console.error(`Email send error (${provider}):`, error);
    throw error;
  }
}

/**
 * Send email via SMTP
 */
async function sendViaSMTP(credentials, settings, emailData) {
  const transporter = nodemailer.createTransport({
    host: credentials.host,
    port: credentials.port || 587,
    secure: credentials.secure || false,
    auth: {
      user: credentials.username,
      pass: credentials.password
    }
  });

  const mailOptions = {
    from: emailData.from || credentials.from_email || credentials.username,
    to: emailData.to,
    subject: emailData.subject,
    text: emailData.text,
    html: emailData.html,
    attachments: emailData.attachments
  };

  const info = await transporter.sendMail(mailOptions);

  return {
    success: true,
    messageId: info.messageId,
    provider: 'smtp'
  };
}

/**
 * Send email via SendGrid
 */
async function sendViaSendGrid(credentials, emailData) {
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(credentials.api_key);

  const msg = {
    to: emailData.to,
    from: emailData.from || credentials.from_email,
    subject: emailData.subject,
    text: emailData.text,
    html: emailData.html,
    attachments: emailData.attachments?.map(att => ({
      content: att.content.toString('base64'),
      filename: att.filename,
      type: att.contentType,
      disposition: 'attachment'
    }))
  };

  const response = await sgMail.send(msg);

  return {
    success: true,
    messageId: response[0].headers['x-message-id'],
    provider: 'sendgrid'
  };
}

/**
 * Send email via Mailgun
 */
async function sendViaMailgun(credentials, settings, emailData) {
  const domain = credentials.domain;
  const apiKey = credentials.api_key;
  const region = credentials.region || 'us'; // 'us' or 'eu'

  const baseUrl = region === 'eu' 
    ? 'https://api.eu.mailgun.net/v3'
    : 'https://api.mailgun.net/v3';

  const formData = new FormData();
  formData.append('from', emailData.from || credentials.from_email);
  formData.append('to', emailData.to);
  formData.append('subject', emailData.subject);
  formData.append('text', emailData.text);
  formData.append('html', emailData.html);

  if (emailData.attachments) {
    emailData.attachments.forEach(att => {
      formData.append('attachment', att.content, att.filename);
    });
  }

  const response = await axios.post(
    `${baseUrl}/${domain}/messages`,
    formData,
    {
      auth: {
        username: 'api',
        password: apiKey
      }
    }
  );

  return {
    success: true,
    messageId: response.data.id,
    provider: 'mailgun'
  };
}

/**
 * Send SMS notification
 * @param {Object} provider - SMS provider configuration
 * @param {Object} credentials - Decrypted provider credentials
 * @param {Object} settings - Provider settings
 * @param {Object} smsData - SMS data (to, message)
 * @returns {Promise<Object>} Send result
 */
async function sendSMS(provider, credentials, settings, smsData) {
  const { to, message } = smsData;

  try {
    switch (provider) {
      case 'twilio':
        return await sendViaTwilio(credentials, { to, message });
      
      case 'sendgrid_sms':
        return await sendViaSendGridSMS(credentials, { to, message });
      
      case 'aws_sns':
        return await sendViaAWSSNS(credentials, settings, { to, message });
      
      default:
        throw new Error(`Unsupported SMS provider: ${provider}`);
    }
  } catch (error) {
    console.error(`SMS send error (${provider}):`, error);
    throw error;
  }
}

/**
 * Send SMS via Twilio
 */
async function sendViaTwilio(credentials, smsData) {
  const twilio = require('twilio');
  const client = twilio(credentials.account_sid, credentials.auth_token);

  const message = await client.messages.create({
    body: smsData.message,
    from: credentials.from_number,
    to: smsData.to
  });

  return {
    success: true,
    messageId: message.sid,
    provider: 'twilio'
  };
}

/**
 * Send SMS via SendGrid SMS (deprecated, but included for completeness)
 */
async function sendViaSendGridSMS(credentials, smsData) {
  // Note: SendGrid SMS is deprecated. This is a placeholder.
  throw new Error('SendGrid SMS is deprecated. Please use Twilio or AWS SNS instead.');
}

/**
 * Send SMS via AWS SNS
 */
async function sendViaAWSSNS(credentials, settings, smsData) {
  const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
  
  const snsClient = new SNSClient({
    region: credentials.region || settings.region || 'us-east-1',
    credentials: {
      accessKeyId: credentials.access_key_id,
      secretAccessKey: credentials.secret_access_key
    }
  });

  const command = new PublishCommand({
    Message: smsData.message,
    PhoneNumber: smsData.to
  });

  const response = await snsClient.send(command);

  return {
    success: true,
    messageId: response.MessageId,
    provider: 'aws_sns'
  };
}

/**
 * Send notification with retry logic
 * @param {Function} sendFunction - Function to send notification
 * @param {number} maxRetries - Maximum number of retries (default: 3)
 * @param {string} backoffType - Backoff type: 'exponential' or 'fixed' (default: 'exponential')
 * @returns {Promise<Object>} Send result
 */
async function sendWithRetry(sendFunction, maxRetries = 3, backoffType = 'exponential') {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await sendFunction();
      return {
        ...result,
        attempts: attempt + 1
      };
    } catch (error) {
      lastError = error;
      console.error(`Send attempt ${attempt + 1} failed:`, error.message);
      
      // Don't retry on last attempt
      if (attempt < maxRetries - 1) {
        const delay = backoffType === 'exponential' 
          ? Math.pow(2, attempt) * 1000  // 1s, 2s, 4s, 8s
          : 5000;  // Fixed 5s delay
        
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(`Failed after ${maxRetries} attempts: ${lastError.message}`);
}

/**
 * Test email provider connection
 */
async function testEmailProvider(provider, credentials, settings, recipientEmail) {
  try {
    const emailData = {
      to: recipientEmail,
      subject: 'E-Sign Email Provider Test',
      text: 'This is a test email from your E-Sign platform. If you received this, your email provider is configured correctly.',
      html: '<p>This is a test email from your E-Sign platform.</p><p>If you received this, your email provider is configured correctly.</p>',
      from: credentials.from_email || credentials.username
    };

    const result = await sendEmail(provider, credentials, settings, emailData);

    return {
      success: true,
      message: `Test email sent successfully to ${recipientEmail}`,
      messageId: result.messageId
    };
  } catch (error) {
    return {
      success: false,
      message: 'Email provider test failed',
      error: error.message
    };
  }
}

/**
 * Test SMS provider connection
 */
async function testSmsProvider(provider, credentials, settings, phoneNumber) {
  try {
    const testOTP = Math.floor(100000 + Math.random() * 900000).toString();
    
    const smsData = {
      to: phoneNumber,
      message: `Your E-Sign test OTP is: ${testOTP}. This is a test message to verify your SMS provider configuration.`
    };

    const result = await sendSMS(provider, credentials, settings, smsData);

    return {
      success: true,
      message: `Test SMS sent successfully to ${phoneNumber}`,
      messageId: result.messageId
    };
  } catch (error) {
    return {
      success: false,
      message: 'SMS provider test failed',
      error: error.message
    };
  }
}

/**
 * Send e-sign notification using configured providers
 * @param {Object} companyDb - Company database connection
 * @param {string} companyId - Company ID
 * @param {string} eventType - Event type (e.g., 'esign.document.created')
 * @param {Object} data - Notification data
 * @returns {Promise<Object>} Send result
 */
async function sendEsignNotification(companyDb, companyId, eventType, data) {
  try {
    // Get notification configuration for this event type
    const NotificationConfiguration = companyDb.model('NotificationConfiguration');
    const config = await NotificationConfiguration.findOne({
      company_id: companyId,
      event_type: eventType,
      is_active: true
    });

    if (!config) {
      console.log(`No active notification configuration found for event: ${eventType}`);
      return { success: false, message: 'No active notification configuration' };
    }

    // Get active email provider
    const EsignProviderConfig = companyDb.model('EsignProviderConfig');
    const emailProvider = await EsignProviderConfig.findOne({
      company_id: companyId,
      provider_type: 'email',
      is_active: true
    });

    if (!emailProvider) {
      console.log('No active email provider configured');
      return { success: false, message: 'No active email provider' };
    }

    // Decrypt credentials
    const encryptionService = require('./encryption.service');
    const credentials = encryptionService.decryptCredentials(emailProvider.credentials);

    // Send email
    const result = await sendWithRetry(
      () => sendEmail(emailProvider.provider, credentials, emailProvider.settings, data),
      3,
      'exponential'
    );

    return result;
  } catch (error) {
    console.error('Error sending e-sign notification:', error);
    throw error;
  }
}

module.exports = {
  sendEmail,
  sendSMS,
  sendWithRetry,
  testEmailProvider,
  testSmsProvider,
  sendEsignNotification
};
