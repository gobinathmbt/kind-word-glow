const express = require('express');
const { protect, authorize, companyScopeCheck } = require('../middleware/auth');
const {
  getCostConfiguration,
  addCostType,
  updateCostType,
  deleteCostType,
  reorderCostTypes
} = require('../controllers/costConfiguration.controller');

const router = express.Router();

// Apply auth middleware
router.use(protect);
router.use(authorize('company_super_admin'));
router.use(companyScopeCheck);

router.get('/', getCostConfiguration);
router.post('/cost-types', addCostType);
router.put('/cost-types/:costTypeId', updateCostType);
router.delete('/cost-types/:costTypeId', deleteCostType);
router.put('/cost-types/reorder', reorderCostTypes);

module.exports = router;
