
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getPricingConfig,
  calculatePrice,
  createSubscription,
  updatePaymentStatus,
  getCompanySubscription,
  getSubscriptionHistory,
  getCompanySubscriptionInfo
} = require('../controllers/subscription.controller');

// All routes require authentication
router.use(protect);

// Get pricing configuration
router.get('/pricing-config', getPricingConfig);

// Calculate subscription price
router.post('/calculate-price', calculatePrice);

// Create subscription (company super admin only)
router.post('/create', authorize('company_super_admin'), createSubscription);

// Update payment status
router.patch('/:subscriptionId/payment-status', authorize('company_super_admin'), updatePaymentStatus);

// Get company subscription
router.get('/current', authorize('company_super_admin', 'company_admin'), getCompanySubscription);

// Get subscription history
router.get('/history', authorize('company_super_admin'), getSubscriptionHistory);

// Get company subscription info
router.get('/company-info', authorize('company_super_admin', 'company_admin'), getCompanySubscriptionInfo);

module.exports = router;
