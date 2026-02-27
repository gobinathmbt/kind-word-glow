const { sqsUtils } = require('../config/sqs');
const pdfService = require('../services/esign/pdf.service');
const auditService = require('../services/esign/audit.service');

/**
 * E-Sign PDF Generation Job Queue
 * 
 * Handles asynchronous PDF generation using AWS SQS
 * 
 * Requirements: 12.1-12.15
 */

// Queue configuration
const PDF_QUEUE_NAME = 'esign-pdf-generation-queue';
let pdfQueueUrl = null;

/**
 * Initialize PDF generation queue
 */
const initializePdfQueue = async () => {
  try {
    if (!pdfQueueUrl) {
      pdfQueueUrl = await sqsUtils.getQueueUrl(PDF_QUEUE_NAME);
      console.log(`[PDF Queue] Initialized: ${pdfQueueUrl}`);
    }
    return pdfQueueUrl;
  } catch (error) {
    console.error('[PDF Queue] Failed to initialize:', error);
    throw error;
  }
};

/**
 * Enqueue PDF generation job
 * @param {string} documentId - Document ID
 * @param {string} companyId - Company ID
 * @param {string} companyDbName - Company database name
 * @returns {Promise<Object>} Enqueue result
 */
const enqueuePdfGeneration = async (documentId, companyId, companyDbName) => {
  try {
    await initializePdfQueue();
    
    const jobData = {
      type: 'pdf_generation',
      documentId,
      companyId,
      companyDbName,
      enqueuedAt: new Date().toISOString(),
      attempts: 0,
    };
    
    const result = await sqsUtils.sendMessage(pdfQueueUrl, jobData);
    
    console.log(`[PDF Queue] Enqueued PDF generation for document ${documentId}, MessageId: ${result.MessageId}`);
    
    return {
      success: true,
      messageId: result.MessageId,
      documentId,
    };
  } catch (error) {
    console.error('[PDF Queue] Failed to enqueue PDF generation:', error);
    throw error;
  }
};

/**
 * Process PDF generation job
 * @param {Object} jobData - Job data from SQS message
 * @returns {Promise<Object>} Processing result
 */
const processPdfGenerationJob = async (jobData) => {
  const { documentId, companyId, companyDbName, attempts = 0 } = jobData;
  
  try {
    console.log(`[PDF Queue] Processing PDF generation for document ${documentId} (attempt ${attempts + 1})`);
    
    // Get company database connection
    const companyDb = await require('../config/dbConnectionManager').getCompanyConnection(companyDbName);
    
    // Get company from master database
    const mongoose = require('mongoose');
    const Company = mongoose.model('Company');
    const company = await Company.findById(companyId);
    
    if (!company) {
      throw new Error(`Company not found: ${companyId}`);
    }
    
    // Create mock request object for services
    const mockReq = {
      company: company,
      user: null,
      getModel: (modelName) => companyDb.model(modelName),
      get: () => 'esign-pdf-queue',
      ip: 'system',
      connection: { remoteAddress: 'system' },
    };
    
    // Generate PDF
    const result = await pdfService.generateSignedPdf(documentId, mockReq);
    
    console.log(`[PDF Queue] PDF generation completed for document ${documentId}`);
    
    return {
      success: true,
      documentId,
      pdf_url: result.pdf_url,
      pdf_hash: result.pdf_hash,
      attempts: attempts + 1,
    };
  } catch (error) {
    console.error(`[PDF Queue] PDF generation failed for document ${documentId}:`, error);
    
    // Update document status to error if max retries exceeded
    const maxRetries = 3;
    if (attempts >= maxRetries - 1) {
      try {
        const companyDb = await require('../config/dbConnectionManager').getCompanyConnection(companyDbName);
        const EsignDocument = companyDb.model('EsignDocument');
        
        await EsignDocument.findByIdAndUpdate(documentId, {
          status: 'error',
          error_reason: `PDF generation failed after ${maxRetries} attempts: ${error.message}`,
        });
        
        console.log(`[PDF Queue] Document ${documentId} marked as error after ${maxRetries} attempts`);
      } catch (updateError) {
        console.error('[PDF Queue] Failed to update document error status:', updateError);
      }
    }
    
    throw error;
  }
};

/**
 * Poll and process PDF generation jobs
 * @param {number} maxMessages - Maximum messages to process per poll (default: 1)
 * @param {number} waitTimeSeconds - Long polling wait time (default: 20)
 * @returns {Promise<Object>} Processing results
 */
