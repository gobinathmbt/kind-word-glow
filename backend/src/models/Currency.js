const mongoose = require('mongoose');

const CurrencySchema = new mongoose.Schema({
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  currency_name: {
    type: String,
    required: true,
    trim: true
  },
  currency_code: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  symbol: {
    type: String,
    required: true,
    trim: true
  },
  country: {
    type: String,
    required: true,
    trim: true
  },
  exchange_rate: {
    type: Number,
    required: true,
    default: 1
  },
  symbol_position: {
    type: String,
    enum: ['before', 'after', 'first', 'last'],
    default: 'before'
  },
  is_active: {
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

// Update timestamp on save
CurrencySchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

// Index for efficient queries
CurrencySchema.index({ company_id: 1 });
CurrencySchema.index({ currency_code: 1, company_id: 1 });
CurrencySchema.index({ is_active: 1 });

module.exports = mongoose.model('Currency', CurrencySchema);
