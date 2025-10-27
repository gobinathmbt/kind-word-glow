const mongoose = require('mongoose');

const GroupPermissionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  permissions: [{
    type: String,
    trim: true
  }],
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

// Compound index to ensure unique name per company
GroupPermissionSchema.index({ name: 1, company_id: 1 }, { unique: true });
GroupPermissionSchema.index({ company_id: 1 });
GroupPermissionSchema.index({ is_active: 1 });

// Update timestamp on save
GroupPermissionSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

module.exports = mongoose.model('GroupPermission', GroupPermissionSchema);