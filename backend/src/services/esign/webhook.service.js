const crypto = require('crypto');
const axios = require('axios');

/**
 * Webhook Service for E-Sign
 * 
 * Handles webhook delivery with HMAC-SHA256 signature verification
 * Implements retry logic with exponential or fixed backoff
 * 
 * Requirements: 13.3-13.8, 40.1-40.5
 */

/**
 * Send webhook notification
 * @param {string} callbackUrl - Webhook URL
 * @param {string} apiSecret - API secret for signature
 * @param {Object} payload - Webhook payload
 * @param {Object} options - Options (retryBackoff: 'exponential' or 'fixed')
 * @returns {Promise<Object>} Send result
 */
async function sendWebhook(callbackUrl, apiSecret, payload, options = {}) {
  const {
    retryBackoff = 'exponential',
    maxRetries = 3,
    timeout = 10000,
  } = options;
  
  // Add timestamp to payload (Req 13.6, 40.4)
  const payloadWithTimestamp = {
    ...payload,
    timestamp: new Date().toISOString(),
  };
  
  // Compute HMAC-SHA256 signature (Req 13.5, 40.2)
  const signature = computeSignature(payloadWithTimestamp, apiSecret);
  
  // Prepare request
  const requestConfig = {
    method: 'POST',
    url: callbackUrl,
    headers: {
      'Content-Type': 'application/json',
      'X-Signature': signature, // Req 13.5, 40.1
      'User-Agent': 'Esign-Webhook/1.0',
    },
    data: payloadWithTimestamp,
    timeout,
  };
  
  // Send with retry logic (Req 13.7, 13.8)
  return await sendWithRetry(requestConfig, maxRetries, retryBackoff);
}

/**
 * Compute HMAC-SHA256 signature
 * @param {Object} payload - Payload to sign
 * @param {string} secret - Secret key
 * @returns {string} Hex-encoded signature
 */
function computeSignature(payload, secret) {
  const payloadString = JSON.stringify(payload);
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payloadString);
  return hmac.digest('hex');
}

/**
 * Verify webhook signature
 * @param {Object} payload - Received payload
 * @param {string} signature - Received signature
 * @param {string} secret - Secret key
 * @returns {boolean} True if signature is valid
 */
