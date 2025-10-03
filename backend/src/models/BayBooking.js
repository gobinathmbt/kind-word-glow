const mongoose = require('mongoose');

const WorkEntrySchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  description: String,
  parts_cost: Number,
  labor_cost: Number,
  gst: Number,
  parts_used: String,
  labor_hours: String,
  technician: String,
  completed: {
    type: Boolean,
    default: false
  },
  entry_date_time: Date,
  estimated_time: Date,
  invoices: [{ url: String, key: String, description: String }],
  pdfs: [{ url: String, key: String, description: String }],
  videos: [{ url: String, key: String, description: String }],
  warranties: [{
    part: String,
    months: String,
    supplier: String,
    document: { url: String, key: String, description: String }
  }],
  documents: [{ url: String, key: String, description: String }],
  images: [{ url: String, key: String, description: String }],
  persons: [{ name: String, role: String, contact: String }],
  quality_check: {
    visual_inspection: Boolean,
    functional_test: Boolean,
    road_test: Boolean,
    safety_check: Boolean,
    notes: String
  },
  comments: String
});

const BayBookingSchema = new mongoose.Schema({
  vehicle_type: {
    type: String,
    enum: ['inspection', 'tradein'],
    required: true
  },
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle'
  },
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  vehicle_stock_id: {
    type: Number,
    required: true
  },
  field_id: {
    type: String,
    required: true
  },
  field_name: {
    type: String,
    required: true
  },
  images: [String],
  videos: [String],
  bay_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceBay',
    required: true
  },
  booking_date: {
    type: Date,
    required: true
  },
  booking_start_time: {
    type: String, // Format: "HH:mm"
    required: true
  },
  booking_end_time: {
    type: String, // Format: "HH:mm"
    required: true
  },
  booking_description: String,
  status: {
    type: String,
    enum: [
      'booking_request',
      'booking_accepted',
      'booking_rejected',
      'work_in_progress',
      'work_review',
      'completed_jobs',
      'rework'
    ],
    default: 'booking_request'
  },
  accepted_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  accepted_at: Date,
  rejected_reason: String,
  date_change_request: {
    requested_date: Date,
    requested_start_time: String,
    requested_end_time: String,
    reason: String,
    requested_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    requested_at: Date
  },
  comment_sheet: {
    work_entries: [WorkEntrySchema],
    warranty_months: String,
    maintenance_recommendations: String,
    next_service_due: Date,
    supplier_comments: String,
    company_feedback: String,
    customer_satisfaction: String,
    technician_company_assigned: String,
    work_completion_date: Date,
    total_amount: Number,
    final_price: Number,
    gst_amount: Number,
    amount_spent: Number,
    invoice_pdf_url: String,
    invoice_pdf_key: String,
    work_images: [{
      url: String,
      key: String
    }],
    submitted_at: Date,
    reviewed_at: Date
  },
  messages: [{
    sender_type: {
      type: String,
      enum: ['company', 'bay_user']
    },
    sender_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: {
      type: String,
      required: true
    },
    sent_at: {
      type: Date,
      default: Date.now
    }
  }],
  conversation_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation'
  },
  work_started_at: Date,
  work_submitted_at: Date,
  work_completed_at: Date,
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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

// Compound index for unique combination
BayBookingSchema.index({
  vehicle_type: 1,
  company_id: 1,
  vehicle_stock_id: 1,
  field_id: 1
}, { unique: true });

// Other indexes
BayBookingSchema.index({ company_id: 1, status: 1 });
BayBookingSchema.index({ bay_id: 1, booking_date: 1 });
BayBookingSchema.index({ bay_id: 1, status: 1 });

// Update timestamp on save
BayBookingSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

module.exports = mongoose.model('BayBooking', BayBookingSchema);
