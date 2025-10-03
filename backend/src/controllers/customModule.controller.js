const CustomModuleConfig = require('../models/CustomModuleConfig');
const Company = require('../models/Company');
const { validationResult } = require('express-validator');

// Get all custom module configurations with pagination and search
const getCustomModuleConfigs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status;

    // Build search query
    let searchQuery = {};
    
    if (search) {
      const companies = await Company.find({
        $or: [
          { company_name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      
      const companyIds = companies.map(company => company._id);
      searchQuery.company_id = { $in: companyIds };
    }
    
    if (status !== undefined && status !== '') {
      searchQuery.is_active = status === 'true';
    }

    const total = await CustomModuleConfig.countDocuments(searchQuery);
    const configs = await CustomModuleConfig.find(searchQuery)
      .populate('company_id', 'company_name email')
      .populate('created_by', 'name email')
      .populate('updated_by', 'name email')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: configs,
      pagination: {
        current_page: page,
        per_page: limit,
        total: total,
        total_pages: totalPages,
        has_next_page: page < totalPages,
        has_prev_page: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching custom module configs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch custom module configurations',
      error: error.message
    });
  }
};

// Get custom module config by ID
const getCustomModuleConfig = async (req, res) => {
  try {
    const { id } = req.params;
    
    const config = await CustomModuleConfig.findById(id)
      .populate('company_id', 'company_name email')
      .populate('created_by', 'name email')
      .populate('updated_by', 'name email');
    
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Custom module configuration not found'
      });
    }

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Error fetching custom module config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch custom module configuration',
      error: error.message
    });
  }
};

// Get custom module config by company ID
const getCustomModuleConfigByCompany = async (req, res) => {
  try {
    const { companyId } = req.params;
    
    const config = await CustomModuleConfig.findOne({ company_id: companyId })
      .populate('company_id', 'company_name email')
      .populate('created_by', 'name email')
      .populate('updated_by', 'name email');

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Error fetching custom module config by company:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch custom module configuration',
      error: error.message
    });
  }
};

// Create or update custom module configuration
const createOrUpdateCustomModuleConfig = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { company_id, custom_modules } = req.body;
    const admin_id = req.user.id;

    // Check if company exists
    const company = await Company.findById(company_id);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Check if configuration already exists
    let config = await CustomModuleConfig.findOne({ company_id });
    
    if (config) {
      // Update existing configuration
      config.custom_modules = custom_modules;
      config.updated_by = admin_id;
      await config.save();
    } else {
      // Create new configuration
      config = new CustomModuleConfig({
        company_id,
        custom_modules,
        created_by: admin_id
      });
      await config.save();
    }

    // Populate the response
    await config.populate('company_id', 'company_name email');
    await config.populate('created_by', 'name email');
    await config.populate('updated_by', 'name email');

    res.status(config.isNew ? 201 : 200).json({
      success: true,
      message: config.isNew ? 'Custom module configuration created successfully' : 'Custom module configuration updated successfully',
      data: config
    });
  } catch (error) {
    console.error('Error creating/updating custom module config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create/update custom module configuration',
      error: error.message
    });
  }
};

// Delete custom module configuration
const deleteCustomModuleConfig = async (req, res) => {
  try {
    const { id } = req.params;
    
    const config = await CustomModuleConfig.findByIdAndDelete(id);
    
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Custom module configuration not found'
      });
    }

    res.json({
      success: true,
      message: 'Custom module configuration deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting custom module config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete custom module configuration',
      error: error.message
    });
  }
};

// Toggle configuration status
const toggleCustomModuleConfigStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    const admin_id = req.user.id;

    const config = await CustomModuleConfig.findByIdAndUpdate(
      id,
      { 
        is_active,
        updated_by: admin_id
      },
      { new: true }
    ).populate('company_id', 'company_name email');

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Custom module configuration not found'
      });
    }

    res.json({
      success: true,
      message: `Custom module configuration ${is_active ? 'activated' : 'deactivated'} successfully`,
      data: config
    });
  } catch (error) {
    console.error('Error toggling custom module config status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle custom module configuration status',
      error: error.message
    });
  }
};

// Get companies without custom module configuration
const getCompaniesWithoutConfig = async (req, res) => {
  try {
    const configuredCompanies = await CustomModuleConfig.find().distinct('company_id');
    
    const companies = await Company.find({
      _id: { $nin: configuredCompanies },
      is_active: true
    }).select('_id company_name email');

    res.json({
      success: true,
      data: companies
    });
  } catch (error) {
    console.error('Error fetching companies without config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch companies without configuration',
      error: error.message
    });
  }
};

module.exports = {
  getCustomModuleConfigs,
  getCustomModuleConfig,
  getCustomModuleConfigByCompany,
  createOrUpdateCustomModuleConfig,
  deleteCustomModuleConfig,
  toggleCustomModuleConfigStatus,
  getCompaniesWithoutConfig
};