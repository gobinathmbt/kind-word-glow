const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../../config/env');

/**
 * Token Service for JWT generation, validation, and rotation
 * 
 * Provides secure token management for e-sign document access
 */

const JWT_SECRET = env.JWT_SECRET || 'your-jwt-secret-key';
const TOKEN_EXPIRY = {
  signing: '7d',      // 7 days for signing links
  session: '1h',      // 1 hour for post-MFA session
  preview: '24h',     // 24 hours for preview links
  api: '30d',         // 30 days for API tokens
};

/**
 * Generate a signing token for a recipient
 * @param {Object} payload - Token payload
 * @param {string} payload.documentId - Document ID
 * @param {string} payload.recipientId - Recipient ID
 * @param {string} payload.email - Recipient email
 * @param {string} payload.companyId - Company ID (optional but recommended)
 * @param {string} type - Token type ('signing', 'session', 'preview')
 * @param {string|number} customExpiry - Custom expiry (optional)
 * @returns {string} JWT token
 */
const generateToken = (payload, type = 'signing', customExpiry = null) => {
  try {
    const { documentId, recipientId, email, companyId } = payload;
    
    if (!documentId || !recipientId || !email) {
      throw new Error('Missing required payload fields: documentId, recipientId, email');
    }
    
    const tokenPayload = {
      documentId,
      recipientId,
      email,
      type,
      tokenId: crypto.randomBytes(16).toString('hex'), // Unique token ID for tracking
      iat: Math.floor(Date.now() / 1000),
    };
    
    // Include company ID if provided
    if (companyId) {
      tokenPayload.companyId = companyId;
    }
    
    const options = {
      expiresIn: customExpiry || TOKEN_EXPIRY[type] || TOKEN_EXPIRY.signing,
    };
    
    return jwt.sign(tokenPayload, JWT_SECRET, options);
  } catch (error) {
    console.error('Token generation error:', error);
    throw new Error(`Failed to generate token: ${error.message}`);
  }
};

/**
 * Validate and decode a token
 * @param {string} token - JWT token to validate
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
const validateToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    } else {
      throw new Error(`Token validation failed: ${error.message}`);
    }
  }
};

/**
 * Rotate a token (generate new token with same payload but new expiry)
 * @param {string} oldToken - Old token to rotate
 * @param {string} newType - New token type (default: 'session')
 * @param {string|number} customExpiry - Custom expiry (optional)
 * @returns {string} New JWT token
 */
const rotateToken = (oldToken, newType = 'session', customExpiry = null) => {
  try {
    // Decode old token (ignore expiry for rotation)
    const decoded = jwt.decode(oldToken);
    
    if (!decoded) {
      throw new Error('Invalid token format');
    }
    
    // Generate new token with same payload but new expiry
    return generateToken(
      {
        documentId: decoded.documentId,
        recipientId: decoded.recipientId,
        email: decoded.email,
        companyId: decoded.companyId, // Preserve company ID
      },
      newType,
      customExpiry
    );
  } catch (error) {
    console.error('Token rotation error:', error);
    throw new Error(`Failed to rotate token: ${error.message}`);
  }
};

/**
 * Decode token without validation (useful for expired tokens)
 * @param {string} token - JWT token to decode
 * @returns {Object|null} Decoded token payload or null if invalid
 */
const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    console.error('Token decode error:', error);
    return null;
  }
};

/**
 * Check if token is expired
 * @param {string} token - JWT token to check
 * @returns {boolean} True if token is expired
 */
const isTokenExpired = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return true;
    }
    
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error) {
    return true;
  }
};

/**
 * Get token expiry date
 * @param {string} token - JWT token
 * @returns {Date|null} Expiry date or null if invalid
 */
const getTokenExpiry = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return null;
    }
    
    return new Date(decoded.exp * 1000);
  } catch (error) {
    return null;
  }
};

/**
 * Generate a short-lived session token after MFA verification
 * @param {Object} payload - Token payload
 * @returns {string} Session JWT token
 */
const generateSessionToken = (payload) => {
  return generateToken(payload, 'session');
};

/**
 * Generate a preview token for document preview
 * @param {Object} payload - Token payload
 * @returns {string} Preview JWT token
 */
const generatePreviewToken = (payload) => {
  return generateToken(payload, 'preview');
};

/**
 * Generate a random token ID for tracking
 * @returns {string} Random token ID
 */
const generateTokenId = () => {
  return crypto.randomBytes(16).toString('hex');
};

/**
 * Calculate expiry timestamp from duration
 * @param {number} value - Duration value
 * @param {string} unit - Duration unit ('hours', 'days', 'weeks')
 * @returns {Date} Expiry timestamp
 */
const calculateExpiry = (value, unit) => {
  const now = new Date();
  
  switch (unit) {
    case 'hours':
      return new Date(now.getTime() + value * 60 * 60 * 1000);
    case 'days':
      return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
    case 'weeks':
      return new Date(now.getTime() + value * 7 * 24 * 60 * 60 * 1000);
    default:
      throw new Error(`Invalid time unit: ${unit}`);
  }
};

module.exports = {
  generateToken,
  validateToken,
  rotateToken,
  decodeToken,
  isTokenExpired,
  getTokenExpiry,
  generateSessionToken,
  generatePreviewToken,
  generateTokenId,
  calculateExpiry,
  TOKEN_EXPIRY,
};
