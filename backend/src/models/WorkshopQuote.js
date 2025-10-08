const mongoose = require("mongoose");

const QuoteResponseSchema = new mongoose.Schema({
  supplier_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Supplier",
    required: true,
  },
  estimated_cost: {
    type: Number,
  },
  estimated_time: {
    type: String,
  },
  comments: {
    type: String,
  },
  quote_pdf_url: {
    type: String,
  },
  quote_pdf_key: {
    type: String,
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected", "not_interested"],
    default: "pending",
  },
  responded_at: {
    type: Date,
    default: Date.now,
  },
});

const WorkEntrySchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  description: {
    type: String,
  },
  parts_cost: {
    type: Number,
  },
  labor_cost: {
    type: Number,
  },
  gst: {
    type: Number,
  },
  parts_used: {
    type: String,
  },
  labor_hours: {
    type: String,
  },
  technician: {
    type: String,
  },
  completed: {
    type: Boolean,
    default: false
  },
  entry_date_time: {
    type: Date,
  },
  estimated_time: {
    type: Date,
  },
  invoices: [{
    url: String,
    key: String,
    description: String
  }],
  pdfs: [{
    url: String,
    key: String,
    description: String
  }],
  videos: [{
    url: String,
    key: String,
    description: String
  }],
  warranties: [{
    part: String,
    months: String,
    supplier: String,
    document: {
      url: String,
      key: String,
      description: String
    }
  }],
  documents: [{
    url: String,
    key: String,
    description: String
  }],
  images: [{
    url: String,
    key: String,
    description: String
  }],
  persons: [{
    name: String,
    role: String,
    contact: String
  }],
  quality_check: {
    visual_inspection: Boolean,
    functional_test: Boolean,
    road_test: Boolean,
    safety_check: Boolean,
    notes: String
  },
  comments: {
    type: String,
  }
});

const WorkshopQuoteSchema = new mongoose.Schema({
  quote_type: {
    type: String,
    enum: ["supplier", "bay", "manual"],
    required: true,
    default: "supplier",
  },
  vehicle_type: {
    type: String,
    enum: ["inspection", "tradein"],
    required: true,
  },
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vehicle",
  },
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true,
  },
  vehicle_stock_id: {
    type: Number,
    required: true,
  },
  field_id: {
    type: String,
    required: true,
  },
  field_name: {
    type: String,
    required: true,
  },
  images: [String],
  videos: [String],
  quote_amount: {
    type: Number,
    required: true,
  },
  quote_description: {
    type: String,
  },
  // For supplier quotes
  selected_suppliers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Supplier",
  }],
  supplier_responses: [QuoteResponseSchema],
  approved_supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Supplier",
  },
  // For bay quotes
  bay_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ServiceBay",
  },
  bay_user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // Bay primary admin acts as supplier
  },
  booking_date: {
    type: Date,
  },
  booking_start_time: {
    type: String, // Format: "HH:mm"
  },
  booking_end_time: {
    type: String, // Format: "HH:mm"
  },
  booking_description: String,
  accepted_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  accepted_at: {
    type: Date,
  },
  rejected_reason: String,
  status: {
    type: String,
    enum: [
      "quote_request",
      "quote_sent",
      "quote_approved",
      "work_in_progress",
      "work_review",
      "completed_jobs",
      "rework",
      "booking_request", // Bay specific
      "booking_accepted", // Bay specific
      "booking_rejected", // Bay specific
      "manual_completion_in_progress", // Manual specific
    ],
    default: "quote_request",
  },
  approved_at: {
    type: Date,
  },
  comment_sheet: {
    work_entries: [WorkEntrySchema],
    warranty_months: {
      type: String,
    },
    maintenance_recommendations: {
      type: String,
    },
    next_service_due: {
      type: Date,
    },
    supplier_comments: {
      type: String,
    },
    company_feedback: {
      type: String,
    },
    customer_satisfaction: {
      type: String,
    },
    technician_company_assigned: {
      type: String,
    },
    work_completion_date: {
      type: Date,
    },
    total_amount: {
      type: Number,
    },
    quote_difference: {
      type: Number,
    },
    final_price: {
      type: Number,
    },
    gst_amount: {
      type: Number,
    },
    amount_spent: {
      type: Number,
    },
    invoice_pdf_url: {
      type: String,
    },
    invoice_pdf_key: {
      type: String,
    },
    work_images: [{
      url: String,
      key: String,
    }],
    submitted_at: {
      type: Date,
    },
    reviewed_at: {
      type: Date,
    },
  },
  messages: [{
    sender_type: {
      type: String,
      enum: ["company", "supplier"],
    },
    sender_id: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "messages.sender_type",
    },
    message: {
      type: String,
      required: true,
    },
    sent_at: {
      type: Date,
      default: Date.now,
    },
  }],
  conversation_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Conversation",
  },
  work_started_at: {
    type: Date,
  },
  work_submitted_at: {
    type: Date,
  },
  work_completed_at: {
    type: Date,
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

// Compound index - allow both supplier and bay quotes for same field
WorkshopQuoteSchema.index(
  {
    quote_type: 1,
    vehicle_type: 1,
    company_id: 1,
    vehicle_stock_id: 1,
    field_id: 1,
  },
  { unique: true }
);

// Other indexes for efficient queries
WorkshopQuoteSchema.index({ company_id: 1, status: 1 });
WorkshopQuoteSchema.index({ selected_suppliers: 1 });
WorkshopQuoteSchema.index({ approved_supplier: 1 });

// Update timestamp on save
WorkshopQuoteSchema.pre("save", function (next) {
  this.updated_at = new Date();
  next();
});

module.exports = mongoose.model("WorkshopQuote", WorkshopQuoteSchema);