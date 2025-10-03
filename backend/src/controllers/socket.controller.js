// socket.controller.js - Main Socket Controller combining chat and metadata handlers
const { Server } = require("socket.io");
const Env_Configuration = require("../config/env");

// Import chat handlers
const {
  initializeChatHandlers,
  chatAuthMiddleware,
  connectedUsers,
  getOrCreateConversation,
  markMessagesAsRead,
  emitChatUserStatus,
} = require("../handlers/chat.handler");

// Import metadata handlers
const {
  initializeMetaHandlers,
  metaAuthMiddleware,
  metaConnectedUsers,
  activeBulkOperations,
  convertToType,
  createOrUpdateEntry,
  processBatchWithSocket,
  BATCH_SIZE,
  BATCH_DELAY,
} = require("../handlers/metadata.handler");

// Import notification handlers
const {
  initializeNotificationHandlers,
  notificationAuthMiddleware,
  notificationConnectedUsers,
  sendRealTimeNotification,
  sendDealershipNotification,
  getConnectedNotificationUsers
} = require("../handlers/notification.handler");

// Import bay chat handlers
const {
  initializeBayChatHandlers,
  bayChatAuthMiddleware,
  bayChatConnectedUsers,
  getOrCreateBayConversation,
  markBayMessagesAsRead,
  emitBayChatUserStatus
} = require("../handlers/bayChat.handler");

let mainIO;
let chatIO;
let metaIO;
let notificationIO;
let bayChatIO;

const initializeSocket = (server) => {
  console.log("Initializing Multi-namespace Socket.io...");

  // Initialize main Socket.IO server
  mainIO = new Server(server, {
    // cors: {
    //   origin: [
    //     Env_Configuration.FRONTEND_URL || "http://localhost:8080",
    //     "http://localhost:8080",
    //     "http://127.0.0.1:8080",
    //   ],
    //   methods: ["GET", "POST"],
    //   credentials: true,
    //   allowEIO3: true,
    // },
    cors: {
      origin: "*", // Allow all origins (quick fix, not recommended for prod)
      methods: ["GET", "POST"],
      credentials: true,
    },
    allowEIO3: true,
    transports: ["websocket", "polling"],
    pingTimeout: 120000,
    pingInterval: 25000,
  });

  // Initialize Chat namespace
  chatIO = mainIO.of("/chat");

  // Initialize Metadata namespace
  metaIO = mainIO.of("/metadata");

  // Initialize Notification namespace
  notificationIO = mainIO.of("/notifications");

  // Initialize Bay Chat namespace
  bayChatIO = mainIO.of("/bay-chat");

  console.log(
    `Multi-namespace Socket.io server initialized with CORS origin: ${
      Env_Configuration.FRONTEND_URL || "http://localhost:8080"
    }`
  );
  console.log("Chat namespace: /chat");
  console.log("Metadata namespace: /metadata");
  console.log("Notification namespace: /notifications");
  console.log("Bay Chat namespace: /bay-chat");

  // Set up Chat namespace authentication middleware
  chatIO.use(chatAuthMiddleware);

  // Set up Metadata namespace authentication middleware
  metaIO.use(metaAuthMiddleware);

  // Set up Notification namespace authentication middleware
  notificationIO.use(notificationAuthMiddleware);

  // Set up Bay Chat namespace authentication middleware
  bayChatIO.use(bayChatAuthMiddleware);

  // Initialize Chat namespace handlers
  initializeChatHandlers(chatIO);

  // Initialize Metadata namespace handlers
  initializeMetaHandlers(metaIO);

  // Initialize Notification namespace handlers
  initializeNotificationHandlers(notificationIO);

  // Initialize Bay Chat namespace handlers
  initializeBayChatHandlers(bayChatIO);

  return { mainIO, chatIO, metaIO, notificationIO, bayChatIO };
};

// Getter functions for socket instances
const getMainSocketIO = () => {
  if (!mainIO) {
    throw new Error("Main Socket.io not initialized");
  }
  return mainIO;
};

const getChatSocketIO = () => {
  if (!chatIO) {
    throw new Error("Chat Socket.io not initialized");
  }
  return chatIO;
};

const getMetaSocketIO = () => {
  if (!metaIO) {
    throw new Error("Metadata Socket.io not initialized");
  }
  return metaIO;
};

const getNotificationSocketIO = () => {
  if (!notificationIO) {
    throw new Error("Notification Socket.io not initialized");
  }
  return notificationIO;
};

const getBayChatSocketIO = () => {
  if (!bayChatIO) {
    throw new Error("Bay Chat Socket.io not initialized");
  }
  return bayChatIO;
};

// Legacy support
const getIO = () => {
  return getChatSocketIO();
};

// Get active operations summary
const getActiveOperations = () => {
  const operations = {};
  activeBulkOperations.forEach((operation, socketId) => {
    operations[socketId] = {
      ...operation,
      duration: operation.endTime
        ? operation.endTime - operation.startTime
        : Date.now() - operation.startTime,
    };
  });
  return operations;
};

// Get connected users summary
const getConnectedUsers = () => {
  return {
    chat: Array.from(connectedUsers.entries()).map(([key, data]) => ({
      key,
      ...data,
    })),
    metadata: Array.from(metaConnectedUsers.entries()).map(([key, data]) => ({
      key,
      ...data,
    })),
    notifications: getConnectedNotificationUsers(),
    bayChat: Array.from(bayChatConnectedUsers.entries()).map(([key, data]) => ({
      key,
      ...data,
    })),
  };
};

module.exports = {
  initializeSocket,
  getIO,
  getMainSocketIO,
  getChatSocketIO,
  getMetaSocketIO,
  getNotificationSocketIO,
  getBayChatSocketIO,
  getActiveOperations,
  getConnectedUsers,
  connectedUsers,
  metaConnectedUsers,
  notificationConnectedUsers,
  bayChatConnectedUsers,
  // Export helper functions for external use if needed
  getOrCreateConversation,
  markMessagesAsRead,
  emitChatUserStatus,
  getOrCreateBayConversation,
  markBayMessagesAsRead,
  emitBayChatUserStatus,
  convertToType,
  createOrUpdateEntry,
  processBatchWithSocket,
  sendRealTimeNotification,
  sendDealershipNotification,
  BATCH_SIZE,
  BATCH_DELAY,
};