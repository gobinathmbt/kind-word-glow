const mongoose = require("mongoose");

const WorkflowSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true,
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  // Workflow Type
  workflow_type: {
    type: String,
    enum: ["vehicle_inbound", "vehicle_property_trigger", "email_automation"],
    required: true,
  },

  // Workflow Status
  status: {
    type: String,
    enum: ["active", "inactive", "draft"],
    default: "draft",
  },

  // React Flow Data
  // Alternative schema approach
  flow_data: {
    type: mongoose.Schema.Types.Mixed,
    default: {
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    },
  },

  // Workflow Configuration based on type
  config: {
    // For vehicle_inbound workflows
    inbound_config: {
      endpoint_url: String,
      authentication: {
        type: {
          type: String,
          enum: ["none", "api_key", "bearer_token", "basic_auth"],
        },
        api_key: String,
        bearer_token: String,
        username: String,
        password: String,
      },
      payload_mapping: [
        {
          source_field: String,
          target_field: String,
          data_type: {
            type: String,
            enum: ["string", "number", "boolean", "date", "array", "object"],
          },
          is_required: Boolean,
          default_value: mongoose.Schema.Types.Mixed,
          transformation_rules: String,
        },
      ],
      validation_rules: [
        {
          field: String,
          rule_type: String,
          rule_value: mongoose.Schema.Types.Mixed,
        },
      ],
    },

    // For vehicle_property_trigger workflows
    trigger_config: {
      trigger_events: [
        {
          vehicle_property: String,
          event_type: {
            type: String,
            enum: ["created", "updated", "value_changed", "status_changed"],
          },
          condition: {
            operator: String,
            value: mongoose.Schema.Types.Mixed,
          },
        },
      ],
      webhook_url: String,
      response_mapping: [
        {
          source_field: String,
          target_field: String,
          include_in_response: Boolean,
        },
      ],
      retry_config: {
        max_attempts: {
          type: Number,
          default: 3,
        },
        retry_interval: {
          type: Number,
          default: 5000,
        },
      },
    },

    // For email_automation workflows
    email_config: {
      email_provider: {
        type: String,
        enum: ["smtp", "sendgrid", "mailgun", "aws_ses"],
        default: "smtp",
      },
      email_settings: {
        smtp_host: String,
        smtp_port: Number,
        smtp_username: String,
        smtp_password: String,
        smtp_secure: Boolean,
        api_key: String,
        domain: String,
        region: String,
      },
      template_config: {
        from_email: String,
        from_name: String,
        subject_template: String,
        body_template: String,
        template_variables: [
          {
            variable_name: String,
            variable_source: String,
            default_value: String,
          },
        ],
      },
      recipient_config: {
        recipient_type: {
          type: String,
          enum: ["fixed_email", "dynamic_field", "user_property"],
        },
        recipient_value: String,
      },
    },
  },

  // Execution Statistics
  execution_stats: {
    total_executions: {
      type: Number,
      default: 0,
    },
    successful_executions: {
      type: Number,
      default: 0,
    },
    failed_executions: {
      type: Number,
      default: 0,
    },
    last_execution: Date,
    last_execution_status: {
      type: String,
      enum: ["success", "failed", "pending"],
    },
    last_execution_error: String,
  },

  // Custom webhook endpoint for this workflow
  custom_endpoint: {
    type: String,
    unique: true,
    sparse: true,
  },

  // Tags and metadata
  tags: [String],
  custom_fields: mongoose.Schema.Types.Mixed,

  // Timestamps
  last_modified_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
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

// Indexes for efficient queries
WorkflowSchema.index({ company_id: 1, status: 1 });
WorkflowSchema.index({ company_id: 1, workflow_type: 1 });
WorkflowSchema.index({ company_id: 1, created_by: 1 });
WorkflowSchema.index({ custom_endpoint: 1 });
WorkflowSchema.index({ tags: 1 });
WorkflowSchema.index({ created_at: -1 });

// Auto-generate custom endpoint for inbound workflows
WorkflowSchema.pre("save", function (next) {
  this.updated_at = new Date();

  // Generate custom endpoint for vehicle_inbound workflows
  if (this.workflow_type === "vehicle_inbound" && !this.custom_endpoint) {
    const randomString =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
    this.custom_endpoint = `workflow_${this._id}_${randomString}`;
  }

  next();
});

// Virtual for workflow age
WorkflowSchema.virtual("workflow_age").get(function () {
  return Math.floor((Date.now() - this.created_at) / (1000 * 60 * 60 * 24));
});

module.exports = mongoose.model("Workflow", WorkflowSchema);
