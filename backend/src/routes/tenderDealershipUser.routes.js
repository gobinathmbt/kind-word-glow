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

// Middleware to check if user is authorized to manage dealership users
// Can be accessed by:
// 1. Company admins (protect + authorize)
// 2. Primary dealership users (protectDealership with role check)
const checkDealershipUserAccess = (req, res, next) => {
  // If user is authenticated via protect middleware (company admin)
  if (req.user && (req.user.role === 'company_super_admin' || req.user.role === 'company_admin')) {
    return next();
  }
  
  // If user is authenticated via protectDealership middleware
  if (req.dealershipUser && (req.dealershipUser.role === 'primary_tender_dealership_user' || req.dealershipUser.role === 'admin')) {
    // Convert dealershipUser to user format for consistency
    req.user = {
      id: req.dealershipUser.id,
      company_id: req.dealershipUser.company_id,
      role: req.dealershipUser.role
    };
    return next();
  }
  
  return res.status(403).json({
    success: false,
    message: 'Access denied. Only company admins or primary dealership users can manage users.'
  });
};

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
