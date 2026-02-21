// tenderChat.handler.js - Tender Chat namespace socket handlers
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Env_Configuration = require("../config/env");
const mailService = require("../config/mailer");

const tenderChatConnectedUsers = new Map();

/**
 * Helper function to get or create tender conversation
 */
const getOrCreateTenderConversation = async (tenderId, dealershipId, companyId, getModel) => {
  try {
    const TenderConversation = getModel('TenderConversation');
    const Tender = getModel('Tender');
    const TenderDealership = getModel('TenderDealership');

    // Check if conversation already exists
    let conversation = await TenderConversation.findOne({
      tender_id: tenderId,
      tenderDealership_id: dealershipId
    });

    if (conversation) {
      return conversation;
    }

    // Verify tender and dealership exist
    const tender = await Tender.findOne({ _id: tenderId, company_id: companyId });
    const dealership = await TenderDealership.findOne({ _id: dealershipId, company_id: companyId });

    if (!tender || !dealership) {
      throw new Error('Tender or dealership not found');
    }

    // Create new conversation
    conversation = await TenderConversation.create({
      tender_id: tenderId,
      tenderDealership_id: dealershipId,
      company_id: companyId,
      messages: []
    });

    return conversation;
  } catch (error) {
    throw new Error(`Failed to get or create tender conversation: ${error.message}`);
  }
};

/**
 * Helper function to mark tender messages as read
 */
const markTenderMessagesAsRead = async (conversationId, userType, getModel) => {
  try {
    const TenderConversation = getModel('TenderConversation');
    
    const conversation = await TenderConversation.findById(conversationId);
    if (!conversation) return;

    const now = new Date();
    let updatedCount = 0;

    conversation.messages.forEach(message => {
      // Mark messages sent by the other party as read
      if (userType === 'admin' && message.sender_type === 'dealership' && !message.is_read) {
        message.is_read = true;
        message.read_at = now;
        updatedCount++;
      } else if (userType === 'dealership' && message.sender_type === 'admin' && !message.is_read) {
        message.is_read = true;
        message.read_at = now;
        updatedCount++;
      }
    });

    // Reset unread count for this user type
    if (userType === 'admin') {
      conversation.unread_count_admin = 0;
    } else {
      conversation.unread_count_dealership = 0;
    }

    await conversation.save();
    return updatedCount;
  } catch (error) {
    console.error("Mark tender messages as read error:", error);
  }
};

/**
 * Helper function to emit tender chat user status
 */
const emitTenderChatUserStatus = (user, isOnline, tenderChatIO) => {
  const statusData = {
    user_id: user._id,
    user_type: user.type,
    online: isOnline,
    last_seen: new Date(),
    namespace: "tender-chat",
  };

  if (user.type === 'admin') {
    tenderChatIO
      .to(`tender_chat_company_${user.company_id}`)
      .emit("user_status_change", statusData);
  } else {
    tenderChatIO
      .to(`tender_chat_dealership_${user.tenderDealership_id}`)
      .emit("user_status_change", statusData);
  }
};

/**
 * Tender Chat namespace authentication middleware
 */
const tenderChatAuthMiddleware = async (socket, next) => {
  console.log("Tender Chat socket authentication middleware triggered");
  try {
    const token = socket.handshake.auth.token;
    console.log(
      "Authenticating tender chat socket with token:",
      token ? "present" : "missing"
    );
    
    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    const decoded = jwt.verify(token, Env_Configuration.JWT_SECRET);
    console.log(
      `Tender Chat socket authentication attempt for user ID: ${decoded.id}, role: ${decoded.role}`
    );

    // Check if it's an admin user
    if (decoded.role === "company_super_admin" || decoded.role === "company_admin") {
      const user = await User.findById(decoded.id);
      if (!user) {
        return next(new Error("User not found"));
      }
      
      socket.user = {
        ...user.toObject(),
        type: 'admin',
        _id: user._id.toString(),
        company_id: user.company_id.toString(),
      };
    } 
    // Check if it's a dealership user
    else if (decoded.tenderDealership_id) {
      // This is a dealership user - we need to get the model dynamically
      // Store the decoded info and we'll fetch the user in the connection handler
      socket.dealershipUserDecoded = decoded;
      socket.user = {
        _id: decoded.id,
        type: 'dealership',
        company_id: decoded.company_id,
        tenderDealership_id: decoded.tenderDealership_id,
        username: decoded.username || 'Dealership User',
        role: decoded.role
      };
    } else {
      return next(new Error("Invalid user type for tender chat"));
    }

    next();
  } catch (error) {
    console.error("Tender Chat socket authentication error:", error);
    next(new Error("Authentication error: Invalid token"));
  }
};

