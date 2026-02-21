const express = require('express');
const { protectDealership } = require('../middleware/auth');
const tenantContext = require('../middleware/tenantContext');
const {
  getTenderDealershipUsers,
  getTenderDealershipUser,
  createTenderDealershipUser,
  updateTenderDealershipUser,
  deleteTenderDealershipUser,
  toggleTenderDealershipUserStatus,
} = require('../controllers/tenderDealershipUser.controller');

const router = express.Router();

// Middleware to check if user is primary_tender_dealership_user
const requirePrimaryDealershipUser = (req, res, next) => {
  if (!req.dealershipUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.dealershipUser.role !== 'primary_tender_dealership_user') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Only primary dealership users can access this resource.'
    });
  }

  next();
};

// Routes accessible by primary_tender_dealership_user only
router.use(protectDealership);
router.use(tenantContext);
router.use(requirePrimaryDealershipUser);

// Tender Dealership User CRUD routes
router.get('/', getTenderDealershipUsers);
router.get('/:id', getTenderDealershipUser);
router.post('/', createTenderDealershipUser);
router.put('/:id', updateTenderDealershipUser);
router.delete('/:id', deleteTenderDealershipUser);
router.patch('/:id/status', toggleTenderDealershipUserStatus);

module.exports = router;
