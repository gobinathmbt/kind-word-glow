  // notification.handler.js - Notification namespace socket handlers
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Notification = require("../models/Notification");
const Env_Configuration = require("../config/env");

const notificationConnectedUsers = new Map();

// Notification namespace authentication middleware
const notificationAuthMiddleware = async (socket, next) => {
  console.log("Notification socket authentication middleware triggered");
  try {
    const token = socket.handshake.auth.token;
    console.log(
      "Authenticating notification socket with token:",
      token ? "present" : "missing"
    );
    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    const decoded = jwt.verify(token, Env_Configuration.JWT_SECRET);
    console.log(
      `Notification socket authentication attempt for user ID: ${decoded.id}, role: ${decoded.role}`
    );

    if (
      decoded.role === "company_super_admin" ||
      decoded.role === "company_admin"
    ) {
      const user = await User.findById(decoded.id);
      if (!user) {
        return next(new Error("User not found"));
      }
      socket.user = {
        ...user.toObject(),
        type: "company",
        _id: user._id.toString(),
        company_id: user.company_id.toString(),
      };
    } else {
      return next(
        new Error(
          "Unauthorized: Notification access restricted to company users"
        )
      );
    }

    next();
  } catch (error) {
    console.error("Notification socket authentication error:", error);
    next(new Error("Authentication error: Invalid token"));
  }
};

