const mongoose = require('mongoose');

const SupplierSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    default: 'Welcome@123'
  },
  address: {
    type: String,
    trim: true
  },
  supplier_shop_name: {
    type: String,
    trim: true
  },
  tags: [String], // Array of tags for searching
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
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
SupplierSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

// Index for efficient queries
SupplierSchema.index({ company_id: 1, email: 1 }, { unique: true });
SupplierSchema.index({ company_id: 1, is_active: 1 });
SupplierSchema.index({ tags: 1 });

module.exports = mongoose.model('Supplier', SupplierSchema);