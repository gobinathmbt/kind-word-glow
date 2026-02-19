const mongoose = require("mongoose");
const ModelRegistry = require("./modelRegistry");

const bodySchema = new mongoose.Schema({
  displayName: {
    type: String,
    required: true,
    trim: true,
  },
  displayValue: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

bodySchema.pre("save", function (next) {
  this.displayValue = this.displayName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");
  this.updatedAt = Date.now();
  next();
});

// Register with ModelRegistry
ModelRegistry.registerModel("Body", bodySchema, "main");

module.exports = mongoose.model("Body", bodySchema);
