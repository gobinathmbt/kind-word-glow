const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
  quote_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkshopQuote',
    required: true,
    index: true
  },
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  supplier_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true
  },
  messages: [{
    sender_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    sender_type: {
      type: String,
      enum: ['company', 'supplier'],
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
  unread_count_company: {
    type: Number,
    default: 0
  },
  unread_count_supplier: {
    type: Number,
    default: 0
  },
  last_message_at: {
    type: Date,
    default: Date.now
  },
  is_archived_company: {
    type: Boolean,
    default: false
  },
  is_archived_supplier: {
    type: Boolean,
    default: false
  },
  metadata: {
    vehicle_stock_id: Number,
    field_name: String,
    vehicle_info: {
      make: String,
      model: String,
      year: Number,
      plate_no: String,
      vin: String
    }
  }
}, {
  timestamps: true
});

// Indexes for better performance
ConversationSchema.index({ quote_id: 1, company_id: 1, supplier_id: 1 });
ConversationSchema.index({ last_message_at: -1 });
ConversationSchema.index({ 'company_id': 1, 'is_archived_company': 1 });
ConversationSchema.index({ 'supplier_id': 1, 'is_archived_supplier': 1 });

module.exports = mongoose.model("Conversation", ConversationSchema);
