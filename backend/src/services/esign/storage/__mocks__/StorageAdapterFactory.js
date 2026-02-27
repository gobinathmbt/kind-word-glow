/**
 * Mock Storage Adapter Factory for testing
 */

const mockAdapter = {
  upload: jest.fn(),
  download: jest.fn(),
  generatePresignedUrl: jest.fn(),
  testConnection: jest.fn(),
  delete: jest.fn(),
  exists: jest.fn(),
};

class StorageAdapterFactory {
  static createAdapter(provider, credentials, settings = {}) {
    return mockAdapter;
  }

  static getSupportedProviders() {
    return [
      {
        id: 'aws_s3',
        name: 'AWS S3',
        description: 'Amazon Web Services S3 storage',
        requiredCredentials: ['access_key_id', 'secret_access_key', 'bucket', 'region']
      }
    ];
  }
}

module.exports = StorageAdapterFactory;
