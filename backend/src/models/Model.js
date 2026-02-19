const mongoose = require("mongoose");
const ModelRegistry = require("./modelRegistry");

const modelSchema = new mongoose.Schema({
  make: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Make",
    required: true,
  },
  displayName: {
    type: String,
    required: true,
    trim: true,
  },
  displayValue: {
    type: String,
    lowercase: true,
    trim: true,
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

modelSchema.pre("save", function (next) {
  this.displayValue = this.displayName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");
  this.updatedAt = Date.now();
  next();
});

// Unique per make
modelSchema.index({ make: 1, displayValue: 1 }, { unique: true });

// Register with ModelRegistry
ModelRegistry.registerModel('Model', modelSchema, 'main');

module.exports = mongoose.model("Model", modelSchema);
