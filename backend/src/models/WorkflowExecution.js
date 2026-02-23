const mongoose = require('mongoose');
const ModelRegistry = require('./modelRegistry');

const WorkflowExecutionSchema = new mongoose.Schema({
  workflow_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workflow',
    required: true,
  },
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  
  // Execution details
  execution_status: {
    type: String,
    enum: ['success', 'partial_success', 'failed'],
    required: true,
  },
  execution_started_at: {
    type: Date,
    default: Date.now,
  },
  execution_completed_at: Date,
  execution_duration_ms: Number,
  
  // Request payload
  request_payload: mongoose.Schema.Types.Mixed,
  
  // Processing results
  total_vehicles: {
    type: Number,
    default: 0,
  },
  successful_vehicles: {
    type: Number,
    default: 0,
  },
  failed_vehicles: {
    type: Number,
    default: 0,
  },
  
  // Detailed results
  vehicle_results: [{
    vehicle_stock_id: mongoose.Schema.Types.Mixed,
    status: {
      type: String,
      enum: ['success', 'failed'],
    },
    database_operation: {
      type: String,
      enum: ['created', 'updated', 'none'],
    },
    vehicle_id: mongoose.Schema.Types.ObjectId,
    vehicle_type: String,
    error_message: String,
    missing_fields: [String],
    validation_errors: [String],
  }],
  
  // Database changes
  database_changes: {
    vehicles_created: {
      type: Number,
      default: 0,
    },
    vehicles_updated: {
      type: Number,
      default: 0,
    },
    created_vehicle_ids: [mongoose.Schema.Types.ObjectId],
    updated_vehicle_ids: [mongoose.Schema.Types.ObjectId],
  },
  
  // Email notification results
  email_sent: {
    type: Boolean,
    default: false,
  },
  email_status: {
    success_email: {
      sent: Boolean,
      error: String,
      sent_at: Date,
    },
    error_email: {
      sent: Boolean,
      error: String,
      sent_at: Date,
    },
  },
  
  // Authentication details
  authentication_used: {
    type: String,
    enum: ['none', 'jwt_token', 'standard', 'static'],
  },
  authentication_passed: {
    type: Boolean,
    default: false,
  },
  
  // Error details
  error_message: String,
  error_stack: String,
  error_details: mongoose.Schema.Types.Mixed,
  
  // Execution metadata
  execution_summary: String,
  
  created_at: {
    type: Date,
    default: Date.now,
  },
});

// Indexes for efficient queries
WorkflowExecutionSchema.index({ workflow_id: 1, created_at: -1 });
WorkflowExecutionSchema.index({ company_id: 1, created_at: -1 });
WorkflowExecutionSchema.index({ execution_status: 1, created_at: -1 });
WorkflowExecutionSchema.index({ created_at: 1 }); // For cleanup cron

// Register with ModelRegistry
ModelRegistry.registerModel('WorkflowExecution', WorkflowExecutionSchema, 'company');

module.exports = {};
