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
 * @returns {Promise<void>}
 */
const storeOTP = async (recipientId, hashedOTP, expiryMinutes = OTP_CONFIG.expiryMinutes) => {
  try {
    const EsignOTP = require('../../models/EsignOTP');
    
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
 * @returns {Promise<Object|null>} OTP data or null if not found
 */
const getOTPData = async (recipientId) => {
  try {
    const EsignOTP = require('../../models/EsignOTP');
    
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
 * @returns {Promise<number>} New attempt count
 */
const incrementAttempts = async (recipientId) => {
  try {
    const EsignOTP = require('../../models/EsignOTP');
    
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
 * @returns {Promise<Object>} Lockout status { isLocked, remainingTime }
 */
const checkLockout = async (recipientId) => {
  try {
    const EsignOTP = require('../../models/EsignOTP');
    
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
 * @returns {Promise<void>}
 */
const lockoutRecipient = async (recipientId, lockoutMinutes = OTP_CONFIG.lockoutMinutes) => {
  try {
    const EsignOTP = require('../../models/EsignOTP');
    
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
 * @returns {Promise<void>}
 */
const deleteOTP = async (recipientId) => {
  try {
    const EsignOTP = require('../../models/EsignOTP');
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
 * @returns {Promise<Object>} { otp, expiresAt }
 */
const generateAndStoreOTP = async (recipientId, expiryMinutes = OTP_CONFIG.expiryMinutes) => {
  try {
    // Check if recipient is locked out
    const lockout = await checkLockout(recipientId);
    if (lockout.isLocked) {
      throw new Error(`Recipient is locked out. Try again in ${Math.ceil(lockout.remainingTime / 60)} minutes.`);
    }
    
    // Generate OTP
    const otp = generateOTP();
    
    // Hash OTP
    const hashedOTP = await hashOTP(otp);
    
    // Store in Redis
    await storeOTP(recipientId, hashedOTP, expiryMinutes);
    
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
 * @returns {Promise<Object>} { valid, message }
 */
const verifyRecipientOTP = async (recipientId, otp) => {
  try {
    // Check if recipient is locked out
    const lockout = await checkLockout(recipientId);
    if (lockout.isLocked) {
      return {
        valid: false,
        message: `Account is locked. Try again in ${Math.ceil(lockout.remainingTime / 60)} minutes.`,
      };
    }
    
    // Get OTP data
    const otpData = await getOTPData(recipientId);
    
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
      const attempts = await incrementAttempts(recipientId);
      
      // Check if max attempts reached
      if (attempts >= OTP_CONFIG.maxAttempts) {
        await lockoutRecipient(recipientId);
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
    await deleteOTP(recipientId);
    
    return {
      valid: true,
      message: 'OTP verified successfully.',
    };
  } catch (error) {
    console.error('OTP verification error:', error);
    throw error;
  }
};

module.exports = {
  generateOTP,
  hashOTP,
  verifyOTP,
  storeOTP,
  getOTPData,
  incrementAttempts,
  checkLockout,
  lockoutRecipient,
  deleteOTP,
  generateAndStoreOTP,
  verifyRecipientOTP,
  OTP_CONFIG,
};
