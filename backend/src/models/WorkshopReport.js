const mongoose = require('mongoose');

const WorkshopReportSchema = new mongoose.Schema({
  // Vehicle Information (Denormalized for performance)
  vehicle_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true
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
  vehicle_type: {
    type: String,
    enum: ['inspection', 'tradein'],
    required: true
  },
  
  // Report Identification
  report_type: {
    type: String,
    enum: ['full_workshop', 'stage_workshop'],
    required: true
  },
  stage_name: {
    type: String, // Only for inspection stages
  },
  
  // Vehicle Details (Denormalized)
  vehicle_details: {
    vin: String,
    plate_no: String,
    make: String,
    model: String,
    year: Number,
    chassis_no: String,
    variant: String,
    hero_image: String,
    name: String
  },

  // Workshop Summary
  workshop_summary: {
    total_fields: Number,
    total_quotes: Number,
    total_work_completed: Number,
    total_work_entries: Number,
    total_cost: Number,
    total_gst: Number,
    grand_total: Number,
    parts_cost: Number,
    labor_cost: Number,
    start_date: Date,
    completion_date: String,
    duration_days: Number
  },

  // Quotes and Work Details (Denormalized for performance)
  quotes_data: [{
    field_id: String,
    field_name: String,
    category_name: String, // For inspection
    section_name: String,
    
    // Quote Information
    quote_amount: Number,
    quote_description: String,
    selected_suppliers: [{
      supplier_id: mongoose.Schema.Types.ObjectId,
      supplier_name: String,
      supplier_email: String,
      supplier_shop_name: String
    }],
    
    // Approved Supplier
    approved_supplier: {
      supplier_id: mongoose.Schema.Types.ObjectId,
      supplier_name: String,
      supplier_email: String,
      supplier_shop_name: String,
      approved_at: Date
    },
    
    // Updated Work Details Structure (matching new comment_sheet)
    work_details: {
      work_entries: [{
        id: String,
        description: String,
        parts_cost: Number,
        labor_cost: Number,
        gst: Number,
        parts_used: String,
        labor_hours: String,
        technician: String,
        completed: Boolean,
        entry_date_time: Date,
        estimated_time: Date,
        
        // File attachments for each work entry
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
        comments: String
      }],
      
      // Overall work summary fields
      warranty_months: String,
      maintenance_recommendations: String,
      next_service_due: Date,
      supplier_comments: String,
      company_feedback: String,
      customer_satisfaction: String,
      technician_company_assigned: String,
      work_completion_date: Date,
      total_amount: Number,
      quote_difference: Number,
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
    
    // Status History
    status_history: [{
      status: String,
      changed_at: Date,
      changed_by: mongoose.Schema.Types.ObjectId
    }],
    
    // Field Media
    field_images: [String],
    field_videos: [String],
    
    // Quote Responses
    quote_responses: [{
      supplier_id: mongoose.Schema.Types.ObjectId,
      supplier_name: String,
      estimated_cost: Number,
      estimated_time: String,
      comments: String,
      quote_pdf_url: String,
      quote_pdf_key: String,
      status: String,
      responded_at: Date
    }],
    
    // Timestamps
    quote_created_at: Date,
    work_started_at: Date,
    work_submitted_at: Date,
    work_completed_at: Date
  }],

  // Communication History (Denormalized)
  communications: [{
    conversation_id: mongoose.Schema.Types.ObjectId,
    supplier_id: mongoose.Schema.Types.ObjectId,
    supplier_name: String,
    field_id: String,
    field_name: String,
    total_messages: Number,
    last_message_at: Date,
    messages: [{
      sender_type: String, // 'company' or 'supplier'
      sender_name: String,
      message_type: String,
      content: String,
      file_url: String,
      sent_at: Date
    }]
  }],

 attachments: [{
  type: {
    type: String,
    enum: ['invoice', 'work_image', 'quote_pdf', 'field_image', 'field_video', 'work_entry_invoice', 'work_entry_pdf', 'work_entry_video', 'work_entry_image', 'work_entry_document', 'warranty_document']
  },
  url: String,
  key: String,
  filename: String,
  description: String,
  field_id: String,
  work_entry_id: String,
  supplier_id: mongoose.Schema.Types.ObjectId,
  uploaded_at: Date
}],

  // Report Generation Info
  generated_at: {
    type: Date,
    default: Date.now
  },
  generated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Enhanced Report Statistics
  statistics: {
    fields_by_status: {
      completed_jobs: Number,
      work_review: Number,
      work_in_progress: Number,
      quote_approved: Number,
      quote_sent: Number,
      quote_request: Number,
      rework: Number
    },
    work_entries_summary: {
      total_entries: Number,
      completed_entries: Number,
      pending_entries: Number,
      total_parts_cost: Number,
      total_labor_cost: Number,
      total_gst: Number
    },
    avg_completion_time: Number, // In days
    cost_breakdown: {
      parts: Number,
      labor: Number,
      gst: Number,
      other: Number
    },
    quality_metrics: {
      visual_inspection_passed: Number,
      functional_test_passed: Number,
      road_test_passed: Number,
      safety_check_passed: Number
    },
    supplier_performance: [{
      supplier_id: mongoose.Schema.Types.ObjectId,
      supplier_name: String,
      jobs_completed: Number,
      work_entries_completed: Number,
      avg_cost: Number,
      avg_time: Number,
      total_earned: Number,
      quality_score: Number
    }],
    technician_performance: [{
      technician_name: String,
      work_entries_completed: Number,
      avg_completion_time: Number,
      quality_score: Number
    }]
  },

  // Timestamps
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
WorkshopReportSchema.index({ vehicle_id: 1, report_type: 1, stage_name: 1 }, { unique: true });
WorkshopReportSchema.index({ company_id: 1, created_at: -1 });
WorkshopReportSchema.index({ vehicle_stock_id: 1, company_id: 1 });
WorkshopReportSchema.index({ vehicle_type: 1, company_id: 1 });

// Update timestamp on save
WorkshopReportSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

module.exports = mongoose.model('WorkshopReport', WorkshopReportSchema);