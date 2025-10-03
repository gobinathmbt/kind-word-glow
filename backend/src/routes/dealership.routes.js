const express = require('express');
const { protect, authorize, companyScopeCheck } = require('../middleware/auth');
const {
  getDealerships,
  getDealership,
  createDealership,
  updateDealership,
  deleteDealership,
  toggleDealershipStatus,
  getDealershipsDropdown
} = require('../controllers/dealership.controller');

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);
router.use(authorize('company_super_admin', 'company_admin'));
router.use(companyScopeCheck);

// Dealership CRUD routes
router.get('/', getDealerships);
router.get('/dropdown', getDealershipsDropdown);
router.get('/:id', getDealership);
router.post('/', authorize('company_super_admin'), createDealership);
router.put('/:id', authorize('company_super_admin'), updateDealership);
router.delete('/:id', authorize('company_super_admin'), deleteDealership);
router.patch('/:id/status', authorize('company_super_admin'), toggleDealershipStatus);

module.exports = router;