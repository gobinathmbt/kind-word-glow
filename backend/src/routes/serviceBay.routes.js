const express = require('express');
const { protect, authorize, companyScopeCheck } = require('../middleware/auth');
const tenantContext = require('../middleware/tenantContext');
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

// Apply auth middleware in correct order
router.use(protect);
router.use(authorize('company_super_admin', 'company_admin'));
router.use(companyScopeCheck);
router.use(tenantContext);

// Routes accessible by both super admin and admin (for dropdown and holidays)
router.get('/dropdown', getBaysDropdown);
router.post('/:id/holiday', addBayHoliday);
router.get('/bay-holiday', getHolidays);
router.delete('/:id/holiday/:holidayId', removeBayHoliday);

// Routes accessible only by super admin
router.use(authorize('company_super_admin'));

router.get('/', getServiceBays);
router.get('/:id', getServiceBay);
router.post('/', createServiceBay);
router.put('/:id', updateServiceBay);
router.delete('/:id', deleteServiceBay);
router.patch('/:id/status', toggleServiceBayStatus);

module.exports = router;
