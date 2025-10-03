const express = require('express');
const router = express.Router();
const { protect, authorize, companyScopeCheck } = require('../middleware/auth');
const {
  getNotificationConfigurations,
  getNotificationConfiguration,
  createNotificationConfiguration,
  updateNotificationConfiguration,
  deleteNotificationConfiguration,
  toggleNotificationConfigurationStatus,
  getAvailableSchemas,
  getCompanyUsers,
  getCompanyDealerships
} = require('../controllers/notificationConfig.controller');

// Apply auth middleware to all routes
router.use(protect);
router.use(authorize('company_super_admin', 'company_admin'));
router.use(companyScopeCheck);

// Get available schemas and users for configuration
router.get('/schemas', getAvailableSchemas);
router.get('/users', getCompanyUsers);
router.get('/dealerships', getCompanyDealerships);

// CRUD operations for notification configurations
router.get('/', getNotificationConfigurations);
router.get('/:id', getNotificationConfiguration);
router.post('/', createNotificationConfiguration);
router.put('/:id', updateNotificationConfiguration);
router.delete('/:id', deleteNotificationConfiguration);
router.patch('/:id/status', toggleNotificationConfigurationStatus);

module.exports = router;