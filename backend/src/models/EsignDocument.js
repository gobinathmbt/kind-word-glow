const mongoose = require('mongoose');
const ModelRegistry = require('./modelRegistry');

const geoLocationSchema = new mongoose.Schema({
  country: String,
  region: String,
  city: String,
  latitude: Number,
  longitude: Number
}, { _id: false });

const recipientSchema = new mongoose.Schema({
  email: { type: String, required: true },
  phone: String,
  name: { type: String, required: true },
  signature_order: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'active', 'opened', 'signed', 'rejected', 'skipped', 'expired'],
    default: 'pending'
  },
  token: String,
  token_expires_at: Date,
  signature_image: String,
  signature_type: { type: String, enum: ['draw', 'type', 'upload'] },
  signed_at: Date,
  ip_address: String,
  user_agent: String,
  geo_location: geoLocationSchema,
  intent_confirmation: String,
  delegated_from: String,
  delegation_reason: String,
  group_id: { type: mongoose.Schema.Types.ObjectId, ref: 'EsignSigningGroup' },
  group_member_email: String,
  kiosk_host_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  kiosk_location: String,
  signer_photo: String,
  scroll_completed_at: Date
}, { _id: true });

const esignDocumentSchema = new mongoose.Schema({
  company_id: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Company' },
  template_id: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'EsignTemplate' },
  template_snapshot: { type: mongoose.Schema.Types.Mixed, required: true },  // Complete template at creation
  status: { 
    type: String, 
    enum: ['new', 'draft_preview', 'distributed', 'opened', 'partially_signed', 'signed', 'completed', 'rejected', 'cancelled', 'expired', 'error'],
    default: 'new'
  },
  payload: { type: mongoose.Schema.Types.Mixed, required: true },  // Delimiter values
  recipients: [recipientSchema],
  pdf_url: String,
  pdf_hash: String,
  certificate_url: String,
  expires_at: { type: Date, required: true },
  completed_at: Date,
  error_reason: String,
  callback_url: String,
  callback_status: { type: String, enum: ['pending', 'success', 'failed'] },
  callback_attempts: { type: Number, default: 0 },
  callback_last_attempt: Date,
  idempotency_key: { type: String, sparse: true },
  bulk_job_id: { type: mongoose.Schema.Types.ObjectId, ref: 'EsignBulkJob' },
  is_archived: { type: Boolean, default: false },
  archived_at: Date,
  reminders_sent: [{  // Track sent reminders to avoid duplicates (Req 61.5)
    sent_at: { type: Date, required: true },
    hours_before_expiry: { type: Number, required: true },
    _id: false
  }],
  created_by: {
    type: { type: String, enum: ['api', 'user'], required: true },
    id: { type: String, required: true }
  },
}, {
  timestamps: true,
  collection: 'esign_documents'
});

// Indexes
esignDocumentSchema.index({ company_id: 1, status: 1 });
esignDocumentSchema.index({ company_id: 1, template_id: 1 });
esignDocumentSchema.index({ company_id: 1, createdAt: -1 });
esignDocumentSchema.index({ company_id: 1, expires_at: 1 });
esignDocumentSchema.index({ company_id: 1, status: 1, completed_at: 1, is_archived: 1 }); // For retention cleanup
esignDocumentSchema.index({ 'recipients.email': 1 });
esignDocumentSchema.index({ 'recipients.token': 1 });
esignDocumentSchema.index({ idempotency_key: 1 }, { unique: true, sparse: true });
esignDocumentSchema.index({ bulk_job_id: 1 });

// Register with ModelRegistry
ModelRegistry.registerModel('EsignDocument', esignDocumentSchema, 'company');

module.exports = {};
