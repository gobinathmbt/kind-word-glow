const mongoose = require("mongoose");

const trademeMetadataSchema = new mongoose.Schema({
  value_id: {
    type: Number,
    required: true,
  },
  parent_id: {
    type: Number,
  },
  name: {
    type: String,
    required: true,
  },
  metadata_type: {
    type: String,
    required: true,
    enum: ["CATEGORY", "CONDITION", "FEATURE", "FUEL_TYPE", "MANUFACTURER", "MODEL", "TRANSMISSION", "VEHICLE_TYPE"],
  },
  category_id: {
    type: Number,
  },
  categoriesSupported: [{
    type: Number,
  }],
  externalNames: [{
    type: String,
  }],
  raw_data: {
    type: mongoose.Schema.Types.Mixed,
  },
  is_active: {
    type: Number,
    default: 1,
    enum: [0, 1],
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
}, {
  strict: false,
  timestamps: false
});

// Indexes for performance
trademeMetadataSchema.index({ value_id: 1 }, { unique: true });
trademeMetadataSchema.index({ parent_id: 1 });
trademeMetadataSchema.index({ metadata_type: 1 });
trademeMetadataSchema.index({ category_id: 1 });
trademeMetadataSchema.index({ name: 1 });
trademeMetadataSchema.index({ is_active: 1 });
trademeMetadataSchema.index({ created_at: -1 });

trademeMetadataSchema.pre("save", function (next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model("TrademeMetadata", trademeMetadataSchema, "tradememetadata");
