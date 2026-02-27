const StorageAdapter = require('./StorageAdapter');
const axios = require('axios');
const crypto = require('crypto');

/**
 * SharePoint Storage Adapter
 * 
 * Implements storage operations using Microsoft SharePoint/OneDrive for Business API.
 * Uses Microsoft Graph API for file operations.
 */
class SharePointStorageAdapter extends StorageAdapter {
  constructor(credentials, settings = {}) {
    super(credentials, settings);
    
    // SharePoint requires OAuth2 credentials
    if (!credentials.tenant_id || !credentials.client_id || !credentials.client_secret) {
      throw new Error('SharePoint requires tenant_id, client_id, and client_secret');
    }

    this.tenantId = credentials.tenant_id;
    this.clientId = credentials.client_id;
    this.clientSecret = credentials.client_secret;
    this.siteId = credentials.site_id || settings.site_id;
    this.driveId = credentials.drive_id || settings.drive_id;
    this.folderPath = credentials.folder_path || settings.folder_path || '/esign';

    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Get access token for Microsoft Graph API
   */
  async getAccessToken() {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const tokenUrl = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;
      
      const params = new URLSearchParams();
      params.append('client_id', this.clientId);
      params.append('client_secret', this.clientSecret);
      params.append('scope', 'https://graph.microsoft.com/.default');
      params.append('grant_type', 'client_credentials');

      const response = await axios.post(tokenUrl, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000; // Refresh 1 min before expiry

      return this.accessToken;
    } catch (error) {
      console.error('SharePoint token error:', error.response?.data || error.message);
      throw new Error(`Failed to get SharePoint access token: ${error.message}`);
    }
  }

  /**
   * Upload file to SharePoint
   */
  async upload(buffer, path, options = {}) {
    try {
      const token = await this.getAccessToken();
      const fileName = path.split('/').pop();
      const uploadPath = `${this.folderPath}/${fileName}`.replace(/\/+/g, '/');

      // Construct upload URL
      let uploadUrl;
      if (this.driveId) {
        uploadUrl = `https://graph.microsoft.com/v1.0/drives/${this.driveId}/root:${uploadPath}:/content`;
      } else if (this.siteId) {
        uploadUrl = `https://graph.microsoft.com/v1.0/sites/${this.siteId}/drive/root:${uploadPath}:/content`;
      } else {
        throw new Error('Either drive_id or site_id must be provided');
      }

      const response = await axios.put(uploadUrl, buffer, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': options.contentType || 'application/pdf'
        }
      });

      const file = response.data;

      return {
        success: true,
        url: file.webUrl,
        path: file.id, // Use file ID as path
        provider: 'sharepoint',
        fileId: file.id,
        fileName: file.name,
        size: file.size
      };
    } catch (error) {
      console.error('SharePoint upload error:', error.response?.data || error.message);
      throw new Error(`Failed to upload to SharePoint: ${error.message}`);
    }
  }

  /**
   * Download file from SharePoint
   */
  async download(path) {
    try {
      const token = await this.getAccessToken();
      const fileId = path;

      // Get download URL
      let downloadUrl;
      if (this.driveId) {
        downloadUrl = `https://graph.microsoft.com/v1.0/drives/${this.driveId}/items/${fileId}/content`;
      } else if (this.siteId) {
        downloadUrl = `https://graph.microsoft.com/v1.0/sites/${this.siteId}/drive/items/${fileId}/content`;
      } else {
        throw new Error('Either drive_id or site_id must be provided');
      }

      const response = await axios.get(downloadUrl, {
        headers: { 'Authorization': `Bearer ${token}` },
        responseType: 'arraybuffer'
      });

      return Buffer.from(response.data);
    } catch (error) {
      console.error('SharePoint download error:', error.response?.data || error.message);
      throw new Error(`Failed to download from SharePoint: ${error.message}`);
    }
  }

  /**
   * Generate sharing link for SharePoint file
   */
  async generatePresignedUrl(path, expirySeconds = 3600) {
    try {
      const token = await this.getAccessToken();
      const fileId = path;

      // Create sharing link
      let sharingUrl;
      if (this.driveId) {
        sharingUrl = `https://graph.microsoft.com/v1.0/drives/${this.driveId}/items/${fileId}/createLink`;
      } else if (this.siteId) {
        sharingUrl = `https://graph.microsoft.com/v1.0/sites/${this.siteId}/drive/items/${fileId}/createLink`;
      } else {
        throw new Error('Either drive_id or site_id must be provided');
      }

      const expirationDateTime = new Date(Date.now() + expirySeconds * 1000).toISOString();

      const response = await axios.post(sharingUrl, {
        type: 'view',
        scope: 'anonymous',
        expirationDateTime: expirationDateTime
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data.link.webUrl;
    } catch (error) {
      console.error('SharePoint sharing link error:', error.response?.data || error.message);
      throw new Error(`Failed to generate sharing link: ${error.message}`);
    }
  }

  /**
   * Test SharePoint connection
   */
  async testConnection() {
    try {
      const testFileName = `esign-test-${crypto.randomBytes(8).toString('hex')}.txt`;
      const testContent = Buffer.from('E-sign storage test file');

      // Test write
      const uploadResult = await this.upload(testContent, testFileName, { contentType: 'text/plain' });
      const fileId = uploadResult.fileId;

      // Test read
      const downloaded = await this.download(fileId);
      
      if (downloaded.toString() !== testContent.toString()) {
        throw new Error('Downloaded content does not match uploaded content');
      }

      // Test delete
      await this.delete(fileId);

      return {
        success: true,
        message: 'SharePoint connection test successful',
        provider: 'sharepoint'
      };
    } catch (error) {
      console.error('SharePoint connection test error:', error);
      return {
        success: false,
        message: 'SharePoint connection test failed',
        error: error.message,
        provider: 'sharepoint'
      };
    }
  }

  /**
   * Delete file from SharePoint
   */
  async delete(path) {
    try {
      const token = await this.getAccessToken();
      const fileId = path;

      let deleteUrl;
      if (this.driveId) {
        deleteUrl = `https://graph.microsoft.com/v1.0/drives/${this.driveId}/items/${fileId}`;
      } else if (this.siteId) {
        deleteUrl = `https://graph.microsoft.com/v1.0/sites/${this.siteId}/drive/items/${fileId}`;
      } else {
        throw new Error('Either drive_id or site_id must be provided');
      }

      await axios.delete(deleteUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      return true;
    } catch (error) {
      console.error('SharePoint delete error:', error.response?.data || error.message);
      throw new Error(`Failed to delete from SharePoint: ${error.message}`);
    }
  }

  /**
   * Check if file exists in SharePoint
   */
  async exists(path) {
    try {
      const token = await this.getAccessToken();
      const fileId = path;

      let checkUrl;
      if (this.driveId) {
        checkUrl = `https://graph.microsoft.com/v1.0/drives/${this.driveId}/items/${fileId}`;
      } else if (this.siteId) {
        checkUrl = `https://graph.microsoft.com/v1.0/sites/${this.siteId}/drive/items/${fileId}`;
      } else {
        throw new Error('Either drive_id or site_id must be provided');
      }

      await axios.get(checkUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      return true;
    } catch (error) {
      if (error.response?.status === 404) {
        return false;
      }
      throw error;
    }
  }
}

module.exports = SharePointStorageAdapter;
