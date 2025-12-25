const express = require('express');
const router = express.Router();
const { getVehicleLogs, getFieldHistory } = require('../controllers/vehicleActivityLog.controller');
const { protect } = require('../middleware/auth');

// Get field history for a specific vehicle field
router.get('/field-history', protect, getFieldHistory);

// Get activity logs for a vehicle
router.get('/:vehicleType/:stockId', protect, getVehicleLogs);

module.exports = router;
