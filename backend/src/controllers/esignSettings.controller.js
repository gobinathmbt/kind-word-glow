const encryptionService = require('../services/esign/encryption.service');
const auditService = require('../services/esign/audit.service');

/**
 * Create or update provider configuration
 * POST /api/company/esign/settings/providers
 */
const createProvider = async (req, res) => {
  try {
    const EsignProviderConfig = req.getModel('EsignProviderConfig');
    const { provider_type, provider, credentials, settings } = req.body;
    const companyId = req.user.company_id;
    const userId = req.user.id;

    // Validate required fields
    if (!provider_type || !provider || !credentials) {
      return res.status(400).json({
        success: false,
        message: 'provider_type, provider, and credentials are required'
      });
    }

    // Validate provider_type
    const validProviderTypes = ['storage', 'email', 'sms'];
    if (!validProviderTypes.includes(provider_type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid provider_type. Must be one of: ${validProviderTypes.join(', ')}`
      });
    }

    // Validate provider based on type
    const validProviders = {
      storage: ['aws_s3', 'azure_blob', 'google_drive', 'dropbox'],
      email: ['smtp', 'sendgrid', 'mailgun'],
      sms: ['twilio', 'sendgrid_sms', 'aws_sns']
    };

    if (!validProviders[provider_type].includes(provider)) {
      return res.status(400).json({
        success: false,
        message: `Invalid provider for ${provider_type}. Must be one of: ${validProviders[provider_type].join(', ')}`
      });
    }

    // Encrypt credentials
    const encryptedCredentials = encryptionService.encryptCredentials(credentials);

    // Deactivate existing active provider of same type
    await EsignProviderConfig.updateMany(
      { company_id: companyId, provider_type, is_active: true },
      { $set: { is_active: false, updated_by: userId } }
    );

    // Create new provider configuration
    const providerConfig = await EsignProviderConfig.create({
      company_id: companyId,
      provider_type,
      provider,
      credentials: encryptedCredentials,
      settings: settings || {},
      is_active: true,
      created_by: userId
    });

    // Log to audit
    await auditService.logEsignEvent({
      company_id: companyId,
      user_id: userId,
      action: 'provider.created',
      event_type: 'provider.created',
      resource: {
        type: 'provider',
        id: providerConfig._id.toString()
      },
      metadata: {
        provider_type,
        provider
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    // Return masked credentials
    const response = providerConfig.toObject();
    response.credentials = encryptionService.maskCredentials(credentials);

    res.status(201).json({
      success: true,
      data: response,
      message: 'Provider configuration created successfully'
    });
  } catch (error) {
    console.error('Error creating provider configuration:', error);
    
    // Handle unique constraint violation
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'An active provider of this type already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating provider configuration',
      error: error.message
    });
  }
};

/**
 * List all provider configurations
 * GET /api/company/esign/settings/providers
 */
const listProviders = async (req, res) => {
  try {
    const EsignProviderConfig = req.getModel('EsignProviderConfig');
    const companyId = req.user.company_id;
    const { provider_type, is_active } = req.query;

    // Build query
    const query = { company_id: companyId };
    if (provider_type) query.provider_type = provider_type;
    if (is_active !== undefined) query.is_active = is_active === 'true';

    const providers = await EsignProviderConfig.find(query)
      .sort({ provider_type: 1, createdAt: -1 })
      .lean();

    // Mask credentials in all providers
    const maskedProviders = providers.map(provider => {
      if (provider.credentials && provider.credentials.encrypted_data) {
        try {
          const decrypted = encryptionService.decryptCredentials(provider.credentials);
          provider.credentials = encryptionService.maskCredentials(decrypted);
        } catch (error) {
          console.error('Error decrypting credentials:', error);
          provider.credentials = { error: 'Unable to decrypt credentials' };
        }
      }
      return provider;
    });

    res.json({
      success: true,
      data: maskedProviders
    });
  } catch (error) {
    console.error('Error listing provider configurations:', error);
    res.status(500).json({
      success: false,
      message: 'Error listing provider configurations',
      error: error.message
    });
  }
};

/**
 * Get single provider configuration
 * GET /api/company/esign/settings/providers/:id
 */
const getProvider = async (req, res) => {
  try {
    const EsignProviderConfig = req.getModel('EsignProviderConfig');
    const { id } = req.params;
    const companyId = req.user.company_id;

    const provider = await EsignProviderConfig.findOne({
      _id: id,
      company_id: companyId
    }).lean();

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider configuration not found'
      });
    }

    // Mask credentials
    if (provider.credentials && provider.credentials.encrypted_data) {
      try {
        const decrypted = encryptionService.decryptCredentials(provider.credentials);
        provider.credentials = encryptionService.maskCredentials(decrypted);
      } catch (error) {
        console.error('Error decrypting credentials:', error);
        provider.credentials = { error: 'Unable to decrypt credentials' };
      }
    }

    res.json({
      success: true,
      data: provider
    });
  } catch (error) {
    console.error('Error getting provider configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting provider configuration',
      error: error.message
    });
  }
};

/**
 * Update provider configuration
 * PUT /api/company/esign/settings/providers/:id
 */
const updateProvider = async (req, res) => {
  try {
    const EsignProviderConfig = req.getModel('EsignProviderConfig');
    const { id } = req.params;
    const { credentials, settings, is_active } = req.body;
    const companyId = req.user.company_id;
    const userId = req.user.id;

    const provider = await EsignProviderConfig.findOne({
      _id: id,
      company_id: companyId
    });

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider configuration not found'
      });
    }

    // Update fields
    if (credentials) {
      provider.credentials = encryptionService.encryptCredentials(credentials);
    }
    if (settings) {
      provider.settings = settings;
    }
    if (is_active !== undefined) {
      // If activating this provider, deactivate others of same type
      if (is_active) {
        await EsignProviderConfig.updateMany(
          { 
            company_id: companyId, 
            provider_type: provider.provider_type, 
            is_active: true,
            _id: { $ne: id }
          },
          { $set: { is_active: false, updated_by: userId } }
        );
      }
      provider.is_active = is_active;
    }

    provider.updated_by = userId;
    await provider.save();

    // Log to audit
    await auditService.logEsignEvent({
      company_id: companyId,
      user_id: userId,
      action: 'provider.updated',
      event_type: 'provider.updated',
      resource: {
        type: 'provider',
        id: provider._id.toString()
      },
      metadata: {
        provider_type: provider.provider_type,
        provider: provider.provider
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    // Return masked credentials
    const response = provider.toObject();
    if (credentials) {
      response.credentials = encryptionService.maskCredentials(credentials);
    } else if (response.credentials && response.credentials.encrypted_data) {
      const decrypted = encryptionService.decryptCredentials(response.credentials);
      response.credentials = encryptionService.maskCredentials(decrypted);
    }

    res.json({
      success: true,
      data: response,
      message: 'Provider configuration updated successfully'
    });
  } catch (error) {
    console.error('Error updating provider configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating provider configuration',
      error: error.message
    });
  }
};

/**
 * Delete provider configuration
 * DELETE /api/company/esign/settings/providers/:id
 */
const deleteProvider = async (req, res) => {
  try {
    const EsignProviderConfig = req.getModel('EsignProviderConfig');
    const { id } = req.params;
    const companyId = req.user.company_id;
    const userId = req.user.id;

    const provider = await EsignProviderConfig.findOne({
      _id: id,
      company_id: companyId
    });

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider configuration not found'
      });
    }

    await provider.deleteOne();

    // Log to audit
    await auditService.logEsignEvent({
      company_id: companyId,
      user_id: userId,
      action: 'provider.deleted',
      event_type: 'provider.deleted',
      resource: {
        type: 'provider',
        id: id
      },
      metadata: {
        provider_type: provider.provider_type,
        provider: provider.provider
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: 'Provider configuration deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting provider configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting provider configuration',
      error: error.message
    });
  }
};

/**
 * Test provider connection
 * POST /api/company/esign/settings/providers/:id/test
 */
const testProviderConnection = async (req, res) => {
  try {
    const EsignProviderConfig = req.getModel('EsignProviderConfig');
    const { id } = req.params;
    const companyId = req.user.company_id;
    const userId = req.user.id;

    const provider = await EsignProviderConfig.findOne({
      _id: id,
      company_id: companyId
    });

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider configuration not found'
      });
    }

    // Decrypt credentials
    const credentials = encryptionService.decryptCredentials(provider.credentials);

    // Test connection based on provider type
    const startTime = Date.now();
    let testResult;

    try {
      switch (provider.provider_type) {
        case 'storage':
          testResult = await testStorageProvider(provider.provider, credentials, provider.settings);
          break;
        case 'email':
          testResult = await testEmailProvider(provider.provider, credentials, provider.settings, req.user.email);
          break;
        case 'sms':
          testResult = await testSmsProvider(provider.provider, credentials, provider.settings, req.body.phone_number);
          break;
        default:
          throw new Error(`Unsupported provider type: ${provider.provider_type}`);
      }

      const duration = Date.now() - startTime;

      // Update test status
      provider.last_tested_at = new Date();
      provider.last_test_status = testResult.success ? 'success' : 'failed';
      provider.last_test_error = testResult.success ? null : testResult.error;
      await provider.save();

      // Log to audit
      await auditService.logEsignEvent({
        company_id: companyId,
        user_id: userId,
        action: 'provider.tested',
        event_type: 'provider.tested',
        resource: {
          type: 'provider',
          id: provider._id.toString()
        },
        metadata: {
          provider_type: provider.provider_type,
          provider: provider.provider,
          test_result: testResult.success ? 'success' : 'failed',
          duration
        },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.json({
        success: true,
        data: {
          ...testResult,
          duration
        }
      });
    } catch (error) {
      const duration = Date.now() - startTime;

      // Update test status
      provider.last_tested_at = new Date();
      provider.last_test_status = 'failed';
      provider.last_test_error = error.message;
      await provider.save();

      // Log to audit
      await auditService.logEsignEvent({
        company_id: companyId,
        user_id: userId,
        action: 'provider.tested',
        event_type: 'provider.tested',
        resource: {
          type: 'provider',
          id: provider._id.toString()
        },
        metadata: {
          provider_type: provider.provider_type,
          provider: provider.provider,
          test_result: 'failed',
          error: error.message,
          duration
        },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.json({
        success: false,
        data: {
          success: false,
          message: 'Connection test failed',
          error: error.message,
          duration
        }
      });
    }
  } catch (error) {
    console.error('Error testing provider connection:', error);
    res.status(500).json({
      success: false,
      message: 'Error testing provider connection',
      error: error.message
    });
  }
};

/**
 * Test storage provider connection
 */
async function testStorageProvider(provider, credentials, settings) {
  // Import storage adapters dynamically
  const StorageAdapterFactory = require('../services/esign/storage/StorageAdapterFactory');
  
  const adapter = StorageAdapterFactory.createAdapter(provider, credentials, settings);
  return await adapter.testConnection();
}

/**
 * Test email provider connection
 */
async function testEmailProvider(provider, credentials, settings, recipientEmail) {
  // Import notification service
  const notificationService = require('../services/esign/notification.service');
  
  return await notificationService.testEmailProvider(provider, credentials, settings, recipientEmail);
}

/**
 * Test SMS provider connection
 */
async function testSmsProvider(provider, credentials, settings, phoneNumber) {
  if (!phoneNumber) {
    throw new Error('phone_number is required for SMS provider testing');
  }

  // Import notification service
  const notificationService = require('../services/esign/notification.service');
  
  return await notificationService.testSmsProvider(provider, credentials, settings, phoneNumber);
}

module.exports = {
  createProvider,
  listProviders,
  getProvider,
  updateProvider,
  deleteProvider,
  testProviderConnection
};

/**
 * Generate new API key
 * POST /api/company/esign/settings/api-keys
 */
const generateAPIKey = async (req, res) => {
  try {
    const EsignAPIKey = req.getModel('EsignAPIKey');
    const { name, scopes } = req.body;
    const companyId = req.user.company_id;
    const userId = req.user.id;

    // Validate required fields
    if (!name || !scopes || !Array.isArray(scopes) || scopes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'name and scopes (array) are required'
      });
    }

    // Validate scopes
    const validScopes = ['esign:create', 'esign:status', 'esign:download', 'esign:cancel', 'template:read'];
    const invalidScopes = scopes.filter(scope => !validScopes.includes(scope));
    if (invalidScopes.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid scopes: ${invalidScopes.join(', ')}. Valid scopes are: ${validScopes.join(', ')}`
      });
    }

    // Generate unique API key pair using crypto
    const crypto = require('crypto');
    const apiKey = `esign_${crypto.randomBytes(32).toString('hex')}`; // 64 character hex string + prefix
    const apiSecret = crypto.randomBytes(32).toString('hex'); // 64 character hex string

    // Extract key prefix (first 8 characters after prefix)
    const keyPrefix = apiKey.substring(0, 14); // "esign_" + 8 chars

    // Hash the full API key (not just secret) with bcrypt for storage
    const bcrypt = require('bcrypt');
    const hashedSecret = await bcrypt.hash(apiKey, 10);

    // Create API key record
    const apiKeyDoc = await EsignAPIKey.create({
      company_id: companyId,
      name,
      key_prefix: keyPrefix,
      hashed_secret: hashedSecret,
      scopes,
      is_active: true,
      created_by: userId
    });

    // Log to audit
    await auditService.logEsignEvent({
      company_id: companyId,
      user_id: userId,
      action: 'api_key.generated',
      event_type: 'api_key.generated',
      resource: {
        type: 'api_key',
        id: apiKeyDoc._id.toString()
      },
      metadata: {
        name,
        scopes,
        key_prefix: keyPrefix
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    // Return response with plain API key and secret (only shown once)
    res.status(201).json({
      success: true,
      data: {
        id: apiKeyDoc._id,
        name: apiKeyDoc.name,
        api_key: apiKey,
        api_secret: apiSecret,
        key_prefix: keyPrefix,
        scopes: apiKeyDoc.scopes,
        is_active: apiKeyDoc.is_active,
        created_at: apiKeyDoc.createdAt
      },
      message: 'API key generated successfully. Please save the API key and secret securely. They will not be shown again.'
    });
  } catch (error) {
    console.error('Error generating API key:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating API key',
      error: error.message
    });
  }
};

/**
 * List all API keys
 * GET /api/company/esign/settings/api-keys
 */
const listAPIKeys = async (req, res) => {
  try {
    const EsignAPIKey = req.getModel('EsignAPIKey');
    const companyId = req.user.company_id;
    const { is_active } = req.query;

    // Build query
    const query = { company_id: companyId };
    if (is_active !== undefined) query.is_active = is_active === 'true';

    const apiKeys = await EsignAPIKey.find(query)
      .sort({ createdAt: -1 })
      .select('-hashed_secret') // Exclude hashed secret from response
      .lean();

    res.json({
      success: true,
      data: apiKeys
    });
  } catch (error) {
    console.error('Error listing API keys:', error);
    res.status(500).json({
      success: false,
      message: 'Error listing API keys',
      error: error.message
    });
  }
};

/**
 * Revoke API key
 * DELETE /api/company/esign/settings/api-keys/:id
 */
const revokeAPIKey = async (req, res) => {
  try {
    const EsignAPIKey = req.getModel('EsignAPIKey');
    const { id } = req.params;
    const companyId = req.user.company_id;
    const userId = req.user.id;
    const { reason } = req.body;

    const apiKey = await EsignAPIKey.findOne({
      _id: id,
      company_id: companyId
    });

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        message: 'API key not found'
      });
    }

    // Mark as inactive (soft delete)
    apiKey.is_active = false;
    apiKey.revoked_at = new Date();
    apiKey.revoked_by = userId;
    if (reason) {
      apiKey.revoke_reason = reason;
    }
    await apiKey.save();

    // Log to audit
    await auditService.logEsignEvent({
      company_id: companyId,
      user_id: userId,
      action: 'api_key.revoked',
      event_type: 'api_key.revoked',
      resource: {
        type: 'api_key',
        id: apiKey._id.toString()
      },
      metadata: {
        name: apiKey.name,
        key_prefix: apiKey.key_prefix,
        reason: reason || 'No reason provided'
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: 'API key revoked successfully'
    });
  } catch (error) {
    console.error('Error revoking API key:', error);
    res.status(500).json({
      success: false,
      message: 'Error revoking API key',
      error: error.message
    });
  }
};

module.exports = {
  createProvider,
  listProviders,
  getProvider,
  updateProvider,
  deleteProvider,
  testProviderConnection,
  generateAPIKey,
  listAPIKeys,
  revokeAPIKey
};
