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
        const { page = 1, limit = 20, is_read = 'all', type = 'all' } = data;
        const userId = socket.user._id;
        const companyId = socket.user.company_id;

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
        console.error('Error fetching notifications via socket:', error);
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

        const notification = await Notification.findOne({
          _id: notification_id,
          recipient_id: userId
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
          const unreadCount = await Notification.getUnreadCount(userId);
          socket.emit("unread_count_update", { unread_count: unreadCount });
          
          socket.emit("notification_marked_read", {
            notification_id,
            unread_count: unreadCount
          });
        }
      } catch (error) {
        console.error('Error marking notification as read via socket:', error);
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

        socket.emit("all_notifications_marked_read", {
          modified_count: result.modifiedCount,
          unread_count: 0
        });

        socket.emit("unread_count_update", { unread_count: 0 });
      } catch (error) {
        console.error('Error marking all notifications as read via socket:', error);
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

        const notification = await Notification.findOneAndDelete({
          _id: notification_id,
          recipient_id: userId
        });

        if (!notification) {
          socket.emit("notification_error", { 
            message: "Notification not found" 
          });
          return;
        }

        const unreadCount = await Notification.getUnreadCount(userId);
        
        socket.emit("notification_deleted", {
          notification_id,
          unread_count: unreadCount
        });

        socket.emit("unread_count_update", { unread_count: unreadCount });
      } catch (error) {
        console.error('Error deleting notification via socket:', error);
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

        const unreadCount = await Notification.getUnreadCount(userId, companyId);
        
        socket.emit("unread_count_update", { unread_count: unreadCount });
      } catch (error) {
        console.error('Error getting unread count via socket:', error);
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