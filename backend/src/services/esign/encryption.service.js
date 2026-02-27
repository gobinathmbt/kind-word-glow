const crypto = require('crypto');
const env = require('../../config/env');

/**
 * Encryption Service for AES-256 credential encryption/decryption
 * 
 * Uses AES-256-GCM for authenticated encryption with additional data (AEAD)
 * Provides secure storage of sensitive provider credentials
 */

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 64; // 512 bits

// Get encryption key from environment or generate a default (should be set in production)
const ENCRYPTION_KEY = env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

if (!env.ENCRYPTION_KEY) {
  console.warn('⚠️  WARNING: ENCRYPTION_KEY not set in environment. Using temporary key. Set ENCRYPTION_KEY in production!');
}

/**
 * Derive encryption key from master key using PBKDF2
 * @param {string} masterKey - Master encryption key
 * @param {Buffer} salt - Salt for key derivation
 * @returns {Buffer} Derived key
 */
const deriveKey = (masterKey, salt) => {
  return crypto.pbkdf2Sync(
    masterKey,
    salt,
    100000, // iterations
    32, // key length (256 bits)
    'sha256'
  );
};

/**
 * Encrypt data using AES-256-GCM
 * @param {string|Object} data - Data to encrypt (will be JSON stringified if object)
 * @param {string} version - Encryption version (default: 'v1')
 * @returns {string} Encrypted data in format: version:salt:iv:authTag:encryptedData (base64)
 */
const encrypt = (data, version = 'v1') => {
  try {
    // Convert data to string if it's an object
    const plaintext = typeof data === 'object' ? JSON.stringify(data) : String(data);
    
    // Generate random salt and IV
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Derive key from master key
    const key = deriveKey(ENCRYPTION_KEY, salt);
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // Encrypt data
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // Get authentication tag
    const authTag = cipher.getAuthTag();
    
    // Combine all components: version:salt:iv:authTag:encryptedData
    const result = [
      version,
      salt.toString('base64'),
      iv.toString('base64'),
      authTag.toString('base64'),
      encrypted
    ].join(':');
    
    return result;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error(`Failed to encrypt data: ${error.message}`);
  }
};

/**
 * Decrypt data using AES-256-GCM
 * @param {string} encryptedData - Encrypted data in format: version:salt:iv:authTag:encryptedData
 * @param {boolean} parseJSON - Whether to parse result as JSON (default: true)
 * @returns {string|Object} Decrypted data
 */
const decrypt = (encryptedData, parseJSON = true) => {
  try {
    // Split encrypted data into components
    const parts = encryptedData.split(':');
    
    if (parts.length !== 5) {
      throw new Error('Invalid encrypted data format');
    }
    
    const [version, saltBase64, ivBase64, authTagBase64, encrypted] = parts;
    
    // Validate version
    if (version !== 'v1') {
      throw new Error(`Unsupported encryption version: ${version}`);
    }
    
    // Convert from base64
    const salt = Buffer.from(saltBase64, 'base64');
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');
    
    // Derive key from master key
    const key = deriveKey(ENCRYPTION_KEY, salt);
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt data
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    // Parse JSON if requested
    if (parseJSON) {
      try {
        return JSON.parse(decrypted);
      } catch {
        // If JSON parsing fails, return as string
        return decrypted;
      }
    }
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error(`Failed to decrypt data: ${error.message}`);
  }
};

/**
 * Encrypt provider credentials
 * @param {Object} credentials - Credentials object to encrypt
 * @returns {Object} Encrypted credentials object with metadata
 */
const encryptCredentials = (credentials) => {
  if (!credentials || typeof credentials !== 'object') {
    throw new Error('Credentials must be a non-null object');
  }
  
  const encryptedData = encrypt(credentials);
  
  return {
    encrypted_data: encryptedData,
    encryption_version: 'v1',
    encrypted_at: new Date().toISOString()
  };
};

/**
 * Decrypt provider credentials
 * @param {Object} encryptedCredentials - Encrypted credentials object
 * @returns {Object} Decrypted credentials
 */
const decryptCredentials = (encryptedCredentials) => {
  if (!encryptedCredentials || !encryptedCredentials.encrypted_data) {
    throw new Error('Invalid encrypted credentials object');
  }
  
  return decrypt(encryptedCredentials.encrypted_data, true);
};

/**
 * Mask sensitive fields in credentials for display
 * @param {Object} credentials - Credentials object
 * @param {Array<string>} sensitiveFields - Fields to mask (default: common sensitive fields)
 * @returns {Object} Credentials with masked sensitive fields
 */
const maskCredentials = (credentials, sensitiveFields = ['password', 'secret', 'key', 'token', 'api_key', 'access_key', 'secret_key']) => {
  if (!credentials || typeof credentials !== 'object') {
    return credentials;
  }
  
  const masked = { ...credentials };
  
  for (const field of sensitiveFields) {
    if (masked[field]) {
      const value = String(masked[field]);
      if (value.length <= 8) {
        masked[field] = '****';
      } else {
        // Show first 4 and last 4 characters
        masked[field] = `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
      }
    }
  }
  
  return masked;
};

/**
 * Generate a secure random key
 * @param {number} length - Key length in bytes (default: 32 for 256 bits)
 * @returns {string} Random key in hex format
 */
const generateSecureKey = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Hash a value using SHA-256
 * @param {string} value - Value to hash
 * @returns {string} Hash in hex format
 */
const hash = (value) => {
  return crypto.createHash('sha256').update(value).digest('hex');
};

module.exports = {
  encrypt,
  decrypt,
  encryptCredentials,
  decryptCredentials,
  maskCredentials,
  generateSecureKey,
  hash,
};
