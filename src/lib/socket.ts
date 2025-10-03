// socket.ts - Enhanced with proper connection handling
import { io, Socket } from "socket.io-client";
import { BASE_URL } from "@/lib/config";

interface UserStatus {
  user_id: string;
  user_type: string;
  online: boolean;
  last_seen: Date;
}

interface ConversationData {
  conversation: any;
  quote_id: string;
}

interface TypingIndicator {
  user_id: string;
  user_name: string;
  typing: boolean;
}

class SocketService {
  private socket: Socket | null = null;
  private static instance: SocketService;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;

  private constructor() {}

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  private getSocketUrl(): string {
    return `${BASE_URL}/chat`;
  }

  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        // If already connecting, wait for that connection
        const checkConnection = () => {
          if (this.socket?.connected) {
            resolve();
          } else if (!this.isConnecting) {
            reject(new Error("Connection failed"));
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
        return;
      }

      this.isConnecting = true;
      const token =
        sessionStorage.getItem("token") ||
        sessionStorage.getItem("supplier_token");

      if (!token) {
        this.isConnecting = false;
        reject(new Error("No auth token found"));
        return;
      }

      const socketUrl = this.getSocketUrl();
      console.log(`🔌 Attempting to connect to socket server at: ${socketUrl}`);

      // First, let's test if the chat server is responding
      fetch(`${BASE_URL}/api/socket_connection/v1/chat_connection/health`)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Chat server health check failed: ${response.status}`);
          }
          return response.json();
        })
        .then(() => {
          console.log("✅ Chat server health check passed, initializing socket...");
          this.initializeSocket(socketUrl, token, resolve, reject);
        })
        .catch((error) => {
          console.error("❌ Chat server health check failed:", error);
          // Try to connect anyway
          this.initializeSocket(socketUrl, token, resolve, reject);
        });
    });
  }

  private initializeSocket(
    socketUrl: string,
    token: string,
    resolve: () => void,
    reject: (error: Error) => void
  ): void {
    this.socket = io(socketUrl, {
      auth: {
        token,
      },
      transports: ["polling", "websocket"], // Try polling first
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: 5000,
      timeout: 20000, // Increased timeout
      forceNew: true,
      upgrade: true,
      autoConnect: true,
    });

    // Set up event handlers
    this.socket.on("connect", () => {
      console.log("✅ Connected to socket server");
      console.log(`📡 Socket ID: ${this.socket?.id}`);
      console.log(`🚀 Transport: ${this.socket?.io.engine?.transport?.name}`);

      this.reconnectAttempts = 0;
      this.isConnecting = false;
      resolve();
    });

    this.socket.on("chat_connected", (data) => {
      console.log("🎉 Chat socket connection confirmed by server:", data);
    });

    this.socket.on("disconnect", (reason) => {
      console.log("❌ Disconnected from server:", reason);
      this.isConnecting = false;
    });

    this.socket.on("connect_error", (error) => {
      console.error("🚫 Socket connection error:", error);
      this.isConnecting = false;
      reject(error);
    });

    this.socket.on("reconnect_attempt", (attempt) => {
      this.reconnectAttempts = attempt;
      console.log(`🔄 Reconnection attempt ${attempt}`);
    });

    this.socket.on("reconnect", (attempt) => {
      console.log(`✅ Reconnected after ${attempt} attempts`);
    });

    this.socket.on("reconnect_failed", () => {
      console.error("❌ Failed to reconnect after maximum attempts");
      this.isConnecting = false;
      reject(new Error("Failed to reconnect"));
    });

    // Handle authentication errors
    this.socket.on("error", (error) => {
      console.error("🔐 Socket error:", error);
      this.isConnecting = false;
      reject(new Error(error.message || "Socket error"));
    });

    // Timeout fallback
    setTimeout(() => {
      if (!this.socket?.connected && this.isConnecting) {
        console.error("⏰ Connection timeout");
        this.isConnecting = false;
        reject(new Error("Connection timeout"));
      }
    }, 25000);
  }

  public disconnect(): void {
    if (this.socket) {
      console.log("🔌 Disconnecting from socket server");
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnecting = false;
  }

  public getConversation(
    quoteId: string,
    supplierId?: string,
    companyId?: string
  ): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit("get_conversation", {
        quote_id: quoteId,
        supplier_id: supplierId,
        company_id: companyId,
      });
    } else {
      console.warn("❌ Socket not connected. Cannot get conversation.");
    }
  }

  public joinConversation(
    quoteId: string,
    supplierId?: string,
    companyId?: string
  ): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit("join_conversation", {
        quote_id: quoteId,
        supplier_id: supplierId,
        company_id: companyId,
      });
    } else {
      console.warn("❌ Socket not connected. Cannot join conversation.");
    }
  }

  public leaveConversation(quoteId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit("leave_conversation", { quote_id: quoteId });
    }
  }

  public sendMessage(
    quoteId: string,
    content: string,
    messageType: string = "text",
    fileData?: any
  ): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit("send_message", {
        quote_id: quoteId,
        content,
        message_type: messageType,
        file_data: fileData,
      });
    } else {
      console.warn("❌ Socket not connected. Cannot send message.");
    }
  }

  public markMessagesRead(quoteId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit("mark_messages_read", { quote_id: quoteId });
    }
  }

  public startTyping(quoteId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit("typing_start", { quote_id: quoteId });
    }
  }

  public stopTyping(quoteId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit("typing_stop", { quote_id: quoteId });
    }
  }

  public getUserStatus(userType: string, userId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit("get_user_status", {
        user_type: userType,
        user_id: userId,
      });
    }
  }

  // Event listeners
  public onConversationData(callback: (data: ConversationData) => void): void {
    this.socket?.on("conversation_data", callback);
  }

  public onNewMessage(callback: (data: any) => void): void {
    this.socket?.on("new_message", callback);
  }

  public onConversationUpdate(callback: (data: any) => void): void {
    this.socket?.on("conversation_update", callback);
  }

  public onJoinedConversation(callback: (data: any) => void): void {
    this.socket?.on("joined_conversation", callback);
  }

  public onMessagesMarkedRead(callback: (data: any) => void): void {
    this.socket?.on("messages_marked_read", callback);
  }

  public onUserTyping(callback: (data: TypingIndicator) => void): void {
    this.socket?.on("user_typing", callback);
  }

  public onUserStatusChange(callback: (data: UserStatus) => void): void {
    this.socket?.on("user_status_change", callback);
  }

  public onUserStatus(callback: (data: UserStatus) => void): void {
    this.socket?.on("user_status", callback);
  }

  public onNotification(callback: (data: any) => void): void {
    this.socket?.on("new_message_notification", callback);
  }

  public onError(callback: (error: any) => void): void {
    this.socket?.on("error", callback);
  }

  public onConnected(callback: (data: any) => void): void {
    this.socket?.on("chat_connected", callback);
  }

  public off(event: string, callback?: (...args: any[]) => void): void {
    this.socket?.off(event, callback);
  }

  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  public getSocketId(): string | null {
    return this.socket?.id || null;
  }

  public getConnectionState(): string {
    if (!this.socket) return "disconnected";
    if (this.isConnecting) return "connecting";
    if (this.socket.connected) return "connected";
    return "disconnected";
  }

  // Helper method to ensure connection before performing actions
  public async ensureConnection(): Promise<void> {
    if (!this.isConnected()) {
      await this.connect();
    }
  }

  // Method to test connection
  public testConnection(): void {
    if (this.socket && this.socket.connected) {
      console.log("🧪 Testing socket connection...");
      this.socket.emit("ping", { timestamp: Date.now() });

      // Listen for pong response
      this.socket.once("pong", (data) => {
        console.log("🏓 Socket connection test successful:", data);
      });

      // Timeout for test
      setTimeout(() => {
        console.warn("⏰ Socket connection test timeout");
      }, 5000);
    } else {
      console.warn("❌ Cannot test connection - socket not connected");
    }
  }
}

export const socketService = SocketService.getInstance();
