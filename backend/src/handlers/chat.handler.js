// chat.handler.js - Chat namespace socket handlers
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Supplier = require("../models/Supplier");
const Conversation = require("../models/Conversation");
const WorkshopQuote = require("../models/WorkshopQuote");
const Env_Configuration = require("../config/env");

const connectedUsers = new Map();

// Helper function to get or create conversation
const getOrCreateConversation = async (quoteId, companyId, supplierId) => {
  try {
    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      quote_id: quoteId,
      company_id: companyId,
      supplier_id: supplierId,
    })
      .populate("company_id", "company_name")
      .populate("supplier_id", "name supplier_shop_name");

    if (conversation) {
      return conversation;
    }

    // Get quote details for metadata
    const quote = await WorkshopQuote.findById(quoteId)
      .populate("vehicle")
      .populate("company_id");

    // Create new conversation
    conversation = new Conversation({
      quote_id: quoteId,
      company_id: companyId,
      supplier_id: supplierId,
      metadata: {
        vehicle_stock_id: quote.vehicle_stock_id,
        field_name: quote.field_name,
        vehicle_info: quote.vehicle
          ? {
              make: quote.vehicle.make,
              model: quote.vehicle.model,
              year: quote.vehicle.year,
              plate_no: quote.vehicle.plate_no,
              vin: quote.vehicle.vin,
            }
          : {},
      },
    });

    await conversation.save();

    // Update WorkshopQuote with conversation reference
    await WorkshopQuote.findByIdAndUpdate(quoteId, {
      conversation_id: conversation._id,
    });

    return conversation;
  } catch (error) {
    throw new Error(`Failed to get or create conversation: ${error.message}`);
  }
};

// Helper function to mark messages as read
const markMessagesAsRead = async (conversationId, userType, userId) => {
  try {
    await Conversation.updateOne(
      {
        _id: conversationId,
        "messages.sender_type": { $ne: userType },
        "messages.is_read": false,
      },
      {
        $set: { "messages.$[elem].is_read": true },
      },
      {
        arrayFilters: [
          {
            "elem.sender_type": { $ne: userType },
            "elem.is_read": false,
          },
        ],
      }
    );
  } catch (error) {
    console.error("Mark messages as read error:", error);
  }
};

// Helper function to emit chat user status
const emitChatUserStatus = (user, isOnline, chatIO) => {
  const statusData = {
    user_id: user._id,
    user_type: user.type,
    online: isOnline,
    last_seen: new Date(),
    namespace: "chat",
  };

  if (user.type === "company") {
    chatIO
      .to(`chat_company_${user.company_id}`)
      .emit("user_status_change", statusData);
  } else {
    chatIO
      .to(`chat_supplier_${user._id}`)
      .emit("user_status_change", statusData);
  }
};

// Chat namespace authentication middleware
const chatAuthMiddleware = async (socket, next) => {
  console.log("Chat socket authentication middleware triggered");
  try {
    const token = socket.handshake.auth.token;
    console.log(
      "Authenticating chat socket with token:",
      token ? "present" : "missing"
    );
    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    const decoded = jwt.verify(token, Env_Configuration.JWT_SECRET);
    console.log(
      `Chat socket authentication attempt for user ID: ${decoded.id}, role: ${decoded.role}`
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
      const supplier = await Supplier.findById(decoded.supplier_id);
      if (!supplier) {
        return next(new Error("Supplier not found"));
      }
      socket.user = {
        ...supplier.toObject(),
        type: "supplier",
        _id: supplier._id.toString(),
      };
    }

    next();
  } catch (error) {
    console.error("Chat socket authentication error:", error);
    next(new Error("Authentication error: Invalid token"));
  }
};

