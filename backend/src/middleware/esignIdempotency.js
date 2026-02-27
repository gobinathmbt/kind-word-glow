const crypto = require('crypto');

/**
 * E-Sign Idempotency Middleware
 * 
 * Prevents duplicate document creation using idempotency keys
 * Stores request results in MongoDB for 24 hours
 */

const IDEMPOTENCY_CONFIG = {
  ttl: 24 * 60 * 60, // 24 hours in seconds
  keyPrefix: 'idempotency:esign:',
};

/**
 * Idempotency middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const esignIdempotency = async (req, res, next) => {
  try {
    // Only apply to POST requests
    if (req.method !== 'POST') {
      return next();
    }
    
    // Get idempotency key from header
    const idempotencyKey = req.headers['x-idempotency-key'] || req.headers['idempotency-key'];
    
    // If no idempotency key provided, continue without idempotency check
    if (!idempotencyKey) {
      return next();
    }
    
    // Validate idempotency key format (should be UUID or similar)
    if (!isValidIdempotencyKey(idempotencyKey)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid idempotency key',
        message: 'Idempotency key must be a valid UUID or unique string (min 16 characters)',
      });
    }
    
    // Ensure req.getModel is available
    if (!req.getModel) {
      console.error('req.getModel not available - idempotency check disabled');
      return next();
    }
    
    // Get company/API key identifier
    const identifier = req.api_key?.key_prefix || req.company_id || 'unknown';
    
    // Create idempotency key
    const fullIdempotencyKey = `${identifier}:${idempotencyKey}`;
    
    // Check if request with this idempotency key was already processed
    const EsignIdempotency = req.getModel('EsignIdempotency');
    const cachedResponse = await EsignIdempotency.findOne({ idempotencyKey: fullIdempotencyKey });
    
    if (cachedResponse) {
      // Check if expired
      if (cachedResponse.expiresAt < new Date()) {
        await EsignIdempotency.deleteOne({ idempotencyKey: fullIdempotencyKey });
      } else {
        console.log(`Idempotent request detected: ${idempotencyKey}`);
        
        // Return cached response
        return res.status(cachedResponse.statusCode || 200).json(cachedResponse.body);
      }
    }
    
    // Store original res.json function
    const originalJson = res.json.bind(res);
    
    // Override res.json to cache the response
    res.json = function(body) {
      // Only cache successful responses (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const expiresAt = new Date(Date.now() + IDEMPOTENCY_CONFIG.ttl * 1000);
        
        const responseData = {
          idempotencyKey: fullIdempotencyKey,
          statusCode: res.statusCode,
          body,
          expiresAt,
        };
        
        // Store in MongoDB asynchronously (don't wait)
        EsignIdempotency.create(responseData)
          .catch(error => {
            console.error('Failed to cache idempotent response:', error);
          });
      }
      
      // Call original json function
      return originalJson(body);
    };
    
    // Attach idempotency key to request for use in controllers
    req.idempotencyKey = idempotencyKey;
    
    next();
  } catch (error) {
    console.error('Idempotency middleware error:', error);
    // Fail open - continue without idempotency check if error occurs
    next();
  }
};

/**
 * Validate idempotency key format
 * @param {string} key - Idempotency key to validate
 * @returns {boolean} True if valid
 */
const isValidIdempotencyKey = (key) => {
  if (!key || typeof key !== 'string') {
    return false;
  }
  
  // Must be at least 16 characters
  if (key.length < 16) {
    return false;
  }
  
  // Must be alphanumeric with hyphens (UUID format or similar)
  const validPattern = /^[a-zA-Z0-9-_]+$/;
  return validPattern.test(key);
};

/**
 * Generate a unique idempotency key
 * @returns {string} UUID v4 idempotency key
 */
const generateIdempotencyKey = () => {
  return crypto.randomUUID();
};

/**
 * Manually store idempotent response
 * @param {string} idempotencyKey - Idempotency key
 * @param {string} identifier - Company/API key identifier
 * @param {Object} response - Response data
 * @param {number} ttl - TTL in seconds (optional)
 * @param {Object} req - Express request object (for getModel)
 * @returns {Promise<void>}
 */
const storeIdempotentResponse = async (idempotencyKey, identifier, response, ttl = IDEMPOTENCY_CONFIG.ttl, req) => {
  try {
    if (!req || !req.getModel) {
      throw new Error('Request object with getModel method is required');
    }
    
    const EsignIdempotency = req.getModel('EsignIdempotency');
    
    const key = `${identifier}:${idempotencyKey}`;
    const expiresAt = new Date(Date.now() + ttl * 1000);
    
    await EsignIdempotency.create({
      idempotencyKey: key,
      statusCode: response.statusCode || 200,
      body: response.body,
      expiresAt,
    });
  } catch (error) {
    console.error('Failed to store idempotent response:', error);
    throw error;
  }
};

/**
 * Get idempotent response from cache
 * @param {string} idempotencyKey - Idempotency key
 * @param {string} identifier - Company/API key identifier
 * @param {Object} req - Express request object (for getModel)
 * @returns {Promise<Object|null>} Cached response or null
 */
const getIdempotentResponse = async (idempotencyKey, identifier, req) => {
  try {
    if (!req || !req.getModel) {
      throw new Error('Request object with getModel method is required');
    }
    
    const EsignIdempotency = req.getModel('EsignIdempotency');
    
    const key = `${identifier}:${idempotencyKey}`;
    const record = await EsignIdempotency.findOne({ idempotencyKey: key });
    
    if (!record) {
      return null;
    }
    
    // Check if expired
    if (record.expiresAt < new Date()) {
      await EsignIdempotency.deleteOne({ idempotencyKey: key });
      return null;
    }
    
    return record;
  } catch (error) {
    console.error('Failed to get idempotent response:', error);
    return null;
  }
};

/**
 * Delete idempotent response from cache
 * @param {string} idempotencyKey - Idempotency key
 * @param {string} identifier - Company/API key identifier
 * @param {Object} req - Express request object (for getModel)
 * @returns {Promise<void>}
 */
const deleteIdempotentResponse = async (idempotencyKey, identifier, req) => {
  try {
    if (!req || !req.getModel) {
      throw new Error('Request object with getModel method is required');
    }
    
    const EsignIdempotency = req.getModel('EsignIdempotency');
    
    const key = `${identifier}:${idempotencyKey}`;
    await EsignIdempotency.deleteOne({ idempotencyKey: key });
  } catch (error) {
    console.error('Failed to delete idempotent response:', error);
    throw error;
  }
};

module.exports = {
  esignIdempotency,
  isValidIdempotencyKey,
  generateIdempotencyKey,
  storeIdempotentResponse,
  getIdempotentResponse,
  deleteIdempotentResponse,
  IDEMPOTENCY_CONFIG,
};
