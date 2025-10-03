const mongoose = require('mongoose');

const CustomModuleConfigSchema = new mongoose.Schema({
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  custom_modules: [{
    module_name: {
      type: String,
      required: true
    },
    module_display: {
      type: String,
      required: true
    },
    is_active: {
      type: Boolean,
      default: true
    },
    assigned_date: {
      type: Date,
      default: Date.now
    }
  }],
  is_active: {
    type: Boolean,
    default: true
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MasterAdmin',
    required: true
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MasterAdmin'
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
CustomModuleConfigSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

// Index for efficient queries
CustomModuleConfigSchema.index({ company_id: 1 });
CustomModuleConfigSchema.index({ 'custom_modules.module_name': 1 });

module.exports = mongoose.model('CustomModuleConfig', CustomModuleConfigSchema);