/**
 * Model Loader
 * 
 * Imports all models to trigger their registration with ModelRegistry.
 * This ensures all models are available via req.getModel() in controllers.
 * 
 * IMPORTANT: This file must be imported early in app.js before routes are loaded.
 */

// Main DB Models (15 models)
require('./Body');
require('./Company');
require('./CustomModuleConfig');
require('./GlobalLog');
require('./Make');
require('./MasterAdmin');
require('./MasterDropdown');
require('./Model');
require('./Permission');
require('./Plan');
require('./TrademeMetadata');
require('./User');
require('./Variant');
require('./VariantYear');
require('./VehicleMetadata');

// Company DB Models (40 models)
require('./AdvertiseData');
require('./AdvertiseVehicle');
require('./Conversation');
require('./CostConfiguration');
require('./Currency');
require('./Dealership');
require('./DropdownMaster');
require('./EsignAPIKey');
require('./EsignAuditLog');
require('./EsignBulkJob');
require('./EsignDocument');
require('./EsignProviderConfig');
require('./EsignSigningGroup');
require('./EsignTemplate');
require('./GroupPermission');
require('./InspectionConfig');
require('./Integration');
require('./Invoice');
require('./MasterVehicle');
require('./Notification');
require('./NotificationConfiguration');
require('./ServiceBay');
require('./Subscriptions');
require('./Supplier');
require('./Tender');
require('./TenderConversation');
require('./TenderDealership');
require('./TenderDealershipUser');
require('./TenderHistory');
require('./TenderNotification');
require('./TenderVehicle');
require('./TradeinConfig');
require('./Vehicle');
require('./VehicleActivityLog');
require('./Workflow');
require('./WorkflowExecution');
require('./WorkshopQuote');
require('./WorkshopReport');

console.log('✅ All models loaded and registered with ModelRegistry');

module.exports = {};
