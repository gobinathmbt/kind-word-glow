/**
 * Report Controllers Index
 * Central export file for all report controllers
 */

// Vehicle Schema Report Controllers
const vehicleReports = require('./vehicle.report.controller');
const masterVehicleReports = require('./masterVehicle.report.controller');
const advertiseVehicleReports = require('./advertiseVehicle.report.controller');

// Workshop Report Controllers
const workshopQuoteReports = require('./workshopQuote.report.controller');
const workshopReportReports = require('./workshopReport.report.controller');

// Dealership, User, Supplier Report Controllers
const dealershipReports = require('./dealership.report.controller');
const userReports = require('./user.report.controller');
const supplierReports = require('./supplier.report.controller');

// System Configuration Report Controllers
const serviceBayReports = require('./serviceBay.report.controller');
const conversationReports = require('./conversation.report.controller');
const costConfigReports = require('./costConfiguration.report.controller');
const dropdownMasterReports = require('./dropdownMaster.report.controller');
const inspectionConfigReports = require('./inspectionConfig.report.controller');
const tradeinConfigReports = require('./tradeinConfig.report.controller');
const integrationReports = require('./integration.report.controller');
const notificationConfigReports = require('./notificationConfig.report.controller');
const groupPermissionReports = require('./groupPermission.report.controller');
const workflowReports = require('./workflow.report.controller');

module.exports = {
  // Vehicle Schema Reports (22 total endpoints)
  vehicleReports,           // 12 endpoints
  masterVehicleReports,     // 5 endpoints
  advertiseVehicleReports,  // 5 endpoints
  
  // Workshop Reports (20 total endpoints)
  workshopQuoteReports,     // 12 endpoints
  workshopReportReports,    // 8 endpoints
  
  // Business Entity Reports (15 total endpoints)
  dealershipReports,        // 6 endpoints
  userReports,              // 5 endpoints
  supplierReports,          // 4 endpoints
  
  // System Configuration Reports (24 total endpoints)
  serviceBayReports,        // 4 endpoints
  conversationReports,      // 3 endpoints
  costConfigReports,        // 3 endpoints
  dropdownMasterReports,    // 3 endpoints
  inspectionConfigReports,  // 3 endpoints
  tradeinConfigReports,     // 3 endpoints
  integrationReports,       // 3 endpoints
  notificationConfigReports,// 3 endpoints
  groupPermissionReports,   // 2 endpoints
  workflowReports           // 3 endpoints
};
