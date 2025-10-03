// src/lib/metaSocket.ts - Fixed sequential batch processing
import { io, Socket } from "socket.io-client";
import { BASE_URL } from "@/lib/config";

interface UploadProgress {
  batchId: string;
  progress: number;
  currentBatch: number;
  totalBatches: number;
  results: {
    processed: number;
    created: number;
    updated: number;
    skipped: number;
    errors: number;
  };
  estimatedTimeRemaining?: number;
}

interface BatchProgress {
  batchId: string;
  batchNumber: number;
  totalBatches: number;
  recordsProcessed: number;
  totalRecordsInBatch: number;
  progressInBatch: number;
}

interface UploadResults {
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  errors: any[];
  batchId: string;
  totalBatches: number;
  totalRecords: number;
}

interface BulkUploadData {
  data: any[];
  fieldMapping: any;
  dataTypes: any;
  customFieldTypes?: any;
  options?: any;
}

interface ConnectionStats {
  isConnected: boolean;
  socketId: string | null;
  connectionState: string;
  lastConnected?: Date;
  lastError?: string;
  retryCount: number;
}

class MetaSocketService {
  private socket: Socket | null = null;
  private static instance: MetaSocketService;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private isConnecting = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private connectionRetryTimeout: NodeJS.Timeout | null = null;

  // Fixed batch processing state
  private currentBatches: any[][] = [];
  private currentBatchIndex: number = 0;
  private uploadConfig: any = null;
  private isProcessingBatch: boolean = false;
  private batchProcessingTimeout: NodeJS.Timeout | null = null;

  // Connection stats
  private stats: ConnectionStats = {
    isConnected: false,
    socketId: null,
    connectionState: "disconnected",
    retryCount: 0,
  };

  // Event callbacks
  private callbacks: { [event: string]: ((...args: any[]) => void)[] } = {};

  private constructor() {}

  public static getInstance(): MetaSocketService {
    if (!MetaSocketService.instance) {
      MetaSocketService.instance = new MetaSocketService();
    }
    return MetaSocketService.instance;
  }

