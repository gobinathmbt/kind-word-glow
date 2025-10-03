
const express = require('express');
const { protect, authorize, companyScopeCheck } = require('../middleware/auth');
const {
  getInspections,
  startInspection,
  getInspection,
  updateInspection,
  completeInspection,
  getInspectionReport
} = require('../controllers/inspection.controller');

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);
router.use(authorize('company_super_admin', 'company_admin'));
router.use(companyScopeCheck);

// Inspection routes
router.get('/', getInspections);
router.post('/start/:vehicleId', startInspection);
router.get('/:id', getInspection);
router.put('/:id', updateInspection);
router.post('/:id/complete', completeInspection);
router.get('/:id/report', getInspectionReport);

module.exports = router;
