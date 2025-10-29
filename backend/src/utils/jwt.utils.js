const crypto = require('crypto');

/**
 * Verify JWT token against the stored token in workflow
 * @param {string} token - Token from request header
 * @param {string} storedToken - Token stored in workflow config
 * @returns {boolean} - Whether token is valid
 */
const verifyJWTToken = (token, storedToken) => {
  try {
    // For workflow JWT tokens, we do a direct comparison
    // The token format is: header.payload.signature
    return token === storedToken;
  } catch (error) {
    console.error('JWT verification error:', error);
    return false;
  }
};

/**
 * Extract bearer token from authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} - Extracted token or null
 */
const extractBearerToken = (authHeader) => {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    return parts[1];
  }
  
  return null;
};

/**
 * Verify static token
 * @param {string} token - Token from request
 * @param {string} storedToken - Token stored in workflow config
 * @returns {boolean} - Whether token is valid
 */
const verifyStaticToken = (token, storedToken) => {
  return token === storedToken;
};

/**
 * Verify standard authentication (API key and secret)
 * @param {string} apiKey - API key from request header
 * @param {string} apiSecret - API secret from request header
 * @param {string} storedApiKey - Stored API key in workflow config
 * @param {string} storedApiSecret - Stored API secret in workflow config
 * @returns {boolean} - Whether credentials are valid
 */
const verifyStandardAuth = (apiKey, apiSecret, storedApiKey, storedApiSecret) => {
  return apiKey === storedApiKey && apiSecret === storedApiSecret;
};

module.exports = {
  verifyJWTToken,
  extractBearerToken,
  verifyStaticToken,
  verifyStandardAuth,
};
