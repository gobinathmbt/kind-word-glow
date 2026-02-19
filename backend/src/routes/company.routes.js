const express = require('express');
const { protect, authorize, companyScopeCheck } = require('../middleware/auth');
const tenantContext = require('../middleware/tenantContext');
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
  testWebhook,

  // Company info
  getCompanyInfo,
  updateCompanyInfo,
  updateCompanyPassword
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
  getGroupPermissions,
  getGroupPermission,
  createGroupPermission,
  updateGroupPermission,
  deleteGroupPermission,
  assignGroupPermissionToUser
} = require('../controllers/groupPermission.controller');

const {
  createController,
  modifyController,
  retrieveController
} = require('../controllers/vehicleMetadata.controller');

// Import all report controllers
const vehicleReports = require('../controllers/reports/vehicle.report.controller');
const workshopQuoteReports = require('../controllers/reports/workshopQuote.report.controller');
const workshopReportReports = require('../controllers/reports/workshopReport.report.controller');
const dealershipReports = require('../controllers/reports/dealership.report.controller');
const userReports = require('../controllers/reports/user.report.controller');
const supplierReports = require('../controllers/reports/supplier.report.controller');
const serviceBayReports = require('../controllers/reports/serviceBay.report.controller');
const conversationReports = require('../controllers/reports/conversation.report.controller');
const costConfigReports = require('../controllers/reports/costConfiguration.report.controller');
const dropdownMasterReports = require('../controllers/reports/dropdownMaster.report.controller');
const inspectionConfigReports = require('../controllers/reports/inspectionConfig.report.controller');
const tradeinConfigReports = require('../controllers/reports/tradeinConfig.report.controller');
const integrationReports = require('../controllers/reports/integration.report.controller');
const notificationConfigReports = require('../controllers/reports/notificationConfig.report.controller');
const groupPermissionReports = require('../controllers/reports/groupPermission.report.controller');
const workflowReports = require('../controllers/reports/workflow.report.controller');

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);
router.use(authorize('company_super_admin', 'company_admin'));
router.use(companyScopeCheck);
router.use(tenantContext);

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

// Group Permission routes (only super admin)
router.get('/group-permissions', authorize('company_super_admin'), getGroupPermissions);
router.get('/group-permissions/:id', authorize('company_super_admin'), getGroupPermission);
router.post('/group-permissions', authorize('company_super_admin'), createGroupPermission);
router.put('/group-permissions/:id', authorize('company_super_admin'), updateGroupPermission);
router.delete('/group-permissions/:id', authorize('company_super_admin'), deleteGroupPermission);
router.put('/users/:userId/group-permission', authorize('company_super_admin'), assignGroupPermissionToUser);

// Settings routes (only super admin)
router.get('/settings/s3', authorize('company_super_admin', 'company_admin'), getS3Config);
router.get('/settings/callback', authorize('company_super_admin'), getCallbackConfig);
router.get('/settings/billing', authorize('company_super_admin'), getBillingInfo);
router.put('/settings/s3', authorize('company_super_admin'), updateS3Config);
router.put('/settings/callback', authorize('company_super_admin'), updateCallbackConfig);
router.post('/settings/test-s3', authorize('company_super_admin'), testS3Connection);
router.post('/settings/test-webhook', authorize('company_super_admin'), testWebhook);

// Company info routes (only super admin)
router.get('/info', authorize('company_super_admin'), getCompanyInfo);
router.put('/info', authorize('company_super_admin'), updateCompanyInfo);
router.put('/password', authorize('company_super_admin'), updateCompanyPassword);

router.post('/create/:type', authorize('company_super_admin', 'company_admin'), createController.create);

router.post('/company_dropdowns/dropdowns/dropdown_values', authorize('company_super_admin', 'company_admin'), getCompanyMasterdropdownvalues);

router.use('/company/dropdowns', authorize('company_super_admin'), require('./master.dropdown.routes'));
router.get('/company/meta-data', authorize('company_super_admin'), retrieveController.dropdown);

// ============================================================================
// ANALYTICS REPORT ROUTES (77 endpoints across 18 schemas)
// ============================================================================

