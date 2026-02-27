const crypto = require('crypto');
const bcrypt = require('bcryptjs');

/**
 * OTP Service for generation, hashing, verification with MongoDB storage
 * 
 * Provides secure OTP management for multi-factor authentication
 */

const OTP_CONFIG = {
  length: 6,
  expiryMinutes: 10,
  maxAttempts: 5,
  lockoutMinutes: 30,
  saltRounds: 10,
};

/**
 * Generate a random OTP
 * @param {number} length - OTP length (default: 6)
 * @returns {string} Random OTP
 */
const generateOTP = (length = OTP_CONFIG.length) => {
  const digits = '0123456789';
  let otp = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, digits.length);
    otp += digits[randomIndex];
  }
  
  return otp;
};

/**
 * Hash OTP using bcrypt
 * @param {string} otp - OTP to hash
 * @returns {Promise<string>} Hashed OTP
 */
const hashOTP = async (otp) => {
  try {
    return await bcrypt.hash(otp, OTP_CONFIG.saltRounds);
  } catch (error) {
    console.error('OTP hashing error:', error);
    throw new Error(`Failed to hash OTP: ${error.message}`);
  }
};

/**
 * Verify OTP against hash
 * @param {string} otp - OTP to verify
 * @param {string} hashedOTP - Hashed OTP to compare against
 * @returns {Promise<boolean>} True if OTP matches
 */
const verifyOTP = async (otp, hashedOTP) => {
  try {
    return await bcrypt.compare(otp, hashedOTP);
  } catch (error) {
    console.error('OTP verification error:', error);
    throw new Error(`Failed to verify OTP: ${error.message}`);
  }
};

/**
 * Store OTP in MongoDB
 * @param {string} recipientId - Recipient ID
 * @param {string} hashedOTP - Hashed OTP
 * @param {number} expiryMinutes - Expiry in minutes (default: 10)
 * @param {Object} req - Express request object (for getModel)
 * @returns {Promise<void>}
 */
const storeOTP = async (recipientId, hashedOTP, expiryMinutes = OTP_CONFIG.expiryMinutes, req) => {
  try {
    if (!req || !req.getModel) {
      throw new Error('Request object with getModel method is required');
    }
    
    const EsignOTP = req.getModel('EsignOTP');
    
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
    
    // Upsert OTP record
    await EsignOTP.findOneAndUpdate(
      { recipientId },
      {
        recipientId,
        hashedOTP,
        attempts: 0,
        lockedUntil: null,
        expiresAt,
        createdAt: new Date(),
      },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error('OTP storage error:', error);
    throw new Error(`Failed to store OTP: ${error.message}`);
  }
};

/**
 * Get OTP data from MongoDB
 * @param {string} recipientId - Recipient ID
 * @param {Object} req - Express request object (for getModel)
 * @returns {Promise<Object|null>} OTP data or null if not found
 */
const getOTPData = async (recipientId, req) => {
  try {
    if (!req || !req.getModel) {
      throw new Error('Request object with getModel method is required');
    }
    
    const EsignOTP = req.getModel('EsignOTP');
    
    const otpRecord = await EsignOTP.findOne({ recipientId });
    
    if (!otpRecord) {
      return null;
    }
    
    // Check if expired
    if (otpRecord.expiresAt < new Date()) {
      await EsignOTP.deleteOne({ recipientId });
      return null;
    }
    
    return otpRecord;
  } catch (error) {
    console.error('OTP retrieval error:', error);
    throw new Error(`Failed to retrieve OTP: ${error.message}`);
  }
};

/**
 * Increment OTP attempt counter
 * @param {string} recipientId - Recipient ID
 * @param {Object} req - Express request object (for getModel)
 * @returns {Promise<number>} New attempt count
 */
const incrementAttempts = async (recipientId, req) => {
  try {
    if (!req || !req.getModel) {
      throw new Error('Request object with getModel method is required');
    }
    
    const EsignOTP = req.getModel('EsignOTP');
    
    const otpRecord = await EsignOTP.findOneAndUpdate(
      { recipientId },
      { $inc: { attempts: 1 } },
      { new: true }
    );
    
    if (!otpRecord) {
      throw new Error('OTP not found');
    }
    
    return otpRecord.attempts;
  } catch (error) {
    console.error('OTP attempt increment error:', error);
    throw new Error(`Failed to increment attempts: ${error.message}`);
  }
};

/**
 * Check if recipient is locked out
 * @param {string} recipientId - Recipient ID
 * @param {Object} req - Express request object (for getModel)
 * @returns {Promise<Object>} Lockout status { isLocked, remainingTime }
 */
const checkLockout = async (recipientId, req) => {
  try {
    if (!req || !req.getModel) {
      throw new Error('Request object with getModel method is required');
    }
    
    const EsignOTP = req.getModel('EsignOTP');
    
    const otpRecord = await EsignOTP.findOne({ recipientId });
    
    if (!otpRecord || !otpRecord.lockedUntil) {
      return { isLocked: false, remainingTime: 0 };
    }
    
    const now = new Date();
    
    if (otpRecord.lockedUntil <= now) {
      // Lockout expired, clear it
      await EsignOTP.findOneAndUpdate(
        { recipientId },
        { $set: { lockedUntil: null, attempts: 0 } }
      );
      return { isLocked: false, remainingTime: 0 };
    }
    
    const remainingTime = Math.ceil((otpRecord.lockedUntil - now) / 1000);
    
    return {
      isLocked: true,
      remainingTime,
      lockedAt: otpRecord.lockedUntil,
    };
  } catch (error) {
    console.error('Lockout check error:', error);
    throw new Error(`Failed to check lockout: ${error.message}`);
  }
};

/**
 * Lock out recipient after max attempts
 * @param {string} recipientId - Recipient ID
 * @param {number} lockoutMinutes - Lockout duration in minutes (default: 30)
 * @param {Object} req - Express request object (for getModel)
 * @returns {Promise<void>}
 */
const lockoutRecipient = async (recipientId, lockoutMinutes = OTP_CONFIG.lockoutMinutes, req) => {
  try {
    if (!req || !req.getModel) {
      throw new Error('Request object with getModel method is required');
    }
    
    const EsignOTP = req.getModel('EsignOTP');
    
    const lockedUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000);
    
    await EsignOTP.findOneAndUpdate(
      { recipientId },
      { $set: { lockedUntil, attempts: OTP_CONFIG.maxAttempts } },
      { upsert: true }
    );
  } catch (error) {
    console.error('Lockout error:', error);
    throw new Error(`Failed to lockout recipient: ${error.message}`);
  }
};

