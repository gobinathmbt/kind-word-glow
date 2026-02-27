const mongoose = require('mongoose');
const ModelRegistry = require('./modelRegistry');

const esignProviderConfigSchema = new mongoose.Schema({
  company_id: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Company' },
  provider_type: { 
    type: String, 
    enum: ['storage', 'email', 'sms'], 
    required: true 
  },
  provider: { 
    type: String, 
    enum: [
      'aws_s3', 'azure_blob', 'google_drive', 'dropbox',  // Storage providers
      'smtp', 'sendgrid', 'mailgun',                       // Email providers
      'twilio', 'sendgrid_sms', 'aws_sns'                  // SMS providers
    ], 
    required: true 
  },
  credentials: {
    // Encrypted credentials stored as JSON string
    // Structure varies by provider
    encrypted_data: { type: String, required: true },
    encryption_version: { type: String, default: 'v1' }
  },
  settings: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  is_active: { type: Boolean, default: true },
  last_tested_at: Date,
  last_test_status: { type: String, enum: ['success', 'failed'] },
  last_test_error: String,
  created_by: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
  collection: 'esign_provider_configs'
});

// Indexes
esignProviderConfigSchema.index({ company_id: 1, provider_type: 1, is_active: 1 });
esignProviderConfigSchema.index({ company_id: 1, provider: 1 });

// Ensure only one active provider per type per company
esignProviderConfigSchema.index(
  { company_id: 1, provider_type: 1, is_active: 1 },
  { 
    unique: true, 
    partialFilterExpression: { is_active: true },
    name: 'unique_active_provider_per_type'
  }
);

// Register with ModelRegistry
ModelRegistry.registerModel('EsignProviderConfig', esignProviderConfigSchema, 'company');

module.exports = {};
