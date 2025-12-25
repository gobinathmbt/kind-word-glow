const mongoose = require('mongoose');

const VehicleActivityLogSchema = new mongoose.Schema({
    company_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true
    },
    vehicle_stock_id: {
        type: Number,
        required: true,
        index: true
    },
    vehicle_type: {
        type: String,
        required: true,
        enum: ['master', 'tradein', 'inspection', 'advertisement', 'pricing'],
        index: true
    },
    module_name: {
        type: String,
        required: true
    },
    action: {
        type: String,
        required: true,
        enum: ['create', 'update', 'delete']
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    user_name: { // Snapshot of user name at time of log
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    changes: [{
        field: String,
        old_value: mongoose.Schema.Types.Mixed,
        new_value: mongoose.Schema.Types.Mixed
    }],
    // For hierarchical/tree structure if needed, or just flat logs
    parent_log_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VehicleActivityLog',
        default: null
    },
    attachments: [{
        file_name: String,
        file_url: String,
        uploaded_at: Date
    }],
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true,
    collection: 'vehicleactivitylog'
});

// Indexes for faster retrieval
VehicleActivityLogSchema.index({ company_id: 1, vehicle_stock_id: 1, vehicle_type: 1 });
VehicleActivityLogSchema.index({ company_id: 1, timestamp: -1 });

module.exports = mongoose.model('VehicleActivityLog', VehicleActivityLogSchema);
