import { io, Socket } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

class BaySocketService {
  private socket: Socket | null = null;
  private isInitialized = false;

  initialize(token: string) {
    if (this.isInitialized && this.socket?.connected) {
      console.log("Bay socket already initialized and connected");
      return;
    }

    console.log("Initializing bay socket connection...");

    this.socket = io(`${SOCKET_URL}/bay-chat`, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.socket.on("connect", () => {
      console.log("Bay socket connected:", this.socket?.id);
      this.isInitialized = true;
    });

    this.socket.on("disconnect", (reason) => {
      console.log("Bay socket disconnected:", reason);
      this.isInitialized = false;
    });

    this.socket.on("connect_error", (error) => {
      console.error("Bay socket connection error:", error);
    });

    this.socket.on("error", (error) => {
      console.error("Bay socket error:", error);
    });
  }

  joinBayConversation(bookingId: string) {
    if (!this.socket) {
      console.error("Bay socket not initialized");
      return;
    }
    console.log("Joining bay conversation:", bookingId);
    this.socket.emit("join-bay-conversation", { bookingId });
  }

  sendBayMessage(conversationId: string, message: string, attachments?: any[]) {
    if (!this.socket) {
      console.error("Bay socket not initialized");
      return;
    }
    this.socket.emit("send-bay-message", { conversationId, message, attachments });
  }

  onBayConversationJoined(callback: (data: any) => void) {
    if (!this.socket) return;
    this.socket.on("bay-conversation-joined", callback);
  }

  onBayMessageReceived(callback: (data: any) => void) {
    if (!this.socket) return;
    this.socket.on("bay-message-received", callback);
  }

  onBayNewMessageNotification(callback: (data: any) => void) {
    if (!this.socket) return;
    this.socket.on("bay-new-message-notification", callback);
  }

  onBayUserTyping(callback: (data: any) => void) {
    if (!this.socket) return;
    this.socket.on("bay-user-typing", callback);
  }

  emitBayTyping(conversationId: string, isTyping: boolean) {
    if (!this.socket) return;
    this.socket.emit("bay-typing", { conversationId, isTyping });
  }

  markBayMessagesRead(conversationId: string) {
    if (!this.socket) return;
    this.socket.emit("bay-messages-read", { conversationId });
  }

  onBayMessagesMarkedRead(callback: (data: any) => void) {
    if (!this.socket) return;
    this.socket.on("bay-messages-marked-read", callback);
  }

  onBayUserStatus(callback: (data: any) => void) {
    if (!this.socket) return;
    this.socket.on("bay-user-status", callback);
  }

  disconnect() {
    if (this.socket) {
      console.log("Disconnecting bay socket");
      this.socket.disconnect();
      this.socket = null;
      this.isInitialized = false;
    }
  }

  isConnected() {
    return this.socket?.connected || false;
  }

  offAll() {
    if (this.socket) {
      this.socket.off("bay-conversation-joined");
      this.socket.off("bay-message-received");
      this.socket.off("bay-new-message-notification");
      this.socket.off("bay-user-typing");
      this.socket.off("bay-messages-marked-read");
      this.socket.off("bay-user-status");
    }
  }
}

export const baySocketService = new BaySocketService();
