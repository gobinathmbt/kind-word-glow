const mongoose = require('mongoose');
const ModelRegistry = require('./modelRegistry');

const groupMemberSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  email: { type: String, required: true },
  name: { type: String, required: true },
  is_active: { type: Boolean, default: true },
  added_at: { type: Date, default: Date.now }
}, { _id: true });

const esignSigningGroupSchema = new mongoose.Schema({
  company_id: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Company' },
  name: { type: String, required: true },
  description: String,
  members: [groupMemberSchema],
  signing_policy: {
    type: String,
    enum: ['any_member', 'all_members', 'majority'],
    default: 'any_member'
  },
  is_active: { type: Boolean, default: true },
  created_by: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
  collection: 'esign_signing_groups'
});

// Indexes
esignSigningGroupSchema.index({ company_id: 1, is_active: 1 });
esignSigningGroupSchema.index({ company_id: 1, name: 1 });
esignSigningGroupSchema.index({ 'members.email': 1 });

// Register with ModelRegistry
ModelRegistry.registerModel('EsignSigningGroup', esignSigningGroupSchema, 'company');

module.exports = {};
