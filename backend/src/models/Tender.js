const mongoose = require('mongoose');
const ModelRegistry = require('./modelRegistry');

const TenderSchema = new mongoose.Schema({
  tender_id: {
    type: String,
    unique: true
  },
  customer_info: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phone: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      trim: true
    }
  },
  basic_vehicle_info: {
    make: {
      type: String,
      required: true,
      trim: true
    },
    model: {
      type: String,
      required: true,
      trim: true
    },
    year: {
      type: String,
      required: true,
      trim: true
    },
    variant: {
      type: String,
      trim: true
    },
    body_style: {
      type: String,
      trim: true
    },
    color: {
      type: String,
      trim: true
    }
  },
  tender_expiry_time: {
    type: Date,
    required: true
  },
  tender_status: {
    type: String,
    enum: ['Pending', 'Sent', 'Quote Received', 'Approved', 'Closed'],
    default: 'Pending'
  },
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Generate tender_id with format: TND-{timestamp}-{random}
TenderSchema.pre('save', function(next) {
  if (this.isNew) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.tender_id = `TND-${timestamp}-${random}`;
  }
  
  this.updated_at = new Date();
  next();
});

// Indexes
TenderSchema.index({ company_id: 1, tender_status: 1 });
TenderSchema.index({ company_id: 1, created_at: -1 });
TenderSchema.index({ tender_id: 1 }, { unique: true });

// Register with ModelRegistry
ModelRegistry.registerModel('Tender', TenderSchema, 'company');

module.exports = mongoose.model('Tender', TenderSchema);
