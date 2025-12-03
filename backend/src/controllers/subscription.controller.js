
const Plan = require('../models/Plan');
const Subscription = require('../models/Subscriptions');
const Company = require('../models/Company');
const MasterAdmin = require('../models/MasterAdmin');
const { logEvent } = require('./logs.controller');
const env = require('../config/env');

// Get pricing configuration
const getPricingConfig = async (req, res) => {
  try {
    const plan = await Plan.findOne({ is_active: true });
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'No active pricing plan found'
      });
    }

    res.status(200).json({
      success: true,
      data: plan
    });
  } catch (error) {
    console.error('Get pricing config error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pricing configuration'
    });
  }
};

// Calculate subscription price
const calculatePrice = async (req, res) => {
  try {
    const { number_of_days, number_of_users, selected_modules, is_upgrade, is_renewal } = req.body;

    const plan = await Plan.findOne({ is_active: true });
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'No active pricing plan found'
      });
    }

    // Calculate user cost
    // Calculate user cost (only charge when at least one module is selected)
    let userCost = 0;
    if (selected_modules && selected_modules.length > 0) {
      userCost = plan.per_user_cost * number_of_users;
    }

    // Calculate module cost
    let moduleCost = 0;
    const moduleDetails = [];

    if (selected_modules && selected_modules.length > 0) {
      for (const moduleName of selected_modules) {
        const moduleConfig = plan.modules.find(m => m.module_name === moduleName);
        if (moduleConfig) {
          moduleCost += moduleConfig.cost_per_module;
          moduleDetails.push({
            display_value: moduleConfig.display_value,
            module_name: moduleName,
            cost: moduleConfig.cost_per_module
          });
        }
      }
    }

    // For upgrades, calculate based on remaining days
    let effectiveDays = number_of_days;
    let discountAmount = 0;
    
    if (is_upgrade) {
      const companyId = req.user.company_id;
      const company = await Company.findById(companyId);
      
      if (company && company.subscription_end_date) {
        const now = new Date();
        const endDate = new Date(company.subscription_end_date);
        const remainingDays = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));
        effectiveDays = remainingDays;
        
        // Calculate discount for existing subscription - only for current modules/users
        const currentModuleCost = company.module_access.reduce((sum, moduleName) => {
          const moduleConfig = plan.modules.find(m => m.module_name === moduleName);
          return sum + (moduleConfig?.cost_per_module || 0);
        }, 0);
        
        const currentDailyRate = (company.number_of_users * plan.per_user_cost) + currentModuleCost;
        discountAmount = currentDailyRate * remainingDays;
      }
    }

    // Calculate total for the period
    const dailyRate = userCost + moduleCost;
    let totalAmount = dailyRate * effectiveDays;
    
    if (is_upgrade && discountAmount > 0) {
      totalAmount = Math.max(0, totalAmount - discountAmount);
    }

    res.status(200).json({
      success: true,
      data: {
        per_user_cost: plan.per_user_cost,
        user_cost: userCost,
        module_cost: moduleCost,
        daily_rate: dailyRate,
        total_amount: totalAmount,
        effective_days: effectiveDays,
        discount_amount: discountAmount,
        module_details: moduleDetails,
        is_upgrade,
        is_renewal,
        breakdown: {
          users: `${number_of_users} users × $${plan.per_user_cost} × ${effectiveDays} days = $${userCost * effectiveDays}`,
          modules: `Modules × ${effectiveDays} days = $${moduleCost * effectiveDays}`,
          discount: discountAmount > 0 ? `Discount: -$${discountAmount}` : '',
          total: `Total = $${totalAmount}`
        }
      }
    });
  } catch (error) {
    console.error('Calculate price error:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating price'
    });
  }
};

