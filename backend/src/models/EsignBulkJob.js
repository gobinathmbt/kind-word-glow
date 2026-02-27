const mongoose = require('mongoose');
const ModelRegistry = require('./modelRegistry');

const bulkJobItemSchema = new mongoose.Schema({
  row_number: { type: Number, required: true },
  document_id: { type: mongoose.Schema.Types.ObjectId, ref: 'EsignDocument' },
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  payload: mongoose.Schema.Types.Mixed,
  error_message: String,
  processed_at: Date
}, { _id: true });

const esignBulkJobSchema = new mongoose.Schema({
  company_id: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Company' },
  template_id: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'EsignTemplate' },
  name: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  total_items: { type: Number, required: true },
  processed_items: { type: Number, default: 0 },
  successful_items: { type: Number, default: 0 },
  failed_items: { type: Number, default: 0 },
  items: [bulkJobItemSchema],
  csv_file_url: String,
  csv_file_name: String,
  started_at: Date,
  completed_at: Date,
  error_summary: String,
  created_by: {
    type: { type: String, enum: ['api', 'user'], required: true },
    id: { type: String, required: true }
  },
}, {
  timestamps: true,
  collection: 'esign_bulk_jobs'
});

// Indexes
esignBulkJobSchema.index({ company_id: 1, status: 1 });
esignBulkJobSchema.index({ company_id: 1, template_id: 1 });
esignBulkJobSchema.index({ company_id: 1, createdAt: -1 });
esignBulkJobSchema.index({ 'items.document_id': 1 });

// Virtual for progress percentage
esignBulkJobSchema.virtual('progress_percentage').get(function() {
  if (this.total_items === 0) return 0;
  return Math.round((this.processed_items / this.total_items) * 100);
});

// Register with ModelRegistry
ModelRegistry.registerModel('EsignBulkJob', esignBulkJobSchema, 'company');

module.exports = {};