/**
 * Initialize Tender Chat namespace handlers
 */
const initializeTenderChatHandlers = (tenderChatIO, dbConnectionManager) => {
  tenderChatIO.on("connection", (socket) => {
    console.log(
      `Tender Chat User connected: ${socket.user.username || socket.user.first_name} (${socket.user.type}) - Socket ID: ${socket.id}`
    );

    // Add user to connected users map
    const userKey = `tender_chat_${socket.user.type}_${socket.user._id}`;
    tenderChatConnectedUsers.set(userKey, {
      socketId: socket.id,
      user: socket.user,
      lastSeen: new Date(),
      online: true,
      namespace: "tender-chat",
    });

    // Join user to their personal room
    const userRoom = `tender_chat_${socket.user.type}_${socket.user._id}`;
    socket.join(userRoom);

    // Join user to company/dealership room for notifications
    if (socket.user.type === 'admin') {
      socket.join(`tender_chat_company_${socket.user.company_id}`);
    } else {
      socket.join(`tender_chat_dealership_${socket.user.tenderDealership_id}`);
    }

    // Emit connection success
    socket.emit("tender_chat_connected", {
      message: "Successfully connected to tender chat server",
      user: {
        id: socket.user._id,
        name: socket.user.username || `${socket.user.first_name} ${socket.user.last_name}`,
        type: socket.user.type,
      },
      namespace: "tender-chat",
    });

    // Emit online status to relevant users
    emitTenderChatUserStatus(socket.user, true, tenderChatIO);

    /**
     * Get conversation for a tender-dealership pair
     */
    socket.on("get_tender_conversation", async (data) => {
      try {
        const { tender_id, dealership_id } = data;

        // Get database connection for this company
        const companyDb = await dbConnectionManager.getCompanyConnection(socket.user.company_id);
        const getModel = (modelName) => companyDb.model(modelName);

        const conversation = await getOrCreateTenderConversation(
          tender_id,
          dealership_id,
          socket.user.company_id,
          getModel
        );

        socket.emit("tender_conversation_data", {
          conversation: conversation.toObject(),
          tender_id,
          dealership_id
        });
      } catch (error) {
        console.error("Get tender conversation error:", error);
        socket.emit("error", { message: "Failed to get conversation" });
      }
    });

    /**
     * Join tender conversation room
     */
    socket.on("join_tender_conversation", async (data) => {
      try {
        const { tender_id, dealership_id } = data;
        console.log(
          "Joining tender conversation room for tender:",
          tender_id,
          "dealership:",
          dealership_id
        );

        // Get database connection for this company
        const companyDb = await dbConnectionManager.getCompanyConnection(socket.user.company_id);
        const getModel = (modelName) => companyDb.model(modelName);

        // Verify access
        if (socket.user.type === 'dealership') {
          if (socket.user.tenderDealership_id !== dealership_id) {
            socket.emit("error", { message: "Access denied" });
            return;
          }
        }

        const conversation = await getOrCreateTenderConversation(
          tender_id,
          dealership_id,
          socket.user.company_id,
          getModel
        );

        if (conversation) {
          const roomName = `tender_conversation_${tender_id}_${dealership_id}`;
          socket.join(roomName);
          socket.currentTenderConversation = { tender_id, dealership_id };

          // Mark messages as read
          await markTenderMessagesAsRead(
            conversation._id,
            socket.user.type,
            getModel
          );

          socket.emit("joined_tender_conversation", {
            tender_id,
            dealership_id,
            conversation: conversation.toObject()
          });

          console.log(
            `User ${socket.user.username || socket.user.first_name} joined tender conversation ${tender_id}-${dealership_id}`
          );
        } else {
          socket.emit("error", {
            message: "Conversation not found or access denied",
          });
        }
      } catch (error) {
        console.error("Join tender conversation error:", error);
        socket.emit("error", { message: "Failed to join conversation" });
      }
    });

    /**
     * Leave tender conversation room
     */
    socket.on("leave_tender_conversation", (data) => {
      const { tender_id, dealership_id } = data;
      const roomName = `tender_conversation_${tender_id}_${dealership_id}`;
      socket.leave(roomName);
      console.log(
        `User ${socket.user.username || socket.user.first_name} left tender conversation ${tender_id}-${dealership_id}`
      );
    });

    /**
     * Send message in tender conversation
     */
    socket.on("send_tender_message", async (data) => {
      try {
        const { tender_id, dealership_id, content, message_type = 'text', file_data } = data;

        // Validate file size (10MB limit)
        if (file_data && file_data.size > 10 * 1024 * 1024) {
          socket.emit("error", { message: "File size exceeds 10MB limit" });
          return;
        }

        // Get database connection for this company
        const companyDb = await dbConnectionManager.getCompanyConnection(socket.user.company_id);
        const getModel = (modelName) => companyDb.model(modelName);

        const TenderConversation = getModel('TenderConversation');
        const Tender = getModel('Tender');
        const TenderDealership = getModel('TenderDealership');
        const TenderDealershipUser = getModel('TenderDealershipUser');

        // Verify access
        if (socket.user.type === 'dealership') {
          if (socket.user.tenderDealership_id !== dealership_id) {
            socket.emit("error", { message: "Access denied" });
            return;
          }
        }

        const conversation = await TenderConversation.findOne({
          tender_id,
          tenderDealership_id: dealership_id
        });

        if (!conversation) {
          socket.emit("error", { message: "Conversation not found" });
          return;
        }

        // Use pre-uploaded file data from frontend
        let fileUrl = file_data ? file_data.url : null;
        let fileKey = file_data ? file_data.key : null;
        let fileSize = file_data ? file_data.size : null;
        let fileType = file_data ? file_data.type : null;
        let fileName = file_data ? file_data.name : null;

        // Determine sender info
        let senderName;
        if (socket.user.type === 'admin') {
          senderName = `${socket.user.first_name} ${socket.user.last_name}`;
        } else {
          senderName = socket.user.username;
        }

        // Create new message
        const newMessage = {
          sender_id: socket.user._id,
          sender_type: socket.user.type,
          sender_name: senderName,
          message_type,
          content: content || fileName || "",
          file_url: fileUrl,
          file_key: fileKey,
          file_size: fileSize,
          file_type: fileType,
          file_name: fileName,
          is_read: false,
          created_at: new Date(),
        };

        // Add message to conversation
        conversation.messages.push(newMessage);

        // Update unread counts
        if (socket.user.type === 'admin') {
          conversation.unread_count_dealership += 1;
        } else {
          conversation.unread_count_admin += 1;
        }

        conversation.last_message_at = new Date();
        await conversation.save();

        // Get the saved message
        const savedMessage = conversation.messages[conversation.messages.length - 1];

        // Emit to conversation room
        const roomName = `tender_conversation_${tender_id}_${dealership_id}`;
        tenderChatIO.to(roomName).emit("new_tender_message", {
          conversation_id: conversation._id,
          tender_id,
          dealership_id,
          message: savedMessage,
        });


        // Notify the other party
        const targetRoom = socket.user.type === 'admin'
          ? `tender_chat_dealership_${dealership_id}`
          : `tender_chat_company_${socket.user.company_id}`;

        tenderChatIO.to(targetRoom).emit("tender_conversation_update", {
          conversation_id: conversation._id,
          tender_id,
          dealership_id,
          last_message: savedMessage.content,
          last_message_at: savedMessage.created_at,
          unread_count: socket.user.type === 'admin'
            ? conversation.unread_count_dealership
            : conversation.unread_count_admin,
          sender_type: socket.user.type,
        });

        console.log(
          `Message sent in tender conversation ${tender_id}-${dealership_id} by ${senderName}`
        );
      } catch (error) {
        console.error("Send tender message error:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    /**
     * Typing indicators
     */
    socket.on("tender_typing_start", (data) => {
      const { tender_id, dealership_id } = data;
      const roomName = `tender_conversation_${tender_id}_${dealership_id}`;
      socket.to(roomName).emit("tender_user_typing", {
        user_id: socket.user._id,
        user_name: socket.user.username || `${socket.user.first_name} ${socket.user.last_name}`,
        typing: true,
      });
    });

    socket.on("tender_typing_stop", (data) => {
      const { tender_id, dealership_id } = data;
      const roomName = `tender_conversation_${tender_id}_${dealership_id}`;
      socket.to(roomName).emit("tender_user_typing", {
        user_id: socket.user._id,
        user_name: socket.user.username || `${socket.user.first_name} ${socket.user.last_name}`,
        typing: false,
      });
    });

    /**
     * Mark messages as read
     */
    socket.on("mark_tender_messages_read", async (data) => {
      try {
        const { tender_id, dealership_id } = data;

        // Get database connection for this company
        const companyDb = await dbConnectionManager.getCompanyConnection(socket.user.company_id);
        const getModel = (modelName) => companyDb.model(modelName);

        const TenderConversation = getModel('TenderConversation');

        const conversation = await TenderConversation.findOne({
          tender_id,
          tenderDealership_id: dealership_id
        });

        if (conversation) {
          const updatedCount = await markTenderMessagesAsRead(
            conversation._id,
            socket.user.type,
            getModel
          );

          socket.emit("tender_messages_marked_read", { tender_id, dealership_id });

          // Emit to other users in conversation
          const roomName = `tender_conversation_${tender_id}_${dealership_id}`;
          socket.to(roomName).emit("tender_messages_marked_read", {
            tender_id,
            dealership_id,
            marked_by: socket.user.type,
            marked_by_id: socket.user._id,
          });
        }
      } catch (error) {
        console.error("Mark tender messages read error:", error);
      }
    });

    /**
     * Get user online status
     */
    socket.on("get_tender_user_status", (data) => {
      const { user_type, user_id } = data;
      const userKey = `tender_chat_${user_type}_${user_id}`;
      const userStatus = tenderChatConnectedUsers.get(userKey);
      socket.emit("tender_user_status", {
        user_id,
        user_type,
        online: userStatus ? userStatus.online : false,
        last_seen: userStatus ? userStatus.lastSeen : new Date(),
      });
    });

    /**
     * Ping/pong for connection testing
     */
    socket.on("tender_ping", (data) => {
      socket.emit("tender_pong", {
        ...data,
        serverTime: new Date(),
      });
    });

    /**
     * Handle disconnect
     */
    socket.on("disconnect", (reason) => {
      console.log(
        `Tender Chat User disconnected: ${socket.user.username || socket.user.first_name} (${socket.user.type}) - ${reason}`
      );

      const userKey = `tender_chat_${socket.user.type}_${socket.user._id}`;
      const userData = tenderChatConnectedUsers.get(userKey);
      if (userData) {
        userData.online = false;
        userData.lastSeen = new Date();
        tenderChatConnectedUsers.set(userKey, userData);
      }

      // Stop typing if user was typing
      if (socket.currentTenderConversation) {
        const { tender_id, dealership_id } = socket.currentTenderConversation;
        const roomName = `tender_conversation_${tender_id}_${dealership_id}`;
        socket.to(roomName).emit("tender_user_typing", {
          user_id: socket.user._id,
          user_name: socket.user.username || `${socket.user.first_name} ${socket.user.last_name}`,
          typing: false,
        });
      }

      emitTenderChatUserStatus(socket.user, false, tenderChatIO);
      socket.leaveAll();
    });

    /**
     * Handle errors
     */
    socket.on("error", (error) => {
      console.error("Tender Chat socket error:", error);
      socket.emit("error", { message: "Socket error occurred" });
    });
  });
};

module.exports = {
  initializeTenderChatHandlers,
  tenderChatAuthMiddleware,
  tenderChatConnectedUsers,
  getOrCreateTenderConversation,
  markTenderMessagesAsRead,
  emitTenderChatUserStatus,
};
