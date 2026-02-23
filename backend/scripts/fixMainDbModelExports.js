/**
 * Fix Main DB Model Exports Script
 * 
 * Restores mongoose.model() exports for main database models.
 * Main DB models can safely export mongoose.model() since they always use the default connection.
 * Only company DB models should export empty objects.
 * 
 * Usage: node backend/scripts/fixMainDbModelExports.js
 */

const fs = require('fs');
const path = require('path');

const MODELS_DIR = path.join(__dirname, '../src/models');

// Main DB models that SHOULD export mongoose.model()
const MAIN_DB_MODEL_FILES = [
  { file: 'Body.js', name: 'Body', schema: 'bodySchema' },
  { file: 'Company.js', name: 'Company', schema: 'CompanySchema' },
  { file: 'CustomModuleConfig.js', name: 'CustomModuleConfig', schema: 'CustomModuleConfigSchema' },
  { file: 'GlobalLog.js', name: 'GlobalLog', schema: 'GlobalLogSchema' },
  { file: 'Make.js', name: 'Make', schema: 'makeSchema' },
  { file: 'MasterAdmin.js', name: 'MasterAdmin', schema: 'MasterAdminSchema' },
  { file: 'MasterDropdown.js', name: 'MasterDropdown', schema: 'MasterDropdownSchema' },
  { file: 'Model.js', name: 'Model', schema: 'modelSchema' },
  { file: 'Permission.js', name: 'Permission', schema: 'PermissionSchema' },
  { file: 'Plan.js', name: 'Plan', schema: 'PlanSchema' },
  { file: 'TrademeMetadata.js', name: 'TrademeMetadata', schema: 'trademeMetadataSchema' },
  { file: 'User.js', name: 'User', schema: 'UserSchema' },
  { file: 'Variant.js', name: 'Variant', schema: 'variantSchema' },
  { file: 'VariantYear.js', name: 'VariantYear', schema: 'variantYearSchema' },
  { file: 'VehicleMetadata.js', name: 'VehicleMetadata', schema: 'vehicleMetadataSchema' }
];

function fixMainDbModelFile(modelInfo) {
  const filePath = path.join(MODELS_DIR, modelInfo.file);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if file has empty export
    const hasEmptyExport = content.includes('module.exports = {};');
    
    if (!hasEmptyExport) {
      console.log(`  ⏭️  Skipped (already has model export): ${modelInfo.file}`);
      return false;
    }
    
    // Replace empty export with mongoose.model export
    content = content.replace(
      'module.exports = {};',
      `module.exports = mongoose.model('${modelInfo.name}', ${modelInfo.schema});`
    );
    
    // Write back to file
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✅ Fixed: ${modelInfo.file}`);
    return true;
    
  } catch (error) {
    console.error(`  ❌ Error fixing ${modelInfo.file}:`, error.message);
    return false;
  }
}

function fixAllMainDbModels() {
  console.log('🔧 Restoring mongoose.model() exports for main DB models...\n');
  
  let fixedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  
  for (const modelInfo of MAIN_DB_MODEL_FILES) {
    const result = fixMainDbModelFile(modelInfo);
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
  console.log(`  - Total processed: ${MAIN_DB_MODEL_FILES.length}`);
  
  if (fixedCount > 0) {
    console.log('\n✅ Main DB models can now be imported directly!');
    console.log('⚠️  Company DB models still use empty exports (correct behavior)');
  }
}

// Run the fix
console.log('🚀 Starting main DB model export fix...\n');
fixAllMainDbModels();
console.log('\n✅ Script completed!');
