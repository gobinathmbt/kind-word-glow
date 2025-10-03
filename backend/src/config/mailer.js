
const nodemailer = require('nodemailer');
const config = require('./env');

class MailService {
  constructor() {
    this.transporter = null;
    this.init();
  }

  async init() {
    try {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: config.GMAIL_USER,
          pass: config.GMAIL_PASSWORD
        }
      });

      // Verify connection
      await this.transporter.verify();
      console.log('✅ Email service connected');
    } catch (error) {
      console.error('❌ Email service error:', error.message);
    }
  }

  async sendEmail({ to, subject, html, text }) {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      const mailOptions = {
        from: `Auto Erp Platform <${config.GMAIL_USER}>`,
        to,
        subject,
        html,
        text
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`📧 Email sent successfully to ${to}`);
      return result;
    } catch (error) {
      console.error(`❌ Failed to send email to ${to}:`, error.message);
      throw error;
    }
  }

  // Template methods
  async sendWelcomeEmail(companyData) {
    const { email, company_name, login_credentials } = companyData;
    
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
        <p>You can access your dashboard at: <a href="${config.FRONTEND_URL}/login">Login Here</a></p>
        
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
    const { email, username, password, created_by_company } = userData;
    
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
        <p>You can access the platform at: <a href="${config.FRONTEND_URL}/login">Login Here</a></p>
        
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
