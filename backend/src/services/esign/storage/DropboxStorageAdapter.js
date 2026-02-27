const StorageAdapter = require('./StorageAdapter');
const { Dropbox } = require('dropbox');
const crypto = require('crypto');

/**
 * Dropbox Storage Adapter
 * 
 * Implements storage operations using Dropbox API.
 */
class DropboxStorageAdapter extends StorageAdapter {
  constructor(credentials, settings = {}) {
    super(credentials, settings);
    
    if (!credentials.access_token) {
      throw new Error('Dropbox requires access_token');
    }

    this.dbx = new Dropbox({
      accessToken: credentials.access_token
    });

    this.folderPath = credentials.folder_path || settings.folder_path || '/esign';
  }

  /**
   * Upload file to Dropbox
   */
  async upload(buffer, path, options = {}) {
    try {
      const fileName = path.split('/').pop();
      const dropboxPath = `${this.folderPath}/${fileName}`.replace(/\/+/g, '/');

      const response = await this.dbx.filesUpload({
        path: dropboxPath,
        contents: buffer,
        mode: 'overwrite',
        autorename: false,
        mute: false
      });

      return {
        success: true,
        url: null, // Dropbox doesn't provide direct URL in upload response
        path: response.result.path_display,
        provider: 'dropbox',
        fileId: response.result.id,
        fileName: response.result.name,
        size: response.result.size
      };
    } catch (error) {
      console.error('Dropbox upload error:', error);
      throw new Error(`Failed to upload to Dropbox: ${error.message}`);
    }
  }

  /**
   * Download file from Dropbox
   */
  async download(path) {
    try {
      const response = await this.dbx.filesDownload({ path: path });
      
      // The file content is in response.result.fileBinary
      return Buffer.from(response.result.fileBinary);
    } catch (error) {
      console.error('Dropbox download error:', error);
      throw new Error(`Failed to download from Dropbox: ${error.message}`);
    }
  }

  /**
   * Generate temporary link for Dropbox file
   */
  async generatePresignedUrl(path, expirySeconds = 3600) {
    try {
      // Dropbox temporary links expire after 4 hours by default
      const response = await this.dbx.filesGetTemporaryLink({ path: path });
      
      return response.result.link;
    } catch (error) {
      console.error('Dropbox temporary link error:', error);
      throw new Error(`Failed to generate temporary link: ${error.message}`);
    }
  }

  /**
   * Test Dropbox connection
   */
  async testConnection() {
    try {
      const testFileName = `esign-test-${crypto.randomBytes(8).toString('hex')}.txt`;
      const testPath = `${this.folderPath}/${testFileName}`.replace(/\/+/g, '/');
      const testContent = Buffer.from('E-sign storage test file');

      // Test write
      await this.upload(testContent, testFileName, { contentType: 'text/plain' });

      // Test read
      const downloaded = await this.download(testPath);
      
      if (downloaded.toString() !== testContent.toString()) {
        throw new Error('Downloaded content does not match uploaded content');
      }

      // Test delete
      await this.delete(testPath);

      return {
        success: true,
        message: 'Dropbox connection test successful',
        provider: 'dropbox'
      };
    } catch (error) {
      console.error('Dropbox connection test error:', error);
      return {
        success: false,
        message: 'Dropbox connection test failed',
        error: error.message,
        provider: 'dropbox'
      };
    }
  }

  /**
   * Delete file from Dropbox
   */
  async delete(path) {
    try {
      await this.dbx.filesDeleteV2({ path: path });
      return true;
    } catch (error) {
      console.error('Dropbox delete error:', error);
      throw new Error(`Failed to delete from Dropbox: ${error.message}`);
    }
  }

  /**
   * Check if file exists in Dropbox
   */
  async exists(path) {
    try {
      await this.dbx.filesGetMetadata({ path: path });
      return true;
    } catch (error) {
      if (error.status === 409) { // Path not found
        return false;
      }
      throw error;
    }
  }
}

module.exports = DropboxStorageAdapter;
