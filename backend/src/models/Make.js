const mongoose = require("mongoose");
const ModelRegistry = require("./modelRegistry");

const makeSchema = new mongoose.Schema({
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

makeSchema.pre("save", function (next) {
  this.displayValue = this.displayName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");
  this.updatedAt = Date.now();
  next();
});

// Register with ModelRegistry
ModelRegistry.registerModel('Make', makeSchema, 'main');

module.exports = mongoose.model("Make", makeSchema);
