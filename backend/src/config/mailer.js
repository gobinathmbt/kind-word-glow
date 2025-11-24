const nodemailer = require('nodemailer');
const MasterAdmin = require('../models/MasterAdmin'); // Adjust path as needed

class MailService {
  constructor() {
    this.transporter = null;
    this.fromEmail = null;
    this.fromName = null;
  }

  async init() {
    try {
      // Get SMTP configuration from database
      const emailConfig = await this.getEmailClient();
      
      // Create transporter with retrieved credentials
      this.transporter = nodemailer.createTransport({
        host: emailConfig.host,
        port: emailConfig.port,
        secure: emailConfig.secure,
        auth: {
          user: emailConfig.auth.user,
          pass: emailConfig.auth.pass
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      // Store from email details
      this.fromEmail = emailConfig.from_email;
      this.fromName = emailConfig.from_name;

      // Verify connection
      await this.transporter.verify();
      console.log('✅ Email service connected successfully');
      
      return true;
    } catch (error) {
      console.error('❌ Email service initialization error:', error.message);
      throw error;
    }
  }

  async getEmailClient() {
    try {
      const masterAdmin = await MasterAdmin.findOne({ role: 'master_admin' });
      
      if (!masterAdmin) {
        throw new Error('SMTP configuration not found: MasterAdmin record not found');
      }

      if (!masterAdmin.smtp_settings) {
        throw new Error('SMTP settings not configured in master admin');
      }

      const smtpSettings = masterAdmin.smtp_settings;

      // Validate required SMTP settings
      if (!smtpSettings.host || !smtpSettings.port || !smtpSettings.user || !smtpSettings.password) {
        throw new Error('Invalid SMTP configuration: Missing required fields');
      }

      if (!smtpSettings.from_email) {
        throw new Error('Invalid SMTP configuration: Missing from_email field');
      }

      return {
        host: smtpSettings.host,
        port: smtpSettings.port,
        secure: smtpSettings.secure || false,
        auth: {
          user: smtpSettings.user,
          pass: smtpSettings.password
        },
        from_email: smtpSettings.from_email,
        from_name: smtpSettings.from_name || 'Auto Erp Platform'
      };

    } catch (error) {
      console.error('Error retrieving SMTP configuration:', error.message);
      throw error;
    }
  }

  async sendEmail({ to, subject, html, text, cc, attachments }) {
    try {
      // Initialize if not already done
      if (!this.transporter) {
        await this.init();
      }

      const mailOptions = {
        from: `${this.fromName} <${this.fromEmail}>`,
        to,
        subject,
        html,
        text
      };

      // Add CC if provided
      if (cc) {
        mailOptions.cc = cc;
      }

      // Add attachments if provided
      if (attachments && attachments.length > 0) {
        mailOptions.attachments = attachments;
      }

      const result = await this.transporter.sendMail(mailOptions);
      return result;
    } catch (error) {
      console.error(`❌ Failed to send email to ${to}:`, error.message);
      throw error;
    }
  }

  async sendWelcomeEmail(companyData) {
    const { email, company_name, login_credentials, frontend_url } = companyData;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3b82f6;">Welcome to Auto Erp!</h1>
        <p>Dear ${company_name} team,</p>
        <p>Your company has been successfully registered on our platform. Here are your login credentials:</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Email:</strong> ${login_credentials.email}</p>
          <p><strong>Password:</strong> ${login_credentials.password}</p>
          <p><strong>Role:</strong> Company Super Admin</p>
        </div>
        
        <p>Please log in and change your password immediately for security purposes.</p>
        <p>You can access your dashboard at: <a href="${frontend_url}/login">Login Here</a></p>
        
        <p>Best regards,<br>Auto Erp Team</p>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Welcome to Auto Erp - Your Account is Ready!',
      html
    });
  }

  async sendUserCreatedEmail(userData) {
    const { email, username, password, created_by_company, frontend_url } = userData;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3b82f6;">Your Auto Erp Account</h1>
        <p>Hello,</p>
        <p>An account has been created for you by ${created_by_company}. Here are your login credentials:</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Username:</strong> ${username}</p>
          <p><strong>Password:</strong> ${password}</p>
        </div>
        
        <p>Please log in and change your password on first login.</p>
        <p>You can access the platform at: <a href="${frontend_url}/login">Login Here</a></p>
        
        <p>Best regards,<br>Auto Erp Team</p>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Your Auto Erp Account Credentials',
      html
    });
  }
}

// Create singleton instance
const mailService = new MailService();

module.exports = mailService;