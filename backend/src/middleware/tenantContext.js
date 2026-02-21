/**
 * Tenant Context Middleware
 * 
 * Attaches database connections and model helper to request object based on user context.
 * Executes after authentication middleware to provide transparent database switching.
 * 
 * Key Features:
 * - Attaches main database connection (req.mainDb) for all requests
 * - Attaches company database connection (req.companyDb) for company users
 * - Provides req.getModel(modelName) helper for automatic model routing
 * - Handles errors: connection failures (500), missing context (400), invalid model (500)
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 7.2, 7.3, 7.4
 */

const connectionManager = require('../config/dbConnectionManager');
const ModelRegistry = require('../models/modelRegistry');
const { getModel } = require('../utils/modelFactory');

/**
 * Tenant Context Middleware
 * 
 * Attaches database connections and model helper to request object.
 * Skips processing for routes that don't have router.use(protect) middleware.
 * 
 * Routes WITHOUT router.use(protect) - Authentication is NOT required:
 * - auth.routes.js (login, registration)
 * - supplierAuth.routes.js (supplier login with custom protectSupplier)
 * - googlemaps.routes.js (public map API)
 * - paymentSettings.routes.js (getGoogleMapsApiKey endpoint)
 * - socketRoutes.js (socket health checks)
 * - supplierDashboard.routes.js (uses custom protectSupplier)
 * - workflowExecution.routes.js (public workflow execution)
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function tenantContext(req, res, next) {
  try {
    // Skip tenant context for unauthenticated requests
    // These routes don't have router.use(protect) or router.use(protectDealership) middleware
    if (!req.user && !req.dealershipUser) {
      return next();
    }

    // Always attach main database connection
    try {
      req.mainDb = connectionManager.getMainConnection();
    } catch (error) {
      console.error('Failed to get main database connection:', error);
      return res.status(500).json({
        success: false,
        message: 'Database connection error'
      });
    }

    // Attach company database connection for company users, suppliers, and dealership users
    req.companyDb = null;
    req.companyId = null; // Track company_id for cleanup
    
    // For regular users: check company_db_name and role
    // For suppliers: just check if company_id exists
    // For dealership users: check if dealershipUser exists with company_id
    const isRegularUser = req.user && req.user.company_db_name && req.user.role !== 'master_admin';
    const isSupplier = req.user && req.user.role === 'supplier' && req.user.company_id;
    const isDealershipUser = req.dealershipUser && req.dealershipUser.company_id;
    
    if (isRegularUser || isSupplier || isDealershipUser) {
      try {
        // Get company_id from appropriate source
        const companyId = req.dealershipUser ? req.dealershipUser.company_id : req.user.company_id;
        
        req.companyDb = await connectionManager.getCompanyConnection(companyId);
        req.companyId = companyId; // Store for later cleanup
        
        // Only log in development mode
        if (process.env.NODE_ENV === 'development') {
          const userType = req.dealershipUser ? 'dealership user' : (isSupplier ? 'supplier' : 'user');
          console.log(`✅ Company database attached for ${userType}, company: ${companyId}`);
        }
      } catch (error) {
        const companyId = req.dealershipUser ? req.dealershipUser.company_id : req.user.company_id;
        console.error(`Failed to get company database connection for company ${companyId}:`, error);
        return res.status(500).json({
          success: false,
          message: 'Database connection error'
        });
      }
    }

    // Add response 'finish' event listener to decrement activeRequests
    res.on('finish', () => {
      if (req.companyId) {
        connectionManager.decrementActiveRequests(req.companyId);
      }
    });

    // Add response 'close' event listener to handle error cases
    // This handles cases where the connection is closed before response finishes
    // (e.g., client disconnects, network errors, timeouts)
    res.on('close', () => {
      if (req.companyId) {
        connectionManager.decrementActiveRequests(req.companyId);
      }
    });

    // Attach req.getModel helper function
    req.getModel = (modelName) => {
      // Validate model name
      if (!modelName || typeof modelName !== 'string') {
        throw new Error('Model name must be a non-empty string');
      }

      // Check if model exists in registry
      if (!ModelRegistry.isRegistered(modelName)) {
        const error = new Error(`Model not found: ${modelName}`);
        error.statusCode = 500;
        throw error;
      }

      // Route to correct database based on model type
      if (ModelRegistry.isMainDbModel(modelName)) {
        // Main DB model - always use main database
        return getModel(modelName, req.mainDb);
      } else if (ModelRegistry.isCompanyDbModel(modelName)) {
        // Company DB model - requires company context
        if (!req.companyDb) {
          const error = new Error('Company context required for this operation');
          error.statusCode = 400;
          throw error;
        }
        return getModel(modelName, req.companyDb);
      } else {
        // Model not categorized (shouldn't happen if registry is correct)
        const error = new Error(`Model not found: ${modelName}`);
        error.statusCode = 500;
        throw error;
      }
    };

    next();
  } catch (error) {
    console.error('Tenant context middleware error:', error);
    
    // Handle specific error types
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }

    // Generic error
    return res.status(500).json({
      success: false,
      message: 'Database connection error'
    });
  }
}

module.exports = tenantContext;
