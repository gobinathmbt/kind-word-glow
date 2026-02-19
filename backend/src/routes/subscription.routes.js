
const express = require('express');
const router = express.Router();
const { protect, authorize, companyScopeCheck } = require('../middleware/auth');
const tenantContext = require('../middleware/tenantContext');
const {
  getPricingConfig,
  calculatePrice,
  createSubscription,
  updatePaymentStatus,
  getCompanySubscription,
  getSubscriptionHistory,
  getCompanySubscriptionInfo
} = require('../controllers/subscription.controller');
const {
  fetchInvoiceFromGateway,
  getInvoiceReceiptUrl,
  sendStripeReceiptEmail,
  sendPayPalReceiptEmail,
  sendRazorpayReceiptEmail
} = require('../controllers/invoice.gateway.controller');

// All routes require authentication
router.use(protect);
router.use(authorize('company_super_admin', 'company_admin'));
router.use(companyScopeCheck);
router.use(tenantContext);

// Get pricing configuration
router.get('/pricing-config', getPricingConfig);

// Calculate subscription price
router.post('/calculate-price', calculatePrice);

// Create subscription (company super admin only)
router.post('/create', authorize('company_super_admin'), createSubscription);

// Update payment status
router.patch('/:subscriptionId/payment-status', authorize('company_super_admin'), updatePaymentStatus);

// Get company subscription
router.get('/current', getCompanySubscription);

// Get subscription history
router.get('/history', authorize('company_super_admin'), getSubscriptionHistory);

// Get company subscription info
router.get('/company-info', getCompanySubscriptionInfo);

// Fetch invoice from payment gateway
router.get('/:subscriptionId/invoice-from-gateway', authorize('company_super_admin'), fetchInvoiceFromGateway);

// Get invoice receipt URL
router.get('/:subscriptionId/receipt-url', authorize('company_super_admin'), getInvoiceReceiptUrl);

// Send Stripe receipt via email
router.post('/:subscriptionId/send-stripe-receipt', authorize('company_super_admin'), sendStripeReceiptEmail);

// Send PayPal receipt via email
router.post('/:subscriptionId/send-paypal-receipt', authorize('company_super_admin'), sendPayPalReceiptEmail);

// Send Razorpay receipt via email
router.post('/:subscriptionId/send-razorpay-receipt', authorize('company_super_admin'), sendRazorpayReceiptEmail);

module.exports = router;
