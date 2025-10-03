const mongoose = require('mongoose');

const DealershipSchema = new mongoose.Schema({
  dealership_id: {
    type: String,
  },
  dealership_name: {
    type: String,
    required: true,
    trim: true
  },
  dealership_address: {
    type: String,
    required: true,
    trim: true
  },
  dealership_email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
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
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Generate dealership_id from dealership_name
// Generate dealership_id from dealership_name + current datetime
DealershipSchema.pre('save', async function(next) {
  if (this.isNew) {
    const now = new Date();
    const formattedDateTime = `${now.getFullYear()}${(now.getMonth() + 1)
      .toString()
      .padStart(2, '0')}${now.getDate()
      .toString()
      .padStart(2, '0')}${now.getHours()
      .toString()
      .padStart(2, '0')}${now.getMinutes()
      .toString()
      .padStart(2, '0')}${now.getSeconds()
      .toString()
      .padStart(2, '0')}`;

    this.dealership_id = this.dealership_name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_') + '_' + formattedDateTime; // append date-time
  }

  this.updated_at = new Date();
  next();
});


// Indexes
DealershipSchema.index({ company_id: 1 });
DealershipSchema.index({ dealership_id: 1 });
DealershipSchema.index({ is_active: 1 });
DealershipSchema.index({ dealership_name: 1 });

module.exports = mongoose.model('Dealership', DealershipSchema);
