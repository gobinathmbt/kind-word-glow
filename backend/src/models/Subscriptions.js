
const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema({
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  number_of_days: {
    type: Number,
    required: true,
    min: 1
  },
  number_of_users: {
    type: Number,
    required: true,
    min: 1
  },
  selected_modules: [{
    module_name: String,
    cost: Number
  }],
  total_amount: {
    type: Number,
    required: true
  },
  subscription_start_date: {
    type: Date,
    required: true
  },
  subscription_end_date: {
    type: Date,
    required: true
  },
  payment_status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  payment_method: {
    type: String,
    enum: ['stripe', 'paypal', 'razorpay']
  },
  payment_transaction_id: String,
  is_active: {
    type: Boolean,
    default: true
  },
  grace_period_end: Date,
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
SubscriptionSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

// Virtual for subscription status
SubscriptionSchema.virtual('subscription_status').get(function() {
  const now = new Date();
  if (this.subscription_end_date > now) {
    return 'active';
  } else if (this.grace_period_end && this.grace_period_end > now) {
    return 'grace_period';
  } else {
    return 'expired';
  }
});

// Virtual for days remaining
SubscriptionSchema.virtual('days_remaining').get(function() {
  const now = new Date();
  if (this.subscription_end_date > now) {
    return Math.ceil((this.subscription_end_date - now) / (1000 * 60 * 60 * 24));
  }
  return 0;
});

module.exports = mongoose.model('Subscription', SubscriptionSchema);
