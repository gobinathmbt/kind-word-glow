const env = require('../../config/env');
const crypto = require('crypto');
const lockService = require('./lock.service');
const auditService = require('./audit.service');
const StorageAdapterFactory = require('./storage/StorageAdapterFactory');
const encryptionService = require('./encryption.service');

/**
 * PDF Service for HTML-to-PDF and PDF-to-HTML conversion
 * 
 * This service provides an abstraction layer for PDF operations.
 * Implementation options:
 * 1. Puppeteer/Playwright (Node.js) - Recommended for production
 * 2. External Python service with WeasyPrint
 * 3. Cloud service (AWS Lambda, Google Cloud Functions)
 * 
 * Configuration:
 * - PDF_SERVICE_TYPE: 'puppeteer' | 'python' | 'cloud'
 * - PDF_SERVICE_URL: URL for external service (if applicable)
 * - PDF_SERVICE_TIMEOUT: Timeout in milliseconds (default: 30000)
 * - PDF_SERVICE_MAX_RETRIES: Maximum retry attempts (default: 2)
 */

const PDF_SERVICE_CONFIG = {
  type: env.PDF_SERVICE_TYPE || 'puppeteer',
  url: env.PDF_SERVICE_URL || 'http://localhost:3001',
  timeout: env.PDF_SERVICE_TIMEOUT || 30000,
  maxRetries: env.PDF_SERVICE_MAX_RETRIES || 2,
  retryDelay: 5000, // 5 seconds between retries
};

/**
 * Convert HTML to PDF
 * @param {string} htmlContent - HTML content to convert
 * @param {Object} options - Conversion options
 * @returns {Promise<Buffer>} PDF buffer
 */
const htmlToPdf = async (htmlContent, options = {}) => {
  const {
    format = 'A4',
    margin = { top: '20px', right: '20px', bottom: '20px', left: '20px' },
    printBackground = true,
    displayHeaderFooter = false,
    headerTemplate = '',
    footerTemplate = '',
  } = options;

  try {
    // TODO: Implement based on PDF_SERVICE_CONFIG.type
    // For now, throw an error indicating the service needs to be implemented
    throw new Error(
      'PDF service not yet implemented. Please install Puppeteer or configure an external PDF service.'
    );

    // Example implementation with Puppeteer (to be uncommented when Puppeteer is installed):
    /*
    const puppeteer = require('puppeteer');
    
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format,
      margin,
      printBackground,
      displayHeaderFooter,
      headerTemplate,
      footerTemplate,
    });
    
    await browser.close();
    
    return pdfBuffer;
    */
  } catch (error) {
    console.error('HTML to PDF conversion error:', error);
    throw new Error(`Failed to convert HTML to PDF: ${error.message}`);
  }
};

/**
 * Convert PDF to HTML (for template editing)
 * @param {Buffer} pdfBuffer - PDF buffer to convert
 * @param {Object} options - Conversion options
 * @returns {Promise<string>} HTML content
 */
const pdfToHtml = async (pdfBuffer, options = {}) => {
  try {
    // TODO: Implement PDF to HTML conversion
    // This is more complex and may require external libraries like pdf2htmlEX or pdf.js
    throw new Error(
      'PDF to HTML conversion not yet implemented. This feature requires additional libraries.'
    );

    // Example implementation approach:
    /*
    const pdfjsLib = require('pdfjs-dist/legacy/build/pdf');
    
    // Load PDF
    const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer });
    const pdf = await loadingTask.promise;
    
    let htmlContent = '<html><body>';
    
    // Extract text and structure from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      htmlContent += `<div class="page" data-page="${pageNum}">`;
      
      textContent.items.forEach(item => {
        htmlContent += `<span style="position:absolute; left:${item.transform[4]}px; top:${item.transform[5]}px;">${item.str}</span>`;
      });
      
      htmlContent += '</div>';
    }
    
    htmlContent += '</body></html>';
    
    return htmlContent;
    */
  } catch (error) {
    console.error('PDF to HTML conversion error:', error);
    throw new Error(`Failed to convert PDF to HTML: ${error.message}`);
  }
};

