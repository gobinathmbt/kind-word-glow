const mongoose = require('mongoose');
const ModelRegistry = require('./modelRegistry');

const TenderDealershipSchema = new mongoose.Schema({
  tenderDealership_id: {
    type: String,
    unique: true
  },
  dealership_name: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    street: {
      type: String,
      trim: true
    },
    suburb: {
      type: String,
      trim: true
    },
    state: {
      type: String,
      trim: true
    }
  },
  billing_address: {
    street: {
      type: String,
      trim: true
    },
    suburb: {
      type: String,
      trim: true
    },
    state: {
      type: String,
      trim: true
    }
  },
  abn: {
    type: String,
    trim: true
  },
  dp_name: {
    type: String,
    trim: true
  },
  brand_or_make: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  hubRecID: {
    type: String,
    trim: true
  },
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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

// Generate unique 8-digit hexadecimal tenderDealership_id
TenderDealershipSchema.pre('save', async function(next) {
  if (this.isNew) {
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!isUnique && attempts < maxAttempts) {
      // Generate 8-digit hexadecimal ID (uppercase)
      const randomHex = Math.floor(Math.random() * 0xFFFFFFFF).toString(16).toUpperCase().padStart(8, '0');
      const candidateId = randomHex;
      
      // Check if this ID already exists
      const existing = await this.constructor.findOne({ 
        tenderDealership_id: candidateId 
      });
      
      if (!existing) {
        this.tenderDealership_id = candidateId;
        isUnique = true;
      }
      
      attempts++;
    }
    
    if (!isUnique) {
      return next(new Error('Failed to generate unique dealership ID after multiple attempts'));
    }
  }
  
  this.updated_at = new Date();
  next();
});

// Indexes
TenderDealershipSchema.index({ company_id: 1, email: 1 }, { unique: true });
TenderDealershipSchema.index({ company_id: 1, isActive: 1 });
TenderDealershipSchema.index({ tenderDealership_id: 1 });

// Register with ModelRegistry
ModelRegistry.registerModel('TenderDealership', TenderDealershipSchema, 'company');

module.exports = {};
