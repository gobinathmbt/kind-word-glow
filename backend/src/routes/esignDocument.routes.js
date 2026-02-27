const express = require('express');
const router = express.Router();
const esignDocumentController = require('../controllers/esignDocument.controller');
const auth = require('../middleware/auth');
const tenantContext = require('../middleware/tenantContext');
const moduleAccess = require('../middleware/moduleAccess');

/**
 * E-Sign Document Routes
 * 
 * These routes are for company admins to manage documents
 * Requires auth, tenantContext, and moduleAccess middleware
 * 
 * Base path: /api/company/esign/documents
 */

// Apply middleware to all routes
router.use(auth);
router.use(tenantContext);
router.use(moduleAccess('esign_documents'));

/**
 * List Documents
 * GET /api/company/esign/documents
 * 
 * Query parameters:
 * - status: Filter by status (can be array)
 * - template_id: Filter by template
 * - recipient_email: Filter by recipient email
 * - date_from: Filter by creation date (from)
 * - date_to: Filter by creation date (to)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - sort_by: Sort field (default: createdAt)
 * - sort_order: Sort order (asc/desc, default: desc)
 */
router.get('/', esignDocumentController.listDocuments);

/**
 * Get Document Details
 * GET /api/company/esign/documents/:id
 */
router.get('/:id', esignDocumentController.getDocument);

/**
 * Approve Preview Document
 * POST /api/company/esign/documents/:id/approve
 * 
 * Requires Company_Admin role
 */
router.post('/:id/approve', esignDocumentController.approveDocument);

/**
 * Reject Preview Document
 * POST /api/company/esign/documents/:id/reject
 * 
 * Requires Company_Admin role
 * Body: { reason: string }
 */
router.post('/:id/reject', esignDocumentController.rejectDocument);

/**
 * Verify PDF Integrity
 * GET /api/company/esign/documents/:id/verify
 * 
 * Verifies that the signed PDF has not been tampered with
 */
router.get('/:id/verify', esignDocumentController.verifyDocument);

/**
 * Download Evidence Package
 * GET /api/company/esign/documents/:id/evidence-package
 * 
 * Downloads a ZIP file containing:
 * - Signed PDF
 * - Certificate of completion
 * - Audit trail CSV
 * - Verification JSON
 */
router.get('/:id/evidence-package', esignDocumentController.downloadEvidencePackage);

/**
 * Resend Document
 * POST /api/company/esign/documents/:id/resend
 * 
 * Generates new token and resends notification to a specific recipient
 * Body: { recipient_id: string }
 */
router.post('/:id/resend', esignDocumentController.resendDocument);

/**
 * Send Reminder
 * POST /api/company/esign/documents/:id/remind
 * 
 * Sends reminder notifications to all pending recipients
 */
router.post('/:id/remind', esignDocumentController.remindDocument);

/**
 * Cancel Document
 * POST /api/company/esign/documents/:id/cancel
 * 
 * Cancels a document and invalidates all recipient tokens
 * Body: { reason: string }
 */
router.post('/:id/cancel', esignDocumentController.cancelDocument);

/**
 * Download Signed PDF
 * GET /api/company/esign/documents/:id/download
 * 
 * Generates a presigned URL and redirects to download the signed PDF
 */
router.get('/:id/download', esignDocumentController.downloadDocument);

/**
 * Get Document Timeline
 * GET /api/company/esign/documents/:id/timeline
 * 
 * Returns chronological timeline of all events for a document
 */
router.get('/:id/timeline', esignDocumentController.getDocumentTimeline);

/**
 * Bulk Operations
 * POST /api/company/esign/documents/bulk
 * 
 * Performs bulk operations on multiple documents
 * Body: { action: 'cancel' | 'download' | 'resend' | 'delete', document_ids: string[] }
 */
router.post('/bulk', esignDocumentController.bulkOperation);

module.exports = router;