// Create subscription
const createSubscription = async (req, res) => {
  try {
    const {
      number_of_days,
      number_of_users,
      selected_modules,
      total_amount,
      payment_method,
      is_upgrade,
      is_renewal,
      billing_info
    } = req.body;

    const companyId = req.user.company_id;
    const company = await Company.findById(companyId);

    // Clean up old pending subscriptions (older than 15 minutes) for this company
    await Subscription.deleteMany({
      company_id: companyId,
      payment_status: 'pending',
      created_at: { $lt: new Date(Date.now() - 15 * 60 * 1000) }
    });

    // Check for recent pending subscription to reuse (prevent duplicates)
    const recentPending = await Subscription.findOne({
      company_id: companyId,
      payment_status: 'pending',
      payment_method: payment_method,
      created_at: { $gte: new Date(Date.now() - 10 * 60 * 1000) }
    });

    if (recentPending) {
      return res.status(200).json({
        success: true,
        data: recentPending
      });
    }

    let startDate, endDate;
    
    if (is_upgrade) {
      // For upgrades, use current dates
      startDate = company.subscription_start_date || new Date();
      endDate = company.subscription_end_date || new Date();
    } else if (is_renewal) {
      // For renewals, start from current end date or now
      startDate = company.subscription_end_date && company.subscription_end_date > new Date() 
        ? company.subscription_end_date 
        : new Date();
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + number_of_days);
    } else {
      // New subscription
      startDate = new Date();
      endDate = new Date();
      endDate.setDate(startDate.getDate() + number_of_days);
    }

    const gracePeriodEnd = new Date(endDate);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 2);

    const plan = await Plan.findOne({ is_active: true });
    const moduleDetails = [];

    if (selected_modules && selected_modules.length > 0) {
      for (const moduleName of selected_modules) {
        const moduleConfig = plan.modules.find(m => m.module_name === moduleName);
        if (moduleConfig) {
          moduleDetails.push({
            module_name: moduleName,
            cost: moduleConfig.cost_per_module
          });
        }
      }
    }

    const subscription = new Subscription({
      company_id: companyId,
      number_of_days,
      number_of_users,
      selected_modules: moduleDetails,
      total_amount,
      subscription_start_date: startDate,
      subscription_end_date: endDate,
      grace_period_end: gracePeriodEnd,
      payment_method,
      payment_status: 'pending'
    });

    // Create payment gateway order/intent based on payment method
    if (payment_method === 'razorpay') {
      try {
        // Fetch payment settings from database
        const masterAdmin = await MasterAdmin.findOne();
        
        if (!masterAdmin?.payment_settings?.razorpay_key_id || !masterAdmin?.payment_settings?.razorpay_key_secret) {
          throw new Error('Razorpay credentials not configured. Please configure them in Master Admin → Settings → Payment Settings');
        }
        
        const Razorpay = require('razorpay');
        const razorpay = new Razorpay({
          key_id: masterAdmin.payment_settings.razorpay_key_id,
          key_secret: masterAdmin.payment_settings.razorpay_key_secret
        });

        // Convert amount to paise (smallest currency unit)
        const amountInPaise = Math.round(total_amount * 100);

        const razorpayOrder = await razorpay.orders.create({
          amount: amountInPaise,
          currency: 'INR',
          receipt: `sub_${subscription._id}`,
          notes: {
            subscription_id: subscription._id.toString(),
            company_id: companyId.toString()
          }
        });

        subscription.razorpay_order_id = razorpayOrder.id;
      } catch (razorpayError) {
        console.error('Razorpay order creation error:', razorpayError);
        // Continue without Razorpay order - frontend will handle gracefully
      }
    } else if (payment_method === 'stripe') {
      try {
        // Fetch payment settings from database
        const masterAdmin = await MasterAdmin.findOne();
        
        if (!masterAdmin?.payment_settings?.stripe_secret_key) {
          throw new Error('Stripe credentials not configured. Please configure them in Master Admin → Settings → Payment Settings');
        }
        
        const stripe = require('stripe')(masterAdmin.payment_settings.stripe_secret_key);
        
        // Convert amount to cents (smallest currency unit for USD)
        const amountInCents = Math.round(total_amount * 100);

        const paymentIntent = await stripe.paymentIntents.create({
          amount: amountInCents,
          currency: 'usd',
          metadata: {
            subscription_id: subscription._id.toString(),
            company_id: companyId.toString()
          },
          description: `Subscription for ${number_of_users} users - ${number_of_days} days`
        });

        subscription.stripe_payment_intent_id = paymentIntent.id;
        subscription.stripe_client_secret = paymentIntent.client_secret;
      } catch (stripeError) {
        console.error('Stripe payment intent creation error:', stripeError);
        // Continue without Stripe payment intent - frontend will handle gracefully
      }
    }

    await subscription.save();

    // // Generate invoice
    // const { generateInvoice } = require('./invoice.controller');
    // try {
    //   await generateInvoice(subscription._id, billing_info);
    // } catch (invoiceError) {
    //   console.error('Failed to generate invoice:', invoiceError);
    //   // Don't fail the subscription creation if invoice generation fails
    // }

    // DO NOT update Company table here - wait for payment confirmation
    // Company will be updated only when payment status is 'completed' in updatePaymentStatus

    await logEvent({
      event_type: 'system_operation',
      event_action: 'subscription_created',
      event_description: `Subscription created for company (pending payment)`,
      company_id: companyId,
      user_id: req.user.id,
      metadata: {
        subscription_id: subscription._id,
        amount: total_amount,
        payment_method
      }
    });

    res.status(201).json({
      success: true,
      data: subscription
    });
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating subscription'
    });
  }
};


