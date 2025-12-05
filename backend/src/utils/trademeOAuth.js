const crypto = require('crypto');

/**
 * Generate OAuth 1.0a signature for Trade Me API
 * Trade Me uses OAuth 1.0a authentication which requires:
 * - Consumer Key & Secret (identifies your app)
 * - Access Token & Token Secret (identifies the user/dealer)
 */

/**
 * Generate a random nonce for OAuth request
 */
function generateNonce() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Get current timestamp in seconds
 */
function getTimestamp() {
  return Math.floor(Date.now() / 1000);
}

/**
 * Percent encode a string according to OAuth spec
 */
function percentEncode(str) {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A');
}

/**
 * Generate OAuth 1.0a signature
 * @param {string} method - HTTP method (GET, POST, etc.)
 * @param {string} url - Full URL without query parameters
 * @param {object} params - All OAuth and request parameters
 * @param {string} consumerSecret - OAuth consumer secret
 * @param {string} tokenSecret - OAuth token secret
 * @returns {string} Base64 encoded signature
 */
function generateOAuthSignature(method, url, params, consumerSecret, tokenSecret) {
  // 1. Sort parameters alphabetically
  const sortedKeys = Object.keys(params).sort();
  
  // 2. Create parameter string
  const paramString = sortedKeys
    .map(key => `${percentEncode(key)}=${percentEncode(params[key])}`)
    .join('&');
  
  // 3. Create signature base string
  const signatureBaseString = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(paramString)
  ].join('&');
  
  // 4. Create signing key
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;
  
  // 5. Generate HMAC-SHA1 signature
  const hmac = crypto.createHmac('sha1', signingKey);
  hmac.update(signatureBaseString);
  const signature = hmac.digest('base64');
  
  return signature;
}

/**
 * Generate complete OAuth 1.0a authorization header
 * @param {string} method - HTTP method
 * @param {string} url - Full URL without query parameters
 * @param {object} credentials - OAuth credentials
 * @param {string} credentials.consumer_key
 * @param {string} credentials.consumer_secret
 * @param {string} credentials.access_token
 * @param {string} credentials.token_secret
 * @param {object} additionalParams - Additional request parameters (optional)
 * @returns {string} OAuth authorization header value
 */
function generateOAuthHeader(method, url, credentials, additionalParams = {}) {
  // Generate OAuth parameters
  const oauthParams = {
    oauth_consumer_key: credentials.consumer_key,
    oauth_token: credentials.access_token,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: getTimestamp().toString(),
    oauth_nonce: generateNonce(),
    oauth_version: '1.0'
  };
  
  // Combine OAuth params with additional params for signature
  const allParams = { ...oauthParams, ...additionalParams };
  
  // Generate signature
  const signature = generateOAuthSignature(
    method,
    url,
    allParams,
    credentials.consumer_secret,
    credentials.token_secret
  );
  
  // Add signature to OAuth params
  oauthParams.oauth_signature = signature;
  
  // Build OAuth header string
  const headerParts = Object.keys(oauthParams)
    .sort()
    .map(key => `${percentEncode(key)}="${percentEncode(oauthParams[key])}"`)
    .join(', ');
  
  return `OAuth ${headerParts}`;
}

/**
 * Validate OAuth credentials
 * @param {object} credentials - OAuth credentials to validate
 * @returns {object} Validation result
 */
function validateOAuthCredentials(credentials) {
  const required = ['consumer_key', 'consumer_secret', 'access_token', 'token_secret'];
  const missing = required.filter(field => !credentials[field]);
  
  if (missing.length > 0) {
    return {
      valid: false,
      message: `Missing OAuth credentials: ${missing.join(', ')}`
    };
  }
  
  return { valid: true };
}

module.exports = {
  generateOAuthSignature,
  generateOAuthHeader,
  validateOAuthCredentials,
  generateNonce,
  getTimestamp,
  percentEncode
};
