const StorageAdapter = require('./StorageAdapter');
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');

/**
 * AWS S3 Storage Adapter
 * 
 * Implements storage operations using AWS S3.
 * Reuses existing Company.s3_config when available.
 */
class S3StorageAdapter extends StorageAdapter {
  constructor(credentials, settings = {}) {
    super(credentials, settings);
    
    // Initialize S3 client
    this.s3Client = new S3Client({
      region: credentials.region || settings.region || 'us-east-1',
      credentials: {
        accessKeyId: credentials.access_key_id || credentials.access_key,
        secretAccessKey: credentials.secret_access_key || credentials.secret_key
      }
    });

    this.bucket = credentials.bucket || settings.bucket;
    
    if (!this.bucket) {
      throw new Error('S3 bucket name is required');
    }
  }

  /**
   * Upload file to S3
   */
  async upload(buffer, path, options = {}) {
    try {
      const key = this._normalizePath(path);
      
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: options.contentType || 'application/pdf',
        Metadata: options.metadata || {},
        ServerSideEncryption: 'AES256'
      });

      await this.s3Client.send(command);

      const url = `https://${this.bucket}.s3.amazonaws.com/${key}`;

      return {
        success: true,
        url,
        path: key,
        provider: 'aws_s3',
        bucket: this.bucket,
        size: buffer.length
      };
    } catch (error) {
      console.error('S3 upload error:', error);
      throw new Error(`Failed to upload to S3: ${error.message}`);
    }
  }

  /**
   * Download file from S3
   */
  async download(path) {
    try {
      const key = this._normalizePath(path);
      
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key
      });

      const response = await this.s3Client.send(command);
      
      // Convert stream to buffer
      const chunks = [];
      for await (const chunk of response.Body) {
        chunks.push(chunk);
      }
      
      return Buffer.concat(chunks);
    } catch (error) {
      console.error('S3 download error:', error);
      throw new Error(`Failed to download from S3: ${error.message}`);
    }
  }

  /**
   * Generate presigned URL for S3 object
   */
  async generatePresignedUrl(path, expirySeconds = 3600) {
    try {
      const key = this._normalizePath(path);
      
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key
      });

      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn: expirySeconds
      });

      return url;
    } catch (error) {
      console.error('S3 presigned URL error:', error);
      throw new Error(`Failed to generate presigned URL: ${error.message}`);
    }
  }

  /**
   * Test S3 connection
   */
  async testConnection() {
    try {
      const testKey = `esign-test/${crypto.randomBytes(8).toString('hex')}.txt`;
      const testContent = Buffer.from('E-sign storage test file');

      // Test write
      await this.upload(testContent, testKey, { contentType: 'text/plain' });

      // Test read
      const downloaded = await this.download(testKey);
      
      if (downloaded.toString() !== testContent.toString()) {
        throw new Error('Downloaded content does not match uploaded content');
      }

      // Test delete
      await this.delete(testKey);

      return {
        success: true,
        message: 'S3 connection test successful',
        provider: 'aws_s3',
        bucket: this.bucket
      };
    } catch (error) {
      console.error('S3 connection test error:', error);
      return {
        success: false,
        message: 'S3 connection test failed',
        error: error.message,
        provider: 'aws_s3'
      };
    }
  }

  /**
   * Delete file from S3
   */
  async delete(path) {
    try {
      const key = this._normalizePath(path);
      
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      console.error('S3 delete error:', error);
      throw new Error(`Failed to delete from S3: ${error.message}`);
    }
  }

  /**
   * Check if file exists in S3
   */
  async exists(path) {
    try {
      const key = this._normalizePath(path);
      
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Normalize path by removing leading slashes
   */
  _normalizePath(path) {
    return path.replace(/^\/+/, '');
  }
}

module.exports = S3StorageAdapter;