/**
 * Convert PDF to HTML (alias for pdfToHtml)
 * @param {Buffer} pdfBuffer - PDF buffer to convert
 * @param {Object} options - Conversion options
 * @returns {Promise<string>} HTML content
 */
const convertPdfToHtml = async (pdfBuffer, options = {}) => {
  return pdfToHtml(pdfBuffer, options);
};

/**
 * Generate PDF with retry logic
 * @param {string} htmlContent - HTML content to convert
 * @param {Object} options - Conversion options
 * @returns {Promise<Buffer>} PDF buffer
 */
const generatePdfWithRetry = async (htmlContent, options = {}) => {
  let lastError;
  
  for (let attempt = 1; attempt <= PDF_SERVICE_CONFIG.maxRetries + 1; attempt++) {
    try {
      console.log(`PDF generation attempt ${attempt}/${PDF_SERVICE_CONFIG.maxRetries + 1}`);
      
      const pdfBuffer = await htmlToPdf(htmlContent, options);
      
      console.log(`PDF generated successfully on attempt ${attempt}`);
      return pdfBuffer;
    } catch (error) {
      lastError = error;
      console.error(`PDF generation attempt ${attempt} failed:`, error.message);
      
      if (attempt <= PDF_SERVICE_CONFIG.maxRetries) {
        // Wait before retrying (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(`PDF generation failed after ${PDF_SERVICE_CONFIG.maxRetries + 1} attempts: ${lastError.message}`);
};

/**
 * Validate HTML content before conversion
 * @param {string} htmlContent - HTML content to validate
 * @returns {boolean} True if valid
 */
const validateHtmlContent = (htmlContent) => {
  if (!htmlContent || typeof htmlContent !== 'string') {
    throw new Error('Invalid HTML content: must be a non-empty string');
  }
  
  if (htmlContent.length > 10 * 1024 * 1024) { // 10MB limit
    throw new Error('HTML content too large: maximum size is 10MB');
  }
  
  return true;
};

/**
 * Get PDF service health status
 * @returns {Promise<Object>} Health status
 */
const checkPdfServiceHealth = async () => {
  try {
    // TODO: Implement health check based on service type
    return {
      status: 'not_implemented',
      message: 'PDF service not yet configured',
      type: PDF_SERVICE_CONFIG.type,
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.message,
    };
  }
};

/**
 * Inject signature images into HTML at delimiter positions
 * @param {string} htmlContent - Original HTML content
 * @param {Array} recipients - Array of recipient objects with signature images
 * @param {Array} delimiters - Array of delimiter configurations from template
 * @returns {string} HTML with injected signatures
 */
const injectSignatures = (htmlContent, recipients, delimiters) => {
  let modifiedHtml = htmlContent;
  
  // Create a map of signature_order to signature image
  const signatureMap = {};
  recipients.forEach(recipient => {
    if (recipient.signature_image && recipient.status === 'signed') {
      signatureMap[recipient.signature_order] = recipient.signature_image;
    }
  });
  
  // Inject signatures at delimiter positions
  delimiters.forEach(delimiter => {
    if (delimiter.type === 'signature' && delimiter.assigned_to !== undefined) {
      const signatureImage = signatureMap[delimiter.assigned_to];
      if (signatureImage) {
        // Replace delimiter with signature image
        const delimiterPattern = new RegExp(`{{${delimiter.key}}}`, 'g');
        const imageTag = `<img src="${signatureImage}" alt="Signature" style="max-width: 200px; max-height: 100px; display: inline-block;" />`;
        modifiedHtml = modifiedHtml.replace(delimiterPattern, imageTag);
      }
    }
  });
  
  return modifiedHtml;
};

/**
 * Append audit footer to HTML
 * @param {string} htmlContent - HTML content with signatures
 * @param {Object} document - Document object
 * @param {Array} recipients - Array of recipient objects
 * @returns {string} HTML with audit footer
 */
const appendAuditFooter = (htmlContent, document, recipients) => {
  const signedRecipients = recipients.filter(r => r.status === 'signed');
  
  let footerHtml = `
    <div style="page-break-before: always; padding: 20px; font-family: Arial, sans-serif; font-size: 12px; border-top: 2px solid #333; margin-top: 40px;">
      <h3 style="margin-bottom: 20px;">Audit Trail</h3>
      <p><strong>Document ID:</strong> ${document._id}</p>
      <p><strong>Completed At:</strong> ${document.completed_at || new Date().toISOString()}</p>
      <p><strong>Template:</strong> ${document.template_snapshot?.name || 'N/A'}</p>
      
      <h4 style="margin-top: 20px; margin-bottom: 10px;">Signers:</h4>
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
        <thead>
          <tr style="background-color: #f0f0f0;">
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Name</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Email</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Signed At</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">IP Address</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Location</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  signedRecipients.forEach(recipient => {
    const location = recipient.geo_location 
      ? `${recipient.geo_location.city || ''}, ${recipient.geo_location.region || ''}, ${recipient.geo_location.country || ''}`
      : 'N/A';
    
    footerHtml += `
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px;">${recipient.name}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${recipient.email}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${recipient.signed_at ? new Date(recipient.signed_at).toLocaleString() : 'N/A'}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${recipient.ip_address || 'N/A'}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${location}</td>
      </tr>
    `;
  });
  
  footerHtml += `
        </tbody>
      </table>
      
      <p style="margin-top: 20px; font-size: 10px; color: #666;">
        This document was electronically signed using the Secure Gateway E-Sign Platform.
        The signatures and audit trail are cryptographically secured and tamper-evident.
      </p>
    </div>
  `;
  
  // Insert footer before closing body tag
  const bodyCloseIndex = htmlContent.lastIndexOf('</body>');
  if (bodyCloseIndex !== -1) {
    return htmlContent.slice(0, bodyCloseIndex) + footerHtml + htmlContent.slice(bodyCloseIndex);
  }
  
  // If no body tag, append at the end
  return htmlContent + footerHtml;
};

/**
 * Compute SHA-256 hash of PDF buffer
 * @param {Buffer} pdfBuffer - PDF buffer
 * @returns {string} Hex-encoded SHA-256 hash
 */
const computePdfHash = (pdfBuffer) => {
  return crypto.createHash('sha256').update(pdfBuffer).digest('hex');
};

/**
 * Upload PDF to storage with retry logic
 * @param {Buffer} pdfBuffer - PDF buffer to upload
 * @param {string} documentId - Document ID for path generation
 * @param {Object} req - Express request object
 * @returns {Promise<Object>} Upload result with url and retry count
 */
const uploadPdfWithRetry = async (pdfBuffer, documentId, req) => {
  const maxRetries = 3;
  const delays = [2000, 4000, 8000]; // Exponential backoff: 2s, 4s, 8s
  let lastError;
  
  // Get active storage provider
  const EsignProviderConfig = req.getModel('EsignProviderConfig');
  const storageProvider = await EsignProviderConfig.findOne({
    company_id: req.company._id,
    provider_type: 'storage',
    is_active: true,
  });
  
  if (!storageProvider) {
    throw new Error('No active storage provider configured');
  }
  
  // Decrypt credentials
  const credentials = encryptionService.decrypt(storageProvider.credentials);
  
  // Create storage adapter
  const storageAdapter = StorageAdapterFactory.createAdapter(
    storageProvider.provider,
    credentials,
    storageProvider.settings
  );
  
  // Generate storage path
  const timestamp = Date.now();
  const path = `esign/documents/${documentId}/signed_${timestamp}.pdf`;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`PDF upload attempt ${attempt}/${maxRetries}`);
      
      const result = await storageAdapter.upload(pdfBuffer, path, {
        contentType: 'application/pdf',
        metadata: {
          documentId,
          uploadedAt: new Date().toISOString(),
        },
      });
      
      console.log(`PDF uploaded successfully on attempt ${attempt}`);
      
      return {
        url: result.url,
        path: result.path || path,
        provider: storageProvider.provider,
        retryCount: attempt - 1,
      };
    } catch (error) {
      lastError = error;
      console.error(`PDF upload attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        const delay = delays[attempt - 1];
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(`PDF upload failed after ${maxRetries} attempts: ${lastError.message}`);
};

/**
 * Generate signed PDF with complete workflow
 * @param {string} documentId - Document ID
 * @param {Object} req - Express request object
 * @returns {Promise<Object>} Result with pdf_url, pdf_hash, and metadata
 */
const generateSignedPdf = async (documentId, req) => {
  const lockKey = `document:${documentId}:pdf-generation`;
  let lockResult;
  
  try {
    // Step 1: Acquire distributed lock
    console.log(`Acquiring lock for document ${documentId}`);
    lockResult = await lockService.acquireLockWithRetry(lockKey, 300, 3, 1000, req); // 5 min TTL
    
    if (!lockResult.acquired) {
      throw new Error('Failed to acquire lock for PDF generation');
    }
    
    console.log(`Lock acquired: ${lockResult.lockId}`);
    
    // Step 2: Load document
    const EsignDocument = req.getModel('EsignDocument');
    const document = await EsignDocument.findById(documentId);
    
    if (!document) {
      throw new Error('Document not found');
    }
    
    if (document.status !== 'signed') {
      throw new Error(`Document status is ${document.status}, expected 'signed'`);
    }
    
    // Step 3: Inject signatures into HTML
    console.log('Injecting signatures into HTML');
    let htmlContent = document.template_snapshot.html_content;
    
    // Replace payload delimiters first
    Object.keys(document.payload).forEach(key => {
      const pattern = new RegExp(`{{${key}}}`, 'g');
      htmlContent = htmlContent.replace(pattern, document.payload[key] || '');
    });
    
    // Inject signature images
    htmlContent = injectSignatures(
      htmlContent,
      document.recipients,
      document.template_snapshot.delimiters
    );
    
    // Step 4: Append audit footer
    console.log('Appending audit footer');
    htmlContent = appendAuditFooter(htmlContent, document, document.recipients);
    
    // Step 5: Generate PDF with retry
    console.log('Generating PDF');
    const pdfBuffer = await generatePdfWithRetry(htmlContent, {
      format: 'A4',
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
      printBackground: true,
    });
    
    // Step 6: Compute PDF hash
    console.log('Computing PDF hash');
    const pdfHash = computePdfHash(pdfBuffer);
    
    // Step 7: Upload PDF with retry
    console.log('Uploading PDF to storage');
    const uploadResult = await uploadPdfWithRetry(pdfBuffer, documentId, req);
    
    // Step 8: Update document record
    document.pdf_url = uploadResult.url;
    document.pdf_hash = pdfHash;
    document.status = 'completed';
    document.completed_at = new Date();
    await document.save();
    
    // Step 9: Log to audit
    await auditService.logPDFEvent(req, 'pdf.generated', document, {
      pdf_hash: pdfHash,
      storage_provider: uploadResult.provider,
      retry_count: uploadResult.retryCount,
    });
    
    await auditService.logPDFEvent(req, 'pdf.stored', document, {
      pdf_url: uploadResult.url,
      storage_path: uploadResult.path,
    });
    
    console.log(`PDF generation completed for document ${documentId}`);
    
    // Step 10: Execute post-signature actions asynchronously (Req 13.9)
    // This runs without blocking the response to the signer
    const postSignatureService = require('./postSignature.service');
    setImmediate(async () => {
      try {
        await postSignatureService.executePostSignatureActions(req, document);
      } catch (error) {
        console.error('Post-signature processing error:', error);
        // Error is already logged in the service, no need to throw
      }
    });
    
    return {
      pdf_url: uploadResult.url,
      pdf_hash: pdfHash,
      storage_provider: uploadResult.provider,
      retry_count: uploadResult.retryCount,
    };
  } catch (error) {
    console.error('PDF generation error:', error);
    
    // Update document status to error
    try {
      const EsignDocument = req.getModel('EsignDocument');
      await EsignDocument.findByIdAndUpdate(documentId, {
        status: 'error',
        error_reason: error.message,
      });
      
      // Log error to audit
      await auditService.logEvent(req, {
        event_type: 'pdf.generation_failed',
        actor: { type: 'system' },
        resource: { type: 'document', id: documentId },
        action: 'PDF generation failed',
        metadata: { error: error.message },
      });
    } catch (updateError) {
      console.error('Failed to update document error status:', updateError);
    }
    
    throw error;
  } finally {
    // Step 10: Always release lock
    if (lockResult && lockResult.acquired) {
      try {
        await lockService.releaseLock(lockKey, lockResult.lockId, req);
        console.log(`Lock released: ${lockKey}`);
      } catch (lockError) {
        console.error('Failed to release lock:', lockError);
      }
    }
  }
};

/**
 * Verify PDF integrity
 * @param {string} documentId - Document ID
 * @param {Object} req - Express request object
 * @returns {Promise<Object>} Verification result
 */
const verifyPdfIntegrity = async (documentId, req) => {
  try {
    // Load document
    const EsignDocument = req.getModel('EsignDocument');
    const document = await EsignDocument.findById(documentId);
    
    if (!document) {
      throw new Error('Document not found');
    }
    
    if (!document.pdf_url || !document.pdf_hash) {
      throw new Error('Document PDF not available');
    }
    
    // Get storage provider
    const EsignProviderConfig = req.getModel('EsignProviderConfig');
    const storageProvider = await EsignProviderConfig.findOne({
      company_id: req.company._id,
      provider_type: 'storage',
      is_active: true,
    });
    
    if (!storageProvider) {
      throw new Error('No active storage provider configured');
    }
    
    // Decrypt credentials
    const credentials = encryptionService.decrypt(storageProvider.credentials);
    
    // Create storage adapter
    const storageAdapter = StorageAdapterFactory.createAdapter(
      storageProvider.provider,
      credentials,
      storageProvider.settings
    );
    
    // Extract path from URL or use stored path
    // This is a simplified approach - actual implementation may need URL parsing
    const pathMatch = document.pdf_url.match(/esign\/documents\/[^?]+/);
    const path = pathMatch ? pathMatch[0] : document.pdf_url;
    
    // Download PDF
    console.log('Downloading PDF for verification');
    const pdfBuffer = await storageAdapter.download(path);
    
    // Compute hash
    const computedHash = computePdfHash(pdfBuffer);
    
    // Compare hashes
    const isValid = computedHash === document.pdf_hash;
    
    // Log verification attempt
    await auditService.logPDFEvent(req, 'pdf.verified', document, {
      verification_status: isValid ? 'valid' : 'invalid',
      stored_hash: document.pdf_hash,
      computed_hash: computedHash,
    });
    
    return {
      status: isValid ? 'valid' : 'invalid',
      stored_hash: document.pdf_hash,
      computed_hash: computedHash,
      algorithm: 'SHA-256',
      verified_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error('PDF verification error:', error);
    
    // Log verification failure
    await auditService.logEvent(req, {
      event_type: 'pdf.verification_failed',
      actor: { type: 'user', id: req.user?._id?.toString(), email: req.user?.email },
      resource: { type: 'document', id: documentId },
      action: 'PDF verification failed',
      metadata: { error: error.message },
    });
    
    throw error;
  }
};

module.exports = {
  htmlToPdf,
  pdfToHtml,
  convertPdfToHtml,
  generatePdfWithRetry,
  validateHtmlContent,
  checkPdfServiceHealth,
  generateSignedPdf,
  injectSignatures,
  appendAuditFooter,
  computePdfHash,
  uploadPdfWithRetry,
  verifyPdfIntegrity,
  PDF_SERVICE_CONFIG,
};