// Initialize Notification namespace handlers
const initializeNotificationHandlers = (notificationIO) => {
  console.log("Initializing Notification handlers...");

  notificationIO.on("connection", (socket) => {
    console.log(
      `Notification User connected: ${
        socket.user.username || socket.user.first_name
      } (${socket.user.type}) - Socket ID: ${socket.id}`
    );

    // Add user to notification connected users map
    const userKey = `notification_${socket.user.type}_${socket.user._id}`;
    notificationConnectedUsers.set(userKey, {
      socketId: socket.id,
      user: socket.user,
      lastSeen: new Date(),
      online: true,
      namespace: "notification",
    });

    // Join user to their personal notification room
    const userRoom = `user_${socket.user._id}`;
    socket.join(userRoom);

    // Join user to company room for company-wide notifications
    socket.join(`company_${socket.user.company_id}`);

    // Join dealership rooms if user has dealership access
    if (socket.user.dealership_ids && Array.isArray(socket.user.dealership_ids)) {
      socket.user.dealership_ids.forEach(dealershipId => {
        socket.join(`dealership_${dealershipId}`);
      });
    }

    // Emit connection success
    socket.emit("notification_connected", {
      message: "Successfully connected to notification server",
      user: {
        id: socket.user._id,
        name: socket.user.username || socket.user.first_name,
        type: socket.user.type,
      },
      namespace: "notification",
    });

    // Send initial unread count
    socket.emit("unread_count_update", {
      unread_count: 0, // Will be updated by real-time events
    });

    // Handle get notifications request
    socket.on("get_notifications", async (data) => {
      try {
        console.log('🔔 Socket: get_notifications event received', {
          userId: socket.user._id,
          userIdType: typeof socket.user._id,
          data
        });
        
        const { page = 1, limit = 20, is_read = 'all', type = 'all', priority = 'all' } = data;
        const userId = socket.user._id;
        const companyId = socket.user.company_id;

        // Convert string IDs to ObjectId for MongoDB query
        const mongoose = require('mongoose');
        const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
        const companyObjectId = mongoose.Types.ObjectId.isValid(companyId) ? new mongoose.Types.ObjectId(companyId) : companyId;

        // Build query
        const query = { 
          recipient_id: userObjectId,
          company_id: companyObjectId
        };

        if (is_read !== 'all') {
          query.is_read = is_read === 'true' || is_read === true;
        }

        if (type !== 'all') {
          query.type = type;
        }

        if (priority !== 'all') {
          query.priority = priority;
        }

        console.log('🔍 Socket: Query:', JSON.stringify(query), {
          userObjectId: userObjectId.toString(),
          companyObjectId: companyObjectId.toString()
        });

        // Get company connection and Notification model
        const dbConnectionManager = require('../config/dbConnectionManager');
        const companyConnection = await dbConnectionManager.getCompanyConnection(companyId);
        const ModelRegistry = require('../models/modelRegistry');
        const CompanyNotification = ModelRegistry.getModel('Notification', companyConnection);

        console.log('📊 Using Notification model from database:', CompanyNotification.db.name);

        // Execute query with pagination using company database model
        const notifications = await CompanyNotification.find(query)
          .sort({ created_at: -1 })
          .limit(limit * 1)
          .skip((page - 1) * limit)
          .lean();

        const total = await CompanyNotification.countDocuments(query);
        const unreadCount = await CompanyNotification.getUnreadCount(userObjectId, companyObjectId);

        console.log('✅ Socket: Found notifications:', {
          count: notifications.length,
          total,
          unreadCount,
          sampleNotification: notifications[0] ? {
            _id: notifications[0]._id,
            title: notifications[0].title
          } : null
        });

        socket.emit("notifications_data", {
          notifications,
          unread_count: unreadCount,
          pagination: {
            current_page: parseInt(page),
            total_pages: Math.ceil(total / limit),
            total_records: total,
            has_next: page * limit < total,
            has_previous: page > 1
          }
        });
      } catch (error) {
        console.error('❌ Socket: Error fetching notifications:', error);
        socket.emit("notification_error", { 
          message: "Failed to fetch notifications",
          error: error.message 
        });
      }
    });

    // Handle mark notification as read
    socket.on("mark_notification_read", async (data) => {
      try {
        const { notification_id } = data;
        const userId = socket.user._id;
        const companyId = socket.user.company_id;

        // Get company connection and Notification model
        const dbConnectionManager = require('../config/dbConnectionManager');
        const companyConnection = await dbConnectionManager.getCompanyConnection(companyId);
        const ModelRegistry = require('../models/modelRegistry');
        const CompanyNotification = ModelRegistry.getModel('Notification', companyConnection);

        // Convert to ObjectId
        const mongoose = require('mongoose');
        const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
        const notificationObjectId = mongoose.Types.ObjectId.isValid(notification_id) ? new mongoose.Types.ObjectId(notification_id) : notification_id;

        const notification = await CompanyNotification.findOne({
          _id: notificationObjectId,
          recipient_id: userObjectId
        });

        if (!notification) {
          socket.emit("notification_error", { 
            message: "Notification not found" 
          });
          return;
        }

        if (!notification.is_read) {
          await notification.markAsRead();
          
          // Emit updated unread count
          const companyObjectId = mongoose.Types.ObjectId.isValid(companyId) ? new mongoose.Types.ObjectId(companyId) : companyId;
          const unreadCount = await CompanyNotification.getUnreadCount(userObjectId, companyObjectId);
          socket.emit("unread_count_update", { unread_count: unreadCount });
          
          socket.emit("notification_marked_read", {
            notification_id,
            unread_count: unreadCount
          });
        }
      } catch (error) {
        console.error('❌ Socket: Error marking notification as read:', error);
        socket.emit("notification_error", { 
          message: "Failed to mark notification as read",
          error: error.message 
        });
      }
    });

    // Handle mark all notifications as read
    socket.on("mark_all_notifications_read", async () => {
      try {
        const userId = socket.user._id;
        const companyId = socket.user.company_id;

        // Get company connection and Notification model
        const dbConnectionManager = require('../config/dbConnectionManager');
        const companyConnection = await dbConnectionManager.getCompanyConnection(companyId);
        const ModelRegistry = require('../models/modelRegistry');
        const CompanyNotification = ModelRegistry.getModel('Notification', companyConnection);

        // Convert to ObjectId
        const mongoose = require('mongoose');
        const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
        const companyObjectId = mongoose.Types.ObjectId.isValid(companyId) ? new mongoose.Types.ObjectId(companyId) : companyId;

        const result = await CompanyNotification.updateMany(
          { 
            recipient_id: userObjectId,
            company_id: companyObjectId,
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

        socket.emit("all_notifications_marked_read", {
          modified_count: result.modifiedCount,
          unread_count: 0
        });

        socket.emit("unread_count_update", { unread_count: 0 });
      } catch (error) {
        console.error('❌ Socket: Error marking all notifications as read:', error);
        socket.emit("notification_error", { 
          message: "Failed to mark all notifications as read",
          error: error.message 
        });
      }
    });

    // Handle delete notification
    socket.on("delete_notification", async (data) => {
      try {
        const { notification_id } = data;
        const userId = socket.user._id;
        const companyId = socket.user.company_id;

        // Get company connection and Notification model
        const dbConnectionManager = require('../config/dbConnectionManager');
        const companyConnection = await dbConnectionManager.getCompanyConnection(companyId);
        const ModelRegistry = require('../models/modelRegistry');
        const CompanyNotification = ModelRegistry.getModel('Notification', companyConnection);

        // Convert to ObjectId
        const mongoose = require('mongoose');
        const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
        const notificationObjectId = mongoose.Types.ObjectId.isValid(notification_id) ? new mongoose.Types.ObjectId(notification_id) : notification_id;
        const companyObjectId = mongoose.Types.ObjectId.isValid(companyId) ? new mongoose.Types.ObjectId(companyId) : companyId;

        const notification = await CompanyNotification.findOneAndDelete({
          _id: notificationObjectId,
          recipient_id: userObjectId
        });

        if (!notification) {
          socket.emit("notification_error", { 
            message: "Notification not found" 
          });
          return;
        }

        const unreadCount = await CompanyNotification.getUnreadCount(userObjectId, companyObjectId);
        
        socket.emit("notification_deleted", {
          notification_id,
          unread_count: unreadCount
        });

        socket.emit("unread_count_update", { unread_count: unreadCount });
      } catch (error) {
        console.error('❌ Socket: Error deleting notification:', error);
        socket.emit("notification_error", { 
          message: "Failed to delete notification",
          error: error.message 
        });
      }
    });

    // Handle get unread count
    socket.on("get_unread_count", async () => {
      try {
        const userId = socket.user._id;
        const companyId = socket.user.company_id;

        // Get company connection and Notification model
        const dbConnectionManager = require('../config/dbConnectionManager');
        const companyConnection = await dbConnectionManager.getCompanyConnection(companyId);
        const ModelRegistry = require('../models/modelRegistry');
        const CompanyNotification = ModelRegistry.getModel('Notification', companyConnection);

        // Convert to ObjectId
        const mongoose = require('mongoose');
        const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
        const companyObjectId = mongoose.Types.ObjectId.isValid(companyId) ? new mongoose.Types.ObjectId(companyId) : companyId;

        const unreadCount = await CompanyNotification.getUnreadCount(userObjectId, companyObjectId);
        
        socket.emit("unread_count_update", { unread_count: unreadCount });
      } catch (error) {
        console.error('❌ Socket: Error getting unread count:', error);
        socket.emit("notification_error", { 
          message: "Failed to get unread count",
          error: error.message 
        });
      }
    });

    // Handle disconnect
    socket.on("disconnect", (reason) => {
      console.log(
        `Notification User disconnected: ${
          socket.user.username || socket.user.first_name
        } - Reason: ${reason}`
      );

      // Remove user from connected users map
      const userKey = `notification_${socket.user.type}_${socket.user._id}`;
      notificationConnectedUsers.delete(userKey);
    });
  });
};

// Send real-time notification to specific user
const sendRealTimeNotification = async (notificationIO, notification, userId) => {
  try {
    if (notificationIO) {
      // Send to specific user
      notificationIO.to(`user_${userId}`).emit('new_notification', {
        notification: {
          _id: notification._id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          priority: notification.priority,
          created_at: notification.created_at,
          action_url: notification.action_url,
          source_entity: notification.source_entity
        },
        unread_count: await Notification.getUnreadCount(userId)
      });
    }
  } catch (error) {
    console.error('Error sending real-time notification:', error);
  }
};

// Send notification to dealership
const sendDealershipNotification = async (notificationIO, notification, dealershipId) => {
  try {
    if (notificationIO) {
      notificationIO.to(`dealership_${dealershipId}`).emit('dealership_notification', {
        notification: {
          _id: notification._id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          priority: notification.priority,
          created_at: notification.created_at,
          action_url: notification.action_url,
          source_entity: notification.source_entity,
          dealership_id: dealershipId
        }
      });
    }
  } catch (error) {
    console.error('Error sending dealership notification:', error);
  }
};

// Get connected notification users
const getConnectedNotificationUsers = () => {
  return Array.from(notificationConnectedUsers.entries()).map(([key, data]) => ({
    key,
    ...data,
  }));
};

module.exports = {
  initializeNotificationHandlers,
  notificationAuthMiddleware,
  notificationConnectedUsers,
  sendRealTimeNotification,
  sendDealershipNotification,
  getConnectedNotificationUsers
};