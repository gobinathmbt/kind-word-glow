
const express = require('express');
const { protect, authorize, companyScopeCheck } = require('../middleware/auth');
const {
  getTadeins,
  startAppraisal,
  getTradein,
  updateTradein,
  completeAppraisal,
  makeOffer,
  getTradeinReport
} = require('../controllers/tradein.controller');

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);
router.use(authorize('company_super_admin', 'company_admin'));
router.use(companyScopeCheck);

// Trade-in routes
router.get('/', getTadeins);
router.post('/start/:vehicleId/:vehicleType', startAppraisal);
router.get('/:id', getTradein);
router.put('/:id', updateTradein);
router.post('/:id/complete', completeAppraisal);
router.post('/:id/offer', makeOffer);
router.get('/:id/report', getTradeinReport);

module.exports = router;