const pollPdfGenerationJobs = async (maxMessages = 1, waitTimeSeconds = 20) => {
  try {
    await initializePdfQueue();
    
    console.log(`[PDF Queue] Polling for jobs (max: ${maxMessages}, wait: ${waitTimeSeconds}s)`);
    
    const messages = await sqsUtils.receiveMessages(pdfQueueUrl, maxMessages, waitTimeSeconds);
    
    if (messages.length === 0) {
      console.log('[PDF Queue] No messages received');
      return {
        processed: 0,
        succeeded: 0,
        failed: 0,
      };
    }
    
    console.log(`[PDF Queue] Received ${messages.length} messages`);
    
    let succeeded = 0;
    let failed = 0;
    
    // Process each message
    for (const message of messages) {
      try {
        const jobData = JSON.parse(message.Body);
        
        // Process the job
        await processPdfGenerationJob(jobData);
        
        // Delete message from queue on success
        await sqsUtils.deleteMessage(pdfQueueUrl, message.ReceiptHandle);
        
        succeeded++;
        console.log(`[PDF Queue] Successfully processed and deleted message ${message.MessageId}`);
      } catch (error) {
        console.error(`[PDF Queue] Failed to process message ${message.MessageId}:`, error);
        
        // Parse job data to check retry count
        try {
          const jobData = JSON.parse(message.Body);
          const maxRetries = 3;
          
          if (jobData.attempts < maxRetries - 1) {
            // Re-enqueue with incremented attempt count
            jobData.attempts = (jobData.attempts || 0) + 1;
            
            // Calculate delay based on attempt (exponential backoff: 2s, 4s, 8s)
            const delaySeconds = Math.pow(2, jobData.attempts);
            
            await sqsUtils.sendMessage(pdfQueueUrl, jobData, delaySeconds);
            
            console.log(`[PDF Queue] Re-enqueued message with ${delaySeconds}s delay (attempt ${jobData.attempts + 1}/${maxRetries})`);
          } else {
            console.log(`[PDF Queue] Max retries exceeded for message ${message.MessageId}, not re-enqueueing`);
          }
          
          // Delete original message
          await sqsUtils.deleteMessage(pdfQueueUrl, message.ReceiptHandle);
        } catch (retryError) {
          console.error('[PDF Queue] Failed to handle retry logic:', retryError);
        }
        
        failed++;
      }
    }
    
    console.log(`[PDF Queue] Processed ${messages.length} messages: ${succeeded} succeeded, ${failed} failed`);
    
    return {
      processed: messages.length,
      succeeded,
      failed,
    };
  } catch (error) {
    console.error('[PDF Queue] Polling error:', error);
    return {
      processed: 0,
      succeeded: 0,
      failed: 0,
      error: error.message,
    };
  }
};

/**
 * Start PDF generation queue worker
 * Continuously polls for jobs
 * @param {Object} options - Worker options
 */
const startPdfGenerationWorker = (options = {}) => {
  const {
    maxMessages = 1,
    waitTimeSeconds = 20,
    pollInterval = 1000, // 1 second between polls
  } = options;
  
  console.log('[PDF Queue] Starting PDF generation worker');
  console.log(`[PDF Queue] Worker config: maxMessages=${maxMessages}, waitTime=${waitTimeSeconds}s, pollInterval=${pollInterval}ms`);
  
  let isRunning = true;
  
  const poll = async () => {
    if (!isRunning) {
      console.log('[PDF Queue] Worker stopped');
      return;
    }
    
    try {
      await pollPdfGenerationJobs(maxMessages, waitTimeSeconds);
    } catch (error) {
      console.error('[PDF Queue] Worker error:', error);
    }
    
    // Schedule next poll
    setTimeout(poll, pollInterval);
  };
  
  // Start polling
  poll();
  
  // Return stop function
  return {
    stop: () => {
      console.log('[PDF Queue] Stopping PDF generation worker');
      isRunning = false;
    },
  };
};

/**
 * Get queue statistics
 * @returns {Promise<Object>} Queue statistics
 */
const getPdfQueueStats = async () => {
  try {
    await initializePdfQueue();
    
    const attributes = await sqsUtils.getQueueAttributes(pdfQueueUrl);
    
    return {
      queueUrl: pdfQueueUrl,
      approximateNumberOfMessages: parseInt(attributes.ApproximateNumberOfMessages || '0'),
      approximateNumberOfMessagesNotVisible: parseInt(attributes.ApproximateNumberOfMessagesNotVisible || '0'),
      approximateNumberOfMessagesDelayed: parseInt(attributes.ApproximateNumberOfMessagesDelayed || '0'),
      createdTimestamp: attributes.CreatedTimestamp,
      lastModifiedTimestamp: attributes.LastModifiedTimestamp,
    };
  } catch (error) {
    console.error('[PDF Queue] Failed to get queue stats:', error);
    throw error;
  }
};

module.exports = {
  initializePdfQueue,
  enqueuePdfGeneration,
  processPdfGenerationJob,
  pollPdfGenerationJobs,
  startPdfGenerationWorker,
  getPdfQueueStats,
};
