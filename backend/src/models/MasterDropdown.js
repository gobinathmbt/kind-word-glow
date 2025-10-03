
const mongoose = require('mongoose');

const MasterDropdownValueSchema = new mongoose.Schema({
  option_value: { type: String, required: true, trim: true },
  display_value: { type: String, trim: true },
  description: { type: String, trim: true },
  is_default: { type: Boolean, default: false },
  is_active: { type: Boolean, default: true },
  display_order: { type: Number, default: 0 },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'MasterAdmin' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

MasterDropdownValueSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

const MasterDropdownSchema = new mongoose.Schema({
  dropdown_name: { type: String, required: true, trim: true, lowercase: true },
  display_name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  allow_multiple_selection: { type: Boolean, default: false },
  is_required: { type: Boolean, default: false },
  is_active: { type: Boolean, default: true },
  values: [MasterDropdownValueSchema],
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'MasterAdmin' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// Helpful indexes (do not enforce unique to avoid migration issues; controller checks duplicates)
MasterDropdownSchema.index({ dropdown_name: 1 });
MasterDropdownSchema.index({ display_name: 1 });

// Update timestamp on save
MasterDropdownSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

module.exports = mongoose.model('MasterDropdown', MasterDropdownSchema);
