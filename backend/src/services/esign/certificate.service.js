/**
 * Certificate of Completion Service
 * 
 * Generates certificate PDFs that summarize all signing events and verification data
 */

const crypto = require('crypto');
const pdfService = require('./pdf.service');
const StorageAdapterFactory = require('./storage/StorageAdapterFactory');
const encryptionService = require('./encryption.service');
const auditService = require('./audit.service');
const env = require('../../config/env');

/**
 * Generate certificate HTML
 * @param {Object} document - Document object
 * @param {Object} options - Generation options
 * @returns {string} Certificate HTML
 */
const generateCertificateHtml = (document, options = {}) => {
  const { verificationUrl } = options;
  const signedRecipients = document.recipients.filter(r => r.status === 'signed');
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Certificate of Completion</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 40px;
          color: #333;
        }
        .header {
          text-align: center;
          margin-bottom: 40px;
          border-bottom: 3px solid #0066cc;
          padding-bottom: 20px;
        }
        .header h1 {
          color: #0066cc;
          margin: 0;
          font-size: 32px;
        }
        .header p {
          margin: 10px 0 0 0;
          font-size: 16px;
          color: #666;
        }
        .section {
          margin-bottom: 30px;
        }
        .section h2 {
          color: #0066cc;
          font-size: 20px;
          margin-bottom: 15px;
          border-bottom: 2px solid #e0e0e0;
          padding-bottom: 5px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 200px 1fr;
          gap: 10px;
          margin-bottom: 20px;
        }
        .info-label {
          font-weight: bold;
          color: #555;
        }
        .info-value {
          color: #333;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
        }
        th {
          background-color: #0066cc;
          color: white;
          padding: 12px;
          text-align: left;
          font-weight: bold;
        }
        td {
          border: 1px solid #ddd;
          padding: 10px;
        }
        tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        .verification-box {
          background-color: #f0f8ff;
          border: 2px solid #0066cc;
          border-radius: 5px;
          padding: 20px;
          margin-top: 30px;
        }
        .verification-box h3 {
          color: #0066cc;
          margin-top: 0;
        }
        .hash-value {
          font-family: 'Courier New', monospace;
          background-color: #fff;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 3px;
          word-break: break-all;
          font-size: 12px;
        }
        .footer {
          margin-top: 50px;
          padding-top: 20px;
          border-top: 2px solid #e0e0e0;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
        .timestamp {
          font-style: italic;
          color: #888;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Certificate of Completion</h1>
        <p>Electronic Signature Verification Document</p>
      </div>
      
      <div class="section">
        <h2>Document Information</h2>
        <div class="info-grid">
          <div class="info-label">Document ID:</div>
          <div class="info-value">${document._id}</div>
          
          <div class="info-label">Template Name:</div>
          <div class="info-value">${document.template_snapshot?.name || 'N/A'}</div>
          
          <div class="info-label">Created At:</div>
          <div class="info-value">${new Date(document.createdAt).toLocaleString()}</div>
          
          <div class="info-label">Completed At:</div>
          <div class="info-value">${document.completed_at ? new Date(document.completed_at).toLocaleString() : 'N/A'}</div>
          
          <div class="info-label">Status:</div>
          <div class="info-value">${document.status}</div>
        </div>
      </div>
      
      <div class="section">
        <h2>Signers</h2>
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Name</th>
              <th>Email</th>
              <th>Signed At</th>
              <th>IP Address</th>
              <th>Location</th>
            </tr>
          </thead>
          <tbody>
            ${signedRecipients.map(recipient => {
              const location = recipient.geo_location 
                ? `${recipient.geo_location.city || ''}, ${recipient.geo_location.region || ''}, ${recipient.geo_location.country || ''}`
                : 'N/A';
              
              return `
                <tr>
                  <td>${recipient.signature_order}</td>
                  <td>${recipient.name}</td>
                  <td>${recipient.email}</td>
                  <td class="timestamp">${recipient.signed_at ? new Date(recipient.signed_at).toLocaleString() : 'N/A'}</td>
                  <td>${recipient.ip_address || 'N/A'}</td>
                  <td>${location}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
      
      <div class="verification-box">
        <h3>Document Verification</h3>
        <div class="info-grid">
          <div class="info-label">Hash Algorithm:</div>
          <div class="info-value">SHA-256</div>
          
          <div class="info-label">Document Hash:</div>
          <div class="info-value">
            <div class="hash-value">${document.pdf_hash || 'Not available'}</div>
          </div>
          
          ${verificationUrl ? `
            <div class="info-label">Verification URL:</div>
            <div class="info-value">${verificationUrl}</div>
          ` : ''}
        </div>
        
        <p style="margin-top: 15px; font-size: 14px;">
          This certificate confirms that the document was electronically signed by all parties listed above.
          The document hash can be used to verify the integrity and authenticity of the signed PDF.
        </p>
      </div>
      
      <div class="footer">
        <p>
          This certificate was generated by the Secure Gateway E-Sign Platform<br>
          Generated on: ${new Date().toLocaleString()}<br>
          Certificate ID: ${crypto.randomBytes(16).toString('hex')}
        </p>
        <p style="margin-top: 10px;">
          This is a legally binding electronic record. Any tampering with this document will be evident through hash verification.
        </p>
      </div>
    </body>
    </html>
  `;
  
  return html;
};

/**
 * Generate certificate of completion
 * @param {string} documentId - Document ID
 * @param {Object} req - Express request object
 * @returns {Promise<Object>} Result with certificate_url
 */
const generateCertificate = async (documentId, req) => {
  try {
    console.log(`Generating certificate for document ${documentId}`);
    
    // Load document
    const EsignDocument = req.getModel('EsignDocument');
    const document = await EsignDocument.findById(documentId);
    
    if (!document) {
      throw new Error('Document not found');
    }
    
    if (document.status !== 'completed') {
      throw new Error(`Document status is ${document.status}, expected 'completed'`);
    }
    
    // Generate verification URL
    const baseUrl = env.APP_URL || 'http://localhost:3000';
    const verificationUrl = `${baseUrl}/api/company/esign/documents/${documentId}/verify`;
    
    // Generate certificate HTML
    const certificateHtml = generateCertificateHtml(document, { verificationUrl });
    
    // Convert to PDF
    console.log('Converting certificate HTML to PDF');
    const certificatePdfBuffer = await pdfService.htmlToPdf(certificateHtml, {
      format: 'A4',
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
      printBackground: true,
    });
    
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
    
    // Upload certificate
    const timestamp = Date.now();
    const path = `esign/documents/${documentId}/certificate_${timestamp}.pdf`;
    
    console.log('Uploading certificate to storage');
    const uploadResult = await storageAdapter.upload(certificatePdfBuffer, path, {
      contentType: 'application/pdf',
      metadata: {
        documentId,
        type: 'certificate',
        uploadedAt: new Date().toISOString(),
      },
    });
    
    // Update document record
    document.certificate_url = uploadResult.url;
    await document.save();
    
    // Log to audit
    await auditService.logEvent(req, {
      event_type: 'certificate.generated',
      actor: { type: 'system' },
      resource: { type: 'document', id: documentId },
      action: 'Certificate of completion generated',
      metadata: {
        certificate_url: uploadResult.url,
        storage_provider: storageProvider.provider,
      },
    });
    
    console.log(`Certificate generated for document ${documentId}`);
    
    return {
      certificate_url: uploadResult.url,
      storage_provider: storageProvider.provider,
    };
  } catch (error) {
    console.error('Certificate generation error:', error);
    
    // Log error to audit
    await auditService.logEvent(req, {
      event_type: 'certificate.generation_failed',
      actor: { type: 'system' },
      resource: { type: 'document', id: documentId },
      action: 'Certificate generation failed',
      metadata: { error: error.message },
    });
    
    throw error;
  }
};

module.exports = {
  generateCertificate,
  generateCertificateHtml,
};
