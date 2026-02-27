const express = require('express');
const router = express.Router();
const esignKioskController = require('../controllers/esignKiosk.controller');
const connectionManager = require('../config/dbConnectionManager');
const { getModel } = require('../utils/modelFactory');
const ModelRegistry = require('../models/modelRegistry');

/**
 * Kiosk E-Sign Routes
 * Routes for in-person signing at kiosk locations
 * Routes are prefixed with /api/esign/kiosk
 */

// Custom tenant context middleware for kiosk routes
const kioskTenantContext = async (req, res, next) => {
  try {
    // Always attach main database connection
    req.mainDb = connectionManager.getMainConnection();
    
    // Extract company from token
    const { token } = req.params;
    
    if (token) {
      // Decode token to get company ID
      const tokenService = require('../services/esign/token.service');
      const decoded = tokenService.decodeToken(token);
      
      if (decoded && decoded.companyId) {
        // Get company database connection
        req.companyDb = await connectionManager.getCompanyConnection(decoded.companyId);
        req.companyId = decoded.companyId;
      }
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
    console.error('Kiosk tenant context error:', error);
    return res.status(500).json({
      success: false,
      message: 'Database connection error'
    });
  }
};

// Apply custom tenant context middleware
router.use(kioskTenantContext);

// Access kiosk signing page
router.get('/:token', esignKioskController.accessKioskPage);

// Authenticate host
router.post('/:token/authenticate-host', esignKioskController.authenticateHost);

// Capture signer photo
router.post('/:token/capture-photo', esignKioskController.capturePhoto);

// Submit in-person signature
router.post('/:token/submit', esignKioskController.submitKioskSignature);

module.exports = router;
