const mongoose = require('mongoose');
const ModelRegistry = require('./modelRegistry');

/**
 * E-Sign Distributed Lock Model
 * Manages distributed locks for PDF generation and critical operations
 */
const EsignLockSchema = new mongoose.Schema({
  lockKey: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  lockId: {
    type: String,
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

// TTL index to automatically delete expired locks
EsignLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Register with ModelRegistry
ModelRegistry.registerModel('EsignLock', EsignLockSchema, 'company');

module.exports = {};
