const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const tenantContext = require('../middleware/tenantContext');
const { checkModuleAccess } = require('../middleware/moduleAccess');
const esignSettingsController = require('../controllers/esignSettings.controller');

// Apply middleware to all routes
router.use(protect);
router.use(tenantContext);
router.use(checkModuleAccess('esign_documents'));

// Provider Configuration Routes
router.post('/providers', 
  authorize('company_super_admin'), 
  esignSettingsController.createProvider
);

router.get('/providers', 
  esignSettingsController.listProviders
);

router.get('/providers/:id', 
  esignSettingsController.getProvider
);

router.put('/providers/:id', 
  authorize('company_super_admin'), 
  esignSettingsController.updateProvider
);

router.delete('/providers/:id', 
  authorize('company_super_admin'), 
  esignSettingsController.deleteProvider
);

router.post('/providers/:id/test', 
  esignSettingsController.testProviderConnection
);

module.exports = router;
