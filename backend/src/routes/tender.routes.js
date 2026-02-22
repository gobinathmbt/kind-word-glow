const express = require('express');
const { protect, authorize, companyScopeCheck } = require('../middleware/auth');
const tenantContext = require('../middleware/tenantContext');
const {
  getTenders,
  getTender,
  createTender,
  updateTender,
  deleteTender,
  toggleTenderStatus,
  sendTender,
  getTenderRecipients,
  getTenderDealershipStatusSummary,
  getDealershipQuoteDetails,
  getAvailableDealerships,
  getTenderHistory,
  approveQuote,
  closeTender
} = require('../controllers/tender.controller');

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);
router.use(authorize('company_super_admin', 'company_admin'));
router.use(companyScopeCheck);
router.use(tenantContext);

// Tender CRUD routes
router.get('/', getTenders);
router.get('/:id', getTender);
router.post('/', createTender);
router.put('/:id', updateTender);
router.delete('/:id', deleteTender);
router.patch('/:id/status', toggleTenderStatus);

// Tender distribution routes
router.post('/:id/send', sendTender);
router.get('/:id/recipients', getTenderRecipients);
router.get('/:id/dealership-status-summary', getTenderDealershipStatusSummary);
router.get('/:id/dealership-quote/:dealershipId', getDealershipQuoteDetails);
router.get('/:id/available-dealerships', getAvailableDealerships);

// Tender history route
router.get('/:id/history', getTenderHistory);

// Order management routes
router.post('/:id/approve-quote', approveQuote);
router.post('/:id/close', closeTender);

module.exports = router;
