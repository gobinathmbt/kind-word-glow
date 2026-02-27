const mongoose = require('mongoose');
const ModelRegistry = require('./modelRegistry');

const esignAPIKeySchema = new mongoose.Schema({
  company_id: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Company' },
  name: { type: String, required: true },
  key_prefix: { type: String, required: true },  // First 8 characters for display
  hashed_secret: { type: String, required: true },  // bcrypt hash of full key
  scopes: [{ 
    type: String, 
    enum: ['esign:create', 'esign:status', 'esign:download', 'esign:cancel', 'template:read'],
    required: true 
  }],
  is_active: { type: Boolean, default: true },
  last_used_at: Date,
  usage_count: { type: Number, default: 0 },
  created_by: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  revoked_at: Date,
  revoked_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  revoke_reason: String,
}, {
  timestamps: true,
  collection: 'esign_api_keys'
});

// Indexes
esignAPIKeySchema.index({ company_id: 1, is_active: 1 });
esignAPIKeySchema.index({ key_prefix: 1 });
esignAPIKeySchema.index({ company_id: 1, createdAt: -1 });

// Register with ModelRegistry
ModelRegistry.registerModel('EsignAPIKey', esignAPIKeySchema, 'company');

module.exports = {};
