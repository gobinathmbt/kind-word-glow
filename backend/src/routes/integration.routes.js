const express = require('express');
const { protect, authorize, companyScopeCheck } = require('../middleware/auth');
const {
  getIntegrations,
  getIntegration,
  createIntegration,
  updateIntegration,
  deleteIntegration,
  toggleIntegrationStatus,
} = require('../controllers/integration.controller');

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);
router.use(authorize('company_super_admin', 'company_admin'));
router.use(companyScopeCheck);

// Integration routes
router.get('/', getIntegrations);
router.get('/:id', getIntegration);
router.post('/', createIntegration);
router.put('/:id', updateIntegration);
router.delete('/:id', deleteIntegration);
router.patch('/:id/status', toggleIntegrationStatus);

module.exports = router;
