/**
 * Evidence Package Service
 * 
 * Generates ZIP files containing all signing materials:
 * - Signed PDF
 * - Certificate of completion
 * - Audit trail CSV
 * - Verification JSON
 */

const archiver = require('archiver');
const { Readable } = require('stream');
const StorageAdapterFactory = require('./storage/StorageAdapterFactory');
const encryptionService = require('./encryption.service');
const auditService = require('./audit.service');

/**
 * Generate audit trail CSV
 * @param {Object} document - Document object
 * @param {Object} req - Express request object
 * @returns {Promise<string>} CSV content
 */
const generateAuditTrailCsv = async (document, req) => {
  // Get audit logs for this document
  const EsignAuditLog = req.getModel('EsignAuditLog');
  const auditLogs = await EsignAuditLog.find({
    'resource.type': 'document',
    'resource.id': document._id.toString(),
  }).sort({ timestamp: 1 });
  
  // CSV header
  let csv = 'Timestamp,Event Type,Actor Type,Actor Email,Action,IP Address,User Agent,Metadata\n';
  
  // Add audit log entries
  auditLogs.forEach(log => {
    const timestamp = new Date(log.timestamp).toISOString();
    const eventType = log.event_type || '';
    const actorType = log.actor?.type || '';
    const actorEmail = log.actor?.email || '';
    const action = log.action || '';
    const ipAddress = log.ip_address || '';
    const userAgent = (log.user_agent || '').replace(/"/g, '""'); // Escape quotes
    const metadata = JSON.stringify(log.metadata || {}).replace(/"/g, '""');
    
    csv += `"${timestamp}","${eventType}","${actorType}","${actorEmail}","${action}","${ipAddress}","${userAgent}","${metadata}"\n`;
  });
  
  // Add recipient signing events
  document.recipients.forEach(recipient => {
    if (recipient.status === 'signed' && recipient.signed_at) {
      const timestamp = new Date(recipient.signed_at).toISOString();
      const location = recipient.geo_location 
        ? `${recipient.geo_location.city || ''}, ${recipient.geo_location.region || ''}, ${recipient.geo_location.country || ''}`
        : 'N/A';
      
      csv += `"${timestamp}","signature.submitted","signer","${recipient.email}","Signature submitted","${recipient.ip_address || ''}","${(recipient.user_agent || '').replace(/"/g, '""')}","{\\"location\\":\\"${location}\\",\\"signature_type\\":\\"${recipient.signature_type || ''}\\"}"\n`;
    }
  });
  
  return csv;
};

/**
 * Generate verification JSON
 * @param {Object} document - Document object
 * @returns {string} JSON content
 */
const generateVerificationJson = (document) => {
  const verificationData = {
    document_id: document._id.toString(),
    template_name: document.template_snapshot?.name || 'N/A',
    status: document.status,
    created_at: document.createdAt,
    completed_at: document.completed_at,
    pdf_hash: document.pdf_hash,
    hash_algorithm: 'SHA-256',
    pdf_url: document.pdf_url,
    certificate_url: document.certificate_url,
    signers: document.recipients
      .filter(r => r.status === 'signed')
      .map(r => ({
        name: r.name,
        email: r.email,
        signature_order: r.signature_order,
        signed_at: r.signed_at,
        ip_address: r.ip_address,
        geo_location: r.geo_location,
        signature_type: r.signature_type,
      })),
    verification_instructions: {
      description: 'To verify the integrity of the signed PDF, compute its SHA-256 hash and compare with the hash value above.',
      steps: [
        '1. Download the signed PDF from the evidence package',
        '2. Compute SHA-256 hash of the PDF file',
        '3. Compare the computed hash with the hash value in this file',
        '4. If hashes match, the document has not been tampered with',
      ],
    },
    generated_at: new Date().toISOString(),
  };
  
  return JSON.stringify(verificationData, null, 2);
};

/**
 * Download file from storage
 * @param {string} url - File URL
 * @param {Object} storageAdapter - Storage adapter instance
 * @returns {Promise<Buffer>} File buffer
 */
const downloadFileFromStorage = async (url, storageAdapter) => {
  // Extract path from URL
  // This is a simplified approach - actual implementation may need URL parsing
  const pathMatch = url.match(/esign\/documents\/[^?]+/);
  const path = pathMatch ? pathMatch[0] : url;
  
  return await storageAdapter.download(path);
};

/**
 * Generate evidence package
 * @param {string} documentId - Document ID
 * @param {Object} req - Express request object
 * @returns {Promise<Buffer>} ZIP file buffer
 */
const generateEvidencePackage = async (documentId, req) => {
  try {
    console.log(`Generating evidence package for document ${documentId}`);
    
    // Load document
    const EsignDocument = req.getModel('EsignDocument');
    const document = await EsignDocument.findById(documentId);
    
    if (!document) {
      throw new Error('Document not found');
    }
    
    if (document.status !== 'completed') {
      throw new Error(`Document status is ${document.status}, expected 'completed'`);
    }
    
    if (!document.pdf_url) {
      throw new Error('Signed PDF not available');
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
    
    // Download signed PDF
    console.log('Downloading signed PDF');
    const signedPdfBuffer = await downloadFileFromStorage(document.pdf_url, storageAdapter);
    
    // Download certificate (if available)
    let certificateBuffer = null;
    if (document.certificate_url) {
      console.log('Downloading certificate');
      try {
        certificateBuffer = await downloadFileFromStorage(document.certificate_url, storageAdapter);
      } catch (error) {
        console.warn('Failed to download certificate:', error.message);
      }
    }
    
    // Generate audit trail CSV
    console.log('Generating audit trail CSV');
    const auditTrailCsv = await generateAuditTrailCsv(document, req);
    
    // Generate verification JSON
    console.log('Generating verification JSON');
    const verificationJson = generateVerificationJson(document);
    
    // Create ZIP archive
    console.log('Creating ZIP archive');
    const archive = archiver('zip', {
      zlib: { level: 9 }, // Maximum compression
    });
    
    // Collect ZIP data in buffer
    const chunks = [];
    archive.on('data', chunk => chunks.push(chunk));
    
    // Handle archive errors
    archive.on('error', err => {
      throw err;
    });
    
    // Add files to archive
    archive.append(signedPdfBuffer, { name: 'signed_document.pdf' });
    
    if (certificateBuffer) {
      archive.append(certificateBuffer, { name: 'certificate_of_completion.pdf' });
    }
    
    archive.append(auditTrailCsv, { name: 'audit_trail.csv' });
    archive.append(verificationJson, { name: 'verification.json' });
    
    // Add README
    const readme = `Evidence Package for Document ${documentId}
=====================================

This package contains all materials related to the electronic signature process:

1. signed_document.pdf - The final signed document with all signatures and audit footer
2. certificate_of_completion.pdf - Certificate summarizing all signing events
3. audit_trail.csv - Complete audit trail of all events related to this document
4. verification.json - Verification data including document hash and signer information

To verify the integrity of the signed document:
1. Compute the SHA-256 hash of signed_document.pdf
2. Compare it with the hash value in verification.json
3. If they match, the document has not been tampered with

Generated: ${new Date().toISOString()}
Document ID: ${documentId}
Template: ${document.template_snapshot?.name || 'N/A'}
Status: ${document.status}
`;
    
    archive.append(readme, { name: 'README.txt' });
    
    // Finalize archive
    await archive.finalize();
    
    // Wait for all data to be collected
    await new Promise((resolve, reject) => {
      archive.on('end', resolve);
      archive.on('error', reject);
    });
    
    const zipBuffer = Buffer.concat(chunks);
    
    // Log to audit
    await auditService.logEvent(req, {
      event_type: 'evidence_package.generated',
      actor: { 
        type: 'user', 
        id: req.user?._id?.toString(), 
        email: req.user?.email 
      },
      resource: { type: 'document', id: documentId },
      action: 'Evidence package generated',
      metadata: {
        package_size: zipBuffer.length,
        includes_certificate: !!certificateBuffer,
      },
    });
    
    console.log(`Evidence package generated for document ${documentId}, size: ${zipBuffer.length} bytes`);
    
    return zipBuffer;
  } catch (error) {
    console.error('Evidence package generation error:', error);
    
    // Log error to audit
    await auditService.logEvent(req, {
      event_type: 'evidence_package.generation_failed',
      actor: { 
        type: 'user', 
        id: req.user?._id?.toString(), 
        email: req.user?.email 
      },
      resource: { type: 'document', id: documentId },
      action: 'Evidence package generation failed',
      metadata: { error: error.message },
    });
    
    throw error;
  }
};

module.exports = {
  generateEvidencePackage,
  generateAuditTrailCsv,
  generateVerificationJson,
};
