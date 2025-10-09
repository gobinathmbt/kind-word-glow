const Currency = require('../models/Currency');
const { logEvent } = require('./logs.controller');

// @desc    Get all currencies for a company
// @route   GET /api/company/currencies
// @access  Private (Company Super Admin)
const getCurrencies = async (req, res) => {
  try {
    const { search } = req.query;
    
    let currencyDoc = await Currency.findOne({ 
      company_id: req.user.company_id 
    });
    
    if (!currencyDoc) {
      return res.status(200).json({
        success: true,
        data: [],
        pagination: {
          page: 1,
          limit: 100,
          total_records: 0,
          total_pages: 0
        }
      });
    }
    
    let currencies = currencyDoc.currencies || [];
    
    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      currencies = currencies.filter((currency) => 
        currency.currency_name?.toLowerCase().includes(searchLower) ||
        currency.currency_code?.toLowerCase().includes(searchLower) ||
        currency.country?.toLowerCase().includes(searchLower)
      );
    }
    
    res.status(200).json({
      success: true,
      data: currencies,
      pagination: {
        page: 1,
        limit: 100,
        total_records: currencies.length,
        total_pages: 1
      }
    });
  } catch (error) {
    console.error('Get currencies error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving currencies'
    });
  }
};

// @desc    Get single currency
// @route   GET /api/company/currencies/:id
// @access  Private (Company Super Admin)
const getCurrency = async (req, res) => {
  try {
    const currencyDoc = await Currency.findOne({
      company_id: req.user.company_id
    });
    
    if (!currencyDoc) {
      return res.status(404).json({
        success: false,
        message: 'Currency document not found'
      });
    }
    
    const currency = currencyDoc.currencies.id(req.params.id);
    
    if (!currency) {
      return res.status(404).json({
        success: false,
        message: 'Currency not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: currency
    });
  } catch (error) {
    console.error('Get currency error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving currency'
    });
  }
};

// @desc    Create currency
// @route   POST /api/company/currencies
// @access  Private (Company Super Admin)
const createCurrency = async (req, res) => {
  try {
    const { currency_name, currency_code, symbol, country, exchange_rate, symbol_position } = req.body;
    
    let currencyDoc = await Currency.findOne({
      company_id: req.user.company_id
    });
    
    if (!currencyDoc) {
      // Create new currency document for company
      currencyDoc = await Currency.create({
        company_id: req.user.company_id,
        currencies: [],
        created_by: req.user.id
      });
    }
    
    // Check if currency code already exists
    const existingCurrency = currencyDoc.currencies.find(
      (c) => c.currency_code === currency_code.toUpperCase()
    );
    
    if (existingCurrency) {
      return res.status(400).json({
        success: false,
        message: 'Currency code already exists for this company'
      });
    }
    
    const newCurrency = {
      currency_name,
      currency_code: currency_code.toUpperCase(),
      symbol,
      country,
      exchange_rate: exchange_rate || 1,
      symbol_position: symbol_position || 'before',
    };
    
    currencyDoc.currencies.push(newCurrency);
    await currencyDoc.save();
    
    const addedCurrency = currencyDoc.currencies[currencyDoc.currencies.length - 1];
    
    await logEvent(
      req.user.company_id,
      'create',
      'currency',
      currencyDoc._id,
      req.user.id,
      null,
      { currency_name, currency_code }
    );
    
    res.status(201).json({
      success: true,
      data: addedCurrency,
      message: 'Currency created successfully'
    });
  } catch (error) {
    console.error('Create currency error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating currency'
    });
  }
};

// @desc    Update currency
// @route   PUT /api/company/currencies/:id
// @access  Private (Company Super Admin)
const updateCurrency = async (req, res) => {
  try {
    const { currency_name, currency_code, symbol, country, exchange_rate, symbol_position, is_active } = req.body;
    
    const currencyDoc = await Currency.findOne({
      company_id: req.user.company_id
    });
    
    if (!currencyDoc) {
      return res.status(404).json({
        success: false,
        message: 'Currency document not found'
      });
    }
    
    const currency = currencyDoc.currencies.id(req.params.id);
    
    if (!currency) {
      return res.status(404).json({
        success: false,
        message: 'Currency not found'
      });
    }
    
    const oldData = currency.toObject();
    
    // Check if currency code is being changed and if it already exists
    if (currency_code && currency_code.toUpperCase() !== currency.currency_code) {
      const existingCurrency = currencyDoc.currencies.find(
        (c) => c.currency_code === currency_code.toUpperCase() && c._id.toString() !== req.params.id
      );
      
      if (existingCurrency) {
        return res.status(400).json({
          success: false,
          message: 'Currency code already exists for this company'
        });
      }
    }
    
    if (currency_name) currency.currency_name = currency_name;
    if (currency_code) currency.currency_code = currency_code.toUpperCase();
    if (symbol) currency.symbol = symbol;
    if (country) currency.country = country;
    if (exchange_rate !== undefined) currency.exchange_rate = exchange_rate;
    if (symbol_position) currency.symbol_position = symbol_position;
    if (is_active !== undefined) currency.is_active = is_active;
    
    currency.updated_at = new Date();
    
    await currencyDoc.save();
    
    await logEvent(
      req.user.company_id,
      'update',
      'currency',
      currencyDoc._id,
      req.user.id,
      oldData,
      currency.toObject()
    );
    
    res.status(200).json({
      success: true,
      data: currency,
      message: 'Currency updated successfully'
    });
  } catch (error) {
    console.error('Update currency error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating currency'
    });
  }
};

// @desc    Delete currency
// @route   DELETE /api/company/currencies/:id
// @access  Private (Company Super Admin)
const deleteCurrency = async (req, res) => {
  try {
    const currencyDoc = await Currency.findOne({
      company_id: req.user.company_id
    });
    
    if (!currencyDoc) {
      return res.status(404).json({
        success: false,
        message: 'Currency document not found'
      });
    }
    
    const currency = currencyDoc.currencies.id(req.params.id);
    
    if (!currency) {
      return res.status(404).json({
        success: false,
        message: 'Currency not found'
      });
    }
    
    const oldData = currency.toObject();
    
    currency.deleteOne();
    await currencyDoc.save();
    
    await logEvent(
      req.user.company_id,
      'delete',
      'currency',
      currencyDoc._id,
      req.user.id,
      oldData,
      null
    );
    
    res.status(200).json({
      success: true,
      message: 'Currency deleted successfully'
    });
  } catch (error) {
    console.error('Delete currency error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting currency'
    });
  }
};

module.exports = {
  getCurrencies,
  getCurrency,
  createCurrency,
  updateCurrency,
  deleteCurrency
};
