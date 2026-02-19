const mongoose = require('mongoose');
const Env_Configuration = require('./env');

/**
 * Database Connection Manager
 * Manages connections to main database and multiple company-specific databases
 * Implements singleton pattern with connection caching and pooling
 */
class DatabaseConnectionManager {
  constructor() {
    if (DatabaseConnectionManager.instance) {
      return DatabaseConnectionManager.instance;
    }

    this.mainConnection = null;
    this.companyConnections = new Map(); // Map<companyId, {connection, lastAccessed, activeRequests}>
    this.connectionStats = {
      totalCompanyConnections: 0,
      activeConnections: 0,
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0
    };

    // Configuration
    this.MAIN_DB_POOL_SIZE = Env_Configuration.MAIN_DB_POOL_SIZE || 20;
    this.COMPANY_DB_POOL_SIZE = Env_Configuration.COMPANY_DB_POOL_SIZE || 10;
    this.MAX_COMPANY_CONNECTIONS = Env_Configuration.MAX_COMPANY_CONNECTIONS || 50;
    this.SERVER_SELECTION_TIMEOUT = Env_Configuration.DB_SERVER_SELECTION_TIMEOUT || 5000;
    this.SOCKET_TIMEOUT = Env_Configuration.DB_SOCKET_TIMEOUT || 45000;

    DatabaseConnectionManager.instance = this;
  }

  /**
   * Get or create main database connection
   * @returns {mongoose.Connection} Main database connection
   */
  getMainConnection() {
    if (!this.mainConnection) {
      this.mainConnection = this._createMainConnection();
      console.log('✅ Main database connection created');
    }
    return this.mainConnection;
  }

  /**
   * Get or create company-specific database connection
   * @param {string} companyId - Company ID
   * @returns {Promise<mongoose.Connection>} Company database connection
   */
  async getCompanyConnection(companyId) {
    if (!companyId) {
      throw new Error('Company ID is required');
    }

    this.connectionStats.totalRequests++;

    // Check if connection exists in cache
    if (this.companyConnections.has(companyId)) {
      const connectionInfo = this.companyConnections.get(companyId);
      connectionInfo.lastAccessed = new Date();
      connectionInfo.activeRequests++;
      this.connectionStats.cacheHits++;
      
      return connectionInfo.connection;
    }

    // Cache miss - create new connection
    this.connectionStats.cacheMisses++;

    // Check if we need to evict connections (LRU)
    if (this.companyConnections.size >= this.MAX_COMPANY_CONNECTIONS) {
      await this._evictLeastRecentlyUsed();
    }

    // Create new connection
    const dbName = this._getCompanyDbName(companyId);
    const connection = await this._createConnection(dbName, this.COMPANY_DB_POOL_SIZE);

    // Cache the connection
    this.companyConnections.set(companyId, {
      connection,
      lastAccessed: new Date(),
      activeRequests: 1
    });

    this.connectionStats.totalCompanyConnections++;
    this.connectionStats.activeConnections = this.companyConnections.size;

    console.log(`✅ Company database connection created: ${dbName}`);

    return connection;
  }

  /**
   * Close a specific company connection
   * @param {string} companyId - Company ID
   */
  async closeCompanyConnection(companyId) {
    if (this.companyConnections.has(companyId)) {
      const connectionInfo = this.companyConnections.get(companyId);
      await connectionInfo.connection.close();
      this.companyConnections.delete(companyId);
      this.connectionStats.activeConnections = this.companyConnections.size;
      
      console.log(`🔒 Company database connection closed: company_${companyId}`);
    }
  }

  /**
   * Decrement active requests counter for a company connection
   * @param {string} companyId - Company ID
   */
  decrementActiveRequests(companyId) {
    if (!companyId) {
      return;
    }

    if (this.companyConnections.has(companyId)) {
      const connectionInfo = this.companyConnections.get(companyId);
      // Safe decrement - never go below 0
      connectionInfo.activeRequests = Math.max(0, connectionInfo.activeRequests - 1);
      
      // Log in development only
      if (process.env.NODE_ENV === 'development') {
        console.log(`📉 Active requests decremented for company_${companyId}: ${connectionInfo.activeRequests}`);
      }
    }
  }

  /**
   * Close all connections for graceful shutdown
   */
  async closeAllConnections() {
    console.log('🔒 Closing all database connections...');

    // Close main connection
    if (this.mainConnection) {
      await this.mainConnection.close();
      this.mainConnection = null;
      console.log('🔒 Main database connection closed');
    }

    // Close all company connections
    const closePromises = [];
    for (const [companyId, connectionInfo] of this.companyConnections.entries()) {
      closePromises.push(
        connectionInfo.connection.close()
          .then(() => console.log(`🔒 Company database connection closed: company_${companyId}`))
          .catch(err => console.error(`❌ Error closing connection for company_${companyId}:`, err))
      );
    }

    await Promise.all(closePromises);
    this.companyConnections.clear();
    this.connectionStats.activeConnections = 0;

    console.log('✅ All database connections closed');
  }