/**
 * Delete OTP data from MongoDB
 * @param {string} recipientId - Recipient ID
 * @param {Object} req - Express request object (for getModel)
 * @returns {Promise<void>}
 */
const deleteOTP = async (recipientId, req) => {
  try {
    if (!req || !req.getModel) {
      throw new Error('Request object with getModel method is required');
    }
    
    const EsignOTP = req.getModel('EsignOTP');
    await EsignOTP.deleteOne({ recipientId });
  } catch (error) {
    console.error('OTP deletion error:', error);
    throw new Error(`Failed to delete OTP: ${error.message}`);
  }
};

/**
 * Generate and store OTP for recipient
 * @param {string} recipientId - Recipient ID
 * @param {number} expiryMinutes - Expiry in minutes (default: 10)
 * @param {Object} req - Express request object (for getModel)
 * @returns {Promise<Object>} { otp, expiresAt }
 */
const generateAndStoreOTP = async (recipientId, expiryMinutes = OTP_CONFIG.expiryMinutes, req) => {
  try {
    if (!req || !req.getModel) {
      throw new Error('Request object with getModel method is required');
    }
    
    // Check if recipient is locked out
    const lockout = await checkLockout(recipientId, req);
    if (lockout.isLocked) {
      throw new Error(`Recipient is locked out. Try again in ${Math.ceil(lockout.remainingTime / 60)} minutes.`);
    }
    
    // Generate OTP
    const otp = generateOTP();
    
    // Hash OTP
    const hashedOTP = await hashOTP(otp);
    
    // Store in MongoDB
    await storeOTP(recipientId, hashedOTP, expiryMinutes, req);
    
    // Calculate expiry time
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
    
    return {
      otp,
      expiresAt,
    };
  } catch (error) {
    console.error('OTP generation and storage error:', error);
    throw error;
  }
};

/**
 * Verify OTP for recipient
 * @param {string} recipientId - Recipient ID
 * @param {string} otp - OTP to verify
 * @param {Object} req - Express request object (for getModel)
 * @returns {Promise<Object>} { valid, message }
 */
