
const express = require('express');
const { protect, authorize, companyScopeCheck } = require('../middleware/auth');
const {
  getDropdowns,
  createDropdown,
  updateDropdown,
  deleteDropdown,
  addValue,
  updateValue,
  deleteValue,
  reorderValues,
  getMasterInspection
} = require('../controllers/dropdown.controller');

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);
router.use(authorize('company_super_admin', 'company_admin'));
router.use(companyScopeCheck);

// Dropdown CRUD routes
router.get('/', getDropdowns);
router.post('/', authorize('company_super_admin'), createDropdown);
router.put('/:id', authorize('company_super_admin'), updateDropdown);
router.delete('/:id', authorize('company_super_admin'), deleteDropdown);

// Dropdown values CRUD routes
router.post('/:id/values', authorize('company_super_admin'), addValue);
router.put('/:id/values/:valueId', authorize('company_super_admin'), updateValue);
router.put('/:id/reorder/values', authorize('company_super_admin'), reorderValues);
router.delete('/:id/values/:valueId', authorize('company_super_admin'), deleteValue);

// Special routes
router.get('/master_inspection', getMasterInspection);

module.exports = router;
