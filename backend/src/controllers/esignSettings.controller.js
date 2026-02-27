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
