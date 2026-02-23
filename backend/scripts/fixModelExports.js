/**
 * Fix Model Exports Script
 * 
 * Removes direct mongoose.model() calls from model files.
 * Models should only register with ModelRegistry and export an empty object.
 * The actual model instances are created dynamically by the connection manager.
 * 
 * Usage: node backend/scripts/fixModelExports.js
 */

const fs = require('fs');
const path = require('path');

const MODELS_DIR = path.join(__dirname, '../src/models');

// Model files to fix (all except index.js and modelRegistry.js)
const MODEL_FILES = [
  'AdvertiseData.js',
  'AdvertiseVehicle.js',
  'Body.js',
  'Company.js',
  'Conversation.js',
  'CostConfiguration.js',
  'Currency.js',
  'CustomModuleConfig.js',
  'Dealership.js',
  'DropdownMaster.js',
  'GlobalLog.js',
  'GroupPermission.js',
  'InspectionConfig.js',
  'Integration.js',
  'Invoice.js',
  'Make.js',
  'MasterAdmin.js',
  'MasterDropdown.js',
  'MasterVehicle.js',
  'Model.js',
  'Notification.js',
  'NotificationConfiguration.js',
  'Permission.js',
  'Plan.js',
  'ServiceBay.js',
  'Subscriptions.js',
  'Supplier.js',
  'Tender.js',
  'TenderConversation.js',
  'TenderDealership.js',
  'TenderDealershipUser.js',
  'TenderHistory.js',
  'TenderNotification.js',
  'TenderVehicle.js',
  'TradeinConfig.js',
  'TrademeMetadata.js',
  'User.js',
  'Variant.js',
  'VariantYear.js',
  'Vehicle.js',
  'VehicleActivityLog.js',
  'VehicleMetadata.js',
  'Workflow.js',
  'WorkflowExecution.js',
  'WorkshopQuote.js',
  'WorkshopReport.js'
];

function fixModelFile(filename) {
  const filePath = path.join(MODELS_DIR, filename);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if file has the problematic export
    const hasDirectExport = content.includes('module.exports = mongoose.model(');
    
    if (!hasDirectExport) {
      console.log(`  ⏭️  Skipped (already fixed): ${filename}`);
      return false;
    }
    
    // Replace the direct mongoose.model export with empty object export
    // Pattern: module.exports = mongoose.model('ModelName', SchemaName);
    const exportPattern = /module\.exports = mongoose\.model\([^)]+\);/g;
    
    content = content.replace(exportPattern, 'module.exports = {};');
    
    // Write back to file
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✅ Fixed: ${filename}`);
    return true;
    
  } catch (error) {
    console.error(`  ❌ Error fixing ${filename}:`, error.message);
    return false;
  }
}

function fixAllModels() {
  console.log('🔧 Fixing model export statements...\n');
  
  let fixedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  
  for (const filename of MODEL_FILES) {
    const result = fixModelFile(filename);
    if (result === true) {
      fixedCount++;
    } else if (result === false) {
      skippedCount++;
    } else {
      errorCount++;
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`  - Files fixed: ${fixedCount}`);
  console.log(`  - Files skipped: ${skippedCount}`);
  console.log(`  - Errors: ${errorCount}`);
  console.log(`  - Total processed: ${MODEL_FILES.length}`);
  
  if (fixedCount > 0) {
    console.log('\n⚠️  IMPORTANT: Restart your application for changes to take effect!');
  }
}

// Run the fix
console.log('🚀 Starting model export fix...\n');
fixAllModels();
console.log('\n✅ Script completed!');
