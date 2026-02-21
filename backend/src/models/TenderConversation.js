const mongoose = require('mongoose');
const ModelRegistry = require('./modelRegistry');

const TenderConversationSchema = new mongoose.Schema({
  tender_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tender',
    required: true,
    index: true
  },
  tenderDealership_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TenderDealership',
    required: true,
    index: true
  },
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  messages: [{
    sender_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    sender_type: {
      type: String,
      enum: ['admin', 'dealership'],
      required: true
    },
    sender_name: {
      type: String,
      required: true
    },
    message_type: {
      type: String,
      enum: ['text', 'image', 'video', 'file', 'audio'],
      default: 'text'
    },
    content: {
      type: String,
      required: function() {
        return this.message_type === 'text';
      }
    },
    file_url: String,
    file_key: String,
    file_size: Number,
    file_type: String,
    file_name: String,
    is_read: {
      type: Boolean,
      default: false
    },
    read_at: Date,
    created_at: {
      type: Date,
      default: Date.now
    }
  }],
  unread_count_admin: {
    type: Number,
    default: 0
  },
  unread_count_dealership: {
    type: Number,
    default: 0
  },
  last_message_at: {
    type: Date,
    default: Date.now
  },
  is_archived_admin: {
    type: Boolean,
    default: false
  },
  is_archived_dealership: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for better performance
TenderConversationSchema.index({ tender_id: 1, tenderDealership_id: 1 }, { unique: true });
TenderConversationSchema.index({ company_id: 1, last_message_at: -1 });
TenderConversationSchema.index({ company_id: 1, is_archived_admin: 1 });
TenderConversationSchema.index({ tenderDealership_id: 1, is_archived_dealership: 1 });

// Register with ModelRegistry as company database model
ModelRegistry.registerModel('TenderConversation', TenderConversationSchema, 'company');

module.exports = mongoose.model("TenderConversation", TenderConversationSchema);
