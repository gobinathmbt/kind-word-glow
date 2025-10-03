// notificationSocket.ts - Notification Socket Service
import { io, Socket } from "socket.io-client";
import { BASE_URL } from "@/lib/config";

class NotificationSocketService {
  private socket: Socket | null = null;
  private connectionState: string = "disconnected";
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectInterval: number = 1000;

  constructor() {
    this.connectionState = "disconnected";
  }

  // Connect to notification socket
  async connect(): Promise<void> {
    try {
      console.log("🔔 Connecting to notification socket...");

      const token = sessionStorage.getItem("token");
      if (!token) {
        throw new Error("No token found for notification socket connection");
      }

      const socketUrl = `${BASE_URL}/notifications`;

      this.socket = io(socketUrl, {
        auth: { token },
        transports: ["polling", "websocket"],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectInterval,
        reconnectionDelayMax: 10000,
        timeout: 30000,
        forceNew: true,
        upgrade: true,
        autoConnect: true,
      });

      this.setupEventHandlers();

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Notification socket connection timeout"));
        }, 10000);

        this.socket?.on("notification_connected", (data) => {
          clearTimeout(timeout);
          console.log("✅ Notification socket connected:", data);
          this.connectionState = "connected";
          this.reconnectAttempts = 0;
          resolve();
        });

        this.socket?.on("connect_error", (error) => {
          clearTimeout(timeout);
          console.error("❌ Notification socket connection error:", error);
          this.connectionState = "error";
          this.reconnectAttempts++;
          reject(error);
        });
      });
    } catch (error) {
      console.error("❌ Notification socket connection failed:", error);
      this.connectionState = "error";
      throw error;
    }
  }

  // Setup socket event handlers
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      console.log("🔔 Notification socket connected to server");
      this.connectionState = "connected";
      this.reconnectAttempts = 0;
    });

    this.socket.on("disconnect", (reason) => {
      console.log("🔔 Notification socket disconnected:", reason);
      this.connectionState = "disconnected";

      if (reason === "io server disconnect") {
        // Server initiated disconnect, reconnect manually
        this.socket?.connect();
      }
    });

    this.socket.on("reconnect", (attemptNumber) => {
      console.log(
        `🔔 Notification socket reconnected after ${attemptNumber} attempts`
      );
      this.connectionState = "connected";
      this.reconnectAttempts = 0;
    });

    this.socket.on("reconnect_attempt", (attemptNumber) => {
      console.log(`🔔 Notification socket reconnect attempt ${attemptNumber}`);
      this.connectionState = "reconnecting";
    });

    this.socket.on("reconnect_error", (error) => {
      console.error("🔔 Notification socket reconnect error:", error);
      this.connectionState = "error";
    });

    this.socket.on("reconnect_failed", () => {
      console.error("🔔 Notification socket reconnect failed");
      this.connectionState = "failed";
    });
  }

  // Disconnect from notification socket
  disconnect(): void {
    if (this.socket) {
      console.log("🔔 Disconnecting notification socket...");
      this.socket.disconnect();
      this.socket = null;
      this.connectionState = "disconnected";
    }
  }

  // Check if connected
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Get connection state
  getConnectionState(): string {
    return this.connectionState;
  }

  // Get socket ID
  getSocketId(): string | null {
    return this.socket?.id || null;
  }

  // Get socket instance
  getSocket(): Socket | null {
    return this.socket;
  }

  // Emit event
  emit(event: string, data?: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn("🔔 Notification socket not connected, cannot emit:", event);
    }
  }

  // Add event listener
  on(event: string, callback: (...args: any[]) => void): void {
    this.socket?.on(event, callback);
  }

  // Remove event listener
  off(event: string, callback?: (...args: any[]) => void): void {
    this.socket?.off(event, callback);
  }

  // Test connection
  testConnection(): void {
    if (this.socket?.connected) {
      console.log("🧪 Testing notification socket connection...");
      this.socket.emit("get_unread_count");
    } else {
      console.warn("🔔 Notification socket not connected for testing");
    }
  }

  // Force reconnect
  async forceReconnect(): Promise<void> {
    console.log("🔄 Force reconnecting notification socket...");
    this.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await this.connect();
  }
}

export const notificationSocketService = new NotificationSocketService();
