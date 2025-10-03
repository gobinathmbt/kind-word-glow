const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema({
  subscription_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    required: true
  },
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  invoice_number: {
    type: String,
    required: true,
    unique: true
  },
  invoice_date: {
    type: Date,
    required: true,
    default: Date.now
  },
  due_date: {
    type: Date,
    required: true
  },
  billing_info: {
    name: String,
    email: String,
    address: String,
    city: String,
    postal_code: String,
    country: String,
    phone: String
  },
  items: [{
    description: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      default: 1
    },
    unit_price: {
      type: Number,
      required: true
    },
    total_price: {
      type: Number,
      required: true
    }
  }],
  subtotal: {
    type: Number,
    required: true
  },
  tax_rate: {
    type: Number,
    default: 0
  },
  tax_amount: {
    type: Number,
    default: 0
  },
  discount_amount: {
    type: Number,
    default: 0
  },
  total_amount: {
    type: Number,
    required: true
  },
  payment_status: {
    type: String,
    enum: ['pending', 'paid', 'overdue', 'cancelled'],
    default: 'pending'
  },
  payment_method: {
    type: String,
    enum: ['stripe', 'paypal', 'razorpay'],
    required: true
  },
  payment_transaction_id: String,
  payment_date: Date,
  notes: String,
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Generate invoice number
InvoiceSchema.pre('save', async function(next) {
  if (this.isNew && !this.invoice_number) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    // Find the latest invoice for this month
    const lastInvoice = await this.constructor.findOne({
      invoice_number: new RegExp(`^INV-${year}${month}-`)
    }).sort({ invoice_number: -1 });
    
    let sequence = 1;
    if (lastInvoice) {
      const lastSequence = parseInt(lastInvoice.invoice_number.split('-')[2]);
      sequence = lastSequence + 1;
    }
    
    this.invoice_number = `INV-${year}${month}-${String(sequence).padStart(4, '0')}`;
  }
  
  this.updated_at = new Date();
  next();
});

// Index for efficient queries
InvoiceSchema.index({ company_id: 1, created_at: -1 });
InvoiceSchema.index({ subscription_id: 1 });
InvoiceSchema.index({ invoice_number: 1 });
InvoiceSchema.index({ payment_status: 1 });

module.exports = mongoose.model('Invoice', InvoiceSchema);