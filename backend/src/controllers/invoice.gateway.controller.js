// Controller for fetching invoices from payment gateways
const Subscription = require('../models/Subscriptions');
const MasterAdmin = require('../models/MasterAdmin');
const env = require('../config/env');

/**
 * Fetch invoice from Stripe
 */
const fetchStripeInvoice = async (subscription) => {
  try {
    // Fetch payment settings from database
    const masterAdmin = await MasterAdmin.findOne();
    
    if (!masterAdmin?.payment_settings?.stripe_secret_key) {
      throw new Error('Stripe credentials not configured. Please configure them in Master Admin → Settings → Payment Settings');
    }
    
    const stripe = require('stripe')(masterAdmin.payment_settings.stripe_secret_key);
    
    const paymentIntentId = subscription.stripe_payment_intent_id;
    if (!paymentIntentId) {
      throw new Error('Stripe Payment Intent ID not found');
    }

    // Fetch payment intent details
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ['charges.data', 'customer']
    });

    // Get charge details
    const charge = paymentIntent.charges?.data?.[0];
    
    return {
      success: true,
      gateway: 'stripe',
      invoice_data: {
        payment_intent_id: paymentIntent.id,
        amount: paymentIntent.amount / 100, // Convert from cents
        currency: paymentIntent.currency.toUpperCase(),
        status: paymentIntent.status,
        created: new Date(paymentIntent.created * 1000),
        description: paymentIntent.description,
        receipt_url: charge?.receipt_url || null,
        receipt_number: charge?.receipt_number || null,
        charge_id: charge?.id || null,
        customer_id: paymentIntent.customer || null,
        payment_method_details: charge?.payment_method_details || null,
      }
    };
  } catch (error) {
    console.error('Stripe invoice fetch error:', error);
    throw new Error(`Failed to fetch Stripe invoice: ${error.message}`);
  }
};

/**
 * Fetch invoice from Razorpay
 */
const fetchRazorpayInvoice = async (subscription) => {
  try {
    // Fetch payment settings from database
    const masterAdmin = await MasterAdmin.findOne();
    
    const Razorpay = require('razorpay');
    
    const razorpayKeyId = masterAdmin?.payment_settings?.razorpay_key_id;
    const razorpayKeySecret = masterAdmin?.payment_settings?.razorpay_key_secret;
    
    // Validate credentials
    if (!razorpayKeyId) {
      throw new Error('Razorpay Key ID is not configured. Please configure it in Master Admin → Settings → Payment Settings');
    }
    
    if (!razorpayKeySecret) {
      throw new Error('Razorpay Key Secret is not configured. Please configure it in Master Admin → Settings → Payment Settings');
    }
    
    const razorpay = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret
    });

    const paymentId = subscription.razorpay_payment_id;
    if (!paymentId) {
      throw new Error('Razorpay Payment ID not found');
    }



    // Fetch payment details
    const payment = await razorpay.payments.fetch(paymentId);

    // Fetch order details if order_id exists
    let orderDetails = null;
    if (subscription.razorpay_order_id) {
      try {
        orderDetails = await razorpay.orders.fetch(subscription.razorpay_order_id);
      } catch (err) {
        console.warn('Could not fetch Razorpay order details:', err.message);
      }
    }

    return {
      success: true,
      gateway: 'razorpay',
      invoice_data: {
        payment_id: payment.id,
        order_id: payment.order_id,
        amount: payment.amount / 100, // Convert from paise
        currency: payment.currency.toUpperCase(),
        status: payment.status,
        method: payment.method,
        created: new Date(payment.created_at * 1000),
        email: payment.email,
        contact: payment.contact,
        description: payment.description,
        card_details: payment.card || null,
        bank: payment.bank || null,
        wallet: payment.wallet || null,
        vpa: payment.vpa || null,
        order_details: orderDetails ? {
          id: orderDetails.id,
          amount: orderDetails.amount / 100,
          currency: orderDetails.currency,
          receipt: orderDetails.receipt,
          status: orderDetails.status,
        } : null,
      }
    };
  } catch (error) {
    console.error('Razorpay invoice fetch error:', error);
    
    // Provide helpful error messages
    if (error.statusCode === 401) {
      throw new Error('Razorpay authentication failed. Please verify your RAZORPAY_KEY_SECRET in backend/src/config/env.js. Get your secret from: https://dashboard.razorpay.com/app/keys');
    }
    
    if (error.statusCode === 400 && error.error?.code === 'BAD_REQUEST_ERROR') {
      throw new Error(`Razorpay API error: ${error.error?.description || 'Invalid request'}. Check your API credentials.`);
    }
    
    throw new Error(`Failed to fetch Razorpay invoice: ${error.message || 'Unknown error'}`);
  }
};

