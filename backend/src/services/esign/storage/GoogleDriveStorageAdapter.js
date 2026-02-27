const StorageAdapter = require('./StorageAdapter');
const { google } = require('googleapis');
const crypto = require('crypto');
const stream = require('stream');

/**
 * Google Drive Storage Adapter
 * 
 * Implements storage operations using Google Drive API.
 */
class GoogleDriveStorageAdapter extends StorageAdapter {
  constructor(credentials, settings = {}) {
    super(credentials, settings);
    
    // Google Drive requires OAuth2 credentials or service account
    if (credentials.type === 'service_account') {
      // Service account authentication
      this.auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: credentials.client_email,
          private_key: credentials.private_key,
          project_id: credentials.project_id
        },
        scopes: ['https://www.googleapis.com/auth/drive.file']
      });
    } else if (credentials.refresh_token) {
      // OAuth2 authentication
      const oauth2Client = new google.auth.OAuth2(
        credentials.client_id,
        credentials.client_secret,
        credentials.redirect_uri
      );
      oauth2Client.setCredentials({
        refresh_token: credentials.refresh_token
      });
      this.auth = oauth2Client;
    } else {
      throw new Error('Google Drive requires either service_account credentials or OAuth2 refresh_token');
    }

    this.drive = google.drive({ version: 'v3', auth: this.auth });
    this.folderId = credentials.folder_id || settings.folder_id; // Optional parent folder
  }

  /**
   * Upload file to Google Drive
   */
  async upload(buffer, path, options = {}) {
    try {
      const fileName = path.split('/').pop();
      
      const fileMetadata = {
        name: fileName,
        parents: this.folderId ? [this.folderId] : undefined
      };

      const media = {
        mimeType: options.contentType || 'application/pdf',
        body: stream.Readable.from(buffer)
      };

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink, webContentLink, size'
      });

      const file = response.data;

      return {
        success: true,
        url: file.webContentLink || file.webViewLink,
        path: file.id, // Google Drive uses file ID as path
        provider: 'google_drive',
        fileId: file.id,
        fileName: file.name,
        size: parseInt(file.size || buffer.length)
      };
    } catch (error) {
      console.error('Google Drive upload error:', error);
      throw new Error(`Failed to upload to Google Drive: ${error.message}`);
    }
  }

  /**
   * Download file from Google Drive
   */
  async download(path) {
    try {
      // Path is the file ID in Google Drive
      const fileId = path;
      
      const response = await this.drive.files.get(
        { fileId: fileId, alt: 'media' },
        { responseType: 'arraybuffer' }
      );

      return Buffer.from(response.data);
    } catch (error) {
      console.error('Google Drive download error:', error);
      throw new Error(`Failed to download from Google Drive: ${error.message}`);
    }
  }

  /**
   * Generate shareable link for Google Drive file
   */
  async generatePresignedUrl(path, expirySeconds = 3600) {
    try {
      const fileId = path;

      // Make file accessible via link
      await this.drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        }
      });

      // Get file metadata with webContentLink
      const response = await this.drive.files.get({
        fileId: fileId,
        fields: 'webContentLink, webViewLink'
      });

      // Note: Google Drive links don't expire by default
      // For temporary access, you would need to implement a cleanup job
      // or use a different sharing mechanism
      return response.data.webContentLink || response.data.webViewLink;
    } catch (error) {
      console.error('Google Drive presigned URL error:', error);
      throw new Error(`Failed to generate shareable link: ${error.message}`);
    }
  }

  /**
   * Test Google Drive connection
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
        message: 'Google Drive connection test successful',
        provider: 'google_drive'
      };
    } catch (error) {
      console.error('Google Drive connection test error:', error);
      return {
        success: false,
        message: 'Google Drive connection test failed',
        error: error.message,
        provider: 'google_drive'
      };
    }
  }

  /**
   * Delete file from Google Drive
   */
  async delete(path) {
    try {
      const fileId = path;
      
      await this.drive.files.delete({
        fileId: fileId
      });

      return true;
    } catch (error) {
      console.error('Google Drive delete error:', error);
      throw new Error(`Failed to delete from Google Drive: ${error.message}`);
    }
  }

  /**
   * Check if file exists in Google Drive
   */
  async exists(path) {
    try {
      const fileId = path;
      
      await this.drive.files.get({
        fileId: fileId,
        fields: 'id'
      });

      return true;
    } catch (error) {
      if (error.code === 404) {
        return false;
      }
      throw error;
    }
  }
}

module.exports = GoogleDriveStorageAdapter;
