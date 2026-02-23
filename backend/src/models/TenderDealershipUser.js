const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const ModelRegistry = require('./modelRegistry');

const TenderDealershipUserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: true,
    default: 'Welcome@123',
    minlength: 6
  },
  tenderDealership_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TenderDealership',
    required: true
  },
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  role: {
    type: String,
    enum: ['primary_tender_dealership_user', 'tender_dealership_user', 'salesman'],
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TenderDealershipUser'
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
TenderDealershipUserSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

// Hash password before saving
TenderDealershipUserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to check password
TenderDealershipUserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

TenderDealershipUserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Indexes
TenderDealershipUserSchema.index({ company_id: 1, username: 1 }, { unique: true });
TenderDealershipUserSchema.index({ company_id: 1, tenderDealership_id: 1 });
TenderDealershipUserSchema.index({ company_id: 1, isActive: 1 });

// Register with ModelRegistry
ModelRegistry.registerModel('TenderDealershipUser', TenderDealershipUserSchema, 'company');

module.exports = {};