/**
 * Fetch invoice from PayPal
 */
const fetchPayPalInvoice = async (subscription) => {
  try {
    // Fetch payment settings from database
    const masterAdmin = await MasterAdmin.findOne();
    
    const paypal = require('@paypal/checkout-server-sdk');
    
    // PayPal environment setup - use database config
    const clientId = masterAdmin?.payment_settings?.paypal_client_id;
    const clientSecret = masterAdmin?.payment_settings?.paypal_client_secret;
    
    if (!clientId || !clientSecret) {
      throw new Error('PayPal credentials not configured. Please configure them in Master Admin → Settings → Payment Settings');
    }
    
    const environment = new paypal.core.SandboxEnvironment(clientId, clientSecret);
    const client = new paypal.core.PayPalHttpClient(environment);

    const orderId = subscription.paypal_order_id;
    if (!orderId) {
      throw new Error('PayPal Order ID not found');
    }

    // Fetch order details
    const request = new paypal.orders.OrdersGetRequest(orderId);
    const response = await client.execute(request);
    const order = response.result;

    return {
      success: true,
      gateway: 'paypal',
      invoice_data: {
        order_id: order.id,
        status: order.status,
        created: order.create_time,
        updated: order.update_time,
        payer: {
          payer_id: order.payer?.payer_id || subscription.paypal_payer_id,
          email: order.payer?.email_address || subscription.paypal_payer_email,
          name: order.payer?.name ? `${order.payer.name.given_name} ${order.payer.name.surname}` : null,
        },
        purchase_units: order.purchase_units?.map(unit => ({
          amount: {
            value: unit.amount.value,
            currency: unit.amount.currency_code,
          },
          description: unit.description,
          payments: unit.payments,
        })) || [],
        links: order.links || [],
      }
    };
  } catch (error) {
    console.error('PayPal invoice fetch error:', error);
    
    // Handle specific PayPal errors
    if (error.statusCode === 404 || error.name === 'RESOURCE_NOT_FOUND') {
      throw new Error('PayPal Order not found. The order ID in your database may be invalid or was created with different API credentials. Please create a new test payment.');
    }
    
    if (error.statusCode === 401) {
      throw new Error('PayPal authentication failed. Please verify your PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in backend/src/config/env.js');
    }
    
    throw new Error(`Failed to fetch PayPal invoice: ${error.message}`);
  }
};

/**
 * Main controller to fetch invoice from gateway
 */
const fetchInvoiceFromGateway = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const companyId = req.user.company_id;

    // Fetch subscription
    const subscription = await Subscription.findOne({
      _id: subscriptionId,
      company_id: companyId
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    // Check if payment is completed
    if (subscription.payment_status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Invoice is only available for completed payments'
      });
    }

    // Check payment method and transaction ID
    if (!subscription.payment_method) {
      return res.status(400).json({
        success: false,
        message: 'Payment method not found'
      });
    }

    if (!subscription.payment_transaction_id) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID not found'
      });
    }

    let invoiceData;

    // Fetch invoice based on payment gateway
    switch (subscription.payment_method) {
      case 'stripe':
        invoiceData = await fetchStripeInvoice(subscription);
        break;
      
      case 'razorpay':
        invoiceData = await fetchRazorpayInvoice(subscription);
        break;
      
      case 'paypal':
        invoiceData = await fetchPayPalInvoice(subscription);
        break;
      
      default:
        return res.status(400).json({
          success: false,
          message: `Unsupported payment gateway: ${subscription.payment_method}`
        });
    }

    // Add subscription details to invoice data
    invoiceData.subscription_details = {
      subscription_id: subscription._id,
      number_of_days: subscription.number_of_days,
      number_of_users: subscription.number_of_users,
      selected_modules: subscription.selected_modules,
      total_amount: subscription.total_amount,
      subscription_start_date: subscription.subscription_start_date,
      subscription_end_date: subscription.subscription_end_date,
      created_at: subscription.created_at,
    };

    res.status(200).json(invoiceData);

  } catch (error) {
    console.error('Fetch invoice from gateway error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching invoice from payment gateway'
    });
  }
};

