const StorageAdapter = require('./StorageAdapter');
const { BlobServiceClient, StorageSharedKeyCredential, generateBlobSASQueryParameters, BlobSASPermissions } = require('@azure/storage-blob');
const crypto = require('crypto');

/**
 * Azure Blob Storage Adapter
 * 
 * Implements storage operations using Azure Blob Storage.
 */
class AzureBlobStorageAdapter extends StorageAdapter {
  constructor(credentials, settings = {}) {
    super(credentials, settings);
    
    const accountName = credentials.account_name;
    const accountKey = credentials.account_key;
    const containerName = credentials.container_name || settings.container_name;

    if (!accountName || !accountKey || !containerName) {
      throw new Error('Azure account_name, account_key, and container_name are required');
    }

    this.containerName = containerName;
    this.accountName = accountName;

    // Create shared key credential
    const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
    
    // Create blob service client
    this.blobServiceClient = new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net`,
      sharedKeyCredential
    );

    this.containerClient = this.blobServiceClient.getContainerClient(containerName);
    this.sharedKeyCredential = sharedKeyCredential;
  }

  /**
   * Upload file to Azure Blob Storage
   */
  async upload(buffer, path, options = {}) {
    try {
      const blobName = this._normalizePath(path);
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

      const uploadOptions = {
        blobHTTPHeaders: {
          blobContentType: options.contentType || 'application/pdf'
        },
        metadata: options.metadata || {}
      };

      await blockBlobClient.upload(buffer, buffer.length, uploadOptions);

      const url = blockBlobClient.url;

      return {
        success: true,
        url,
        path: blobName,
        provider: 'azure_blob',
        container: this.containerName,
        size: buffer.length
      };
    } catch (error) {
      console.error('Azure Blob upload error:', error);
      throw new Error(`Failed to upload to Azure Blob Storage: ${error.message}`);
    }
  }

  /**
   * Download file from Azure Blob Storage
   */
  async download(path) {
    try {
      const blobName = this._normalizePath(path);
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

      const downloadResponse = await blockBlobClient.download(0);
      
      // Convert stream to buffer
      const chunks = [];
      for await (const chunk of downloadResponse.readableStreamBody) {
        chunks.push(chunk);
      }
      
      return Buffer.concat(chunks);
    } catch (error) {
      console.error('Azure Blob download error:', error);
      throw new Error(`Failed to download from Azure Blob Storage: ${error.message}`);
    }
  }

  /**
   * Generate SAS URL for Azure Blob
   */
  async generatePresignedUrl(path, expirySeconds = 3600) {
    try {
      const blobName = this._normalizePath(path);
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

      const startsOn = new Date();
      const expiresOn = new Date(startsOn.getTime() + expirySeconds * 1000);

      const sasToken = generateBlobSASQueryParameters({
        containerName: this.containerName,
        blobName: blobName,
        permissions: BlobSASPermissions.parse('r'), // Read permission
        startsOn,
        expiresOn
      }, this.sharedKeyCredential).toString();

      return `${blockBlobClient.url}?${sasToken}`;
    } catch (error) {
      console.error('Azure Blob SAS URL error:', error);
      throw new Error(`Failed to generate SAS URL: ${error.message}`);
    }
  }

  /**
   * Test Azure Blob Storage connection
   */
  async testConnection() {
    try {
      const testBlobName = `esign-test/${crypto.randomBytes(8).toString('hex')}.txt`;
      const testContent = Buffer.from('E-sign storage test file');

      // Test write
      await this.upload(testContent, testBlobName, { contentType: 'text/plain' });

      // Test read
      const downloaded = await this.download(testBlobName);
      
      if (downloaded.toString() !== testContent.toString()) {
        throw new Error('Downloaded content does not match uploaded content');
      }

      // Test delete
      await this.delete(testBlobName);

      return {
        success: true,
        message: 'Azure Blob Storage connection test successful',
        provider: 'azure_blob',
        container: this.containerName
      };
    } catch (error) {
      console.error('Azure Blob connection test error:', error);
      return {
        success: false,
        message: 'Azure Blob Storage connection test failed',
        error: error.message,
        provider: 'azure_blob'
      };
    }
  }

  /**
   * Delete file from Azure Blob Storage
   */
  async delete(path) {
    try {
      const blobName = this._normalizePath(path);
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

      await blockBlobClient.delete();
      return true;
    } catch (error) {
      console.error('Azure Blob delete error:', error);
      throw new Error(`Failed to delete from Azure Blob Storage: ${error.message}`);
    }
  }

  /**
   * Check if file exists in Azure Blob Storage
   */
  async exists(path) {
    try {
      const blobName = this._normalizePath(path);
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

      return await blockBlobClient.exists();
    } catch (error) {
      console.error('Azure Blob exists check error:', error);
      return false;
    }
  }

  /**
   * Normalize path by removing leading slashes
   */
  _normalizePath(path) {
    return path.replace(/^\/+/, '');
  }
}

module.exports = AzureBlobStorageAdapter;