// Update payment status
const updatePaymentStatus = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { 
      payment_status, 
      payment_transaction_id,
      // Razorpay specific
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      // Stripe specific
      stripe_payment_intent_id,
      stripe_charge_id,
      stripe_customer_id,
      // PayPal specific
      paypal_order_id,
      paypal_payer_id,
      paypal_payer_email
    } = req.body;

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    // Prevent updating completed payment to failed (race condition protection)
    if (subscription.payment_status === 'completed' && payment_status === 'failed') {
      return res.status(200).json({
        success: true,
        message: 'Payment already completed',
        data: subscription
      });
    }

    // Update payment status
    // Only two final states: "completed" or "failed"
    
    // If payment failed, delete the pending subscription instead of updating it
    if (payment_status === 'failed') {
      await Subscription.findByIdAndDelete(subscriptionId);
      
      await logEvent({
        event_type: 'system_operation',
        event_action: 'payment_failed',
        event_description: `Payment failed - subscription deleted`,
        company_id: subscription.company_id,
        metadata: {
          subscription_id: subscriptionId,
          payment_method: subscription.payment_method,
          amount: subscription.total_amount
        }
      });

      return res.status(200).json({
        success: true,
        message: 'Payment failed - subscription not saved',
        data: { deleted: true }
      });
    }
    subscription.payment_status = payment_status;
    
    // Store generic transaction ID
    if (payment_transaction_id) {
      subscription.payment_transaction_id = payment_transaction_id;
    }
    
    // Store Razorpay payment details (only if payment method is Razorpay)
    if (subscription.payment_method === 'razorpay') {
      if (razorpay_payment_id) {
        subscription.razorpay_payment_id = razorpay_payment_id;
        subscription.payment_transaction_id = razorpay_payment_id; // Also store as transaction ID
      }
      if (razorpay_order_id) {
        subscription.razorpay_order_id = razorpay_order_id;
      }
      if (razorpay_signature) {
        subscription.razorpay_signature = razorpay_signature;
      }
    }
    
    // Store Stripe payment details (only if payment method is Stripe)
    if (subscription.payment_method === 'stripe') {
      if (stripe_payment_intent_id) {
        subscription.stripe_payment_intent_id = stripe_payment_intent_id;
        subscription.payment_transaction_id = stripe_payment_intent_id; // Also store as transaction ID
      }
      if (stripe_charge_id) {
        subscription.stripe_charge_id = stripe_charge_id;
      }
      if (stripe_customer_id) {
        subscription.stripe_customer_id = stripe_customer_id;
      }
    }
    
    // Store PayPal payment details (only if payment method is PayPal)
    if (subscription.payment_method === 'paypal') {
      if (paypal_order_id) {
        subscription.paypal_order_id = paypal_order_id;
        subscription.payment_transaction_id = paypal_order_id; // Also store as transaction ID
      }
      if (paypal_payer_id) {
        subscription.paypal_payer_id = paypal_payer_id;
      }
      if (paypal_payer_email) {
        subscription.paypal_payer_email = paypal_payer_email;
      }
    }

    await subscription.save();

    // If payment completed, update company subscription status and module access
    if (payment_status === 'completed') {
      // Extract module names from subscription
      const moduleNames = subscription.selected_modules.map(m => m.module_name);
      
      // Calculate grace period end
      const gracePeriodEnd = new Date(subscription.subscription_end_date);
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 2);

      await Company.findByIdAndUpdate(subscription.company_id, {
        module_access: moduleNames, // store only module names
        subscription_status: 'active',
        subscription_start_date: subscription.subscription_start_date,
        subscription_end_date: subscription.subscription_end_date,
        grace_period_end: gracePeriodEnd,
        number_of_days: subscription.number_of_days,
        number_of_users: subscription.number_of_users,
        user_limit: subscription.number_of_users
      });

      await logEvent({
        event_type: 'system_operation',
        event_action: 'payment_completed',
        event_description: `Payment completed for subscription`,
        company_id: subscription.company_id,
        metadata: {
          subscription_id: subscription._id,
          transaction_id: payment_transaction_id
        }
      });
    }

    res.status(200).json({
      success: true,
      data: subscription
    });
  } catch (error) {
    console.error('Update payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating payment status'
    });
  }
};

