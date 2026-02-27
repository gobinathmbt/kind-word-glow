const express = require('express');
const router = express.Router();
const esignAuditController = require('../controllers/esignAudit.controller');
const auth = require('../middleware/auth');
const tenantContext = require('../middleware/tenantContext');
const moduleAccess = require('../middleware/moduleAccess');

// All routes require authentication, tenant context, and esign module access
router.use(auth);
router.use(tenantContext);
router.use(moduleAccess('esign_documents'));

/**
 * @route   GET /api/company/esign/audit-logs
 * @desc    Query audit logs with filters
 * @access  Private (requires esign_documents module)
 */
router.get('/', esignAuditController.queryAuditLogs);

/**
 * @route   POST /api/company/esign/audit-logs/export
 * @desc    Export audit logs to CSV or JSON
 * @access  Private (requires company_super_admin role)
 */
router.post('/export', esignAuditController.exportAuditLogs);

/**
 * @route   GET /api/company/esign/audit-logs/stats
 * @desc    Get audit log statistics
 * @access  Private (requires esign_documents module)
 */
router.get('/stats', esignAuditController.getAuditStats);

module.exports = router;
