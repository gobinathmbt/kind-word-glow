
const mongoose = require('mongoose');

const DropdownValueSchema = new mongoose.Schema({
  option_value: {
    type: String,
    required: true
  },
  display_value: {
    type: String,
    required: true
  },
  display_order: {
    type: Number,
    default: 0
  },
  is_active: {
    type: Boolean,
    default: true
  },
  is_default: {
    type: Boolean,
    default: false
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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

const DropdownMasterSchema = new mongoose.Schema({
  dropdown_name: {
    type: String,
    required: true
  },
  display_name: {
    type: String,
    required: true
  },
  dealership_id: {
    type: String,
    ref: "Dealership",
  },
  description: String,
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  is_standard: {
    type: Boolean,
    default: false
  },
  allow_multiple_selection: {
    type: Boolean,
    default: false
  },
  is_required: {
    type: Boolean,
    default: false
  },
  validation_rules: {
    min_length: Number,
    max_length: Number,
    pattern: String
  },
  values: [DropdownValueSchema],
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
DropdownMasterSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

// Index for efficient queries
DropdownMasterSchema.index({ company_id: 1, dropdown_name: 1 });
DropdownMasterSchema.index({ is_active: 1 });

module.exports = mongoose.model('DropdownMaster', DropdownMasterSchema);
