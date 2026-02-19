const express = require('express');
const router = express.Router();
const { protect, authorize, companyScopeCheck } = require('../middleware/auth');
const tenantContext = require('../middleware/tenantContext');
const {
  getInvoices,
  getInvoice,
  updateInvoicePaymentStatus,
  getInvoiceStats
} = require('../controllers/invoice.controller');

// All routes require authentication
router.use(protect);
router.use(authorize('company_super_admin', 'company_admin'));
router.use(companyScopeCheck);
router.use(tenantContext);

// Get invoices for company with pagination and filtering
router.get('/', getInvoices);

// Get invoice statistics
router.get('/stats', getInvoiceStats);

// Get specific invoice
router.get('/:invoiceId', getInvoice);

// Update invoice payment status (usually handled by payment webhooks)
router.patch('/:invoiceId/payment-status', authorize('company_super_admin'), updateInvoicePaymentStatus);

module.exports = router;