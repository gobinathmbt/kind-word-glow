const Invoice = require('../models/Invoice');
const Subscription = require('../models/Subscriptions');
const Company = require('../models/Company');
const { logEvent } = require('./logs.controller');

// Generate invoice for subscription
const generateInvoice = async (subscriptionId, billingInfo = {}) => {
  try {
    const subscription = await Subscription.findById(subscriptionId).populate('company_id');
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Create invoice items
    const items = [
      {
        description: `Subscription (${subscription.number_of_days} days, ${subscription.number_of_users} users)`,
        quantity: 1,
        unit_price: subscription.total_amount,
        total_price: subscription.total_amount
      }
    ];

    // Add module items
    if (subscription.selected_modules && subscription.selected_modules.length > 0) {
      subscription.selected_modules.forEach(module => {
        items.push({
          description: `Module: ${module.module_name}`,
          quantity: subscription.number_of_days,
          unit_price: module.cost,
          total_price: module.cost * subscription.number_of_days
        });
      });
    }

    const invoice = new Invoice({
      subscription_id: subscriptionId,
      company_id: subscription.company_id._id,
      invoice_date: new Date(),
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      billing_info: {
        name: billingInfo.name || subscription.company_id.company_name,
        email: billingInfo.email || subscription.company_id.contact_email,
        address: billingInfo.address || '',
        city: billingInfo.city || '',
        postal_code: billingInfo.postal_code || '',
        country: billingInfo.country || 'US',
        phone: billingInfo.phone || ''
      },
      items,
      subtotal: subscription.total_amount,
      tax_rate: 0,
      tax_amount: 0,
      discount_amount: 0,
      total_amount: subscription.total_amount,
      payment_method: subscription.payment_method,
      payment_status: subscription.payment_status === 'completed' ? 'paid' : 'pending'
    });

    await invoice.save();
    return invoice;
  } catch (error) {
    console.error('Generate invoice error:', error);
    throw error;
  }
};

// Get invoices for company
const getInvoices = async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const { page = 1, limit = 10, status, search } = req.query;
    const skip = (page - 1) * limit;

    let query = { company_id: companyId };

    if (status && status !== 'all') {
      query.payment_status = status;
    }

    if (search) {
      query.$or = [
        { invoice_number: new RegExp(search, 'i') },
        { 'billing_info.name': new RegExp(search, 'i') },
        { 'billing_info.email': new RegExp(search, 'i') }
      ];
    }

    const [invoices, total] = await Promise.all([
      Invoice.find(query)
        .populate('subscription_id', 'number_of_days number_of_users selected_modules')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Invoice.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: {
        invoices,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching invoices'
    });
  }
};

// Get invoice by ID
const getInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const companyId = req.user.company_id;

    const invoice = await Invoice.findOne({
      _id: invoiceId,
      company_id: companyId
    }).populate([
      { path: 'subscription_id', select: 'number_of_days number_of_users selected_modules' },
      { path: 'company_id', select: 'company_name contact_email' }
    ]);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    res.status(200).json({
      success: true,
      data: invoice
    });
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching invoice'
    });
  }
};

// Update invoice payment status
const updateInvoicePaymentStatus = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { payment_status, payment_transaction_id, payment_date } = req.body;
    const companyId = req.user.company_id;

    const invoice = await Invoice.findOne({
      _id: invoiceId,
      company_id: companyId
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    invoice.payment_status = payment_status;
    if (payment_transaction_id) {
      invoice.payment_transaction_id = payment_transaction_id;
    }
    if (payment_date) {
      invoice.payment_date = payment_date;
    } else if (payment_status === 'paid') {
      invoice.payment_date = new Date();
    }

    await invoice.save();

    await logEvent({
      event_type: 'system_operation',
      event_action: 'invoice_updated',
      event_description: `Invoice payment status updated to ${payment_status}`,
      company_id: companyId,
      user_id: req.user.id,
      metadata: {
        invoice_id: invoiceId,
        payment_status,
        transaction_id: payment_transaction_id
      }
    });

    res.status(200).json({
      success: true,
      data: invoice
    });
  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating invoice'
    });
  }
};

// Get invoice statistics
const getInvoiceStats = async (req, res) => {
  try {
    const companyId = req.user.company_id;

    const [totalInvoices, paidInvoices, pendingInvoices, overdueInvoices] = await Promise.all([
      Invoice.countDocuments({ company_id: companyId }),
      Invoice.countDocuments({ company_id: companyId, payment_status: 'paid' }),
      Invoice.countDocuments({ company_id: companyId, payment_status: 'pending' }),
      Invoice.countDocuments({
        company_id: companyId,
        payment_status: 'pending',
        due_date: { $lt: new Date() }
      })
    ]);

    const totalAmount = await Invoice.aggregate([
      { $match: { company_id: companyId } },
      { $group: { _id: null, total: { $sum: '$total_amount' } } }
    ]);

    const paidAmount = await Invoice.aggregate([
      { $match: { company_id: companyId, payment_status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$total_amount' } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        total_invoices: totalInvoices,
        paid_invoices: paidInvoices,
        pending_invoices: pendingInvoices,
        overdue_invoices: overdueInvoices,
        total_amount: totalAmount[0]?.total || 0,
        paid_amount: paidAmount[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('Get invoice stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching invoice statistics'
    });
  }
};

module.exports = {
  generateInvoice,
  getInvoices,
  getInvoice,
  updateInvoicePaymentStatus,
  getInvoiceStats
};