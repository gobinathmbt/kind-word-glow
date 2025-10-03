const express = require('express');
const { protect, authorize, companyScopeCheck } = require('../middleware/auth');
const {
  checkWorkshopCompletion,
  completeWorkshop,
  getWorkshopReports,
  getWorkshopReport
} = require('../controllers/workshopReport.controller');

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);
router.use(authorize('company_super_admin', 'company_admin'));
router.use(companyScopeCheck);

// Workshop report routes
router.get('/vehicle/:vehicleId/:vehicleType/check-completion', checkWorkshopCompletion);
router.post('/vehicle/:vehicleId/:vehicleType/complete', completeWorkshop);
router.get('/vehicle/:vehicleId/:vehicleType', getWorkshopReports);
router.get('/report/:reportId', getWorkshopReport);

module.exports = router;