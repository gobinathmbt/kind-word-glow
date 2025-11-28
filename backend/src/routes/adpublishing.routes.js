const express = require('express');
const { protect, authorize, companyScopeCheck } = require('../middleware/auth');
const {
  getAdVehicles,
  getAdVehicle,
  createAdVehicle,
  updateAdVehicle,
  deleteAdVehicle,
  publishAdVehicle
} = require('../controllers/adpublishing.controller');

const {
  getVehicleAdvertisements,
  createAdvertisement,
  updateAdvertisement,
  publishAdvertisement,
  deleteAdvertisement,
  withdrawAdvertisement,
  getAdvertisementHistory,
  getAdvertisementLogs
} = require('../controllers/advertisement.controller');

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);
router.use(authorize('company_super_admin', 'company_admin'));
router.use(companyScopeCheck);

// Advertisement vehicle routes
router.get('/', getAdVehicles);
router.get('/:id', getAdVehicle);
router.post('/', createAdVehicle);
router.put('/:id', updateAdVehicle);
router.delete('/:id', deleteAdVehicle);
router.post('/:id/publish', publishAdVehicle);

// Advertisement platform routes (for external publishing)
router.get('/:vehicleId/advertisements', getVehicleAdvertisements);
router.post('/:vehicleId/advertisements', createAdvertisement);
router.put('/:vehicleId/advertisements/:advertisementId', updateAdvertisement);
router.get('/:vehicleId/advertisements/:advertisementId/history', getAdvertisementHistory);
router.get('/:vehicleId/advertisements/:advertisementId/logs', getAdvertisementLogs);
router.post('/:vehicleId/advertisements/:advertisementId/publish', publishAdvertisement);
router.post('/:vehicleId/advertisements/:advertisementId/withdraw', withdrawAdvertisement);
router.delete('/:vehicleId/advertisements/:advertisementId', deleteAdvertisement);

module.exports = router;