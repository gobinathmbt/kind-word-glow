const cron = require('node-cron');
const mongoose = require('mongoose');
const ModelRegistry = require('../models/modelRegistry');
const auditService = require('../services/esign/audit.service');

/**
 * E-Sign Data Retention Cron Job
 * 
 * Runs daily at midnight UTC to clean up old documents and PDFs
 * based on configured retention policies
 * 
 * Requirements: 76.1-76.7
 */

/**
 * Process retention cleanup for a single company
 * @param {Object} company - Company object
 * @returns {Promise<Object>} Cleanup results
 */
const processCompanyRetention = async (company) => {
  try {
    console.log(`[Retention] Processing company: ${company.name} (${company._id})`);
    
    // Get company database connection
    const companyDb = await require('../config/dbConnectionManager').getCompanyConnection(company.db_name);
    
    // Get models for this company
    const EsignDocument = companyDb.model('EsignDocument');
    const EsignProviderConfig = companyDb.model('EsignProviderConfig');
    const EsignAuditLog = companyDb.model('EsignAuditLog');
    
    // Get retention configuration from company settings
    // Default: 365 days (1 year) if not configured
    const retentionDays = company.esign_retention_days || 365;
    
    // Skip if retention is set to "indefinite" (0 or negative value)
    if (retentionDays <= 0) {
      console.log(`[Retention] Company ${company.name} has indefinite retention, skipping`);
      return {
        company_id: company._id,
        company_name: company.name,
        skipped: true,
        reason: 'indefinite_retention',
      };
    }
    
    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    console.log(`[Retention] Retention period: ${retentionDays} days, cutoff date: ${cutoffDate.toISOString()}`);
    
    // Find documents older than retention period that are completed
    const documentsToArchive = await EsignDocument.find({
      status: 'completed',
      completed_at: { $lt: cutoffDate },
      is_archived: { $ne: true },
    }).lean();
    
    console.log(`[Retention] Found ${documentsToArchive.length} documents to archive`);
    
    if (documentsToArchive.length === 0) {
      return {
        company_id: company._id,
        company_name: company.name,
        documents_archived: 0,
        pdfs_deleted: 0,
      };
    }
    
    // Get active storage provider
    const storageProvider = await EsignProviderConfig.findOne({
      provider_type: 'storage',
      is_active: true,
    });
    
    if (!storageProvider) {
      console.log(`[Retention] No active storage provider found for company ${company.name}`);
      return {
        company_id: company._id,
        company_name: company.name,
        error: 'no_storage_provider',
        documents_archived: 0,
        pdfs_deleted: 0,
      };
    }
    
    // Initialize storage adapter
    const StorageAdapterFactory = require('../services/esign/storage/StorageAdapterFactory');
    const storageAdapter = StorageAdapterFactory.createAdapter(
      storageProvider.provider,
      storageProvider.credentials,
      storageProvider.settings
    );
    
    let documentsArchived = 0;
    let pdfsDeleted = 0;
    const errors = [];
    
    // Create a mock request object for audit logging
    const mockReq = {
      company: company,
      user: null,
      getModel: (modelName) => companyDb.model(modelName),
      get: () => 'esign-retention-cron',
      ip: 'system',
      connection: { remoteAddress: 'system' },
    };
    
    // Log retention cleanup start
    await auditService.logEvent(mockReq, {
      event_type: 'retention.cleanup_started',
      actor: {
        type: 'system',
      },
      resource: {
        type: 'document',
        id: 'retention_cleanup',
      },
      action: 'Retention cleanup started',
      metadata: {
        retention_days: retentionDays,
        cutoff_date: cutoffDate.toISOString(),
        documents_count: documentsToArchive.length,
      },
    });
    
    // Process each document
    for (const document of documentsToArchive) {
      try {
        // Delete PDF from storage if it exists
        if (document.pdf_url) {
          try {
            await storageAdapter.delete(document.pdf_url);
            pdfsDeleted++;
            
            console.log(`[Retention] Deleted PDF for document ${document._id}`);
          } catch (deleteError) {
            console.error(`[Retention] Failed to delete PDF for document ${document._id}:`, deleteError);
            errors.push({
              document_id: document._id,
              error: 'pdf_deletion_failed',
              message: deleteError.message,
            });
          }
        }
        
        // Mark document as archived
        await EsignDocument.updateOne(
          { _id: document._id },
          {
            $set: {
              is_archived: true,
              archived_at: new Date(),
              pdf_url: null, // Clear PDF URL since it's deleted
            },
          }
        );
        
        documentsArchived++;
        
        // Log document archival
        await auditService.logEvent(mockReq, {
          event_type: 'retention.document_archived',
          actor: {
            type: 'system',
          },
          resource: {
            type: 'document',
            id: document._id.toString(),
          },
          action: 'Document archived due to retention policy',
          metadata: {
            retention_days: retentionDays,
            completed_at: document.completed_at,
            pdf_deleted: !!document.pdf_url,
          },
        });
        
        console.log(`[Retention] Archived document ${document._id}`);
      } catch (docError) {
        console.error(`[Retention] Failed to process document ${document._id}:`, docError);
        errors.push({
          document_id: document._id,
          error: 'processing_failed',
          message: docError.message,
        });
      }
    }
    
    // Log retention cleanup completion
    await auditService.logEvent(mockReq, {
      event_type: 'retention.cleanup_completed',
      actor: {
        type: 'system',
      },
      resource: {
        type: 'document',
        id: 'retention_cleanup',
      },
      action: 'Retention cleanup completed',
      metadata: {
        retention_days: retentionDays,
        documents_archived: documentsArchived,
        pdfs_deleted: pdfsDeleted,
        errors_count: errors.length,
        errors: errors.slice(0, 10), // Include first 10 errors
      },
    });
    
    console.log(`[Retention] Completed for company ${company.name}: ${documentsArchived} documents archived, ${pdfsDeleted} PDFs deleted`);
    
    return {
      company_id: company._id,
      company_name: company.name,
      documents_archived: documentsArchived,
      pdfs_deleted: pdfsDeleted,
      errors_count: errors.length,
      errors: errors.slice(0, 10),
    };
  } catch (error) {
    console.error(`[Retention] Error processing company ${company.name}:`, error);
    return {
      company_id: company._id,
      company_name: company.name,
      error: error.message,
      documents_archived: 0,
      pdfs_deleted: 0,
    };
  }
};