// Get company subscription
const getCompanySubscription = async (req, res) => {
  try {
    const companyId = req.user.company_id;

    const subscription = await Subscription.findOne({
      company_id: companyId,
      is_active: true
    }).sort({ created_at: -1 });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        ...subscription.toObject(),
        subscription_status: subscription.subscription_status,
        days_remaining: subscription.days_remaining
      }
    });
  } catch (error) {
    console.error('Get company subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching subscription'
    });
  }
};

const getSubscriptionStatus = async (req, res) => {
  try {
    const companyId = req.user.company_id;
    
    // Get company with subscription status
    const company = await Company.findById(companyId);
    
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }
    
    // Get active subscription if exists
    const activeSubscription = await Subscription.findOne({
      company_id: companyId,
      is_active: true
    }).sort({ created_at: -1 });
    
    res.status(200).json({
      success: true,
      data: {
        status: company.subscription_status,
        ends_at: company.subscription_end_date,
        active_subscription: activeSubscription,
        grace_period: activeSubscription?.grace_period_end || null,
        days_remaining: activeSubscription?.days_remaining || 0
      }
    });
  } catch (error) {
    console.error('Get subscription status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching subscription status'
    });
  }
};

// Get subscription history
const getSubscriptionHistory = async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get total count for pagination info
    const totalSubscriptions = await Subscription.countDocuments({
      company_id: companyId
    });

    // Get paginated subscriptions
    const subscriptions = await Subscription.find({
      company_id: companyId
    })
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(limit);

    const history = subscriptions.map(sub => ({
      ...sub.toObject(),
      subscription_status: sub.subscription_status,
      days_remaining: sub.days_remaining
    }));

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalSubscriptions / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.status(200).json({
      success: true,
      data: history,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalItems: totalSubscriptions,
        itemsPerPage: limit,
        hasNextPage: hasNextPage,
        hasPrevPage: hasPrevPage
      }
    });
  } catch (error) {
    console.error('Get subscription history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching subscription history'
    });
  }
};

// CRON job to check expired subscriptions
const checkExpiredSubscriptions = async () => {
  try {
    const now = new Date();
    
    // Find companies whose grace period has ended
    const expiredCompanies = await Company.find({
      subscription_status: { $in: ['active', 'grace_period'] },
      grace_period_end: { $lt: now }
    });

    for (const company of expiredCompanies) {
      await Company.findByIdAndUpdate(company._id, {
        subscription_status: 'inactive'
      });

    }

    // Update companies entering grace period
    const gracePeriodCompanies = await Company.find({
      subscription_status: 'active',
      subscription_end_date: { $lt: now },
      grace_period_end: { $gt: now }
    });

    for (const company of gracePeriodCompanies) {
      await Company.findByIdAndUpdate(company._id, {
        subscription_status: 'grace_period'
      });
      
    }

    // Clean up abandoned pending subscriptions
    await cleanupPendingSubscriptions();

  } catch (error) {
    console.error('CRON job error:', error);
  }
};

// Clean up abandoned pending subscriptions (can be called by cron job)
const cleanupPendingSubscriptions = async () => {
  try {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    
    const result = await Subscription.deleteMany({
      payment_status: 'pending',
      created_at: { $lt: fifteenMinutesAgo }
    });

    return result.deletedCount;
  } catch (error) {
    console.error('Cleanup pending subscriptions error:', error);
    return 0;
  }
};

// Get company subscription info for current user
const getCompanySubscriptionInfo = async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const company = await Company.findById(companyId);
    
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    const now = new Date();
    let daysRemaining = 0;
    let canRenew = false;
    
    if (company.subscription_end_date) {
      const endDate = new Date(company.subscription_end_date);
      daysRemaining = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));
      
      // Can renew if subscription has ended or in grace period
      canRenew = endDate <= now || company.subscription_status === 'grace_period';
    }

    res.status(200).json({
      success: true,
      data: {
        subscription_status: company.subscription_status,
        subscription_start_date: company.subscription_start_date,
        subscription_end_date: company.subscription_end_date,
        grace_period_end: company.grace_period_end,
        number_of_days: company.number_of_days,
        number_of_users: company.number_of_users,
        module_access: company.module_access,
        days_remaining: daysRemaining,
        can_renew: canRenew
      }
    });
  } catch (error) {
    console.error('Get company subscription info error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching subscription info'
    });
  }
};

module.exports = {
  getPricingConfig,
  calculatePrice,
  createSubscription,
  updatePaymentStatus,
  getCompanySubscription,
  getSubscriptionHistory,
  getSubscriptionStatus,
  checkExpiredSubscriptions,
  getCompanySubscriptionInfo,
  cleanupPendingSubscriptions
};