/**
 * Get invoice receipt URL (for direct download links)
 */
const getInvoiceReceiptUrl = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const companyId = req.user.company_id;

    const subscription = await Subscription.findOne({
      _id: subscriptionId,
      company_id: companyId
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    if (subscription.payment_status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Receipt is only available for completed payments'
      });
    }

    let receiptUrl = null;

    // Get receipt URL based on payment gateway
    if (subscription.payment_method === 'stripe' && subscription.stripe_payment_intent_id) {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || env.STRIPE_SECRET_KEY);
      const paymentIntent = await stripe.paymentIntents.retrieve(
        subscription.stripe_payment_intent_id,
        { expand: ['charges.data'] }
      );
      receiptUrl = paymentIntent.charges?.data?.[0]?.receipt_url || null;
    } else if (subscription.payment_method === 'razorpay') {
      // Razorpay doesn't provide direct receipt URLs
      // We'll need to generate our own or use their invoice API
      receiptUrl = null;
    } else if (subscription.payment_method === 'paypal') {
      // PayPal doesn't provide direct receipt URLs
      // Users can view receipts in their PayPal account
      receiptUrl = null;
    }

    res.status(200).json({
      success: true,
      receipt_url: receiptUrl,
      payment_method: subscription.payment_method,
      transaction_id: subscription.payment_transaction_id,
    });

  } catch (error) {
    console.error('Get receipt URL error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching receipt URL'
    });
  }
};

/**
 * Send Stripe receipt via email
 */
const sendStripeReceiptEmail = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const companyId = req.user.company_id;

    // Fetch subscription with company details
    const subscription = await Subscription.findOne({
      _id: subscriptionId,
      company_id: companyId
    }).populate('company_id');

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    // Check if payment is completed
    if (subscription.payment_status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Receipt can only be sent for completed payments'
      });
    }

    // Check if payment method is Stripe
    if (subscription.payment_method !== 'stripe') {
      return res.status(400).json({
        success: false,
        message: 'This feature is only available for Stripe payments'
      });
    }

    // Check if we have payment intent ID
    if (!subscription.stripe_payment_intent_id) {
      return res.status(400).json({
        success: false,
        message: 'Stripe Payment Intent ID not found'
      });
    }

    // Fetch payment settings from database
    const masterAdmin = await MasterAdmin.findOne();
    
    if (!masterAdmin?.payment_settings?.stripe_secret_key) {
      return res.status(500).json({
        success: false,
        message: 'Stripe credentials not configured. Please configure them in Master Admin → Settings → Payment Settings'
      });
    }
    
    const stripe = require('stripe')(masterAdmin.payment_settings.stripe_secret_key);
    
    // Fetch payment intent details with expanded charges
    const paymentIntent = await stripe.paymentIntents.retrieve(
      subscription.stripe_payment_intent_id,
      { expand: ['charges.data', 'latest_charge'] }
    );


    // Get charge details - try multiple ways
    let charge = null;
    
    // Method 1: From expanded charges array
    if (paymentIntent.charges?.data && paymentIntent.charges.data.length > 0) {
      charge = paymentIntent.charges.data[0];
    }
    
    // Method 2: From latest_charge if expanded
    if (!charge && paymentIntent.latest_charge && typeof paymentIntent.latest_charge === 'object') {
      charge = paymentIntent.latest_charge;
    }
    
    // Method 3: Fetch charge directly using latest_charge ID
    if (!charge && paymentIntent.latest_charge && typeof paymentIntent.latest_charge === 'string') {
      try {
        charge = await stripe.charges.retrieve(paymentIntent.latest_charge);
      } catch (chargeError) {
        console.error('Error fetching charge:', chargeError);
      }
    }
    
    // Method 4: Use stripe_charge_id from subscription if available
    if (!charge && subscription.stripe_charge_id) {
      try {
        charge = await stripe.charges.retrieve(subscription.stripe_charge_id);
      } catch (chargeError) {
        console.error('Error fetching charge from subscription:', chargeError);
      }
    }
    
    if (!charge || !charge.id) {
      console.error('No charge found. Payment Intent:', {
        id: paymentIntent.id,
        status: paymentIntent.status,
        latest_charge: paymentIntent.latest_charge,
        charges_count: paymentIntent.charges?.data?.length || 0
      });
      
      return res.status(400).json({
        success: false,
        message: 'Charge ID not found for this payment. The payment may not be fully processed yet.'
      });
    }


    // Get customer email from multiple sources
    const customerEmail = charge.billing_details?.email || 
                         charge.receipt_email || 
                         paymentIntent.receipt_email ||
                         subscription.company_id?.email;

    if (!customerEmail) {
      return res.status(400).json({
        success: false,
        message: 'Customer email not found. Cannot send receipt.'
      });
    }


    // Send receipt using Stripe API
    // Stripe automatically sends receipts when we update the charge with receipt_email
    const updatedCharge = await stripe.charges.update(charge.id, {
      receipt_email: customerEmail
    });


    res.status(200).json({
      success: true,
      message: 'Receipt sent successfully',
      email: customerEmail,
      charge_id: charge.id,
      receipt_url: updatedCharge.receipt_url || charge.receipt_url
    });

  } catch (error) {
    console.error('❌ Send Stripe receipt email error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error sending receipt email'
    });
  }
};

