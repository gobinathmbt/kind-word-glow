const mongoose = require('mongoose');
const ModelRegistry = require('./modelRegistry');

const TenderHistorySchema = new mongoose.Schema({
  tender_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tender',
    required: true
  },
  tenderDealership_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TenderDealership'
  },
  action_type: {
    type: String,
    enum: [
      'created',
      'sent',
      'updated',
      'viewed',
      'quote_submitted',
      'quote_withdrawn',
      'approved',
      'rejected',
      'closed',
      'order_accepted',
      'order_delivered',
      'order_aborted'
    ],
    required: true
  },
  old_status: {
    type: String,
    trim: true
  },
  new_status: {
    type: String,
    trim: true
  },
  performed_by: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'performed_by_type'
  },
  performed_by_type: {
    type: String,
    enum: ['admin', 'dealership_user'],
    required: true
  },
  notes: {
    type: String,
    trim: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Indexes
TenderHistorySchema.index({ tender_id: 1, created_at: -1 });
TenderHistorySchema.index({ tenderDealership_id: 1, created_at: -1 });

// Register with ModelRegistry
ModelRegistry.registerModel('TenderHistory', TenderHistorySchema, 'company');

module.exports = {};
