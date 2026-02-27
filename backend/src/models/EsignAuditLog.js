const mongoose = require('mongoose');
const ModelRegistry = require('./modelRegistry');

const geoLocationSchema = new mongoose.Schema({
  country: String,
  region: String,
  city: String,
  latitude: Number,
  longitude: Number
}, { _id: false });

const actorSchema = new mongoose.Schema({
  type: { type: String, enum: ['user', 'system', 'api', 'signer'], required: true },
  id: String,
  email: String,
  api_key_prefix: String
}, { _id: false });

const resourceSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ['document', 'template', 'provider', 'api_key', 'recipient', 'signing_group', 'bulk_job'],
    required: true 
  },
  id: { type: String, required: true }
}, { _id: false });

const esignAuditLogSchema = new mongoose.Schema({
  company_id: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Company' },
  event_type: { 
    type: String, 
    required: true,
    enum: [
      // Authentication events
      'auth.login', 'auth.logout', 'auth.failed',
      // Provider events
      'provider.created', 'provider.updated', 'provider.tested', 'provider.deleted',
      // API key events
      'api_key.generated', 'api_key.revoked', 'api_key.used',
      // Template events
      'template.created', 'template.updated', 'template.deleted', 'template.activated', 'template.deactivated',
      // Document events
      'document.created', 'document.distributed', 'document.opened', 'document.signed', 
      'document.completed', 'document.rejected', 'document.cancelled', 'document.expired',
      'document.resent', 'document.reminded',
      // Token events
      'token.generated', 'token.validated', 'token.rotated', 'token.expired',
      // OTP events
      'otp.generated', 'otp.verified', 'otp.failed', 'otp.locked',
      // Signature events
      'signature.submitted', 'signature.rejected', 'signature.delegated',
      // PDF events
      'pdf.generated', 'pdf.stored', 'pdf.downloaded', 'pdf.verified',
      // Notification events
      'notification.sent', 'notification.failed',
      // Webhook events
      'webhook.sent', 'webhook.failed',
      // Signing group events
      'signing_group.created', 'signing_group.updated', 'signing_group.deleted',
      // Bulk job events
      'bulk_job.created', 'bulk_job.started', 'bulk_job.completed', 'bulk_job.failed'
    ]
  },
  actor: actorSchema,
  resource: resourceSchema,
  action: { type: String, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  ip_address: String,
  user_agent: String,
  geo_location: geoLocationSchema,
  timestamp: { type: Date, default: Date.now, required: true },
  hash_chain: String,  // For tamper detection (optional)
}, {
  timestamps: false,  // We use timestamp field instead
  collection: 'esign_audit_logs'
});

// Indexes
esignAuditLogSchema.index({ company_id: 1, timestamp: -1 });
esignAuditLogSchema.index({ company_id: 1, event_type: 1, timestamp: -1 });
esignAuditLogSchema.index({ 'resource.type': 1, 'resource.id': 1, timestamp: -1 });
esignAuditLogSchema.index({ 'actor.email': 1, timestamp: -1 });
esignAuditLogSchema.index({ 'actor.type': 1, timestamp: -1 });

// Prevent modifications and deletions
esignAuditLogSchema.pre('findOneAndUpdate', function(next) {
  next(new Error('Audit logs cannot be modified'));
});

esignAuditLogSchema.pre('findOneAndDelete', function(next) {
  next(new Error('Audit logs cannot be deleted'));
});

esignAuditLogSchema.pre('updateOne', function(next) {
  next(new Error('Audit logs cannot be modified'));
});

esignAuditLogSchema.pre('deleteOne', function(next) {
  next(new Error('Audit logs cannot be deleted'));
});

// Register with ModelRegistry
ModelRegistry.registerModel('EsignAuditLog', esignAuditLogSchema, 'company');

module.exports = {};
