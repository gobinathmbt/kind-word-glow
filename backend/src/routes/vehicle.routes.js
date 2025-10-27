
const express = require('express');
const { protect, authorize, companyScopeCheck } = require('../middleware/auth');
const {
  getVehicleStock,
  getVehicleDetail,
  bulkImportVehicles,
  createVehicleStock,
  updateVehicle,
  deleteVehicle,
  receiveVehicleData,
  processQueueManually,

  updateVehicleOverview,
  updateVehicleGeneralInfo,
  updateVehicleSource,
  updateVehicleRegistration,
  updateVehicleImport,
  updateVehicleEngine,
  updateVehicleSpecifications,
  updateVehicleOdometer,
  updateVehicleOwnership,
  getVehicleAttachments,
  uploadVehicleAttachment,
  deleteVehicleAttachment,
  updateVehicleWorkshopStatus,

} = require('../controllers/vehicle.controller');

const router = express.Router();

// Public route for external vehicle data (no auth required)
router.post('/receive', receiveVehicleData);

// Admin route for manual queue processing (no company scope check needed)
router.post('/process-queue', protect, authorize('master_admin', 'company_super_admin'), processQueueManually);

// Apply auth middleware to remaining routes
router.use(protect);
router.use(authorize('company_super_admin', 'company_admin'));
router.use(companyScopeCheck);

// Vehicle management routes
router.get('/stock', getVehicleStock);
router.get('/detail/:vehicleId/:vehicleType', getVehicleDetail);
router.post('/bulk-import', bulkImportVehicles);
router.post('/create-stock', createVehicleStock);
router.put('/:id/:vehicleType', updateVehicle);
router.delete('/:id', deleteVehicle);

// Vehicle section update routes
router.put('/:id/:vehicleType/overview', updateVehicleOverview);
router.put('/:id/:vehicleType/general-info', updateVehicleGeneralInfo);
router.put('/:id/:vehicleType/source', updateVehicleSource);
router.put('/:id/:vehicleType/registration', updateVehicleRegistration);
router.put('/:id/:vehicleType/import', updateVehicleImport);
router.put('/:id/:vehicleType/engine', updateVehicleEngine);
router.put('/:id/:vehicleType/specifications', updateVehicleSpecifications);
router.put('/:id/:vehicleType/odometer', updateVehicleOdometer);
router.put('/:id/:vehicleType/ownership', updateVehicleOwnership);

// Vehicle attachment routes
router.get('/:id/:vehicleType/attachments', getVehicleAttachments);
router.post('/:id/:vehicleType/attachments', uploadVehicleAttachment);
router.delete('/:id/:vehicleType/attachments/:attachmentId', deleteVehicleAttachment);

// Workshop status update
router.put('/:id/:vehicleType/workshop-status', updateVehicleWorkshopStatus);

module.exports = router;
