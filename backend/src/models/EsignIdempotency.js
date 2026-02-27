const mongoose = require('mongoose');

/**
 * E-Sign Idempotency Model
 * Stores idempotency keys and cached responses
 */
const EsignIdempotencySchema = new mongoose.Schema({
  idempotencyKey: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  statusCode: {
    type: Number,
    required: true,
  },
  body: {
    type: mongoose.Schema.Types.Mixed,
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

// TTL index to automatically delete expired idempotency records (24 hours)
EsignIdempotencySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('EsignIdempotency', EsignIdempotencySchema);
