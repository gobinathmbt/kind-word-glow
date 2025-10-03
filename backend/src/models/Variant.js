const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema({
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  displayValue: {
    type: String,
    lowercase: true,
    trim: true,
    unique: true // Variants are globally unique
  },
  models: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Model',
    required: true
  }],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

variantSchema.pre('save', function(next) {
  this.displayValue = this.displayName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');
  this.updatedAt = Date.now();
  next();
});

// Index for faster lookups
variantSchema.index({ displayValue: 1 }, { unique: true });
variantSchema.index({ models: 1 });

module.exports = mongoose.model('Variant', variantSchema);
