const express = require('express');
const { protect, authorize, companyScopeCheck } = require('../middleware/auth');
const tenantContext = require('../middleware/tenantContext');
const {
  getCostSetter,
  updateCostSetter,
  deleteCostSetter
} = require('../controllers/costSetter.controller');

const router = express.Router();

// Apply auth middleware
router.use(protect);
router.use(authorize('company_super_admin'));
router.use(companyScopeCheck);
router.use(tenantContext);

router.get('/', getCostSetter);
router.put('/', updateCostSetter);
router.delete('/:vehiclePurchaseType', deleteCostSetter);

module.exports = router;
