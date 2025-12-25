const express = require('express');
const { protect, authorize, companyScopeCheck } = require('../middleware/auth');
const {
  updateVehicleDealership,
  getVehiclesForBulkOperations,
  getPricingReadyVehicles,
  togglePricingReady,
  saveVehicleCostDetails,
  updateVehiclePricing,
  getPricingVehicleAttachments,
  uploadPricingVehicleAttachment,
  deletePricingVehicleAttachment,
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
router.put('/:vehicleId/:vehicleType/pricing', updateVehiclePricing);

// Pricing attachment routes
router.get('/:vehicleId/:vehicleType/attachments', getPricingVehicleAttachments);
router.post('/:vehicleId/:vehicleType/attachments', uploadPricingVehicleAttachment);
router.delete('/:vehicleId/:vehicleType/attachments/:attachmentId', deletePricingVehicleAttachment);

module.exports = router;