/**
 * Send PayPal receipt via email
 */
const sendPayPalReceiptEmail = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const companyId = req.user.company_id;

    // Fetch subscription with company details
    const subscription = await Subscription.findOne({
      _id: subscriptionId,
      company_id: companyId
    }).populate('company_id');

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    // Check if payment is completed
    if (subscription.payment_status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Receipt can only be sent for completed payments'
      });
    }

    // Check if payment method is PayPal
    if (subscription.payment_method !== 'paypal') {
      return res.status(400).json({
        success: false,
        message: 'This feature is only available for PayPal payments'
      });
    }

    // Check if we have PayPal order ID
    if (!subscription.paypal_order_id) {
      return res.status(400).json({
        success: false,
        message: 'PayPal Order ID not found'
      });
    }

    // Fetch payment settings from database
    const masterAdmin = await MasterAdmin.findOne();
    
    const paypal = require('@paypal/checkout-server-sdk');
    
    // PayPal environment setup
    const clientId = masterAdmin?.payment_settings?.paypal_client_id;
    const clientSecret = masterAdmin?.payment_settings?.paypal_client_secret;
    
    if (!clientId || !clientSecret) {
      return res.status(500).json({
        success: false,
        message: 'PayPal credentials not configured. Please configure them in Master Admin → Settings → Payment Settings'
      });
    }
    
    const environment = new paypal.core.SandboxEnvironment(clientId, clientSecret);
    const client = new paypal.core.PayPalHttpClient(environment);


    // Fetch order details
    const request = new paypal.orders.OrdersGetRequest(subscription.paypal_order_id);
    const response = await client.execute(request);
    const order = response.result;


    // Get customer email from multiple sources
    const customerEmail = subscription.paypal_payer_email || 
                         order.payer?.email_address ||
                         subscription.company_id?.email;

    if (!customerEmail) {
      return res.status(400).json({
        success: false,
        message: 'Customer email not found. Cannot send receipt.'
      });
    }


    // Get payment details
    const purchaseUnit = order.purchase_units?.[0];
    const capture = purchaseUnit?.payments?.captures?.[0];
    
    // Prepare email content
    const mailService = require('../config/mailer');
    
    const emailSubject = `Payment Receipt - Order ${order.id}`;
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0070ba;">Payment Receipt</h2>
        <p>Thank you for your payment via PayPal.</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Transaction Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0;"><strong>Order ID:</strong></td>
              <td style="padding: 8px 0;">${order.id}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Status:</strong></td>
              <td style="padding: 8px 0;">${order.status}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Amount:</strong></td>
              <td style="padding: 8px 0;">${purchaseUnit?.amount?.currency_code} ${purchaseUnit?.amount?.value}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Date:</strong></td>
              <td style="padding: 8px 0;">${new Date(order.create_time).toLocaleString()}</td>
            </tr>
            ${capture ? `
            <tr>
              <td style="padding: 8px 0;"><strong>Capture ID:</strong></td>
              <td style="padding: 8px 0;">${capture.id}</td>
            </tr>
            ` : ''}
          </table>
        </div>
        
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Subscription Details</h3>
          <p><strong>Duration:</strong> ${subscription.number_of_days} days</p>
          <p><strong>Users:</strong> ${subscription.number_of_users}</p>
          <p><strong>Start Date:</strong> ${new Date(subscription.subscription_start_date).toLocaleDateString()}</p>
          <p><strong>End Date:</strong> ${new Date(subscription.subscription_end_date).toLocaleDateString()}</p>
        </div>
        
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          This is an automated receipt. Please keep this for your records.
        </p>
      </div>
    `;

    // Send email using nodemailer
    await mailService.sendEmail({
      to: customerEmail,
      subject: emailSubject,
      html: emailBody
    });


    res.status(200).json({
      success: true,
      message: 'Receipt sent successfully',
      email: customerEmail,
      order_id: order.id,
      transaction_details: {
        status: order.status,
        amount: purchaseUnit?.amount?.value,
        currency: purchaseUnit?.amount?.currency_code,
        capture_id: capture?.id
      }
    });

  } catch (error) {
    console.error('❌ Send PayPal receipt email error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error sending receipt email'
    });
  }
};

/**
 * Send Razorpay receipt via email
 */
const sendRazorpayReceiptEmail = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const companyId = req.user.company_id;

    // Fetch subscription with company details
    const subscription = await Subscription.findOne({
      _id: subscriptionId,
      company_id: companyId
    }).populate('company_id');

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    // Check if payment is completed
    if (subscription.payment_status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Receipt can only be sent for completed payments'
      });
    }

    // Check if payment method is Razorpay
    if (subscription.payment_method !== 'razorpay') {
      return res.status(400).json({
        success: false,
        message: 'This feature is only available for Razorpay payments'
      });
    }

    // Check if we have payment ID
    if (!subscription.razorpay_payment_id) {
      return res.status(400).json({
        success: false,
        message: 'Razorpay Payment ID not found'
      });
    }

    // Fetch payment settings from database
    const masterAdmin = await MasterAdmin.findOne();
    
    const razorpayKeyId = masterAdmin?.payment_settings?.razorpay_key_id;
    const razorpayKeySecret = masterAdmin?.payment_settings?.razorpay_key_secret;
    
    // Validate Razorpay credentials
    if (!razorpayKeyId) {
      return res.status(500).json({
        success: false,
        message: 'Razorpay Key ID is not configured. Please configure it in Master Admin → Settings → Payment Settings'
      });
    }
    
    if (!razorpayKeySecret) {
      return res.status(500).json({
        success: false,
        message: 'Razorpay Key Secret is not configured. Please configure it in Master Admin → Settings → Payment Settings'
      });
    }

    const Razorpay = require('razorpay');
    const razorpay = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret
    });


    // Fetch payment details
    const payment = await razorpay.payments.fetch(subscription.razorpay_payment_id);


    // Get customer email from multiple sources
    const customerEmail = payment.email || 
                         subscription.company_id?.email;

    if (!customerEmail) {
      return res.status(400).json({
        success: false,
        message: 'Customer email not found. Cannot send receipt.'
      });
    }


    // Razorpay doesn't have a direct API to send receipts for completed payments
    // So we'll generate a professional receipt and send it via email
    const mailService = require('../config/mailer');
    
    // Fetch order details if available
    let orderDetails = null;
    if (subscription.razorpay_order_id) {
      try {
        orderDetails = await razorpay.orders.fetch(subscription.razorpay_order_id);
      } catch (err) {
        console.warn('Could not fetch order details:', err.message);
      }
    }

    // Get payment method details
    let paymentMethodDetails = '';
    if (payment.method === 'card' && payment.card) {
      paymentMethodDetails = `${payment.card.network} ending in ${payment.card.last4}`;
    } else if (payment.method === 'upi' && payment.vpa) {
      paymentMethodDetails = payment.vpa;
    } else if (payment.method === 'wallet' && payment.wallet) {
      paymentMethodDetails = payment.wallet;
    } else if (payment.method === 'netbanking' && payment.bank) {
      paymentMethodDetails = payment.bank;
    } else {
      paymentMethodDetails = payment.method;
    }
    
    const emailSubject = `Payment Receipt - ${payment.id}`;
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #528ff0; margin: 0;">Payment Receipt</h1>
          <p style="color: #666; margin: 5px 0;">Thank you for your payment</p>
        </div>

        <!-- Success Badge -->
        <div style="background-color: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 5px; text-align: center; margin-bottom: 20px;">
          <strong>✓ Payment Successful</strong>
        </div>
        
        <!-- Transaction Details -->
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="margin-top: 0; color: #333; border-bottom: 2px solid #528ff0; padding-bottom: 10px;">Transaction Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; color: #666;"><strong>Payment ID:</strong></td>
              <td style="padding: 10px 0; text-align: right; color: #333;">${payment.id}</td>
            </tr>
            ${orderDetails ? `
            <tr>
              <td style="padding: 10px 0; color: #666;"><strong>Order ID:</strong></td>
              <td style="padding: 10px 0; text-align: right; color: #333;">${orderDetails.id}</td>
            </tr>
            ${orderDetails.receipt ? `
            <tr>
              <td style="padding: 10px 0; color: #666;"><strong>Receipt No:</strong></td>
              <td style="padding: 10px 0; text-align: right; color: #333;">${orderDetails.receipt}</td>
            </tr>
            ` : ''}
            ` : ''}
            <tr>
              <td style="padding: 10px 0; color: #666;"><strong>Status:</strong></td>
              <td style="padding: 10px 0; text-align: right;">
                <span style="background-color: #28a745; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px;">
                  ${payment.status.toUpperCase()}
                </span>
              </td>
            </tr>
            <tr style="border-top: 1px solid #dee2e6;">
              <td style="padding: 10px 0; color: #666;"><strong>Amount Paid:</strong></td>
              <td style="padding: 10px 0; text-align: right; color: #28a745; font-size: 18px; font-weight: bold;">
                ${payment.currency} ${(payment.amount / 100).toFixed(2)}
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #666;"><strong>Payment Method:</strong></td>
              <td style="padding: 10px 0; text-align: right; color: #333; text-transform: capitalize;">
                ${paymentMethodDetails}
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #666;"><strong>Transaction Date:</strong></td>
              <td style="padding: 10px 0; text-align: right; color: #333;">
                ${new Date(payment.created_at * 1000).toLocaleString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric', 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </td>
            </tr>
            ${payment.email ? `
            <tr>
              <td style="padding: 10px 0; color: #666;"><strong>Email:</strong></td>
              <td style="padding: 10px 0; text-align: right; color: #333;">${payment.email}</td>
            </tr>
            ` : ''}
            ${payment.contact ? `
            <tr>
              <td style="padding: 10px 0; color: #666;"><strong>Contact:</strong></td>
              <td style="padding: 10px 0; text-align: right; color: #333;">${payment.contact}</td>
            </tr>
            ` : ''}
          </table>
        </div>
        
        <!-- Subscription Details -->
        <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ffc107;">
          <h3 style="margin-top: 0; color: #856404;">Subscription Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #856404;"><strong>Plan Duration:</strong></td>
              <td style="padding: 8px 0; text-align: right; color: #856404;">${subscription.number_of_days} days</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #856404;"><strong>Number of Users:</strong></td>
              <td style="padding: 8px 0; text-align: right; color: #856404;">${subscription.number_of_users}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #856404;"><strong>Start Date:</strong></td>
              <td style="padding: 8px 0; text-align: right; color: #856404;">
                ${new Date(subscription.subscription_start_date).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #856404;"><strong>End Date:</strong></td>
              <td style="padding: 8px 0; text-align: right; color: #856404;">
                ${new Date(subscription.subscription_end_date).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </td>
            </tr>
          </table>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding: 20px 0; border-top: 1px solid #dee2e6; margin-top: 30px;">
          <p style="color: #666; font-size: 12px; margin: 5px 0;">
            This is an automated payment receipt generated by Razorpay.
          </p>
          <p style="color: #666; font-size: 12px; margin: 5px 0;">
            Please keep this receipt for your records.
          </p>
          <p style="color: #999; font-size: 11px; margin: 15px 0 0 0;">
            Powered by Razorpay
          </p>
        </div>
      </div>
    `;

    await mailService.sendEmail({
      to: customerEmail,
      subject: emailSubject,
      html: emailBody
    });

    res.status(200).json({
      success: true,
      message: 'Receipt sent successfully',
      email: customerEmail,
      payment_id: payment.id,
      order_id: orderDetails?.id || subscription.razorpay_order_id,
      transaction_details: {
        status: payment.status,
        amount: payment.amount / 100,
        currency: payment.currency,
        method: payment.method,
        payment_method_details: paymentMethodDetails
      }
    });

  } catch (error) {
    console.error('❌ Send Razorpay receipt email error:', error);
    
    // Provide helpful error messages
    if (error.statusCode === 401) {
      return res.status(500).json({
        success: false,
        message: 'Razorpay authentication failed. Please verify your credentials.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Error sending receipt email'
    });
  }
};

module.exports = {
  fetchInvoiceFromGateway,
  getInvoiceReceiptUrl,
  sendStripeReceiptEmail,
  sendPayPalReceiptEmail,
  sendRazorpayReceiptEmail,
};
