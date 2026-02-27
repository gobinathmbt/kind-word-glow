/**
 * Storage Adapter Interface
 * 
 * Abstract base class for storage provider implementations.
 * All storage adapters must implement these methods.
 */

class StorageAdapter {
  constructor(credentials, settings = {}) {
    if (this.constructor === StorageAdapter) {
      throw new Error('StorageAdapter is an abstract class and cannot be instantiated directly');
    }
    this.credentials = credentials;
    this.settings = settings;
  }

  /**
   * Upload a file to storage
   * @param {Buffer} buffer - File buffer to upload
   * @param {string} path - Destination path in storage
   * @param {Object} options - Additional upload options (contentType, metadata, etc.)
   * @returns {Promise<Object>} Upload result with url, path, and metadata
   */
  async upload(buffer, path, options = {}) {
    throw new Error('upload() must be implemented by subclass');
  }

  /**
   * Download a file from storage
   * @param {string} path - Path to file in storage
   * @returns {Promise<Buffer>} File buffer
   */
  async download(path) {
    throw new Error('download() must be implemented by subclass');
  }

  /**
   * Generate a presigned URL for temporary access
   * @param {string} path - Path to file in storage
   * @param {number} expirySeconds - URL expiry time in seconds (default: 3600)
   * @returns {Promise<string>} Presigned URL
   */
  async generatePresignedUrl(path, expirySeconds = 3600) {
    throw new Error('generatePresignedUrl() must be implemented by subclass');
  }

  /**
   * Test connection to storage provider
   * @returns {Promise<Object>} Test result with success status and message
   */
  async testConnection() {
    throw new Error('testConnection() must be implemented by subclass');
  }

  /**
   * Delete a file from storage
   * @param {string} path - Path to file in storage
   * @returns {Promise<boolean>} Success status
   */
  async delete(path) {
    throw new Error('delete() must be implemented by subclass');
  }

  /**
   * Check if a file exists in storage
   * @param {string} path - Path to file in storage
   * @returns {Promise<boolean>} Existence status
   */
  async exists(path) {
    throw new Error('exists() must be implemented by subclass');
  }
}

module.exports = StorageAdapter;
