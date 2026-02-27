const mongoose = require('mongoose');
const ModelRegistry = require('./modelRegistry');

/**
 * E-Sign Short Link Model
 * Stores short URL mappings for signing links
 */
const EsignShortLinkSchema = new mongoose.Schema({
  shortCode: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  fullToken: {
    type: String,
    required: true,
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
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

// TTL index to automatically delete expired short links
EsignShortLinkSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Register with ModelRegistry as Main DB model (not company-specific)
ModelRegistry.registerModel('EsignShortLink', EsignShortLinkSchema, 'main');

module.exports = {};
