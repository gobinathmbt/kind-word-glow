const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  first_name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  last_name: {
    type: String,
    trim: true,
    maxlength: 50
  },
  role: {
    type: String,
    enum: ['company_super_admin', 'company_admin'],
    required: true
  },
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  permissions: [{
    type: String,
    trim: true
  }],
  module_access: [{
    type: String,
    trim: true
  }],
  dealership_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dealership'
  }],
  is_active: {
    type: Boolean,
    default: true
  },
  is_first_login: {
    type: Boolean,
    default: true
  },
    is_primary_admin: {
    type: Boolean,
    default: false
  },
  last_login: {
    type: Date
  },
  login_attempts: {
    type: Number,
    default: 0
  },
  account_locked_until: Date,
  email_verified: {
    type: Boolean,
    default: false
  },
  email_verification_token: String,
  password_reset_token: String,
  password_reset_expires: Date,
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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

// Indexes for efficient queries
UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });
UserSchema.index({ company_id: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ is_active: 1 });

// Update timestamp on save
UserSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
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
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Alias for comparePassword (from Code 1)
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to get user's full name
UserSchema.methods.getFullName = function() {
  return `${this.first_name} ${this.last_name}`;
};

// Check if account is locked
UserSchema.methods.isAccountLocked = function() {
  return !!(this.account_locked_until && this.account_locked_until > Date.now());
};

// Increment login attempts
UserSchema.methods.incrementLoginAttempts = function() {
  if (this.account_locked_until && this.account_locked_until < Date.now()) {
    return this.updateOne({
      $unset: { account_locked_until: 1 },
      $set: { login_attempts: 1 }
    });
  }

  const updates = { $inc: { login_attempts: 1 } };

  if (this.login_attempts + 1 >= 5 && !this.isAccountLocked()) {
    updates.$set = { account_locked_until: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }

  return this.updateOne(updates);
};

// Reset login attempts
UserSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { login_attempts: 1, account_locked_until: 1 }
  });
};

module.exports = mongoose.model('User', UserSchema);
