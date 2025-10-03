// bayChat.ts - Bay chat socket service
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
  booking_id: string;
}

interface TypingIndicator {
  user_id: string;
  user_name: string;
  typing: boolean;
}

class BayChatService {
  private socket: Socket | null = null;
  private static instance: BayChatService;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;

  private constructor() {}

  public static getInstance(): BayChatService {
    if (!BayChatService.instance) {
      BayChatService.instance = new BayChatService();
    }
    return BayChatService.instance;
  }

  private getSocketUrl(): string {
    return `${BASE_URL}/bay-chat`;
  }

  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      if (this.isConnecting) {
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
      const token = sessionStorage.getItem("token");

      if (!token) {
        this.isConnecting = false;
        reject(new Error("No auth token found"));
        return;
      }

      const socketUrl = this.getSocketUrl();
      console.log(`🔌 Connecting to bay chat server at: ${socketUrl}`);

      this.initializeSocket(socketUrl, token, resolve, reject);
    });
  }

  private initializeSocket(
    socketUrl: string,
    token: string,
    resolve: () => void,
    reject: (error: Error) => void
  ): void {
    this.socket = io(socketUrl, {
      auth: { token },
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      forceNew: true,
      upgrade: true,
      autoConnect: true,
    });

    this.socket.on("connect", () => {
      console.log("✅ Connected to bay chat server");
      this.reconnectAttempts = 0;
      this.isConnecting = false;
      resolve();
    });

    this.socket.on("bay_chat_connected", (data) => {
      console.log("🎉 Bay chat connection confirmed:", data);
    });

    this.socket.on("disconnect", (reason) => {
      console.log("❌ Disconnected from bay chat:", reason);
      this.isConnecting = false;
    });

    this.socket.on("connect_error", (error) => {
      console.error("🚫 Bay chat connection error:", error);
      this.isConnecting = false;
      reject(error);
    });

    this.socket.on("error", (error) => {
      console.error("🔐 Bay chat error:", error);
      this.isConnecting = false;
      reject(new Error(error.message || "Socket error"));
    });
  }

  public disconnect(): void {
    if (this.socket) {
      console.log("🔌 Disconnecting from bay chat server");
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnecting = false;
  }

  public getConversation(
    bookingId: string,
    bayUserId?: string,
    companyId?: string
  ): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit("get_bay_conversation", {
        booking_id: bookingId,
        bay_user_id: bayUserId,
        company_id: companyId,
      });
    }
  }

  public joinConversation(
    bookingId: string,
    bayUserId?: string,
    companyId?: string
  ): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit("join_bay_conversation", {
        booking_id: bookingId,
        bay_user_id: bayUserId,
        company_id: companyId,
      });
    }
  }

  public leaveConversation(bookingId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit("leave_bay_conversation", { booking_id: bookingId });
    }
  }

  public sendMessage(
    bookingId: string,
    content: string,
    messageType: string = "text",
    fileData?: any
  ): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit("send_bay_message", {
        booking_id: bookingId,
        content,
        message_type: messageType,
        file_data: fileData,
      });
    }
  }

  public markMessagesRead(bookingId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit("mark_bay_messages_read", { booking_id: bookingId });
    }
  }

  public startTyping(bookingId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit("bay_typing_start", { booking_id: bookingId });
    }
  }

  public stopTyping(bookingId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit("bay_typing_stop", { booking_id: bookingId });
    }
  }

  public getUserStatus(userType: string, userId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit("get_bay_user_status", {
        user_type: userType,
        user_id: userId,
      });
    }
  }

  // Event listeners
  public onConversationData(callback: (data: ConversationData) => void): void {
    this.socket?.on("bay_conversation_data", callback);
  }

  public onNewMessage(callback: (data: any) => void): void {
    this.socket?.on("new_bay_message", callback);
  }

  public onConversationUpdate(callback: (data: any) => void): void {
    this.socket?.on("bay_conversation_update", callback);
  }

  public onJoinedConversation(callback: (data: any) => void): void {
    this.socket?.on("joined_bay_conversation", callback);
  }

  public onMessagesMarkedRead(callback: (data: any) => void): void {
    this.socket?.on("bay_messages_marked_read", callback);
  }

  public onUserTyping(callback: (data: TypingIndicator) => void): void {
    this.socket?.on("bay_user_typing", callback);
  }

  public onUserStatusChange(callback: (data: UserStatus) => void): void {
    this.socket?.on("bay_user_status_change", callback);
  }

  public onUserStatus(callback: (data: UserStatus) => void): void {
    this.socket?.on("bay_user_status", callback);
  }

  public onNotification(callback: (data: any) => void): void {
    this.socket?.on("new_bay_message_notification", callback);
  }

  public onError(callback: (error: any) => void): void {
    this.socket?.on("error", callback);
  }

  public onConnected(callback: (data: any) => void): void {
    this.socket?.on("bay_chat_connected", callback);
  }

  public off(event: string, callback?: (...args: any[]) => void): void {
    this.socket?.off(event, callback);
  }

  public isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const bayChatService = BayChatService.getInstance();
