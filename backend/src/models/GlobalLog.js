const mongoose = require('mongoose');

const GlobalLogSchema = new mongoose.Schema({
  event_type: {
    type: String,
    required: true,
    index: true, // Individual index for filtering
    enum: [
      'auth', 'user_management', 'vehicle_operation', 'inspection',
      'tradein', 'configuration', 'api_call', 'data_export',
      'system_error', 'security_event', 'queue_operation','system_operation',
      'supplier_operation','workshop_operation','dealership_operation','meta_operation'
    ]
  },
  event_action: {
    type: String,
    required: true,
    index: true // Individual index for filtering
  },
  event_description: {
    type: String,
    required: true
  },
  
  // User and Company Context - Most selective filters
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true // Individual index
  },
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    index: true // Individual index - critical for multi-tenant
  },
  user_role: {
    type: String,
    index: true // Individual index for role-based filtering
  },
  
  // Request Context
  ip_address: {
    type: String,
    index: true // For security monitoring
  },
  user_agent: String, // No index - rarely filtered
  request_method: {
    type: String,
    index: true // Individual index for HTTP method filtering
  },
  request_url: {
    type: String,
    index: true // For endpoint analysis
  },
  request_params: mongoose.Schema.Types.Mixed,
  request_body: mongoose.Schema.Types.Mixed,
  
  // Response Context
  response_status: {
    type: Number,
    index: true // Individual index for status code filtering
  },
  response_time_ms: {
    type: Number,
    index: true // For performance analysis
  },
  
  // Resource Context
  resource_type: {
    type: String,
    index: true // Individual index
  },
  resource_id: {
    type: String,
    index: true // Individual index
  },
  resource_data: mongoose.Schema.Types.Mixed,
  
  // Additional Metadata
  metadata: mongoose.Schema.Types.Mixed,
  
  // Severity and Status - Critical for filtering
  severity: {
    type: String,
    enum: ['info', 'warning', 'error', 'critical'],
    default: 'info',
    index: true // Individual index
  },
  status: {
    type: String,
    enum: ['success', 'failure', 'pending'],
    default: 'success',
    index: true // Individual index
  },
  
  // Error Information
  error_code: String,
  error_message: String, // Text search target
  error_stack: String,
  
  // Geolocation (optional)
  location: {
    country: String,
    region: String,
    city: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  
  // Timestamps - Most important for time-series queries
  created_at: {
    type: Date,
    default: Date.now,
    index: true // Individual index
  }
});

// OPTIMIZED COMPOUND INDEXES for 50+ lakh records
// Most selective compound indexes first

// 1. Company + Time (Most common query pattern for multi-tenant)
GlobalLogSchema.index({ company_id: 1, created_at: -1 });

// 2. Company + Event Type + Time (Common filtering)
GlobalLogSchema.index({ company_id: 1, event_type: 1, created_at: -1 });

// 3. Company + Severity + Time (Error monitoring)
GlobalLogSchema.index({ company_id: 1, severity: 1, created_at: -1 });

// 4. Company + Status + Time (Success/Failure analysis)
GlobalLogSchema.index({ company_id: 1, status: 1, created_at: -1 });

// 5. Company + User + Time (User activity tracking)
GlobalLogSchema.index({ company_id: 1, user_id: 1, created_at: -1 });

// 6. Event Type + Severity + Time (System-wide error analysis)
GlobalLogSchema.index({ event_type: 1, severity: 1, created_at: -1 });

// 7. Response Status + Time (HTTP error monitoring)
GlobalLogSchema.index({ response_status: 1, created_at: -1 });

// 8. IP Address + Time (Security analysis)
GlobalLogSchema.index({ ip_address: 1, created_at: -1 });

// 9. User Role + Time (Role-based analysis)
GlobalLogSchema.index({ user_role: 1, created_at: -1 });

// 10. Request Method + URL + Time (API endpoint analysis)
GlobalLogSchema.index({ request_method: 1, request_url: 1, created_at: -1 });

// TEXT INDEX for search functionality (separate index for text search)
GlobalLogSchema.index({
  event_description: 'text',
  error_message: 'text',
  request_url: 'text'
}, {
  name: 'log_text_search',
  weights: {
    event_description: 10,
    error_message: 5,
    request_url: 3
  }
});

// PARTIAL INDEXES for specific use cases (saves space and improves performance)

// Index only for errors and warnings
GlobalLogSchema.index(
  { company_id: 1, severity: 1, created_at: -1 },
  { 
    partialFilterExpression: { 
      severity: { $in: ['error', 'critical', 'warning'] } 
    },
    name: 'company_errors_time'
  }
);

// Index only for failed operations
GlobalLogSchema.index(
  { company_id: 1, status: 1, created_at: -1 },
  { 
    partialFilterExpression: { status: 'failure' },
    name: 'company_failures_time'
  }
);

// Index only for slow responses (> 1000ms)
GlobalLogSchema.index(
  { company_id: 1, response_time_ms: -1, created_at: -1 },
  { 
    partialFilterExpression: { response_time_ms: { $gt: 1000 } },
    name: 'company_slow_responses'
  }
);

// TTL index to automatically delete old logs (1 year retention)
// Adjust based on your retention policy
GlobalLogSchema.index(
  { created_at: 1 }, 
  { 
    expireAfterSeconds: 365 * 24 * 60 * 60,
    name: 'log_ttl_index'
  }
);

// SPARSE INDEXES for optional fields
GlobalLogSchema.index({ resource_type: 1, resource_id: 1 }, { sparse: true });
GlobalLogSchema.index({ error_code: 1 }, { sparse: true });

// BACKGROUND INDEX CREATION
// Set background: true for production to avoid blocking operations
if (process.env.NODE_ENV === 'production') {
  GlobalLogSchema.set('autoIndex', false); // Disable auto-indexing in production
}

// SCHEMA OPTIONS for optimization
GlobalLogSchema.set('bufferCommands', false);
GlobalLogSchema.set('bufferMaxEntries', 0);

// Pre-save middleware for optimization
GlobalLogSchema.pre('save', function(next) {
  // Truncate large fields to prevent document size issues
  if (this.error_stack && this.error_stack.length > 5000) {
    this.error_stack = this.error_stack.substring(0, 5000) + '... [truncated]';
  }
  
  if (this.request_body && JSON.stringify(this.request_body).length > 10000) {
    this.request_body = { truncated: true, size: 'large' };
  }
  
  next();
});

// Add useful static methods
GlobalLogSchema.statics.createOptimizedQuery = function(filters) {
  const query = {};
  const sort = {};
  
  // Always sort by created_at for time-series data
  sort.created_at = -1;
  
  // Add company filter first (most selective for multi-tenant)
  if (filters.company_id) {
    query.company_id = filters.company_id;
  }
  
  // Add date range (second most selective)
  if (filters.start_date || filters.end_date) {
    query.created_at = {};
    if (filters.start_date) query.created_at.$gte = new Date(filters.start_date);
    if (filters.end_date) query.created_at.$lte = new Date(filters.end_date);
  }
  
  // Add other filters
  ['event_type', 'severity', 'status', 'user_id', 'user_role', 'request_method'].forEach(field => {
    if (filters[field] && filters[field] !== 'all') {
      query[field] = filters[field];
    }
  });
  
  return { query, sort };
};

module.exports = mongoose.model('GlobalLog', GlobalLogSchema);