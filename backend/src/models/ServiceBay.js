const mongoose = require('mongoose');

const BayTimingsSchema = new mongoose.Schema({
  day_of_week: {
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    required: true
  },
  start_time: {
    type: String, // Format: "HH:mm" (24-hour)
  },
  end_time: {
    type: String, // Format: "HH:mm" (24-hour)
  },
  is_working_day: {
    type: Boolean,
    default: true
  }
});

const BayHolidaySchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  start_time: {
    type: String,
    required: true
  },
  end_time: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    default: ''
  },
  marked_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  marked_at: {
    type: Date,
    default: Date.now
  }
});

const ServiceBaySchema = new mongoose.Schema({
  bay_name: {
    type: String,
    required: true,
    trim: true
  },
  bay_description: {
    type: String,
    trim: true
  },
  dealership_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dealership',
    required: true
  },
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  bay_users: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  primary_admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bay_timings: [BayTimingsSchema],
  bay_holidays: [BayHolidaySchema],
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

// Indexes
ServiceBaySchema.index({ company_id: 1, dealership_id: 1 });
ServiceBaySchema.index({ bay_users: 1 });
ServiceBaySchema.index({ primary_admin: 1 });
ServiceBaySchema.index({ is_active: 1 });

// Update timestamp on save
ServiceBaySchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

module.exports = mongoose.model('ServiceBay', ServiceBaySchema);