const verifyRecipientOTP = async (recipientId, otp, req) => {
  try {
    if (!req || !req.getModel) {
      throw new Error('Request object with getModel method is required');
    }
    
    // Check if recipient is locked out
    const lockout = await checkLockout(recipientId, req);
    if (lockout.isLocked) {
      return {
        valid: false,
        message: `Account is locked. Try again in ${Math.ceil(lockout.remainingTime / 60)} minutes.`,
      };
    }
    
    // Get OTP data
    const otpData = await getOTPData(recipientId, req);
    
    if (!otpData) {
      return {
        valid: false,
        message: 'OTP not found or expired. Please request a new OTP.',
      };
    }
    
    // Verify OTP
    const isValid = await verifyOTP(otp, otpData.hashedOTP);
    
    if (!isValid) {
      // Increment attempts
      const attempts = await incrementAttempts(recipientId, req);
      
      // Check if max attempts reached
      if (attempts >= OTP_CONFIG.maxAttempts) {
        await lockoutRecipient(recipientId, OTP_CONFIG.lockoutMinutes, req);
        return {
          valid: false,
          message: `Maximum attempts exceeded. Account locked for ${OTP_CONFIG.lockoutMinutes} minutes.`,
        };
      }
      
      return {
        valid: false,
        message: `Invalid OTP. ${OTP_CONFIG.maxAttempts - attempts} attempts remaining.`,
        attemptsRemaining: OTP_CONFIG.maxAttempts - attempts,
      };
    }
    
    // OTP is valid, delete it
    await deleteOTP(recipientId, req);
    
    return {
      valid: true,
      message: 'OTP verified successfully.',
    };
  } catch (error) {
    console.error('OTP verification error:', error);
    throw error;
  }
};

/**
 * Generate and send OTP to recipient via configured channels
 * @param {Object} req - Express request object (for getModel)
 * @param {string} recipientId - Recipient ID
 * @param {string} email - Recipient email
 * @param {string} phone - Recipient phone (optional)
 * @param {string} channel - Delivery channel ('email', 'sms', 'both')
 * @param {number} expiryMinutes - Expiry in minutes (default: 10)
 * @returns {Promise<Object>} { success, otp, expiresAt, channel, error }
 */
