const mongoose = require('mongoose');
const ModelRegistry = require('./modelRegistry');

const TenderNotificationSchema = new mongoose.Schema({
  recipient_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  recipient_type: {
    type: String,
    enum: ['admin', 'dealership_user'],
    required: true
  },
  tender_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tender',
    required: true
  },
  notification_type: {
    type: String,
    enum: [
      'tender_sent',
      'quote_submitted',
      'quote_withdrawn',
      'quote_approved',
      'quote_rejected',
      'tender_closed',
      'order_status_change'
    ],
    required: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  is_read: {
    type: Boolean,
    default: false
  },
  read_at: {
    type: Date
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Indexes
TenderNotificationSchema.index({ recipient_id: 1, is_read: 1, created_at: -1 });
TenderNotificationSchema.index({ tender_id: 1 });

// Register with ModelRegistry
ModelRegistry.registerModel('TenderNotification', TenderNotificationSchema, 'company');

module.exports = mongoose.model('TenderNotification', TenderNotificationSchema);
