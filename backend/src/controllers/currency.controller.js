const Currency = require('../models/Currency');
const { logEvent } = require('./logs.controller');

// @desc    Get all currencies for a company
// @route   GET /api/company/currencies
// @access  Private (Company Super Admin)
const getCurrencies = async (req, res) => {
  try {
    const { page = 1, limit = 100, search, status } = req.query;
    
    const query = { company_id: req.user.company_id };
    
    if (search) {
      query.$or = [
        { currency_name: { $regex: search, $options: 'i' } },
        { currency_code: { $regex: search, $options: 'i' } },
        { country: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status && status !== 'all') {
      query.is_active = status === 'active';
    }
    
    const skip = (page - 1) * limit;
    
    const currencies = await Currency.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Currency.countDocuments(query);
    
    res.status(200).json({
      success: true,
      data: currencies,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total_records: total,
        total_pages: Math.ceil(total / limit)
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
    const currency = await Currency.findOne({
      _id: req.params.id,
      company_id: req.user.company_id
    });
    
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
    
    // Check if currency code already exists for this company
    const existingCurrency = await Currency.findOne({
      company_id: req.user.company_id,
      currency_code: currency_code.toUpperCase()
    });
    
    if (existingCurrency) {
      return res.status(400).json({
        success: false,
        message: 'Currency code already exists for this company'
      });
    }
    
    const currency = await Currency.create({
      company_id: req.user.company_id,
      currency_name,
      currency_code: currency_code.toUpperCase(),
      symbol,
      country,
      exchange_rate: exchange_rate || 1,
      symbol_position: symbol_position || 'before',
      created_by: req.user.id
    });
    
    await logEvent(
      req.user.company_id,
      'create',
      'currency',
      currency._id,
      req.user.id,
      null,
      { currency_name, currency_code }
    );
    
    res.status(201).json({
      success: true,
      data: currency,
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
    
    const currency = await Currency.findOne({
      _id: req.params.id,
      company_id: req.user.company_id
    });
    
    if (!currency) {
      return res.status(404).json({
        success: false,
        message: 'Currency not found'
      });
    }
    
    const oldData = currency.toObject();
    
    // Check if currency code is being changed and if it already exists
    if (currency_code && currency_code.toUpperCase() !== currency.currency_code) {
      const existingCurrency = await Currency.findOne({
        company_id: req.user.company_id,
        currency_code: currency_code.toUpperCase(),
        _id: { $ne: req.params.id }
      });
      
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
    
    await currency.save();
    
    await logEvent(
      req.user.company_id,
      'update',
      'currency',
      currency._id,
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
    const currency = await Currency.findOne({
      _id: req.params.id,
      company_id: req.user.company_id
    });
    
    if (!currency) {
      return res.status(404).json({
        success: false,
        message: 'Currency not found'
      });
    }
    
    const oldData = currency.toObject();
    
    await Currency.deleteOne({ _id: req.params.id });
    
    await logEvent(
      req.user.company_id,
      'delete',
      'currency',
      currency._id,
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
