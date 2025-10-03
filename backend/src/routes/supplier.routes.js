const express = require('express');
const { protect, authorize, companyScopeCheck } = require('../middleware/auth');
const {
  getSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  searchSuppliersByTags
} = require('../controllers/supplier.controller');

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);
router.use(authorize('company_super_admin', 'company_admin'));
router.use(companyScopeCheck);

// Supplier CRUD routes
router.get('/', getSuppliers);
router.get('/:id', getSupplier);
router.post('/', createSupplier);
router.put('/:id', updateSupplier);
router.delete('/:id', deleteSupplier);

// Search suppliers by tags
router.post('/search-by-tags', searchSuppliersByTags);

module.exports = router;