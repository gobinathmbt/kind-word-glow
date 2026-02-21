const express = require('express');
const { protect, authorize, companyScopeCheck, protectDealership } = require('../middleware/auth');
const tenantContext = require('../middleware/tenantContext');
const {
  getTenderDealershipUsers,
  getTenderDealershipUser,
  createTenderDealershipUser,
  updateTenderDealershipUser,
  deleteTenderDealershipUser,
  toggleTenderDealershipUserStatus,
  resetTenderDealershipUserPassword
} = require('../controllers/tenderDealershipUser.controller');

const router = express.Router();


// Routes accessible by company admins
router.use(protect);
router.use(authorize('company_super_admin', 'company_admin'));
router.use(companyScopeCheck);
router.use(tenantContext);

// Tender Dealership User CRUD routes
router.get('/', getTenderDealershipUsers);
router.get('/:id', getTenderDealershipUser);
router.post('/', createTenderDealershipUser);
router.put('/:id', updateTenderDealershipUser);
router.delete('/:id', deleteTenderDealershipUser);
router.patch('/:id/status', toggleTenderDealershipUserStatus);
router.post('/:id/reset-password', resetTenderDealershipUserPassword);

module.exports = router;
