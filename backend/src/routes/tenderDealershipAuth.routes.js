const express = require('express');
const {
  dealershipLogin,
  getDealershipTenders,
  getDealershipTender,
  submitQuote,
  withdrawQuote,
  getQuotesByStatus,
  getOrdersByStatus,
  acceptOrder,
  deliverOrder,
  abortOrder,
} = require('../controllers/tenderDealershipAuth.controller');
const { protectDealership } = require('../middleware/auth');
const tenantContext = require('../middleware/tenantContext');

const router = express.Router();

// Public routes (no authentication required)
router.post('/login', dealershipLogin);

// Protected dealership routes
router.use(protectDealership);
router.use(tenantContext);

// Tender viewing routes
router.get('/tenders', getDealershipTenders);
router.get('/tenders/:id', getDealershipTender);

// Quote and Order viewing routes
router.get('/quotes', getQuotesByStatus);
router.get('/orders', getOrdersByStatus);

// Quote submission and withdrawal routes
router.post('/tenders/:id/quote', submitQuote);
router.post('/tenders/:id/withdraw', withdrawQuote);

// Order management routes
router.post('/orders/:id/accept', acceptOrder);
router.post('/orders/:id/deliver', deliverOrder);
router.post('/orders/:id/abort', abortOrder);

module.exports = router;
