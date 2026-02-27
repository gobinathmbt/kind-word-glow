const mongoose = require('mongoose');

/**
 * E-Sign OTP Model
 * Stores OTP data for multi-factor authentication
 */
const EsignOTPSchema = new mongoose.Schema({
  recipientId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  hashedOTP: {
    type: String,
    required: true,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  lockedUntil: {
    type: Date,
    default: null,
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

// TTL index to automatically delete expired OTPs
EsignOTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('EsignOTP', EsignOTPSchema);
