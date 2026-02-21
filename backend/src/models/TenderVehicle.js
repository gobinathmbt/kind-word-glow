const mongoose = require('mongoose');
const ModelRegistry = require('./modelRegistry');

const TenderVehicleSchema = new mongoose.Schema({
  tender_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tender',
    required: true
  },
  tenderDealership_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TenderDealership',
    required: true
  },
  vehicle_type: {
    type: String,
    enum: ['sent_vehicle', 'alternate_vehicle'],
    required: true
  },
  parent_vehicle_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TenderVehicle',
    default: null
  },
  
  // Vehicle details
  make: {
    type: String,
    required: true,
    trim: true
  },
  model: {
    type: String,
    required: true,
    trim: true
  },
  year: {
    type: String,
    required: true,
    trim: true
  },
  variant: {
    type: String,
    trim: true
  },
  body_style: {
    type: String,
    trim: true
  },
  color: {
    type: String,
    trim: true
  },
  registration_number: {
    type: String,
    trim: true
  },
  vin: {
    type: String,
    trim: true
  },
  odometer_reading: {
    type: Number
  },
  
  // Engine and specifications
  engine_details: {
    engine_type: {
      type: String,
      trim: true
    },
    engine_capacity: {
      type: String,
      trim: true
    },
    fuel_type: {
      type: String,
      trim: true
    },
    transmission: {
      type: String,
      trim: true
    }
  },
  
  specifications: {
    doors: {
      type: Number
    },
    seats: {
      type: Number
    },
    drive_type: {
      type: String,
      trim: true
    },
    features: [{
      type: String,
      trim: true
    }]
  },
  
  // Attachments
  attachments: [{
    url: {
      type: String
    },
    key: {
      type: String
    },
    type: {
      type: String
    },
    uploaded_at: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Quote information
  quote_price: {
    type: Number
  },
  quote_status: {
    type: String,
    enum: ['Open', 'In Progress', 'Submitted', 'Withdrawn', 'Closed', 'Order - Approved', 'Accepted', 'Delivered', 'Aborted'],
    default: 'Open'
  },
  quote_notes: {
    type: String,
    trim: true
  },
  
  // Tracking
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TenderDealershipUser'
  },
  modified_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TenderDealershipUser'
  },
  submitted_at: {
    type: Date
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
TenderVehicleSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

// Indexes
TenderVehicleSchema.index({ tender_id: 1, tenderDealership_id: 1 });
TenderVehicleSchema.index({ tender_id: 1, vehicle_type: 1 });
TenderVehicleSchema.index({ quote_status: 1 });
TenderVehicleSchema.index({ parent_vehicle_id: 1 });

// Register with ModelRegistry
ModelRegistry.registerModel('TenderVehicle', TenderVehicleSchema, 'company');

module.exports = mongoose.model('TenderVehicle', TenderVehicleSchema);
