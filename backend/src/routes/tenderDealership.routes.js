const express = require('express');
const { protect, authorize, companyScopeCheck } = require('../middleware/auth');
const tenantContext = require('../middleware/tenantContext');
const {
  getTenderDealerships,
  getTenderDealership,
  createTenderDealership,
  updateTenderDealership,
  deleteTenderDealership,
  toggleTenderDealershipStatus
} = require('../controllers/tenderDealership.controller');

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);
router.use(authorize('company_super_admin', 'company_admin'));
router.use(companyScopeCheck);
router.use(tenantContext);

// Tender Dealership CRUD routes
router.get('/', getTenderDealerships);
router.get('/:id', getTenderDealership);
router.post('/', authorize('company_super_admin'), createTenderDealership);
router.put('/:id', authorize('company_super_admin'), updateTenderDealership);
router.delete('/:id', authorize('company_super_admin'), deleteTenderDealership);
router.patch('/:id/status', authorize('company_super_admin'), toggleTenderDealershipStatus);

module.exports = router;
