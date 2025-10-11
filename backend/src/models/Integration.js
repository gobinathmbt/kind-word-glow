const mongoose = require('mongoose');

const IntegrationSchema = new mongoose.Schema({
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  integration_type: {
    type: String,
    required: true,
  },
  display_name: {
    type: String,
    required: true
  },
  environments: {
    development: {
      configuration: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
      },
      is_active: {
        type: Boolean,
        default: false
      }
    },
    testing: {
      configuration: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
      },
      is_active: {
        type: Boolean,
        default: false
      }
    },
    production: {
      configuration: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
      },
      is_active: {
        type: Boolean,
        default: false
      }
    }
  },
  active_environment: {
    type: String,
    enum: ['development', 'testing', 'production'],
    default: 'production'
  },
  // Deprecated fields - kept for backward compatibility
  configuration: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
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
  updated_by: {
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

// Indexes
IntegrationSchema.index({ company_id: 1, integration_type: 1 });
IntegrationSchema.index({ is_active: 1 });
IntegrationSchema.index({ created_at: -1 });

// Update timestamp on save
IntegrationSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

module.exports = mongoose.model('Integration', IntegrationSchema);
