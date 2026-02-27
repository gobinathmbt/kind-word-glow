/**
 * E-Sign Rate Limiting Middleware
 * 
 * Implements MongoDB-based rate limiting for API endpoints
 * Default: 100 requests per minute per API key
 */

const RATE_LIMIT_CONFIG = {
  windowMs: 60 * 1000, // 1 minute window
  maxRequests: 100,     // 100 requests per window
  keyPrefix: 'ratelimit:esign:',
};

/**
 * Rate limiting middleware
 * @param {Object} options - Rate limit options
 * @param {number} options.windowMs - Time window in milliseconds (default: 60000)
 * @param {number} options.maxRequests - Maximum requests per window (default: 100)
 * @param {string} options.keyPrefix - Redis key prefix (default: 'ratelimit:esign:')
 * @returns {Function} Middleware function
 */
const esignRateLimit = (options = {}) => {
  const config = {
    ...RATE_LIMIT_CONFIG,
    ...options,
  };
  
  return async (req, res, next) => {
    try {
      const EsignRateLimit = require('../models/EsignRateLimit');
      
      // Get identifier for rate limiting
      // Use API key prefix if available, otherwise use IP address
      const identifier = req.api_key?.key_prefix || req.ip || 'unknown';
      
      // Calculate current window
      const now = Date.now();
      const windowStart = Math.floor(now / config.windowMs) * config.windowMs;
      
      // Create rate limit key
      const rateLimitKey = `${config.keyPrefix}${identifier}:${windowStart}`;
      const expiresAt = new Date(windowStart + config.windowMs);
      
      // Try to find or create rate limit record
      let rateLimitRecord = await EsignRateLimit.findOne({ rateLimitKey });
      
      let count;
      if (!rateLimitRecord) {
        // Create new record
        rateLimitRecord = await EsignRateLimit.create({
          rateLimitKey,
          count: 1,
          windowStart,
          expiresAt,
        });
        count = 1;
      } else {
        // Increment count
        rateLimitRecord = await EsignRateLimit.findOneAndUpdate(
          { rateLimitKey },
          { $inc: { count: 1 } },
          { new: true }
        );
        count = rateLimitRecord.count;
      }
      
      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', config.maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, config.maxRequests - count));
      res.setHeader('X-RateLimit-Reset', new Date(windowStart + config.windowMs).toISOString());
      
      // Check if rate limit exceeded
      if (count > config.maxRequests) {
        const retryAfter = Math.ceil((windowStart + config.windowMs - now) / 1000);
        
        res.setHeader('Retry-After', retryAfter);
        
        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          message: `Too many requests. Please try again in ${retryAfter} seconds.`,
          retry_after: retryAfter,
          limit: config.maxRequests,
          window: `${config.windowMs / 1000} seconds`,
        });
      }
      
      next();
    } catch (error) {
      console.error('Rate limiting error:', error);
      // Fail open - allow request if rate limiting fails
      // This prevents MongoDB issues from blocking all requests
      console.warn('Rate limiting failed, allowing request');
      next();
    }
  };
};

/**
 * Create rate limiter with custom configuration
 * @param {number} maxRequests - Maximum requests per window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Function} Middleware function
 */
const createRateLimiter = (maxRequests, windowMs) => {
  return esignRateLimit({ maxRequests, windowMs });
};

/**
 * Strict rate limiter for sensitive operations (10 requests per minute)
 */
const strictRateLimit = esignRateLimit({
  maxRequests: 10,
  windowMs: 60 * 1000,
  keyPrefix: 'ratelimit:esign:strict:',
});

/**
 * Moderate rate limiter for standard operations (100 requests per minute)
 */
const moderateRateLimit = esignRateLimit({
  maxRequests: 100,
  windowMs: 60 * 1000,
  keyPrefix: 'ratelimit:esign:moderate:',
});

/**
 * Lenient rate limiter for read operations (500 requests per minute)
 */
const lenientRateLimit = esignRateLimit({
  maxRequests: 500,
  windowMs: 60 * 1000,
  keyPrefix: 'ratelimit:esign:lenient:',
});

module.exports = {
  esignRateLimit,
  createRateLimiter,
  strictRateLimit,
  moderateRateLimit,
  lenientRateLimit,
};
