const express = require('express');
const router = express.Router();
const esignPublicController = require('../controllers/esignPublic.controller');
const connectionManager = require('../config/dbConnectionManager');
const { getModel } = require('../utils/modelFactory');
const ModelRegistry = require('../models/modelRegistry');

/**
 * Public E-Sign Routes
 * No authentication middleware - public access via token
 * Routes are prefixed with /api/esign/public
 * 
 * Custom tenant context for public routes that extracts company from token
 */

// Custom tenant context middleware for public routes
const publicTenantContext = async (req, res, next) => {
  try {
    // Always attach main database connection
    req.mainDb = connectionManager.getMainConnection();
    
    // Extract company from token
    const { token, shortCode } = req.params;
    
    if (token) {
      // Decode token to get company ID
      const tokenService = require('../services/esign/token.service');
      const decoded = tokenService.decodeToken(token);
      
      if (decoded && decoded.companyId) {
        // Get company database connection
        req.companyDb = await connectionManager.getCompanyConnection(decoded.companyId);
        req.companyId = decoded.companyId;
      }
    } else if (shortCode) {
      // For short links, we need to look up the short code first
      // We'll handle this in the controller since we need to query the database
      // For now, just set up the main DB
    }
    
    // Attach req.getModel helper function
    req.getModel = (modelName) => {
      if (!modelName || typeof modelName !== 'string') {
        throw new Error('Model name must be a non-empty string');
      }

      if (!ModelRegistry.isRegistered(modelName)) {
        throw new Error(`Model not found: ${modelName}`);
      }

      if (ModelRegistry.isMainDbModel(modelName)) {
        return getModel(modelName, req.mainDb);
      } else if (ModelRegistry.isCompanyDbModel(modelName)) {
        if (!req.companyDb) {
          throw new Error('Company context required for this operation');
        }
        return getModel(modelName, req.companyDb);
      } else {
        throw new Error(`Model not found: ${modelName}`);
      }
    };
    
    // Add response 'finish' event listener to decrement activeRequests
    res.on('finish', () => {
      if (req.companyId) {
        connectionManager.decrementActiveRequests(req.companyId);
      }
    });

    // Add response 'close' event listener to handle error cases
    res.on('close', () => {
      if (req.companyId) {
        connectionManager.decrementActiveRequests(req.companyId);
      }
    });
    
    next();
  } catch (error) {
    console.error('Public tenant context error:', error);
    return res.status(500).json({
      success: false,
      message: 'Database connection error'
    });
  }
};

// Apply custom tenant context middleware
router.use(publicTenantContext);

// Access signing page
router.get('/sign/:token', esignPublicController.accessSigningPage);

// Send OTP for MFA
router.post('/sign/:token/send-otp', esignPublicController.sendOTP);

// Verify OTP
router.post('/sign/:token/verify-otp', esignPublicController.verifyOTP);

// Submit signature
router.post('/sign/:token/submit', esignPublicController.submitSignature);

// Decline signature
router.post('/sign/:token/decline', esignPublicController.declineSignature);

// Delegate signing
router.post('/sign/:token/delegate', esignPublicController.delegateSigning);

// Mark scroll completion
router.get('/sign/:token/scroll-complete', esignPublicController.markScrollComplete);

// Short link redirect
router.get('/s/:shortCode', esignPublicController.shortLinkRedirect);

module.exports = router;