const generateAndSendOTP = async (req, recipientId, email, phone, channel = 'email', expiryMinutes = OTP_CONFIG.expiryMinutes) => {
  try {
    if (!req || !req.getModel) {
      throw new Error('Request object with getModel method is required');
    }
    
    // Check if recipient is locked out
    const lockout = await checkLockout(recipientId, req);
    if (lockout.isLocked) {
      return {
        success: false,
        error: `Too many attempts. Try again in ${Math.ceil(lockout.remainingTime / 60)} minutes.`,
        code: 'LOCKED_OUT',
        locked_until: lockout.lockedAt,
      };
    }
    
    // Check OTP resend throttling
    const EsignRateLimit = req.getModel('EsignRateLimit');
    const rateLimitKey = `otp:${recipientId}`;
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    
    // Count OTP sends in last 15 minutes
    const recentSends = await EsignRateLimit.countDocuments({
      rateLimitKey: rateLimitKey,
      createdAt: { $gte: fifteenMinutesAgo }
    });
    
    if (recentSends >= 3) {
      return {
        success: false,
        error: 'Too many OTP requests. Try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
      };
    }
    
    // Generate OTP
    const otp = generateOTP();
    
    // Hash OTP
    const hashedOTP = await hashOTP(otp);
    
    // Store in MongoDB
    await storeOTP(recipientId, hashedOTP, expiryMinutes, req);
    
    // Calculate expiry time
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
    
    // Get provider configurations
    const EsignProviderConfig = req.getModel('EsignProviderConfig');
    const company_id = req.company?._id || req.user?.company_id;
    
    if (!company_id) {
      throw new Error('Company ID not found in request context');
    }
    
    // Send OTP via configured channels
    const notificationService = require('./notification.service');
    const encryptionService = require('./encryption.service');
    
    let emailSent = false;
    let smsSent = false;
    let errors = [];
    
    // Send via email if channel is 'email' or 'both'
    if (channel === 'email' || channel === 'both') {
      try {
        const emailProvider = await EsignProviderConfig.findOne({
          company_id,
          provider_type: 'email',
          is_active: true
        });
        
        if (!emailProvider) {
          errors.push('No active email provider configured');
        } else {
          const credentials = encryptionService.decryptCredentials(emailProvider.credentials);
          
          const emailData = {
            to: email,
            subject: 'Your E-Sign Verification Code',
            text: `Your verification code is: ${otp}\n\nThis code will expire in ${expiryMinutes} minutes.\n\nIf you did not request this code, please ignore this email.`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Your Verification Code</h2>
                <p style="font-size: 16px; color: #666;">Your verification code is:</p>
                <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
                  <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">${otp}</span>
                </div>
                <p style="font-size: 14px; color: #666;">This code will expire in ${expiryMinutes} minutes.</p>
                <p style="font-size: 12px; color: #999; margin-top: 30px;">If you did not request this code, please ignore this email.</p>
              </div>
            `,
            from: credentials.from_email || credentials.username
          };
          
          await notificationService.sendEmail(
            emailProvider.provider,
            credentials,
            emailProvider.settings,
            emailData
          );
          
          emailSent = true;
        }
      } catch (error) {
        console.error('Email OTP send error:', error);
        errors.push(`Email send failed: ${error.message}`);
      }
    }
    
    // Send via SMS if channel is 'sms' or 'both'
    if (channel === 'sms' || channel === 'both') {
      if (!phone) {
        errors.push('Phone number not provided for SMS delivery');
      } else {
        try {
          const smsProvider = await EsignProviderConfig.findOne({
            company_id,
            provider_type: 'sms',
            is_active: true
          });
          
          if (!smsProvider) {
            errors.push('No active SMS provider configured');
          } else {
            const credentials = encryptionService.decryptCredentials(smsProvider.credentials);
            
            const smsData = {
              to: phone,
              message: `Your E-Sign verification code is: ${otp}. Valid for ${expiryMinutes} minutes.`
            };
            
            await notificationService.sendSMS(
              smsProvider.provider,
              credentials,
              smsProvider.settings,
              smsData
            );
            
            smsSent = true;
          }
        } catch (error) {
          console.error('SMS OTP send error:', error);
          errors.push(`SMS send failed: ${error.message}`);
        }
      }
    }
    
    // Track OTP send attempt for rate limiting
    await EsignRateLimit.create({
      rateLimitKey: rateLimitKey,
      count: 1,
      windowStart: Date.now(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes TTL
      createdAt: new Date(),
    });
    
    // Determine success based on channel requirements
    let success = false;
    if (channel === 'email') {
      success = emailSent;
    } else if (channel === 'sms') {
      success = smsSent;
    } else if (channel === 'both') {
      success = emailSent && smsSent;
    }
    
    if (!success) {
      return {
        success: false,
        error: errors.length > 0 ? errors.join('; ') : 'Failed to send OTP',
        code: 'SEND_FAILED',
      };
    }
    
    return {
      success: true,
      otp, // Only for testing/logging, should not be returned to client in production
      expiresAt,
      channel,
      emailSent,
      smsSent,
    };
  } catch (error) {
    console.error('OTP generation and send error:', error);
    return {
      success: false,
      error: error.message,
      code: 'INTERNAL_ERROR',
    };
  }
};

/**
 * Verify OTP for recipient (wrapper for verifyRecipientOTP with additional error handling)
 * @param {Object} req - Express request object (for getModel)
 * @param {string} recipientId - Recipient ID
 * @param {string} otp - OTP to verify
 * @returns {Promise<Object>} { success, message, code, attempts_remaining, locked_until }
 */
const verifyOTP = async (recipientId, otp, req) => {
  try {
    const result = await verifyRecipientOTP(recipientId, otp, req);
    
    if (!result.valid) {
      // Check if locked out
      const lockout = await checkLockout(recipientId, req);
      
      return {
        success: false,
        error: result.message,
        code: lockout.isLocked ? 'LOCKED_OUT' : 'INVALID_OTP',
        attempts_remaining: result.attemptsRemaining,
        locked_until: lockout.isLocked ? lockout.lockedAt : null,
      };
    }
    
    return {
      success: true,
      message: result.message,
    };
  } catch (error) {
    console.error('OTP verification error:', error);
    return {
      success: false,
      error: error.message,
      code: 'INTERNAL_ERROR',
    };
  }
};

module.exports = {
  generateOTP,
  hashOTP,
  verifyOTP: verifyOTP,
  storeOTP,
  getOTPData,
  incrementAttempts,
  checkLockout,
  lockoutRecipient,
  deleteOTP,
  generateAndStoreOTP,
  verifyRecipientOTP,
  generateAndSendOTP,
  OTP_CONFIG,
};
