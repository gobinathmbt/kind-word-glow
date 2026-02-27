const mongoose = require('mongoose');
const ModelRegistry = require('./modelRegistry');

/**
 * E-Sign Rate Limit Model
 * Tracks API request counts for rate limiting
 */
const EsignRateLimitSchema = new mongoose.Schema({
  rateLimitKey: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  count: {
    type: Number,
    default: 0,
  },
  windowStart: {
    type: Number,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// TTL index to automatically delete expired rate limit records
EsignRateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Register with ModelRegistry
ModelRegistry.registerModel('EsignRateLimit', EsignRateLimitSchema, 'company');

module.exports = {};