function verifySignature(payload, signature, secret) {
  const expectedSignature = computeSignature(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

/**
 * Send webhook with retry logic
 * @param {Object} requestConfig - Axios request configuration
 * @param {number} maxRetries - Maximum number of retries
 * @param {string} backoffType - Backoff type: 'exponential' or 'fixed'
 * @returns {Promise<Object>} Send result
 */
async function sendWithRetry(requestConfig, maxRetries, backoffType) {
  const attempts = [];
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const attemptStartTime = Date.now();
    
    try {
      const response = await axios(requestConfig);
      
      const attemptResult = {
        attempt: attempt + 1,
        status: response.status,
        statusText: response.statusText,
        duration: Date.now() - attemptStartTime,
        success: true,
      };
      
      attempts.push(attemptResult);
      
      return {
        success: true,
        attempts,
        totalAttempts: attempt + 1,
        finalStatus: response.status,
        finalResponse: response.data,
      };
    } catch (error) {
      lastError = error;
      
      const attemptResult = {
        attempt: attempt + 1,
        status: error.response?.status,
        statusText: error.response?.statusText,
        error: error.message,
        duration: Date.now() - attemptStartTime,
        success: false,
      };
      
      attempts.push(attemptResult);
      
      console.error(`Webhook attempt ${attempt + 1} failed:`, error.message);
      
      // Don't retry on last attempt
      if (attempt < maxRetries - 1) {
        const delay = calculateBackoffDelay(attempt, backoffType);
        console.log(`Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }
  
  // All retries failed
  return {
    success: false,
    attempts,
    totalAttempts: maxRetries,
    error: lastError.message,
    finalStatus: lastError.response?.status,
  };
}

/**
 * Calculate backoff delay
 * @param {number} attempt - Current attempt number (0-indexed)
 * @param {string} backoffType - Backoff type: 'exponential' or 'fixed'
 * @returns {number} Delay in milliseconds
 */
function calculateBackoffDelay(attempt, backoffType) {
  if (backoffType === 'exponential') {
    // Exponential backoff: 2s, 4s, 8s (Req 13.7)
    return Math.pow(2, attempt + 1) * 1000;
  } else {
    // Fixed backoff: 5s (Req 13.8)
    return 5000;
  }
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Send document completed webhook
 * @param {Object} document - Document object
 * @param {string} callbackUrl - Webhook URL
 * @param {string} apiSecret - API secret
 * @param {Object} options - Options
 * @returns {Promise<Object>} Send result
 */
async function sendDocumentCompletedWebhook(document, callbackUrl, apiSecret, options = {}) {
  const payload = {
    event: 'document.completed',
    document_id: document._id.toString(),
    timestamp: new Date().toISOString(),
    data: {
      status: document.status,
      completed_at: document.completed_at,
      pdf_url: document.pdf_url,
      certificate_url: document.certificate_url,
      recipients: document.recipients.map(r => ({
        email: r.email,
        name: r.name,
        status: r.status,
        signed_at: r.signed_at,
      })),
    },
  };
  
  return await sendWebhook(callbackUrl, apiSecret, payload, options);
}

/**
 * Send document rejected webhook
 * @param {Object} document - Document object
 * @param {string} callbackUrl - Webhook URL
 * @param {string} apiSecret - API secret
 * @param {Object} options - Options
 * @returns {Promise<Object>} Send result
 */
async function sendDocumentRejectedWebhook(document, callbackUrl, apiSecret, options = {}) {
  const payload = {
    event: 'document.rejected',
    document_id: document._id.toString(),
    timestamp: new Date().toISOString(),
    data: {
      status: document.status,
      rejected_at: document.updatedAt,
      reason: document.error_reason,
    },
  };
  
  return await sendWebhook(callbackUrl, apiSecret, payload, options);
}

/**
 * Send document expired webhook
 * @param {Object} document - Document object
 * @param {string} callbackUrl - Webhook URL
 * @param {string} apiSecret - API secret
 * @param {Object} options - Options
 * @returns {Promise<Object>} Send result
 */
async function sendDocumentExpiredWebhook(document, callbackUrl, apiSecret, options = {}) {
  const payload = {
    event: 'document.expired',
    document_id: document._id.toString(),
    timestamp: new Date().toISOString(),
    data: {
      status: document.status,
      expired_at: document.expires_at,
    },
  };
  
  return await sendWebhook(callbackUrl, apiSecret, payload, options);
}

/**
 * Send bulk job completed webhook
 * @param {Object} bulkJob - Bulk job object
 * @param {string} callbackUrl - Webhook URL
 * @param {string} apiSecret - API secret
 * @param {Object} options - Options
 * @returns {Promise<Object>} Send result
 */
async function sendBulkJobCompletedWebhook(bulkJob, callbackUrl, apiSecret, options = {}) {
  const payload = {
    event: 'bulk_job.completed',
    job_id: bulkJob._id.toString(),
    timestamp: new Date().toISOString(),
    data: {
      status: bulkJob.status,
      total_items: bulkJob.total_items,
      successful_items: bulkJob.successful_items,
      failed_items: bulkJob.failed_items,
      completed_at: bulkJob.completed_at,
    },
  };
  
  return await sendWebhook(callbackUrl, apiSecret, payload, options);
}

/**
 * Process webhook for document
 * @param {Object} req - Express request object
 * @param {Object} document - Document object
 * @param {string} eventType - Event type
 * @returns {Promise<void>}
 */
async function processDocumentWebhook(req, document, eventType) {
  try {
    // Check if callback URL is configured
    if (!document.callback_url) {
      return;
    }
    
    // Get API key to retrieve secret
    const EsignAPIKey = req.getModel('EsignAPIKey');
    const apiKey = await EsignAPIKey.findOne({
      company_id: document.company_id,
      is_active: true,
    }).sort({ last_used_at: -1 });
    
    if (!apiKey) {
      console.error('No active API key found for webhook');
      return;
    }
    
    // Get template snapshot for retry backoff configuration
    const template = document.template_snapshot;
    const retryBackoff = template.notification_config?.retry_backoff || 'exponential';
    
    // Send webhook based on event type
    let result;
    switch (eventType) {
      case 'document.completed':
        result = await sendDocumentCompletedWebhook(
          document,
          document.callback_url,
          apiKey.hashed_secret, // In production, use actual secret
          { retryBackoff }
        );
        break;
      
      case 'document.rejected':
        result = await sendDocumentRejectedWebhook(
          document,
          document.callback_url,
          apiKey.hashed_secret,
          { retryBackoff }
        );
        break;
      
      case 'document.expired':
        result = await sendDocumentExpiredWebhook(
          document,
          document.callback_url,
          apiKey.hashed_secret,
          { retryBackoff }
        );
        break;
      
      default:
        console.log(`Webhook not configured for event type: ${eventType}`);
        return;
    }
    
    // Update document with callback status
    const EsignDocument = req.getModel('EsignDocument');
    await EsignDocument.updateOne(
      { _id: document._id },
      {
        callback_status: result.success ? 'success' : 'failed',
        callback_attempts: result.totalAttempts,
        callback_last_attempt: new Date(),
      }
    );
    
    // Log webhook result
    const auditService = require('./audit.service');
    await auditService.logWebhookEvent(req, result.success ? 'webhook.sent' : 'webhook.failed', document, {
      event_type: eventType,
      attempts: result.totalAttempts,
      final_status: result.finalStatus,
      error: result.error,
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
  }
}

module.exports = {
  sendWebhook,
  computeSignature,
  verifySignature,
  sendDocumentCompletedWebhook,
  sendDocumentRejectedWebhook,
  sendDocumentExpiredWebhook,
  sendBulkJobCompletedWebhook,
  processDocumentWebhook,
};
