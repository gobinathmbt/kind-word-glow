const S3StorageAdapter = require('./S3StorageAdapter');
const AzureBlobStorageAdapter = require('./AzureBlobStorageAdapter');
const GoogleDriveStorageAdapter = require('./GoogleDriveStorageAdapter');
const SharePointStorageAdapter = require('./SharePointStorageAdapter');
const DropboxStorageAdapter = require('./DropboxStorageAdapter');

/**
 * Storage Adapter Factory
 * 
 * Creates appropriate storage adapter based on provider type.
 */
class StorageAdapterFactory {
  /**
   * Create storage adapter instance
   * @param {string} provider - Provider name (aws_s3, azure_blob, google_drive, dropbox, sharepoint)
   * @param {Object} credentials - Provider credentials
   * @param {Object} settings - Additional settings
   * @returns {StorageAdapter} Storage adapter instance
   */
  static createAdapter(provider, credentials, settings = {}) {
    switch (provider) {
      case 'aws_s3':
        return new S3StorageAdapter(credentials, settings);
      
      case 'azure_blob':
        return new AzureBlobStorageAdapter(credentials, settings);
      
      case 'google_drive':
        return new GoogleDriveStorageAdapter(credentials, settings);
      
      case 'sharepoint':
        return new SharePointStorageAdapter(credentials, settings);
      
      case 'dropbox':
        return new DropboxStorageAdapter(credentials, settings);
      
      default:
        throw new Error(`Unsupported storage provider: ${provider}`);
    }
  }

  /**
   * Get list of supported storage providers
   * @returns {Array<Object>} List of providers with metadata
   */
  static getSupportedProviders() {
    return [
      {
        id: 'aws_s3',
        name: 'AWS S3',
        description: 'Amazon Web Services S3 storage',
        requiredCredentials: ['access_key_id', 'secret_access_key', 'bucket', 'region']
      },
      {
        id: 'azure_blob',
        name: 'Azure Blob Storage',
        description: 'Microsoft Azure Blob Storage',
        requiredCredentials: ['account_name', 'account_key', 'container_name']
      },
      {
        id: 'google_drive',
        name: 'Google Drive',
        description: 'Google Drive cloud storage',
        requiredCredentials: ['client_email', 'private_key', 'project_id'],
        optionalCredentials: ['folder_id']
      },
      {
        id: 'sharepoint',
        name: 'SharePoint',
        description: 'Microsoft SharePoint/OneDrive for Business',
        requiredCredentials: ['tenant_id', 'client_id', 'client_secret'],
        optionalCredentials: ['site_id', 'drive_id', 'folder_path']
      },
      {
        id: 'dropbox',
        name: 'Dropbox',
        description: 'Dropbox cloud storage',
        requiredCredentials: ['access_token'],
        optionalCredentials: ['folder_path']
      }
    ];
  }
}

module.exports = StorageAdapterFactory;
