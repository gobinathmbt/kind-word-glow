
const mongoose = require('mongoose');

const PermissionSchema = new mongoose.Schema({
  module_name: {
    type: String,
    required: true,
    trim: true
  },
  internal_name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  is_active: {
    type: Boolean,
    default: true
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MasterAdmin',
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
PermissionSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

// Indexes for efficient queries
PermissionSchema.index({ module_name: 1 });
PermissionSchema.index({ internal_name: 1 });
PermissionSchema.index({ is_active: 1 });

module.exports = mongoose.model('Permission', PermissionSchema);
