const mongoose = require('mongoose');

const notificationConfigurationSchema = new mongoose.Schema({
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  trigger_type: {
    type: String,
    enum: ['create', 'update', 'delete'],
    required: true
  },
  target_schema: {
    type: String,
    required: true,
  },
  target_fields: [{
    field_name: {
      type: String,
      required: true
    },
    operator: {
      type: String,
      enum: ['equals', 'not_equals', 'contains', 'not_contains', 'greater_than', 'less_than', 'in', 'not_in'],
      default: 'equals'
    },
    value: mongoose.Schema.Types.Mixed,
    condition: {
      type: String,
      enum: ['and', 'or'],
      default: 'and'
    }
  }],
  target_users: {
    type: {
      type: String,
      enum: ['all', 'specific_users', 'role_based', 'department_based', 'dealership_based'],
      default: 'all'
    },
    user_ids: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    roles: [{
      type: String,
      enum: ['company_super_admin', 'company_admin']
    }],
    departments: [String],
    dealership_ids: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Dealership'
    }],
    exclude_user_ids: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  message_template: {
    title: {
      type: String,
      required: true,
      maxlength: 100
    },
    body: {
      type: String,
      required: true,
      maxlength: 500
    },
    action_url: String,
    variables: [{
      variable_name: String,
      field_path: String // e.g., 'make.displayName', 'user.first_name'
    }]
  },
  notification_channels: {
    in_app: {
      type: Boolean,
      default: true
    },
  },
  conditions: {
    time_based: {
      enabled: {
        type: Boolean,
        default: false
      },
      schedule: {
        type: String,
        enum: ['immediate', 'delayed', 'scheduled'],
        default: 'immediate'
      },
      delay_minutes: {
        type: Number,
        min: 0,
        max: 10080 // 7 days in minutes
      },
      schedule_time: String // cron expression or time format
    },
    frequency_limit: {
      enabled: {
        type: Boolean,
        default: false
      },
      max_per_hour: {
        type: Number,
        min: 1,
        max: 100
      },
      max_per_day: {
        type: Number,
        min: 1,
        max: 1000
      }
    }
  },
  custom_event_config: {
    event_name: String,
    event_data_schema: mongoose.Schema.Types.Mixed,
    triggers: [{
      condition: String,
      action: String
    }]
  },
  is_active: {
    type: Boolean,
    default: true
  },
  type: {
    type: String,
    enum: ['info', 'success', 'warning', 'error'],
    default: 'info'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
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

// Indexes for efficient queries
notificationConfigurationSchema.index({ company_id: 1, is_active: 1 });
notificationConfigurationSchema.index({ target_schema: 1, trigger_type: 1 });
notificationConfigurationSchema.index({ created_at: -1 });

// Update timestamp on save
notificationConfigurationSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

// Validation for target users
notificationConfigurationSchema.pre('save', function(next) {
  if (this.target_users.type === 'specific_users' && (!this.target_users.user_ids || this.target_users.user_ids.length === 0)) {
    return next(new Error('User IDs are required when target type is specific_users'));
  }
  if (this.target_users.type === 'role_based' && (!this.target_users.roles || this.target_users.roles.length === 0)) {
    return next(new Error('Roles are required when target type is role_based'));
  }
  if (this.target_users.type === 'dealership_based' && (!this.target_users.dealership_ids || this.target_users.dealership_ids.length === 0)) {
    return next(new Error('Dealership IDs are required when target type is dealership_based'));
  }
  next();
});

module.exports = mongoose.model('NotificationConfiguration', notificationConfigurationSchema);