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

module.exports = router;