  private getSocketUrl(): string {
    return `${BASE_URL}/metadata`;
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
      this.stats.connectionState = "connecting";
      const token = sessionStorage.getItem("token");

      if (!token) {
        this.isConnecting = false;
        this.stats.connectionState = "disconnected";
        this.stats.lastError = "No auth token found";
        reject(new Error("No auth token found"));
        return;
      }

      const socketUrl = this.getSocketUrl();
      console.log(`Connecting to metadata socket server at: ${socketUrl}`);

      this.performHealthCheck()
        .then(() => {
          console.log(
            "Metadata server health check passed, initializing socket..."
          );
          this.createMetaSocket(socketUrl, token, resolve, reject);
        })
        .catch((error) => {
          console.warn(
            "Metadata server health check failed, attempting connection anyway:",
            error
          );
          this.createMetaSocket(socketUrl, token, resolve, reject);
        });
    });
  }

  private async performHealthCheck(): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(
        `${BASE_URL}/api/socket_connection/v1/metadata_connection/health`,
        {
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(
          `Health check failed: ${response.status} ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        throw new Error("Health check timeout");
      }
      throw error;
    }
  }

  private createMetaSocket(
    socketUrl: string,
    token: string,
    resolve: () => void,
    reject: (error: Error) => void
  ): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.socket = io(socketUrl, {
      auth: { token },
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: 10000,
      timeout: 30000,
      forceNew: true,
      upgrade: true,
      autoConnect: true,
    });

    this.setupEventHandlers(resolve, reject);
  }

  private setupEventHandlers(
    resolve: () => void,
    reject: (error: Error) => void
  ): void {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      console.log("Connected to meta socket server");
      console.log(`Socket ID: ${this.socket?.id}`);

      this.reconnectAttempts = 0;
      this.isConnecting = false;
      this.stats = {
        isConnected: true,
        socketId: this.socket?.id || null,
        connectionState: "connected",
        lastConnected: new Date(),
        retryCount: 0,
      };
      this.startHeartbeat();
      resolve();
    });

    this.socket.on("meta_connected", (data) => {
      console.log("Meta socket connection confirmed:", data);
      this.emit("connected", data);
    });

    this.socket.on("disconnect", (reason) => {
      console.log("Disconnected from meta server:", reason);
      this.isConnecting = false;
      this.stats.isConnected = false;
      this.stats.connectionState = "disconnected";
      this.stopHeartbeat();
      this.resetBatchProcessing();
      this.emit("disconnected", { reason });

      if (reason === "io server disconnect" || reason === "transport close") {
        this.scheduleReconnect();
      }
    });

    this.socket.on("connect_error", (error) => {
      console.error("Meta socket connection error:", error);
      this.isConnecting = false;
      this.stats.connectionState = "error";
      this.stats.lastError = error.message;
      this.stats.retryCount++;
      reject(error);
    });

    this.socket.on("reconnect_attempt", (attempt) => {
      this.reconnectAttempts = attempt;
      this.stats.retryCount = attempt;
      console.log(`Meta socket reconnection attempt ${attempt}`);
    });

    this.socket.on("reconnect", (attempt) => {
      console.log(`Meta socket reconnected after ${attempt} attempts`);
      this.stats.isConnected = true;
      this.stats.connectionState = "connected";
      this.stats.lastConnected = new Date();
      this.startHeartbeat();
    });

    this.socket.on("reconnect_failed", () => {
      console.error("Failed to reconnect meta socket after maximum attempts");
      this.isConnecting = false;
      this.stats.connectionState = "failed";
      this.scheduleReconnect();
      reject(new Error("Failed to reconnect"));
    });

    // FIXED: Upload event handlers with proper sequencing
    this.socket.on("upload_started", (data) => {
      console.log("Bulk upload started:", data);
      this.emit("uploadStarted", data);
    });

    this.socket.on("batch_start", (data) => {
      console.log(`Batch ${data.batchNumber}/${data.totalBatches} started`);
      this.isProcessingBatch = true;
      this.emit("batchStart", data);
    });

    this.socket.on("batch_progress", (data: BatchProgress) => {
      this.emit("batchProgress", data);
    });

    // CRITICAL FIX: Proper batch_complete handler
    this.socket.on("batch_complete", (data: any) => {
      console.log(
        `Batch ${data.batchNumber}/${data.totalBatches} completed:`,
        data.results
      );

      this.isProcessingBatch = false;
      this.emit("batchComplete", data);

      // FIXED: Only process next batch if we have more batches and no errors
      if (!data.error && this.currentBatchIndex < this.currentBatches.length) {
        // Add a small delay to prevent race conditions
        if (this.batchProcessingTimeout) {
          clearTimeout(this.batchProcessingTimeout);
        }

        this.batchProcessingTimeout = setTimeout(() => {
          this.processNextBatch();
        }, 200); // 200ms delay between batches
      } else if (data.error) {
        console.error("Batch processing error, stopping upload:", data.error);
        this.resetBatchProcessing();
        this.emit("uploadError", {
          message: data.error,
          batchNumber: data.batchNumber,
        });
      }
    });

    this.socket.on("upload_progress", (data: UploadProgress) => {
      console.log(
        `Upload progress: ${data.progress}% (Batch ${data.currentBatch}/${data.totalBatches})`
      );
      this.emit("uploadProgress", data);
    });

    this.socket.on(
      "upload_completed",
      (data: { success: boolean; data: UploadResults; duration?: number }) => {
        console.log("Bulk upload completed:", data);
        this.resetBatchProcessing();
        this.emit("uploadCompleted", data);
      }
    );

    this.socket.on("upload_error", (data) => {
      console.error("Upload error:", data);
      this.resetBatchProcessing();
      this.emit("uploadError", data);
    });

    this.socket.on("upload_cancelled", (data) => {
      console.log("Upload cancelled:", data);
      this.resetBatchProcessing();
      this.emit("uploadCancelled", data);
    });

    this.socket.on("upload_status", (data) => {
      this.emit("uploadStatus", data);
    });

    this.socket.on("heartbeat_ack", (data) => {
      console.log("Meta socket heartbeat acknowledged");
    });

    this.socket.on("connection_test_result", (data) => {
      console.log("Meta socket connection test result:", data);
      this.emit("connectionTestResult", data);
    });

    this.socket.on("error", (error) => {
      console.error("Meta socket error:", error);
      this.stats.lastError = error.message || "Unknown error";
      this.emit("error", error);
    });
  }

  private scheduleReconnect(): void {
    if (this.connectionRetryTimeout) {
      clearTimeout(this.connectionRetryTimeout);
    }

    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      30000
    );
    console.log(`Scheduling reconnect in ${delay}ms`);

    this.connectionRetryTimeout = setTimeout(() => {
      if (
        !this.socket?.connected &&
        this.reconnectAttempts < this.maxReconnectAttempts
      ) {
        console.log("Attempting scheduled reconnect...");
        this.connect().catch((error) => {
          console.error("Scheduled reconnect failed:", error);
        });
      }
    }, delay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit("heartbeat");
      }
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // FIXED: Reset batch processing state
  private resetBatchProcessing(): void {
    this.currentBatches = [];
    this.currentBatchIndex = 0;
    this.uploadConfig = null;
    this.isProcessingBatch = false;

    if (this.batchProcessingTimeout) {
      clearTimeout(this.batchProcessingTimeout);
      this.batchProcessingTimeout = null;
    }
  }

  public disconnect(): void {
    if (this.socket) {
      console.log("Disconnecting from meta socket server");
      this.stopHeartbeat();
      this.resetBatchProcessing();

      if (this.connectionRetryTimeout) {
        clearTimeout(this.connectionRetryTimeout);
        this.connectionRetryTimeout = null;
      }

      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnecting = false;
    this.stats.isConnected = false;
    this.stats.connectionState = "disconnected";
    this.callbacks = {};
  }

  // FIXED: Sequential upload with proper batch management
  public startSequentialUpload(config: any, batches: any[][]): void {
    if (!this.socket || !this.socket.connected) {
      throw new Error("Socket not connected");
    }

    if (this.isProcessingBatch) {
      throw new Error("Another upload is already in progress");
    }

    console.log(`Starting sequential upload with ${batches.length} batches`);

    // Reset and initialize batch processing
    this.resetBatchProcessing();
    this.currentBatches = batches;
    this.currentBatchIndex = 0;
    this.uploadConfig = config;

    // Send configuration first
    this.socket.emit("start_bulk_upload_config", {
      ...config,
      totalRecords: batches.reduce((sum, batch) => sum + batch.length, 0),
      totalBatches: batches.length,
    });

    // Start processing first batch after a small delay
    setTimeout(() => {
      this.processNextBatch();
    }, 100);
  }

  // FIXED: Process next batch with proper validation
  private processNextBatch(): void {
    if (this.currentBatchIndex >= this.currentBatches.length) {
      console.log("All batches processed successfully");
      return;
    }

    if (this.isProcessingBatch) {
      console.log("Batch already processing, skipping...");
      return;
    }

    if (!this.socket || !this.socket.connected) {
      console.error("Socket disconnected during batch processing");
      this.resetBatchProcessing();
      this.emit("uploadError", {
        message: "Socket disconnected during processing",
      });
      return;
    }

    const batch = this.currentBatches[this.currentBatchIndex];
    const batchNumber = this.currentBatchIndex + 1;
    const totalBatches = this.currentBatches.length;

    console.log(
      `Processing batch ${batchNumber}/${totalBatches} (${batch.length} records) - Meta Socket`
    );

    this.isProcessingBatch = true;
    this.currentBatchIndex++; // Increment BEFORE sending to prevent duplicates

    this.socket.emit("upload_batch", {
      batchNumber,
      totalBatches,
      data: batch,
    });
  }

  // Keep existing startBulkUpload for backward compatibility
  public startBulkUpload(uploadData: BulkUploadData): void {
    const BATCH_SIZE = 100;

    if (!this.socket || !this.socket.connected) {
      console.warn("Meta socket not connected. Cannot start bulk upload.");
      this.emit("error", { message: "Meta socket not connected" });
      return;
    }

    if (
      !uploadData.data ||
      !Array.isArray(uploadData.data) ||
      uploadData.data.length === 0
    ) {
      console.warn("Invalid upload data provided");
      this.emit("error", {
        message: "Invalid upload data: data must be a non-empty array",
      });
      return;
    }

    if (!uploadData.fieldMapping?.make || !uploadData.fieldMapping?.model) {
      console.warn("Invalid field mapping: make and model are required");
      this.emit("error", {
        message: "Invalid field mapping: make and model fields are required",
      });
      return;
    }

    console.log("Starting bulk upload with", uploadData.data.length, "records");

    // Convert to batches and use sequential upload
    const batches: any[][] = [];
    for (let i = 0; i < uploadData.data.length; i += BATCH_SIZE) {
      batches.push(uploadData.data.slice(i, i + BATCH_SIZE));
    }

    const config = {
      fieldMapping: uploadData.fieldMapping,
      dataTypes: uploadData.dataTypes,
      customFieldTypes: uploadData.customFieldTypes,
      options: uploadData.options,
    };

    this.startSequentialUpload(config, batches);
  }

  public cancelUpload(batchId: string): void {
    if (!this.socket || !this.socket.connected) {
      console.warn("Meta socket not connected. Cannot cancel upload.");
      return;
    }

    if (!batchId) {
      console.warn("No batch ID provided for cancel operation");
      return;
    }

    console.log("Cancelling upload with batchId:", batchId);
    this.resetBatchProcessing();
    this.socket.emit("cancel_upload", { batchId });
  }

  public getUploadStatus(): void {
    if (!this.socket || !this.socket.connected) {
      console.warn("Meta socket not connected. Cannot get upload status.");
      this.emit("uploadStatus", { hasActiveUpload: false, operation: null });
      return;
    }

    this.socket.emit("get_upload_status");
  }

  public testConnection(): void {
    if (!this.socket || !this.socket.connected) {
      console.warn("Cannot test connection - meta socket not connected");
      this.emit("connectionTestResult", {
        status: "error",
        message: "Socket not connected",
        timestamp: new Date(),
      });
      return;
    }

    console.log("Testing meta socket connection...");
    this.socket.emit("test_connection");
  }

  // Event management
  public on(event: string, callback: (...args: any[]) => void): void {
    if (!this.callbacks[event]) {
      this.callbacks[event] = [];
    }
    this.callbacks[event].push(callback);
  }

  public off(event: string, callback?: (...args: any[]) => void): void {
    if (!this.callbacks[event]) return;

    if (callback) {
      this.callbacks[event] = this.callbacks[event].filter(
        (cb) => cb !== callback
      );
    } else {
      this.callbacks[event] = [];
    }
  }

  private emit(event: string, ...args: any[]): void {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach((callback) => {
        try {
          callback(...args);
        } catch (error) {
          console.error(
            `Error in meta socket event callback for ${event}:`,
            error
          );
        }
      });
    }
  }

  // Connection utilities
  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  public getSocketId(): string | null {
    return this.socket?.id || null;
  }

  public getConnectionState(): string {
    return this.stats.connectionState;
  }

  public getConnectionStats(): ConnectionStats {
    return { ...this.stats };
  }

  public async ensureConnection(): Promise<void> {
    if (!this.isConnected()) {
      await this.connect();
    }
  }

  public async reconnectWithRetry(maxRetries: number = 3): Promise<void> {
    let attempts = 0;

    while (attempts < maxRetries && !this.isConnected()) {
      attempts++;
      console.log(`Reconnect attempt ${attempts}/${maxRetries}`);

      try {
        await this.connect();
        console.log("Reconnected successfully");
        return;
      } catch (error) {
        console.error(`Reconnect attempt ${attempts} failed:`, error);

        if (attempts < maxRetries) {
          const delay = 1000 * Math.pow(2, attempts);
          console.log(`Waiting ${delay}ms before next attempt...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`Failed to reconnect after ${maxRetries} attempts`);
  }
}

export const metaSocketService = MetaSocketService.getInstance();

export type {
  UploadProgress,
  BatchProgress,
  UploadResults,
  BulkUploadData,
  ConnectionStats,
};
