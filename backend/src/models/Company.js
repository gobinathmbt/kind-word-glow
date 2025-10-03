
const mongoose = require('mongoose');

const CompanySchema = new mongoose.Schema({
  company_name: {
    type: String,
    required: true,
    trim: true
  },
  contact_person: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  country: {
    type: String,
    required: true
  },
  subscription_status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'trial', 'grace_period'],
    default: 'inactive'
  },
    module_access: {
    type: [String],   // <--- This stores module names
    default: []
  },
  subscription_start_date: Date,
  subscription_end_date: Date,
  grace_period_end: Date,
  number_of_days: {
    type: Number,
    default: 0
  },
  number_of_users: {
    type: Number,
    default: 1
  },
  user_limit: {
    type: Number,
    default: 1
  },
  current_user_count: {
    type: Number,
    default: 0
  },
  s3_config: {
    bucket: String,
    access_key: String,
    secret_key: String,
    region: String,
    url: String
  },
  callback_url: String,
  integration_settings: {
    webhook_url: String,
    api_key: String,
    auth_token: String
  },
  notification_configurations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NotificationConfiguration'
  }],
  is_active: {
    type: Boolean,
    default: true
  },
  created_by: {
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
CompanySchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

// Virtual for company age
CompanySchema.virtual('company_age').get(function() {
  return Math.floor((Date.now() - this.created_at) / (1000 * 60 * 60 * 24));
});

// Index for efficient queries
CompanySchema.index({ email: 1 });
CompanySchema.index({ subscription_status: 1 });

module.exports = mongoose.model('Company', CompanySchema);
