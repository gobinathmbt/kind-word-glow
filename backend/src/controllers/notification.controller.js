const Notification = require('../models/Notification');
// Update the notification controller to use new notification socket
const { getNotificationSocketIO } = require('../controllers/socket.controller');

// Get notifications for a user
const getNotifications = async (req, res) => {
  console.log(req.user)
  try {
    const { page = 1, limit = 20, is_read = 'all', type = 'all' } = req.query;
    const userId = req.user.id;
    const companyId = req.user.company_id;

    // Build query
    const query = { 
      recipient_id: userId,
      company_id: companyId
    };

    if (is_read !== 'all') {
      query.is_read = is_read === 'true';
    }

    if (type !== 'all') {
      query.type = type;
    }

    // Execute query with pagination
    const notifications = await Notification.find(query)
      .populate('configuration_id', 'name description')
      .sort({ created_at: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.getUnreadCount(userId, companyId);

    res.json({
      success: true,
      data: {
        notifications,
        unread_count: unreadCount,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_records: total,
          has_next: page * limit < total,
          has_previous: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications',
      error: error.message
    });
  }
};

// Mark notification as read
const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOne({
      _id: id,
      recipient_id: userId
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    if (!notification.is_read) {
      await notification.markAsRead();
      
      // Emit real-time update
      const notificationIO = getNotificationSocketIO();
      if (notificationIO) {
        notificationIO.to(`user_${userId}`).emit('notification_read', {
          notification_id: id,
          unread_count: await Notification.getUnreadCount(userId)
        });
      }
    }

    res.json({
      success: true,
      data: notification,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking notification as read',
      error: error.message
    });
  }
};

// Mark multiple notifications as read
const markMultipleAsRead = async (req, res) => {
  try {
    const { notification_ids } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(notification_ids) || notification_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'notification_ids array is required'
      });
    }

    const result = await Notification.markManyAsRead(notification_ids, userId);
    
    // Emit real-time update
    const notificationIO = getNotificationSocketIO();
    if (notificationIO) {
      notificationIO.to(`user_${userId}`).emit('notifications_read', {
        notification_ids,
        unread_count: await Notification.getUnreadCount(userId)
      });
    }

    res.json({
      success: true,
      data: {
        modified_count: result.modifiedCount
      },
      message: `${result.modifiedCount} notifications marked as read`
    });
  } catch (error) {
    console.error('Error marking multiple notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking multiple notifications as read',
      error: error.message
    });
  }
};

// Mark all notifications as read
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.user.company_id;

    const result = await Notification.updateMany(
      { 
        recipient_id: userId,
        company_id: companyId,
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

    // Emit real-time update
    const notificationIO = getNotificationSocketIO();
    if (notificationIO) {
      notificationIO.to(`user_${userId}`).emit('all_notifications_read', {
        unread_count: 0
      });
    }

    res.json({
      success: true,
      data: {
        modified_count: result.modifiedCount
      },
      message: `${result.modifiedCount} notifications marked as read`
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking all notifications as read',
      error: error.message
    });
  }
};

// Get notification statistics
const getNotificationStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.user.company_id;

    const stats = await Promise.all([
      // Total notifications
      Notification.countDocuments({ recipient_id: userId, company_id: companyId }),
      
      // Unread count
      Notification.getUnreadCount(userId, companyId),
      
      // Count by type
      Notification.aggregate([
        { $match: { recipient_id: userId, company_id: companyId } },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]),
      
      // Count by priority
      Notification.aggregate([
        { $match: { recipient_id: userId, company_id: companyId } },
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ]),
      
      // Recent activity (last 7 days)
      Notification.countDocuments({
        recipient_id: userId,
        company_id: companyId,
        created_at: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      })
    ]);

    res.json({
      success: true,
      data: {
        total_notifications: stats[0],
        unread_count: stats[1],
        by_type: stats[2].reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        by_priority: stats[3].reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        recent_activity: stats[4]
      }
    });
  } catch (error) {
    console.error('Error fetching notification statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notification statistics',
      error: error.message
    });
  }
};

// Delete notification
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOneAndDelete({
      _id: id,
      recipient_id: userId
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Emit real-time update
    const notificationIO = getNotificationSocketIO();
    if (notificationIO) {
      notificationIO.to(`user_${userId}`).emit('notification_deleted', {
        notification_id: id,
        unread_count: await Notification.getUnreadCount(userId)
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting notification',
      error: error.message
    });
  }
};

// Get unread count
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.user.company_id;

    const unreadCount = await Notification.getUnreadCount(userId, companyId);

    res.json({
      success: true,
      data: {
        unread_count: unreadCount
      }
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching unread count',
      error: error.message
    });
  }
};

module.exports = {
  getNotifications,
  markNotificationAsRead,
  markMultipleAsRead,
  markAllAsRead,
  getNotificationStats,
  deleteNotification,
  getUnreadCount
};