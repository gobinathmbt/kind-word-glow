const express = require('express');
const router = express.Router();
const { getVehicleLogs, getFieldHistory } = require('../controllers/vehicleActivityLog.controller');
const { protect, authorize, companyScopeCheck } = require('../middleware/auth');
const tenantContext = require('../middleware/tenantContext');

// Apply auth middleware to all routes
router.use(protect);
router.use(authorize('company_super_admin', 'company_admin'));
router.use(companyScopeCheck);
router.use(tenantContext);

// Get field history for a specific vehicle field
router.get('/field-history', getFieldHistory);

// Get activity logs for a vehicle
router.get('/:vehicleType/:stockId', getVehicleLogs);

module.exports = router;