// Vehicle Reports (12 endpoints)
router.get('/reports/vehicle/overview-by-type', vehicleReports.getVehicleOverviewByType);
router.get('/reports/vehicle/pricing-analysis', vehicleReports.getVehiclePricingAnalysis);
router.get('/reports/vehicle/status-distribution', vehicleReports.getVehicleStatusDistribution);
router.get('/reports/vehicle/workshop-integration', vehicleReports.getVehicleWorkshopIntegration);
router.get('/reports/vehicle/attachment-analysis', vehicleReports.getVehicleAttachmentAnalysis);
router.get('/reports/vehicle/registration-compliance', vehicleReports.getVehicleRegistrationCompliance);
router.get('/reports/vehicle/import-timeline', vehicleReports.getVehicleImportTimeline);
router.get('/reports/vehicle/engine-specifications', vehicleReports.getVehicleEngineSpecifications);
router.get('/reports/vehicle/odometer-trends', vehicleReports.getVehicleOdometerTrends);
router.get('/reports/vehicle/ownership-history', vehicleReports.getVehicleOwnershipHistory);
router.get('/reports/vehicle/queue-processing', vehicleReports.getVehicleQueueProcessing);
router.get('/reports/vehicle/cost-details', vehicleReports.getVehicleCostDetails);

// WorkshopQuote Reports (12 endpoints)
router.get('/reports/workshop-quote/overview-by-status', workshopQuoteReports.getQuoteOverviewByStatus);
router.get('/reports/workshop-quote/lifecycle-analysis', workshopQuoteReports.getQuoteLifecycleAnalysis);
router.get('/reports/workshop-quote/supplier-performance', workshopQuoteReports.getQuoteSupplierPerformance);
router.get('/reports/workshop-quote/cost-analysis', workshopQuoteReports.getQuoteCostAnalysis);
router.get('/reports/workshop-quote/approval-rates', workshopQuoteReports.getQuoteApprovalRates);
router.get('/reports/workshop-quote/response-time-analysis', workshopQuoteReports.getQuoteResponseTimeAnalysis);
router.get('/reports/workshop-quote/type-distribution', workshopQuoteReports.getQuoteTypeDistribution);
router.get('/reports/workshop-quote/bay-booking-analysis', workshopQuoteReports.getQuoteBayBookingAnalysis);
router.get('/reports/workshop-quote/work-entry-analysis', workshopQuoteReports.getQuoteWorkEntryAnalysis);
router.get('/reports/workshop-quote/invoice-accuracy', workshopQuoteReports.getQuoteInvoiceAccuracy);
router.get('/reports/workshop-quote/rework-patterns', workshopQuoteReports.getQuoteReworkPatterns);
router.get('/reports/workshop-quote/conversation-metrics', workshopQuoteReports.getQuoteConversationMetrics);

// WorkshopReport Reports (8 endpoints)
router.get('/reports/workshop-report/overview', workshopReportReports.getWorkshopReportOverview);
router.get('/reports/workshop-report/cost-breakdown', workshopReportReports.getWorkshopCostBreakdown);
router.get('/reports/workshop-report/quality-metrics', workshopReportReports.getWorkshopQualityMetrics);
router.get('/reports/workshop-report/technician-performance', workshopReportReports.getWorkshopTechnicianPerformance);
router.get('/reports/workshop-report/supplier-scorecard', workshopReportReports.getWorkshopSupplierScorecard);
router.get('/reports/workshop-report/warranty-tracking', workshopReportReports.getWorkshopWarrantyTracking);
router.get('/reports/workshop-report/completion-time-analysis', workshopReportReports.getWorkshopCompletionTimeAnalysis);
router.get('/reports/workshop-report/revenue-analysis', workshopReportReports.getWorkshopRevenueAnalysis);

// Dealership Reports (6 endpoints)
router.get('/reports/dealership/overview', dealershipReports.getDealershipOverview);
router.get('/reports/dealership/vehicle-distribution', dealershipReports.getDealershipVehicleDistribution);
router.get('/reports/dealership/workshop-performance', dealershipReports.getDealershipWorkshopPerformance);
router.get('/reports/dealership/user-activity', dealershipReports.getDealershipUserActivity);
router.get('/reports/dealership/revenue-comparison', dealershipReports.getDealershipRevenueComparison);
router.get('/reports/dealership/service-bay-utilization', dealershipReports.getDealershipServiceBayUtilization);

