const express = require('express');
const { protect, authorize, companyScopeCheck } = require('../middleware/auth');
const {
  createBayBooking,
  getBayCalendar,
  acceptBayBooking,
  rejectBayBooking,
  startWork,
  submitWork,
  acceptWork,
  requestRework,
  getBookingForField
} = require('../controllers/bayBooking.controller');

const router = express.Router();

// Apply auth middleware
router.use(protect);
router.use(authorize('company_super_admin', 'company_admin'));
router.use(companyScopeCheck);

// Booking routes
router.post('/', createBayBooking);
router.get('/calendar', getBayCalendar);
router.get('/field/:vehicle_type/:vehicle_stock_id/:field_id', getBookingForField);

// Bay user actions
router.post('/:id/accept', acceptBayBooking);
router.post('/:id/reject', rejectBayBooking);
router.post('/:id/start-work', startWork);
router.post('/:id/submit-work', submitWork);

// Company actions
router.post('/:id/accept-work', acceptWork);
router.post('/:id/request-rework', requestRework);

module.exports = router;
