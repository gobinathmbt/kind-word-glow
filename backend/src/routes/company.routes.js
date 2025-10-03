
const express = require('express');
const { protect, authorize, companyScopeCheck } = require('../middleware/auth');
const {
  // Dashboard endpoints
  getDashboardStats,
  getVehicleStats,
  getInspectionStats,
  getAppraisalStats,
  getUserStats,
  getRevenueStats,
  getActivityStats,
  getPerformanceStats,
  getSystemStats,
  getRecentActivity,
  getCompanyMasterdropdownvalues,
  
  // Settings endpoints
  getS3Config,
  getCallbackConfig,
  getBillingInfo,
  
  // User management
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  sendWelcomeEmail,
  
  // Settings actions
  updateS3Config,
  updateCallbackConfig,
  testS3Connection,
  testWebhook
} = require('../controllers/company.controller');

const {
  getAvailablePermissions,
  getUserPermissions,
  updateUserPermissions,
  getUserModules,
  updateUserModules,
  getUsersWithPermissions
} = require('../controllers/userPermission.controller');

const { 
  createController, 
  modifyController, 
  retrieveController 
} = require('../controllers/vehicleMetadata.controller');

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);
router.use(authorize('company_super_admin', 'company_admin'));
router.use(companyScopeCheck);

// Dealership routes (only super admin)
router.use('/dealerships', authorize('company_super_admin'), require('./dealership.routes'));

// Dashboard routes
router.get('/dashboard/stats', getDashboardStats);
router.get('/dashboard/vehicles', getVehicleStats);
router.get('/dashboard/inspections', getInspectionStats);
router.get('/dashboard/appraisals', getAppraisalStats);
router.get('/dashboard/users', getUserStats);
router.get('/dashboard/revenue', getRevenueStats);
router.get('/dashboard/activity', getActivityStats);
router.get('/dashboard/performance', getPerformanceStats);
router.get('/dashboard/system', getSystemStats);
router.get('/dashboard/recent-activity', getRecentActivity);

// User management routes (only super admin)
router.get('/users', authorize('company_super_admin'), getUsers);
router.post('/users', authorize('company_super_admin'), createUser);
router.put('/users/:id', authorize('company_super_admin'), updateUser);
router.delete('/users/:id', authorize('company_super_admin'), deleteUser);
router.patch('/users/:id/status', authorize('company_super_admin'), toggleUserStatus);
router.post('/users/:id/send-welcome', authorize('company_super_admin'), sendWelcomeEmail);

// Permission management routes (only super admin)
router.get('/permissions/available', authorize('company_super_admin'), getAvailablePermissions);
router.get('/users-permissions', authorize('company_super_admin'), getUsersWithPermissions);
router.get('/users/:userId/permissions', authorize('company_super_admin'), getUserPermissions);
router.put('/users/:userId/permissions', authorize('company_super_admin'), updateUserPermissions);

// Module management routes (only super admin)
router.get('/users/:userId/modules', authorize('company_super_admin'), getUserModules);
router.put('/users/:userId/modules', authorize('company_super_admin'), updateUserModules);

// Settings routes (only super admin)
router.get('/settings/s3', authorize('company_super_admin','company_admin'), getS3Config);
router.get('/settings/callback', authorize('company_super_admin'), getCallbackConfig);
router.get('/settings/billing', authorize('company_super_admin'), getBillingInfo);
router.put('/settings/s3', authorize('company_super_admin'), updateS3Config);
router.put('/settings/callback', authorize('company_super_admin'), updateCallbackConfig);
router.post('/settings/test-s3', authorize('company_super_admin'), testS3Connection);
router.post('/settings/test-webhook', authorize('company_super_admin'), testWebhook);

router.post('/create/:type', authorize('company_super_admin' , 'company_admin'), createController.create);


router.post('/company_dropdowns/dropdowns/dropdown_values', authorize('company_super_admin','company_admin'), getCompanyMasterdropdownvalues);

router.use('/company/dropdowns', authorize('company_super_admin'), require('./master.dropdown.routes'));
router.get('/company/meta-data', authorize('company_super_admin'), retrieveController.dropdown);


module.exports = router;
