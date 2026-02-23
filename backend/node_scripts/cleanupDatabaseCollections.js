/**
 * Database Cleanup Script
 * 
 * Drops company-specific collections that were incorrectly created in the main database.
 * This script should be run once to clean up the database structure.
 * 
 * Usage: node backend/scripts/cleanupDatabaseCollections.js
 */

const mongoose = require('mongoose');
const Env_Configuration = require('../src/config/env');
const ModelRegistry = require('../src/models/modelRegistry');

// Company models that should NOT exist in main database
const COMPANY_MODELS_TO_DROP = [
  'advertisedata',
  'advertisedatas', // Plural form
  'advertisevehicles',
  'conversations',
  'costconfigurations',
  'currencies',
  'dealerships',
  'dropdownmasters',
  'grouppermissions',
  'inspectionconfigs',
  'integrations',
  'invoices',
  'mastervehicles',
  'notifications',
  'notificationconfigurations',
  'servicebays',
  'subscriptions',
  'suppliers',
  'tenders',
  'tenderconversations',
  'tenderdealerships',
  'tenderdealershipusers',
  'tenderhistories',
  'tendernotifications',
  'tendervehicles',
  'tradeinconfigs',
  'vehicles',
  'vehicleactivitylog', // Singular form
  'vehicleactivitylogs',
  'workflows',
  'workflowexecutions',
  'workshopquotes',
  'workshopreports'
];

async function cleanupMainDatabase() {
  let connection;
  
  try {
    console.log('🔧 Connecting to main database...');
    connection = await mongoose.connect(Env_Configuration.MONGODB_URI);
    
    const db = connection.connection.db;
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    console.log(`\n📋 Found ${collectionNames.length} collections in main database`);
    console.log('Collections:', collectionNames.join(', '));
    
    console.log('\n🔍 Checking for company-specific collections in main database...\n');
    
    let droppedCount = 0;
    let skippedCount = 0;
    
    for (const collectionName of COMPANY_MODELS_TO_DROP) {
      if (collectionNames.includes(collectionName)) {
        try {
          await db.dropCollection(collectionName);
          console.log(`  ✅ Dropped: ${collectionName}`);
          droppedCount++;
        } catch (error) {
          console.error(`  ❌ Failed to drop ${collectionName}:`, error.message);
        }
      } else {
        console.log(`  ⏭️  Skipped (not found): ${collectionName}`);
        skippedCount++;
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`  - Collections dropped: ${droppedCount}`);
    console.log(`  - Collections not found: ${skippedCount}`);
    console.log(`  - Total checked: ${COMPANY_MODELS_TO_DROP.length}`);
    
    // List remaining collections
    const remainingCollections = await db.listCollections().toArray();
    console.log(`\n✅ Remaining collections in main database (${remainingCollections.length}):`);
    remainingCollections.forEach(c => {
      console.log(`  - ${c.name}`);
    });
    
    console.log('\n✅ Cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.connection.close();
      console.log('\n🔒 Database connection closed');
    }
  }
}

// Run cleanup
console.log('🚀 Starting database cleanup...\n');
cleanupMainDatabase()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
