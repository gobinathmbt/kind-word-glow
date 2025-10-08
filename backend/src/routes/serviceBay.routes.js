const express = require('express');
const { protect, authorize, companyScopeCheck } = require('../middleware/auth');
const {
  getServiceBays,
  getServiceBay,
  createServiceBay,
  updateServiceBay,
  deleteServiceBay,
  toggleServiceBayStatus,
  addBayHoliday,
  getHolidays,
  removeBayHoliday,
  getBaysDropdown
} = require('../controllers/serviceBay.controller');

const router = express.Router();

// Apply auth middleware
router.use(protect);
router.use(companyScopeCheck);

// Routes accessible by both super admin and admin (for dropdown and holidays)
router.get('/dropdown', authorize('company_super_admin', 'company_admin'), getBaysDropdown);
router.post('/:id/holiday', authorize('company_super_admin', 'company_admin'), addBayHoliday);
router.get('/bay-holiday', authorize('company_super_admin', 'company_admin'), getHolidays);
router.delete('/:id/holiday/:holidayId', authorize('company_super_admin', 'company_admin'), removeBayHoliday);

// Routes accessible only by super admin
router.use(authorize('company_super_admin'));

router.get('/', getServiceBays);
router.get('/:id', getServiceBay);
router.post('/', createServiceBay);
router.put('/:id', updateServiceBay);
router.delete('/:id', deleteServiceBay);
router.patch('/:id/status', toggleServiceBayStatus);

module.exports = router;
