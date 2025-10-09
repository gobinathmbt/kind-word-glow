const express = require('express');
const { protect, authorize, companyScopeCheck } = require('../middleware/auth');
const {
  getCurrencies,
  getCurrency,
  createCurrency,
  updateCurrency,
  deleteCurrency
} = require('../controllers/currency.controller');

const router = express.Router();

// Apply auth middleware
router.use(protect);
router.use(authorize('company_super_admin'));
router.use(companyScopeCheck);

router.get('/', getCurrencies);
router.get('/:id', getCurrency);
router.post('/', createCurrency);
router.put('/:id', updateCurrency);
router.delete('/:id', deleteCurrency);

module.exports = router;
