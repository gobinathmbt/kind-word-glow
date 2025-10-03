
const mongoose = require('mongoose');

const PlanSchema = new mongoose.Schema({
  per_user_cost: {
    type: Number,
    required: true,
    min: 0,
    default: 10
  },
  modules: [{
    module_name: {
      type: String,
      required: true
    },
    display_value: {
      type: String,
      required: true
    },
    cost_per_module: {
      type: Number,
      required: true,
      min: 0
    }
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
PlanSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

module.exports = mongoose.model('Plan', PlanSchema);
