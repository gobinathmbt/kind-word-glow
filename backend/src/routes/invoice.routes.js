const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getInvoices,
  getInvoice,
  updateInvoicePaymentStatus,
  getInvoiceStats
} = require('../controllers/invoice.controller');

// All routes require authentication
router.use(protect);

// Get invoices for company with pagination and filtering
router.get('/', authorize('company_super_admin', 'company_admin'), getInvoices);

// Get invoice statistics
router.get('/stats', authorize('company_super_admin', 'company_admin'), getInvoiceStats);

// Get specific invoice
router.get('/:invoiceId', authorize('company_super_admin', 'company_admin'), getInvoice);

// Update invoice payment status (usually handled by payment webhooks)
router.patch('/:invoiceId/payment-status', authorize('company_super_admin'), updateInvoicePaymentStatus);

module.exports = router;