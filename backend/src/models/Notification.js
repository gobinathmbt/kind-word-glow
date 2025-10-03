const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  configuration_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NotificationConfiguration',
    required: true,
    index: true
  },
  recipient_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  type: {
    type: String,
    enum: ['info', 'success', 'warning', 'error'],
    default: 'info'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  category: {
    type: String,
    enum: ['system', 'user_action', 'data_change', 'workflow', 'alert'],
    default: 'system'
  },
  source_entity: {
    entity_type: {
      type: String,
      required: true
    },
    entity_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    entity_data: mongoose.Schema.Types.Mixed // Snapshot of relevant data
  },
  dealership_context: {
    dealership_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Dealership'
    },
    dealership_name: String,
    is_dealership_specific: {
      type: Boolean,
      default: false
    }
  },
  action_url: String,
  action_data: mongoose.Schema.Types.Mixed,
  channels: {
    in_app: {
      sent: {
        type: Boolean,
        default: false
      },
      sent_at: Date,
      error: String
    },
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'read', 'failed', 'cancelled'],
    default: 'pending',
    index: true
  },
  read_at: Date,
  is_read: {
    type: Boolean,
    default: false,
    index: true
  },
  delivery_attempts: {
    type: Number,
    default: 0
  },
  max_delivery_attempts: {
    type: Number,
    default: 3
  },
  scheduled_for: Date,
  expires_at: {
    type: Date,
    default: function() {
      // Default expiry: 30 days from creation
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    },
    index: true
  },
  metadata: {
    trigger_type: String,
    trigger_timestamp: Date,
    user_agent: String,
    ip_address: String,
    additional_data: mongoose.Schema.Types.Mixed
  },
  created_at: {
    type: Date,
    default: Date.now,
    index: true
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Compound indexes for efficient queries
notificationSchema.index({ company_id: 1, recipient_id: 1, created_at: -1 });
notificationSchema.index({ company_id: 1, is_read: 1, created_at: -1 });
notificationSchema.index({ recipient_id: 1, is_read: 1, created_at: -1 });
notificationSchema.index({ status: 1, scheduled_for: 1 });
notificationSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Update timestamp on save
notificationSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

// Method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.is_read = true;
  this.read_at = new Date();
  this.status = 'read';
  return this.save();
};

// Static method to mark multiple notifications as read
notificationSchema.statics.markManyAsRead = function(notificationIds, userId) {
  return this.updateMany(
    { 
      _id: { $in: notificationIds }, 
      recipient_id: userId,
      is_read: false 
    },
    { 
      $set: { 
        is_read: true, 
        read_at: new Date(), 
        status: 'read',
        updated_at: new Date()
      } 
    }
  );
};

// Static method to get unread count for a user
notificationSchema.statics.getUnreadCount = function(userId, companyId = null) {
  const query = { recipient_id: userId, is_read: false };
  if (companyId) {
    query.company_id = companyId;
  }
  return this.countDocuments(query);
};

// Static method to cleanup old read notifications
notificationSchema.statics.cleanupOldNotifications = function(daysOld = 2) {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  return this.deleteMany({
    is_read: true,
    read_at: { $lt: cutoffDate }
  });
};

module.exports = mongoose.model('Notification', notificationSchema);