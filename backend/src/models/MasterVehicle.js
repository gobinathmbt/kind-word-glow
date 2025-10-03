const mongoose = require("mongoose");

const MasterVehicleSchema = new mongoose.Schema({
  vehicle_stock_id: {
    type: Number,
    required: true,
  },
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true,
  },
  dealership_id: {
    type: String,
    ref: "Dealership",
  },

  // Vehicle Type & Status
  vehicle_type: {
    type: String,
    enum: ["inspection", "tradein", "advertisement", "master"],
    required: true,
  },

  // Hero Image
  vehicle_hero_image: {
    type: String,
    required: true,
  },

  // Basic Vehicle Information (Required)
  vin: {
    type: String,
    required: true,
  },
  plate_no: {
    type: String,
    required: true,
  },
  make: {
    type: String,
    required: true,
  },
  model: {
    type: String,
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  chassis_no: {
    type: String,
    required: true,
  },
  is_pricing_ready: {
    type: Boolean,
    default: false,
  },
  // Optional Basic Fields
  variant: String,
  model_no: String,
  body_style: String,
  name: String, // Auto-generated from year + make + model + variant + body_style if not provided
  vehicle_category: String, // renamed from vehicle_type to avoid confusion

  // Results Arrays
  inspection_result: [mongoose.Schema.Types.Mixed],
  trade_in_result: [mongoose.Schema.Types.Mixed],
  inspection_report_pdf: String, // URL to the generated PDF report
  tradein_report_pdf: String, // URL to the generated PDF report

  last_inspection_config_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "InspectionConfig",
  },
  last_tradein_config_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TradeinConfig",
  },

  // Vehicle Other Details
  vehicle_other_details: [
    {
      status: String,
      trader_acquisition: String,
      odometer_certified: Boolean,
      odometer_status: String,
      purchase_price: { type: Number, default: 0 },
      exact_expenses: { type: Number, default: 0 },
      estimated_expenses: { type: Number, default: 0 },
      gst_inclusive: { type: Boolean, default: false },
      retail_price: Number,
      sold_price: { type: Number, default: 0 },
      included_in_exports: { type: Boolean, default: true },
    },
  ],

  // Vehicle Source
  vehicle_source: [
    {
      supplier: String,
      purchase_date: Date,
      purchase_type: String,
      purchase_notes: String,
    },
  ],

  // Vehicle Registration
  vehicle_registration: [
    {
      registered_in_local: Boolean,
      year_first_registered_local: Number,
      re_registered: Boolean,
      first_registered_year: Number,
      license_expiry_date: Date,
      wof_cof_expiry_date: Date,
      last_registered_country: String,
      road_user_charges_apply: Boolean,
      outstanding_road_user_charges: Boolean,
      ruc_end_distance: Number,
    },
  ],

  // Vehicle Import Details
  vehicle_import_details: [
    {
      delivery_port: String,
      vessel_name: String,
      voyage: String,
      etd: Date,
      eta: Date,
      date_on_yard: Date,
      imported_as_damaged: Boolean,
    },
  ],

  // Vehicle Attachments - Enhanced with S3 metadata
  vehicle_attachments: [
    {
      vehicle_stock_id: Number,
      type: {
        type: String,
        enum: ["image", "file"],
      },
      url: String,
      s3_key: String, // S3 object key for deletion
      s3_bucket: String, // S3 bucket name
      size: Number,
      mime_type: String,
      filename: String,
      original_filename: String, // Store original filename
      position: Number,
      image_category: {
        type: String,
      },
      file_category: {
        type: String,
      },
      uploaded_at: {
        type: Date,
        default: Date.now,
      },
      uploaded_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },
  ],

  // Vehicle Engine & Transmission
  vehicle_eng_transmission: [
    {
      engine_no: String,
      engine_type: String,
      transmission_type: String,
      primary_fuel_type: String,
      no_of_cylinders: Number,
      turbo: String,
      engine_size: Number,
      engine_size_unit: String,
      engine_features: [String],
    },
  ],

  // Vehicle Specifications
  vehicle_specifications: [
    {
      number_of_seats: Number,
      number_of_doors: Number,
      interior_color: String,
      exterior_primary_color: String,
      exterior_secondary_color: String,
      steering_type: String,
      wheels_composition: String,
      sunroof: Boolean,
      interior_trim: String,
      seat_material: String,
      tyre_size: String,
      interior_features: [String],
      exterior_features: [String],
    },
  ],

  // Vehicle Safety Features
  vehicle_safety_features: [
    {
      features: [String],
    },
  ],

  // Vehicle Odometer
  vehicle_odometer: [
    {
      reading: Number,
      reading_date: Date,
    },
  ],

  // Vehicle Ownership
  vehicle_ownership: {
    origin: String,
    no_of_previous_owners: Number,
    security_interest_on_ppsr: Boolean,
    comments: String,
  },

  // Workshop Status
  is_workshop: {
    type: Boolean,
    default: false,
  },
  workshop_progress: {
    type: String,
    enum: ["in_progress", "completed", "not_processed_yet"],
    default: "not_processed_yet",
  },

  // Workshop Report Status
  workshop_report_ready: {
    // For inspection: array of stages, for tradein: single boolean
    type: mongoose.Schema.Types.Mixed,
    default: function () {
      return this.vehicle_type === "inspection" ? [] : false;
    },
  },
  workshop_report_preparing: {
    type: Boolean,
    default: false,
  },

  // Processing Status
  status: {
    type: String,
    enum: ["pending", "processing", "completed", "failed"],
    default: "pending",
  },

  // Queue Processing
  queue_status: {
    type: String,
    enum: ["pending", "processing", "processed", "failed"],
    default: "pending",
  },
  queue_id: String,
  processing_attempts: {
    type: Number,
    default: 0,
  },
  last_processing_error: String,

  // Custom Fields (for any additional fields not in schema)
  custom_fields: mongoose.Schema.Types.Mixed,

  // Timestamps
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for vehicle_stock_id, company_id, and vehicle_type (unique combination)
MasterVehicleSchema.index(
  { vehicle_stock_id: 1, company_id: 1, vehicle_type: 1 },
  { unique: true }
);

// Other indexes for efficient queries
MasterVehicleSchema.index({ company_id: 1, vehicle_type: 1, status: 1 });
MasterVehicleSchema.index({ queue_status: 1 });
MasterVehicleSchema.index({ created_at: -1 });
MasterVehicleSchema.index({ vin: 1 });
MasterVehicleSchema.index({ plate_no: 1 });

// Auto-generate name if not provided
MasterVehicleSchema.pre("save", function (next) {
  this.updated_at = new Date();

  // Generate name if not provided
  if (!this.name) {
    const nameParts = [this.year, this.make, this.model];
    if (this.variant) nameParts.push(this.variant);
    if (this.body_style) nameParts.push(this.body_style);
    this.name = nameParts.join(" ");
  }

  next();
});

module.exports = mongoose.model("MasterVehicle", MasterVehicleSchema);
