const cron = require('node-cron');
const mongoose = require('mongoose');
const pdfService = require('../services/esign/pdf.service');

/**
 * E-Sign PDF Generation Cron Job (Alternative to SQS)
 * 
 * Runs every minute to check for documents that need PDF generation
 * This is a simpler alternative to SQS for smaller deployments
 * 
 * Requirements: 12.1-12.15
 */

/**
 * Process PDF generation for a single company
 * @param {Object} company - Company object
 * @returns {Promise<Object>} Processing results
 */
const processCompanyPdfGeneration = async (company) => {
  try {
    console.log(`[PDF Cron] Processing company: ${company.name} (${company._id})`);
    
    // Get company database connection
    const companyDb = await require('../config/dbConnectionManager').getCompanyConnection(company.db_name);
    
    // Get models for this company
    const EsignDocument = companyDb.model('EsignDocument');
    
    // Find documents with status "signed" that need PDF generation
    const documentsToProcess = await EsignDocument.find({
      status: 'signed',
      pdf_url: { $exists: false }, // PDF not yet generated
    }).limit(5).lean(); // Process max 5 documents per run to avoid overload
    
    console.log(`[PDF Cron] Found ${documentsToProcess.length} documents needing PDF generation for company ${company.name}`);
    
    if (documentsToProcess.length === 0) {
      return {
        company_id: company._id,
        company_name: company.name,
        pdfs_generated: 0,
      };
    }
    
    let pdfsGenerated = 0;
    const errors = [];
    
    // Create mock request object for services
    const mockReq = {
      company: company,
      user: null,
      getModel: (modelName) => companyDb.model(modelName),
      get: () => 'esign-pdf-cron',
      ip: 'system',
      connection: { remoteAddress: 'system' },
    };
    
    // Process each document
    for (const document of documentsToProcess) {
      try {
        console.log(`[PDF Cron] Generating PDF for document ${document._id}`);
        
        await pdfService.generateSignedPdf(document._id.toString(), mockReq);
        
        pdfsGenerated++;
        console.log(`[PDF Cron] PDF generated successfully for document ${document._id}`);
      } catch (docError) {
        console.error(`[PDF Cron] Failed to generate PDF for document ${document._id}:`, docError);
        errors.push({
          document_id: document._id,
          error: 'pdf_generation_failed',
          message: docError.message,
        });
      }
    }
    
    console.log(`[PDF Cron] Completed for company ${company.name}: ${pdfsGenerated} PDFs generated`);
    
    return {
      company_id: company._id,
      company_name: company.name,
      pdfs_generated: pdfsGenerated,
      errors_count: errors.length,
      errors: errors.slice(0, 10),
    };
  } catch (error) {
    console.error(`[PDF Cron] Error processing company ${company.name}:`, error);
    return {
      company_id: company._id,
      company_name: company.name,
      error: error.message,
      pdfs_generated: 0,
    };
  }
};

/**
 * Run PDF generation for all companies
 */
const runPdfGeneration = async () => {
  try {
    console.log('[PDF Cron] Starting PDF generation job');
    const startTime = Date.now();
    
    // Get all active companies from master database
    const Company = mongoose.model('Company');
    const companies = await Company.find({ is_active: true }).lean();
    
    console.log(`[PDF Cron] Found ${companies.length} active companies`);
    
    // Process each company sequentially
    const results = [];
    for (const company of companies) {
      const result = await processCompanyPdfGeneration(company);
      results.push(result);
    }
    
    // Calculate totals
    const totals = results.reduce(
      (acc, result) => {
        if (!result.error) {
          acc.pdfs_generated += result.pdfs_generated || 0;
          acc.errors_count += result.errors_count || 0;
        }
        if (result.error) {
          acc.companies_failed++;
        }
        return acc;
      },
      {
        pdfs_generated: 0,
        errors_count: 0,
        companies_failed: 0,
      }
    );
    
    const duration = Date.now() - startTime;
    
    console.log('[PDF Cron] PDF generation job completed');
    console.log(`[PDF Cron] Duration: ${duration}ms`);
    console.log(`[PDF Cron] Companies processed: ${companies.length}`);
    console.log(`[PDF Cron] Companies failed: ${totals.companies_failed}`);
    console.log(`[PDF Cron] PDFs generated: ${totals.pdfs_generated}`);
    console.log(`[PDF Cron] Errors: ${totals.errors_count}`);
    
    return {
      success: true,
      duration_ms: duration,
      companies_processed: companies.length,
      ...totals,
      results,
    };
  } catch (error) {
    console.error('[PDF Cron] PDF generation job failed:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Start the PDF generation cron job
 * Runs every minute (* * * * *)
 */
const startPdfGenerationCronJob = () => {
  // Run every minute
  const cronSchedule = '* * * * *';
  
  console.log(`[PDF Cron] Scheduling PDF generation cron job: ${cronSchedule}`);
  
  cron.schedule(cronSchedule, async () => {
    console.log('[PDF Cron] PDF generation cron job triggered');
    await runPdfGeneration();
  });
  
  console.log('[PDF Cron] PDF generation cron job scheduled');
};

/**
 * Run PDF generation immediately (for testing or manual trigger)
 */
const runPdfGenerationNow = async () => {
  console.log('[PDF Cron] Running PDF generation immediately');
  return await runPdfGeneration();
};

module.exports = {
  startPdfGenerationCronJob,
  runPdfGenerationNow,
  processCompanyPdfGeneration,
};