  /**
   * Get connection statistics for monitoring
   * @returns {Object} Connection statistics including accurate activeRequests counts
   */
  getConnectionStats() {
    // Calculate total active requests across all connections
    let totalActiveRequests = 0;
    const companyConnectionDetails = Array.from(this.companyConnections.entries()).map(([companyId, info]) => {
      totalActiveRequests += info.activeRequests;
      return {
        companyId,
        lastAccessed: info.lastAccessed,
        activeRequests: info.activeRequests,
        isIdle: info.activeRequests === 0
      };
    });

    return {
      ...this.connectionStats,
      activeConnections: this.companyConnections.size,
      totalActiveRequests,
      cacheHitRatio: this.connectionStats.totalRequests > 0 
        ? (this.connectionStats.cacheHits / this.connectionStats.totalRequests * 100).toFixed(2) + '%'
        : '0%',
      companyConnections: companyConnectionDetails
    };
  }

  /**
   * Generate database name from company ID
   * @private
   * @param {string} companyId - Company ID
   * @returns {string} Database name
   */
  _getCompanyDbName(companyId) {
    return `company_${companyId}`;
  }

  /**
   * Create main database connection
   * @private
   * @returns {mongoose.Connection} Main database connection
   */
  _createMainConnection() {
    const connection = mongoose.createConnection(Env_Configuration.MONGODB_URI, {
      maxPoolSize: this.MAIN_DB_POOL_SIZE,
      serverSelectionTimeoutMS: this.SERVER_SELECTION_TIMEOUT,
      socketTimeoutMS: this.SOCKET_TIMEOUT
    });

    connection.on('connected', () => {
      console.log('✅ Main database connected');
    });

    connection.on('error', (err) => {
      console.error('❌ Main database error:', err.message);
    });

    connection.on('disconnected', () => {
      console.log('⚠️ Main database disconnected');
    });

    return connection;
  }

  /**
   * Create new connection with pooling configuration
   * @private
   * @param {string} dbName - Database name
   * @param {number} poolSize - Connection pool size
   * @returns {Promise<mongoose.Connection>} Database connection
   */
  async _createConnection(dbName, poolSize) {
    try {
      // Extract base URI without database name
      const baseUri = Env_Configuration.MONGODB_URI.split('?')[0].replace(/\/[^\/]*$/, '');
      const queryParams = Env_Configuration.MONGODB_URI.includes('?') 
        ? '?' + Env_Configuration.MONGODB_URI.split('?')[1] 
        : '';
      
      const uri = `${baseUri}/${dbName}${queryParams}`;

      const connection = mongoose.createConnection(uri, {
        maxPoolSize: poolSize,
        serverSelectionTimeoutMS: this.SERVER_SELECTION_TIMEOUT,
        socketTimeoutMS: this.SOCKET_TIMEOUT
      });

      // Wait for connection to be ready
      await new Promise((resolve, reject) => {
        connection.once('connected', resolve);
        connection.once('error', reject);
      });

      connection.on('error', (err) => {
        console.error(`❌ Database error for ${dbName}:`, err.message);
      });

      connection.on('disconnected', () => {
        console.log(`⚠️ Database disconnected: ${dbName}`);
      });

      return connection;
    } catch (error) {
      console.error(`❌ Failed to create connection for ${dbName}:`, error.message);
      throw new Error(`Database connection failed: ${dbName}`);
    }
  }

  /**
   * Evict least recently used connection when limit is reached
   * @private
   */
  async _evictLeastRecentlyUsed() {
    let lruCompanyId = null;
    let oldestAccess = new Date();

    // Find least recently used connection with no active requests
    for (const [companyId, connectionInfo] of this.companyConnections.entries()) {
      if (connectionInfo.activeRequests === 0 && connectionInfo.lastAccessed < oldestAccess) {
        oldestAccess = connectionInfo.lastAccessed;
        lruCompanyId = companyId;
      }
    }

    // If no idle connection found, find the oldest one regardless
    if (!lruCompanyId) {
      for (const [companyId, connectionInfo] of this.companyConnections.entries()) {
        if (connectionInfo.lastAccessed < oldestAccess) {
          oldestAccess = connectionInfo.lastAccessed;
          lruCompanyId = companyId;
        }
      }
    }

    if (lruCompanyId) {
      console.log(`⚠️ Connection limit reached. Evicting LRU connection: company_${lruCompanyId}`);
      await this.closeCompanyConnection(lruCompanyId);
    }
  }
}

// Export singleton instance
const connectionManager = new DatabaseConnectionManager();
module.exports = connectionManager;