// User Reports (5 endpoints)
router.get('/reports/user/performance-metrics', userReports.getUserPerformanceMetrics);
router.get('/reports/user/login-patterns', userReports.getUserLoginPatterns);
router.get('/reports/user/role-distribution', userReports.getUserRoleDistribution);
router.get('/reports/user/dealership-assignment', userReports.getUserDealershipAssignment);
router.get('/reports/user/permission-utilization', userReports.getUserPermissionUtilization);

// Supplier Reports (4 endpoints)
router.get('/reports/supplier/overview', supplierReports.getSupplierOverview);
router.get('/reports/supplier/performance-ranking', supplierReports.getSupplierPerformanceRanking);
router.get('/reports/supplier/tag-analysis', supplierReports.getSupplierTagAnalysis);
router.get('/reports/supplier/relationship-metrics', supplierReports.getSupplierRelationshipMetrics);

// ServiceBay Reports (4 endpoints)
router.get('/reports/service-bay/utilization', serviceBayReports.getServiceBayUtilization);
router.get('/reports/service-bay/booking-patterns', serviceBayReports.getServiceBayBookingPatterns);
router.get('/reports/service-bay/user-assignment', serviceBayReports.getServiceBayUserAssignment);
router.get('/reports/service-bay/holiday-impact', serviceBayReports.getServiceBayHolidayImpact);

// Conversation Reports (3 endpoints)
router.get('/reports/conversation/volume-analysis', conversationReports.getConversationVolumeAnalysis);
router.get('/reports/conversation/response-times', conversationReports.getConversationResponseTimes);
router.get('/reports/conversation/engagement-metrics', conversationReports.getConversationEngagementMetrics);

// CostConfiguration Reports (3 endpoints)
router.get('/reports/cost-configuration/type-utilization', costConfigReports.getCostTypeUtilization);
router.get('/reports/cost-configuration/setter-effectiveness', costConfigReports.getCostSetterEffectiveness);
router.get('/reports/cost-configuration/currency-distribution', costConfigReports.getCostCurrencyDistribution);

// DropdownMaster Reports (3 endpoints)
router.get('/reports/dropdown-master/usage-analysis', dropdownMasterReports.getDropdownUsageAnalysis);
router.get('/reports/dropdown-master/value-distribution', dropdownMasterReports.getDropdownValueDistribution);
router.get('/reports/dropdown-master/configuration-health', dropdownMasterReports.getDropdownConfigurationHealth);

// InspectionConfig Reports (3 endpoints)
router.get('/reports/inspection-config/usage', inspectionConfigReports.getInspectionConfigUsage);
router.get('/reports/inspection-config/field-analysis', inspectionConfigReports.getInspectionFieldAnalysis);
router.get('/reports/inspection-config/category-effectiveness', inspectionConfigReports.getInspectionCategoryEffectiveness);

// TradeinConfig Reports (3 endpoints)
router.get('/reports/tradein-config/usage', tradeinConfigReports.getTradeinConfigUsage);
router.get('/reports/tradein-config/field-analysis', tradeinConfigReports.getTradeinFieldAnalysis);
router.get('/reports/tradein-config/category-effectiveness', tradeinConfigReports.getTradeinCategoryEffectiveness);

// Integration Reports (3 endpoints)
router.get('/reports/integration/status-overview', integrationReports.getIntegrationStatusOverview);
router.get('/reports/integration/environment-usage', integrationReports.getIntegrationEnvironmentUsage);
router.get('/reports/integration/type-distribution', integrationReports.getIntegrationTypeDistribution);

// NotificationConfiguration Reports (3 endpoints)
router.get('/reports/notification-config/engagement-metrics', notificationConfigReports.getNotificationEngagementMetrics);
router.get('/reports/notification-config/trigger-analysis', notificationConfigReports.getNotificationTriggerAnalysis);
router.get('/reports/notification-config/channel-performance', notificationConfigReports.getNotificationChannelPerformance);

// GroupPermission Reports (2 endpoints)
router.get('/reports/group-permission/usage', groupPermissionReports.getGroupPermissionUsage);
router.get('/reports/group-permission/effectiveness', groupPermissionReports.getGroupPermissionEffectiveness);

// Workflow Reports (3 endpoints)
router.get('/reports/workflow/execution-metrics', workflowReports.getWorkflowExecutionMetrics);
router.get('/reports/workflow/type-distribution', workflowReports.getWorkflowTypeDistribution);
router.get('/reports/workflow/success-rates', workflowReports.getWorkflowSuccessRates);

module.exports = router;