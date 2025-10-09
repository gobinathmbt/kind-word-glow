const mongoose = require('mongoose');

const CostTypeSchema = new mongoose.Schema({
  cost_type: {
    type: String,
    required: true,
    trim: true
  },
  currency_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Currency',
    required: true
  },
  default_tax_rate: {
    type: String,
    trim: true
  },
  default_tax_type: {
    type: String,
    trim: true
  },
  section_type: {
    type: String,
    trim: true
  },
  change_currency: {
    type: Boolean,
    default: false
  },
  display_order: {
    type: Number,
    default: 0
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

const CostSetterSchema = new mongoose.Schema({
  vehicle_purchase_type: {
    type: String,
    required: true,
    trim: true
  },
  enabled_cost_types: [{
    type: mongoose.Schema.Types.ObjectId
  }],
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

const CostConfigurationSchema = new mongoose.Schema({
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    unique: true
  },
  cost_types: [CostTypeSchema],
  cost_setter: [CostSetterSchema],
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

// Update timestamp on save
CostConfigurationSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

// Index for efficient queries
CostConfigurationSchema.index({ company_id: 1 });

module.exports = mongoose.model('CostConfiguration', CostConfigurationSchema);
