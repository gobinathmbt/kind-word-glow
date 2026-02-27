const mongoose = require('mongoose');
const ModelRegistry = require('./modelRegistry');

const delimiterSchema = new mongoose.Schema({
  key: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['text', 'email', 'phone', 'date', 'number', 'signature', 'initial'],
    required: true 
  },
  required: { type: Boolean, default: false },
  default_value: String,
  assigned_to: Number,  // Recipient signature_order
  position: {
    x: Number,
    y: Number,
    page: Number
  }
}, { _id: false });

const recipientConfigSchema = new mongoose.Schema({
  signature_order: { type: Number, required: true },
  recipient_type: { type: String, enum: ['individual', 'group'], required: true },
  signing_group_id: { type: mongoose.Schema.Types.ObjectId, ref: 'EsignSigningGroup' },
  signature_type: { type: String, enum: ['remote', 'in_person'], required: true },
  label: { type: String, required: true }
}, { _id: false });

const mfaConfigSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  channel: { type: String, enum: ['email', 'sms', 'both'], default: 'email' },
  otp_expiry_min: { type: Number, default: 10 }
}, { _id: false });

const linkExpirySchema = new mongoose.Schema({
  value: { type: Number, required: true },
  unit: { type: String, enum: ['hours', 'days', 'weeks'], required: true },
  grace_period_hours: Number
}, { _id: false });

const notificationConfigSchema = new mongoose.Schema({
  send_on_create: { type: Boolean, default: true },
  send_on_complete: { type: Boolean, default: true },
  send_on_reject: { type: Boolean, default: true },
  send_on_expire: { type: Boolean, default: true },
  custom_email_template: String,
  cc_emails: [String]
}, { _id: false });

const routingRuleSchema = new mongoose.Schema({
  triggered_by: Number,
  condition: {
    delimiter_key: String,
    operator: { 
      type: String, 
      enum: ['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'is_empty'] 
    },
    value: mongoose.Schema.Types.Mixed
  },
  action: {
    type: { type: String, enum: ['activate_signer', 'skip_signer', 'add_signer', 'complete'] },
    target_order: Number,
    email: String
  }
}, { _id: false });

const esignTemplateSchema = new mongoose.Schema({
  company_id: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Company' },
  name: { type: String, required: true },
  description: String,
  status: { type: String, enum: ['draft', 'active', 'inactive'], default: 'draft' },
  html_content: { type: String, required: true },
  signature_type: { 
    type: String, 
    enum: ['single', 'multiple', 'hierarchy', 'send_to_all'], 
    required: true 
  },
  delimiters: [delimiterSchema],
  recipients: [recipientConfigSchema],
  mfa_config: mfaConfigSchema,
  link_expiry: linkExpirySchema,
  preview_mode: { type: Boolean, default: false },
  notification_config: notificationConfigSchema,
  routing_rules: [routingRuleSchema],
  require_scroll_completion: { type: Boolean, default: false },
  short_link_enabled: { type: Boolean, default: false },
  is_deleted: { type: Boolean, default: false },
  version: { type: Number, default: 1 },
  created_by: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
}, {
  timestamps: true,
  collection: 'esign_templates'
});

// Indexes
esignTemplateSchema.index({ company_id: 1, status: 1 });
esignTemplateSchema.index({ company_id: 1, is_deleted: 1 });
esignTemplateSchema.index({ company_id: 1, createdAt: -1 });
esignTemplateSchema.index({ company_id: 1, name: 1 });

// Register with ModelRegistry
ModelRegistry.registerModel('EsignTemplate', esignTemplateSchema, 'company');

module.exports = {};
