const mongoose = require("mongoose");

const vehicleMetadataSchema = new mongoose.Schema({
  make: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Make",
    required: true,
  },
  model: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Model",
    required: true,
  },
  variant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Variant",
  },
  body: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Body",
  },
  variantYear: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "VariantYear",
  },
  fuelType: String,
  transmission: String,
  engineCapacity: String,
  power: String,
  torque: String,
  seatingCapacity: Number,

  // Flexible data fields
  customFields: { type: Map, of: mongoose.Schema.Types.Mixed },
  metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  tags: [String],

  source: {
    type: String,
    default: "manual",
  },
  batchId: String,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Indexes for performance
vehicleMetadataSchema.index(
  { make: 1, model: 1, variant: 1, body: 1, variantYear: 1 },
  { unique: true }
);
vehicleMetadataSchema.index({ make: 1, model: 1 });
vehicleMetadataSchema.index({ make: 1 });
vehicleMetadataSchema.index({ tags: 1 });
vehicleMetadataSchema.index({ source: 1, batchId: 1 });
vehicleMetadataSchema.index({ createdAt: -1 });
vehicleMetadataSchema.index({ isActive: 1 });
vehicleMetadataSchema.index({ "$**": "text" }); // Full-text search

vehicleMetadataSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("VehicleMetadata", vehicleMetadataSchema);
