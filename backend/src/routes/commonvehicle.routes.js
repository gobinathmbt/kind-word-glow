const express = require('express');
const { protect, authorize, companyScopeCheck } = require('../middleware/auth');
const {
  updateVehicleDealership,
  getVehiclesForBulkOperations,
  getPricingReadyVehicles,
  togglePricingReady,
  saveVehicleCostDetails,
} = require('../controllers/commonvehicle.controller');

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);
router.use(authorize('company_super_admin', 'company_admin'));
router.use(companyScopeCheck);

// Bulk operations routes
router.put('/update-dealership', updateVehicleDealership);
router.get('/bulk-operations', getVehiclesForBulkOperations);

// Pricing routes
router.get('/pricing-ready', getPricingReadyVehicles);
router.patch('/pricing-ready/:vehicleId', togglePricingReady);
router.put('/:vehicleId/:vehicleType/cost-details', saveVehicleCostDetails);

module.exports = router;