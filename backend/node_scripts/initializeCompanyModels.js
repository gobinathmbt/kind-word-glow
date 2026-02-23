/**
 * Script to initialize all company models for existing companies
 * 
 * This script will:
 * 1. Connect to the main database
 * 2. Get all companies
 * 3. For each company, initialize all company-specific models
 * 4. Create indexes for all models
 * 
 * Usage: node backend/scripts/initializeCompanyModels.js [companyId]
 * - If companyId is provided, only that company will be initialized
 * - If no companyId, all companies will be initialized
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import required modules
const connectionManager = require('../src/config/dbConnectionManager');
const ModelRegistry = require('../src/models/modelRegistry');
const Company = require('../src/models/Company');

// Import all model files to ensure they're registered
require('../src/models');

async function initializeCompanyModels(specificCompanyId = null) {
  let mainConnection = null;

  try {
    // Connect to main database
    console.log('🔌 Connecting to main database...');
    mainConnection = connectionManager.getMainConnection();
    console.log('✅ Connected to main database\n');

    // Get companies to process
    let companies;
    if (specificCompanyId) {
      const company = await Company.findById(specificCompanyId);
      if (!company) {
        throw new Error(`Company not found: ${specificCompanyId}`);
      }
      companies = [company];
      console.log(`Processing single company: ${company.company_name}\n`);
    } else {
      companies = await Company.find({});
      console.log(`Found ${companies.length} companies to process\n`);
    }

    let successCount = 0;
    let errorCount = 0;

    // Process each company
    for (const company of companies) {
      try {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Processing: ${company.company_name} (${company._id})`);
        console.log('='.repeat(60));

        // Get company connection
        const companyConnection = await connectionManager.getCompanyConnection(company._id.toString());
        
        // Initialize all models
        await ModelRegistry.initializeCompanyModels(companyConnection);
        
        console.log(`✅ Successfully initialized models for ${company.company_name}`);
        successCount++;

      } catch (error) {
        console.error(`❌ Failed to initialize models for ${company.company_name}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('=== Summary ===');
    console.log(`Total companies: ${companies.length}`);
    console.log(`Successfully initialized: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    // Close all connections
    await connectionManager.closeAllConnections();
    console.log('\n✅ All connections closed');
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const companyId = args[0] || null;

if (companyId) {
  console.log(`Initializing models for company: ${companyId}\n`);
} else {
  console.log('Initializing models for all companies\n');
}

// Run the script
initializeCompanyModels(companyId)
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
