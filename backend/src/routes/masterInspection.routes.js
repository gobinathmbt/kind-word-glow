const express = require('express');
const { protect, authorize, companyScopeCheck } = require('../middleware/auth');
const {
  getMasterConfiguration,
  getVehicleInspectionData,
  saveInspectionData,
  getActiveConfigurations
} = require('../controllers/masterInspection.controller');

const router = express.Router();

// Public routes (no authentication required for viewing)
router.get('/config/:company_id/:vehicle_type', getMasterConfiguration);
router.get('/active-configs/:company_id/:vehicle_type', getActiveConfigurations);
router.get('/view/:company_id/:vehicle_stock_id/:vehicle_type', getVehicleInspectionData);

// Private routes (authentication required for saving/editing)
router.use(protect);
router.use(authorize('company_super_admin', 'company_admin'));
router.use(companyScopeCheck);

router.post('/save/:company_id/:vehicle_stock_id/:vehicle_type', saveInspectionData);

module.exports = router;