/**
 * Run retention cleanup for all companies
 */
const runRetentionCleanup = async () => {
  try {
    console.log('[Retention] Starting retention cleanup job');
    const startTime = Date.now();
    
    // Get all active companies from master database
    const Company = mongoose.model('Company');
    const companies = await Company.find({ is_active: true }).lean();
    
    console.log(`[Retention] Found ${companies.length} active companies`);
    
    // Process each company sequentially to avoid overwhelming the system
    const results = [];
    for (const company of companies) {
      const result = await processCompanyRetention(company);
      results.push(result);
    }
    
    // Calculate totals
    const totals = results.reduce(
      (acc, result) => {
        if (!result.skipped && !result.error) {
          acc.documents_archived += result.documents_archived || 0;
          acc.pdfs_deleted += result.pdfs_deleted || 0;
          acc.errors_count += result.errors_count || 0;
        }
        if (result.skipped) {
          acc.companies_skipped++;
        }
        if (result.error) {
          acc.companies_failed++;
        }
        return acc;
      },
      {
        documents_archived: 0,
        pdfs_deleted: 0,
        errors_count: 0,
        companies_skipped: 0,
        companies_failed: 0,
      }
    );
    
    const duration = Date.now() - startTime;
    
    console.log('[Retention] Retention cleanup job completed');
    console.log(`[Retention] Duration: ${duration}ms`);
    console.log(`[Retention] Companies processed: ${companies.length}`);
    console.log(`[Retention] Companies skipped: ${totals.companies_skipped}`);
    console.log(`[Retention] Companies failed: ${totals.companies_failed}`);
    console.log(`[Retention] Documents archived: ${totals.documents_archived}`);
    console.log(`[Retention] PDFs deleted: ${totals.pdfs_deleted}`);
    console.log(`[Retention] Errors: ${totals.errors_count}`);
    
    return {
      success: true,
      duration_ms: duration,
      companies_processed: companies.length,
      ...totals,
      results,
    };
  } catch (error) {
    console.error('[Retention] Retention cleanup job failed:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Start the retention cleanup cron job
 * Runs daily at midnight UTC (0 0 * * *)
 */
const startRetentionCronJob = () => {
  // Run daily at midnight UTC
  const cronSchedule = '0 0 * * *';
  
  console.log(`[Retention] Scheduling retention cleanup cron job: ${cronSchedule}`);
  
  cron.schedule(cronSchedule, async () => {
    console.log('[Retention] Retention cleanup cron job triggered');
    await runRetentionCleanup();
  });
  
  console.log('[Retention] Retention cleanup cron job scheduled');
};

/**
 * Run retention cleanup immediately (for testing or manual trigger)
 */
const runRetentionCleanupNow = async () => {
  console.log('[Retention] Running retention cleanup immediately');
  return await runRetentionCleanup();
};

module.exports = {
  startRetentionCronJob,
  runRetentionCleanupNow,
  processCompanyRetention,
};
