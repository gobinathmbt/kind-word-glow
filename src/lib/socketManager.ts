// socketManager.ts - Centralized socket management
import { socketService } from './socket';
import { metaSocketService } from './metaSocket';
import { notificationSocketService } from './notificationSocket';

export interface SocketConnection {
  type: 'chat' | 'metadata' | 'notification';
  isConnected: boolean;
  connectionState: string;
  socketId: string | null;
}

class SocketManager {
  private static instance: SocketManager;
  private connections: Map<string, any> = new Map();

  private constructor() {}

  public static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  // Initialize all socket connections
  public async initializeConnections(): Promise<void> {
    try {
      console.log('🔌 Initializing all socket connections...');
      
      // Initialize chat socket
      await this.connectChatSocket();
      
      // Initialize metadata and notification sockets (only for company users)
      const token = sessionStorage.getItem("token");
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.role === 'company_super_admin' || payload.role === 'company_admin') {
            await this.connectMetaSocket();
            await this.connectNotificationSocket();
          }
        } catch (error) {
          console.warn('Could not parse token for role check:', error);
        }
      }
      
      console.log('✅ All socket connections initialized');
    } catch (error) {
      console.error('❌ Error initializing socket connections:', error);
      throw error;
    }
  }

  // Connect to chat socket
  public async connectChatSocket(): Promise<void> {
    try {
      console.log('📞 Connecting to chat socket...');
      await socketService.connect();
      this.connections.set('chat', socketService);
      console.log('✅ Chat socket connected');
    } catch (error) {
      console.error('❌ Chat socket connection failed:', error);
      throw error;
    }
  }

  // Connect to metadata socket
  public async connectMetaSocket(): Promise<void> {
    try {
      console.log('📊 Connecting to metadata socket...');
      await metaSocketService.connect();
      this.connections.set('metadata', metaSocketService);
      console.log('✅ Metadata socket connected');
    } catch (error) {
      console.error('❌ Metadata socket connection failed:', error);
      throw error;
    }
  }

  // Connect to notification socket
  public async connectNotificationSocket(): Promise<void> {
    try {
      console.log('🔔 Connecting to notification socket...');
      await notificationSocketService.connect();
      this.connections.set('notification', notificationSocketService);
      console.log('✅ Notification socket connected');
    } catch (error) {
      console.error('❌ Notification socket connection failed:', error);
      throw error;
    }
  }

  // Get connection status for all sockets
  public getConnectionStatus(): SocketConnection[] {
    const connections: SocketConnection[] = [];
    
    // Chat socket status
    connections.push({
      type: 'chat',
      isConnected: socketService.isConnected(),
      connectionState: socketService.getConnectionState(),
      socketId: socketService.getSocketId()
    });

    // Metadata socket status
    connections.push({
      type: 'metadata',
      isConnected: metaSocketService.isConnected(),
      connectionState: metaSocketService.getConnectionState(),
      socketId: metaSocketService.getSocketId()
    });

    // Notification socket status
    connections.push({
      type: 'notification',
      isConnected: notificationSocketService.isConnected(),
      connectionState: notificationSocketService.getConnectionState(),
      socketId: notificationSocketService.getSocketId()
    });

    return connections;
  }

  // Get specific socket service
  public getChatSocket() {
    return socketService;
  }

  public getMetaSocket() {
    return metaSocketService;
  }

  public getNotificationSocket() {
    return notificationSocketService;
  }

  // Disconnect all sockets
  public disconnectAll(): void {
    console.log('🔌 Disconnecting all sockets...');
    
    socketService.disconnect();
    metaSocketService.disconnect();
    notificationSocketService.disconnect();
    
    this.connections.clear();
    console.log('✅ All sockets disconnected');
  }

  // Test all connections
  public testAllConnections(): void {
    console.log('🧪 Testing all socket connections...');
    
    if (socketService.isConnected()) {
      socketService.testConnection();
    }
    
    if (metaSocketService.isConnected()) {
      metaSocketService.testConnection();
    }

    if (notificationSocketService.isConnected()) {
      notificationSocketService.testConnection();
    }
  }

  // Reconnect specific socket
  public async reconnectSocket(type: 'chat' | 'metadata' | 'notification'): Promise<void> {
    console.log(`🔄 Reconnecting ${type} socket...`);
    
    if (type === 'chat') {
      socketService.disconnect();
      await this.connectChatSocket();
    } else if (type === 'metadata') {
      metaSocketService.disconnect();
      await this.connectMetaSocket();
    } else if (type === 'notification') {
      notificationSocketService.disconnect();
      await this.connectNotificationSocket();
    }
  }

  // Get connection health summary
  public getHealthSummary(): {
    overall: 'healthy' | 'partial' | 'offline';
    connections: SocketConnection[];
    connectedCount: number;
    totalCount: number;
  } {
    const connections = this.getConnectionStatus();
    const connectedCount = connections.filter(conn => conn.isConnected).length;
    const totalCount = connections.length;
    
    let overall: 'healthy' | 'partial' | 'offline';
    if (connectedCount === totalCount) {
      overall = 'healthy';
    } else if (connectedCount > 0) {
      overall = 'partial';
    } else {
      overall = 'offline';
    }

    return {
      overall,
      connections,
      connectedCount,
      totalCount
    };
  }
}

export const socketManager = SocketManager.getInstance();
export { socketService, metaSocketService, notificationSocketService };