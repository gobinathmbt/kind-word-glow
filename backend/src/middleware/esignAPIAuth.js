const bcrypt = require('bcryptjs');

/**
 * E-Sign API Authentication Middleware
 * 
 * Validates API keys for external API requests
 * Attaches company and API key information to request object
 */

/**
 * Authenticate API key from request header
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const esignAPIAuth = async (req, res, next) => {
  try {
    // Get API key from header
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API key required',
        message: 'Please provide an API key in the x-api-key header',
      });
    }
    
    // Extract key prefix (first 8 characters)
    const keyPrefix = apiKey.substring(0, 8);
    
    // Find API key in database
    // Note: API keys are stored in company databases, so we need to search across companies
    // For now, we'll use a simplified approach - in production, consider storing API keys
    // in the main database with company_id reference for faster lookup
    
    const Company = require('../models/Company');
    const { getCompanyConnection } = require('../config/dbConnectionManager');
    
    // Get all active companies
    const companies = await Company.find({ is_active: true }).select('_id db_name');
    
    let apiKeyDoc = null;
    let companyId = null;
    let companyConnection = null;
    
    // Search for API key across company databases
    for (const company of companies) {
      try {
        const conn = await getCompanyConnection(company._id);
        const EsignAPIKey = conn.model('EsignAPIKey');
        
        const foundKey = await EsignAPIKey.findOne({
          key_prefix: keyPrefix,
          is_active: true,
        });
        
        if (foundKey) {
          // Verify full API key using bcrypt
          const isValid = await bcrypt.compare(apiKey, foundKey.hashed_secret);
          
          if (isValid) {
            apiKeyDoc = foundKey;
            companyId = company._id;
            companyConnection = conn;
            break;
          }
        }
      } catch (error) {
        console.error(`Error checking API key in company ${company._id}:`, error);
        // Continue to next company
      }
    }
    
    if (!apiKeyDoc) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key',
        message: 'The provided API key is invalid or has been revoked',
      });
    }
    
    // Update last used timestamp and usage count
    apiKeyDoc.last_used_at = new Date();
    apiKeyDoc.usage_count = (apiKeyDoc.usage_count || 0) + 1;
    await apiKeyDoc.save();
    
    // Attach company and API key to request
    req.company_id = companyId;
    req.api_key = apiKeyDoc;
    req.companyConnection = companyConnection;
    
    // Helper function to get models from company connection
    req.getModel = (modelName) => {
      return companyConnection.model(modelName);
    };
    
    next();
  } catch (error) {
    console.error('API authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
      message: 'An error occurred during authentication',
    });
  }
};

/**
 * Check if API key has required scope
 * @param {string|Array<string>} requiredScopes - Required scope(s)
 * @returns {Function} Middleware function
 */
const requireScope = (requiredScopes) => {
  return (req, res, next) => {
    if (!req.api_key) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'API key authentication required',
      });
    }
    
    const scopes = Array.isArray(requiredScopes) ? requiredScopes : [requiredScopes];
    const apiKeyScopes = req.api_key.scopes || [];
    
    // Check if API key has at least one of the required scopes
    const hasScope = scopes.some(scope => apiKeyScopes.includes(scope));
    
    if (!hasScope) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: `This operation requires one of the following scopes: ${scopes.join(', ')}`,
        required_scopes: scopes,
        api_key_scopes: apiKeyScopes,
      });
    }
    
    next();
  };
};

module.exports = {
  esignAPIAuth,
  requireScope,
};
