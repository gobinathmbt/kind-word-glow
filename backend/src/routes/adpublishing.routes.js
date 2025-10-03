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

module.exports = router;