// Initialize Chat namespace handlers
const initializeChatHandlers = (chatIO) => {
  chatIO.on("connection", (socket) => {
    console.log(
      `Chat User connected: ${socket.user.username || socket.user.name} (${
        socket.user.type
      }) - Socket ID: ${socket.id}`
    );

    // Add user to connected users map
    const userKey = `chat_${socket.user.type}_${socket.user._id}`;
    connectedUsers.set(userKey, {
      socketId: socket.id,
      user: socket.user,
      lastSeen: new Date(),
      online: true,
      namespace: "chat",
    });

    // Join user to their personal room
    const userRoom = `chat_${socket.user.type}_${socket.user._id}`;
    socket.join(userRoom);

    // Join user to company/supplier room for notifications
    if (socket.user.type === "company") {
      socket.join(`chat_company_${socket.user.company_id}`);
    } else {
      socket.join(`chat_supplier_${socket.user._id}`);
    }

    // Emit connection success
    socket.emit("chat_connected", {
      message: "Successfully connected to chat server",
      user: {
        id: socket.user._id,
        name: socket.user.username || socket.user.name,
        type: socket.user.type,
      },
      namespace: "chat",
    });

    // Emit online status to relevant users
    emitChatUserStatus(socket.user, true, chatIO);

    // Chat event handlers
    socket.on("get_conversation", async (data) => {
      try {
        const { quote_id } = data;

        let companyId, supplierId;

        if (socket.user.type === "company") {
          companyId = socket.user.company_id;
          supplierId = data.supplier_id;
        } else {
          companyId = data.company_id;
          supplierId = socket.user._id;
        }

        const conversation = await getOrCreateConversation(
          quote_id,
          companyId,
          supplierId
        );

        // Populate messages
        await conversation.populate(
          "messages.sender_id",
          "name email supplier_shop_name"
        );

        socket.emit("conversation_data", {
          conversation: conversation.toObject(),
          quote_id,
        });
      } catch (error) {
        console.error("Get conversation error:", error);
        socket.emit("error", { message: "Failed to get conversation" });
      }
    });

    // Join conversation room
    socket.on("join_conversation", async (data) => {
      try {
        const { quote_id, supplier_id, company_id } = data;
        console.log(
          "Joining conversation room for quote:",
          quote_id,
          supplier_id,
          company_id
        );
        let companyId =
          socket.user.type === "company" ? socket.user.company_id : company_id;
        let supplierId =
          socket.user.type === "supplier" ? socket.user._id : supplier_id;

        const conversation = await getOrCreateConversation(
          quote_id,
          companyId,
          supplierId
        );

        if (conversation) {
          socket.join(`conversation_${quote_id}`);
          socket.currentConversation = quote_id;

          // Mark messages as read
          await markMessagesAsRead(
            conversation._id,
            socket.user.type,
            socket.user._id
          );

          // Update unread counts
          if (socket.user.type === "company") {
            conversation.unread_count_company = 0;
          } else {
            conversation.unread_count_supplier = 0;
          }
          await conversation.save();

          // Populate messages before sending
          await conversation.populate(
            "messages.sender_id",
            "name email supplier_shop_name"
          );

          socket.emit("joined_conversation", {
            quote_id,
            conversation: conversation.toObject(),
          });

          console.log(
            `User ${
              socket.user.username || socket.user.name
            } joined conversation ${quote_id}`
          );
        } else {
          socket.emit("error", {
            message: "Conversation not found or access denied",
          });
        }
      } catch (error) {
        console.error("Join conversation error:", error);
        socket.emit("error", { message: "Failed to join conversation" });
      }
    });

    // Leave conversation room
    socket.on("leave_conversation", (data) => {
      const { quote_id } = data;
      socket.leave(`conversation_${quote_id}`);
      console.log(
        `User ${
          socket.user.username || socket.user.name
        } left conversation ${quote_id}`
      );
    });

    // Send message with file handling
    socket.on("send_message", async (data) => {
      try {
        const { quote_id, content, message_type = "text", file_data } = data;

        // Validate file size (10MB limit)
        if (file_data && file_data.size > 10 * 1024 * 1024) {
          socket.emit("error", { message: "File size exceeds 10MB limit" });
          return;
        }

        const conversation = await Conversation.findOne({
          quote_id,
          $or: [
            { company_id: socket.user.company_id || socket.user._id },
            { supplier_id: socket.user._id },
          ],
        }).populate("company_id supplier_id");

        if (!conversation) {
          socket.emit("error", { message: "Conversation not found" });
          return;
        }

        // Use the pre-uploaded file data from frontend
        let fileUrl = file_data ? file_data.url : null;
        let fileKey = file_data ? file_data.key : null;
        let fileSize = file_data ? file_data.size : null;
        let fileType = file_data ? file_data.type : null;
        let fileName = file_data ? file_data.name : null;

        // Create new message
        const newMessage = {
          sender_id: socket.user._id,
          sender_type: socket.user.type,
          sender_name: socket.user.username || socket.user.name,
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
        if (socket.user.type === "company") {
          conversation.unread_count_supplier += 1;
        } else {
          conversation.unread_count_company += 1;
        }

        conversation.last_message_at = new Date();
        await conversation.save();

        // Update WorkshopQuote with conversation reference
        await WorkshopQuote.findByIdAndUpdate(quote_id, {
          conversation_id: conversation._id,
        });

        // Get the saved message
        const savedMessage =
          conversation.messages[conversation.messages.length - 1];

        // Emit to conversation room
        chatIO.to(`conversation_${quote_id}`).emit("new_message", {
          conversation_id: conversation._id,
          message: savedMessage,
        });

        // Notify the other party
        const targetUserId =
          socket.user.type === "company"
            ? `supplier_${conversation.supplier_id}`
            : `company_${conversation.company_id._id}`;

        const targetRoom =
          socket.user.type === "company"
            ? `supplier_${conversation.supplier_id}`
            : `company_${conversation.company_id._id}`;

        chatIO.to(targetRoom).emit("conversation_update", {
          conversation_id: conversation._id,
          quote_id: conversation.quote_id,
          last_message: savedMessage.content,
          last_message_at: savedMessage.created_at,
          unread_count:
            socket.user.type === "company"
              ? conversation.unread_count_supplier
              : conversation.unread_count_company,
          sender_type: socket.user.type,
        });

        // Send push notification
        chatIO.to(targetUserId).emit("new_message_notification", {
          conversation_id: conversation._id,
          quote_id: conversation.quote_id,
          message: savedMessage.content.substring(0, 100) + "...",
          sender_name: socket.user.username || socket.user.name,
        });

        console.log(
          `Message sent in conversation ${quote_id} by ${
            socket.user.username || socket.user.name
          }`
        );
      } catch (error) {
        console.error("Send message error:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Typing indicators
    socket.on("typing_start", (data) => {
      const { quote_id } = data;
      socket.to(`conversation_${quote_id}`).emit("user_typing", {
        user_id: socket.user._id,
        user_name: socket.user.username || socket.user.name,
        typing: true,
      });
    });

    socket.on("typing_stop", (data) => {
      const { quote_id } = data;
      socket.to(`conversation_${quote_id}`).emit("user_typing", {
        user_id: socket.user._id,
        user_name: socket.user.username || socket.user.name,
        typing: false,
      });
    });

    // Mark messages as read
    socket.on("mark_messages_read", async (data) => {
      try {
        const { quote_id } = data;

        const conversation = await Conversation.findOne({
          quote_id,
          $or: [
            { company_id: socket.user.company_id || socket.user._id },
            { supplier_id: socket.user._id },
          ],
        });

        if (conversation) {
          await markMessagesAsRead(
            conversation._id,
            socket.user.type,
            socket.user._id
          );

          if (socket.user.type === "company") {
            conversation.unread_count_company = 0;
          } else {
            conversation.unread_count_supplier = 0;
          }

          await conversation.save();
          socket.emit("messages_marked_read", { quote_id });

          // Emit to other users in conversation
          socket.to(`conversation_${quote_id}`).emit("messages_marked_read", {
            quote_id,
            marked_by: socket.user.type,
            marked_by_id: socket.user._id,
          });
        }
      } catch (error) {
        console.error("Mark messages read error:", error);
      }
    });

    // Get user online status
    socket.on("get_user_status", (data) => {
      const { user_type, user_id } = data;
      const userKey = `chat_${user_type}_${user_id}`;
      const userStatus = connectedUsers.get(userKey);
      socket.emit("user_status", {
        user_id,
        user_type,
        online: userStatus ? userStatus.online : false,
        last_seen: userStatus ? userStatus.lastSeen : new Date(),
      });
    });

    // Ping/pong for connection testing
    socket.on("ping", (data) => {
      socket.emit("pong", {
        ...data,
        serverTime: new Date(),
      });
    });

    // Handle disconnect
    socket.on("disconnect", (reason) => {
      console.log(
        `Chat User disconnected: ${socket.user.username || socket.user.name} (${
          socket.user.type
        }) - ${reason}`
      );

      const userKey = `chat_${socket.user.type}_${socket.user._id}`;
      const userData = connectedUsers.get(userKey);
      if (userData) {
        userData.online = false;
        userData.lastSeen = new Date();
        connectedUsers.set(userKey, userData);
      }

      // Stop typing if user was typing
      if (socket.currentConversation) {
        socket.to(`conversation_${socket.currentConversation}`).emit("user_typing", {
          user_id: socket.user._id,
          user_name: socket.user.username || socket.user.name,
          typing: false,
        });
      }

      emitChatUserStatus(socket.user, false, chatIO);
      socket.leaveAll();
    });

    // Handle errors
    socket.on("error", (error) => {
      console.error("Chat socket error:", error);
      socket.emit("error", { message: "Socket error occurred" });
    });
  });
};

module.exports = {
  initializeChatHandlers,
  chatAuthMiddleware,
  connectedUsers,
  getOrCreateConversation,
  markMessagesAsRead,
  emitChatUserStatus,
};