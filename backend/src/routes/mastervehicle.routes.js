const express = require('express');
const { protect, authorize, companyScopeCheck } = require('../middleware/auth');
const {
  getMasterVehicles,
  getMasterVehicle,
  createMasterVehicle,
  updateMasterVehicle,
  deleteMasterVehicle
} = require('../controllers/mastervehicle.controller');

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);
router.use(authorize('company_super_admin', 'company_admin'));
router.use(companyScopeCheck);

// Master vehicle routes
router.get('/', getMasterVehicles);
router.get('/:id', getMasterVehicle);
router.post('/', createMasterVehicle);
router.put('/:id', updateMasterVehicle);
router.delete('/:id', deleteMasterVehicle);

module.exports = router;