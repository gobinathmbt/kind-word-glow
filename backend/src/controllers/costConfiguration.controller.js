const CostConfiguration = require('../models/CostConfiguration');
const Currency = require('../models/Currency');
const { logEvent } = require('./logs.controller');

// Helper function to populate currency data
const populateCurrencyData = async (costConfig, companyId) => {
  const currencyDoc = await Currency.findOne({ company_id: companyId });
  
  if (currencyDoc && costConfig.cost_types) {
    costConfig.cost_types = costConfig.cost_types.map(ct => {
      const ctObj = ct.toObject ? ct.toObject() : ct;
      if (ctObj.currency_id && currencyDoc.currencies) {
        const currency = currencyDoc.currencies.find(
          c => c._id.toString() === ctObj.currency_id.toString()
        );
        if (currency) {
          ctObj.currency_id = currency;
        }
      }
      return ctObj;
    });
  }
  
  return costConfig;
};

// @desc    Get cost configuration for company
// @route   GET /api/company/cost-configuration
// @access  Private (Company Super Admin)
const getCostConfiguration = async (req, res) => {
  try {
    let costConfig = await CostConfiguration.findOne({
      company_id: req.user.company_id
    }).lean();
    
    if (!costConfig) {
      // Create default configuration if doesn't exist
      costConfig = await CostConfiguration.create({
        company_id: req.user.company_id,
        cost_types: [],
        created_by: req.user.id
      });
      costConfig = costConfig.toObject();
    }
    
    // Populate currency data
    costConfig = await populateCurrencyData(costConfig, req.user.company_id);
    
    res.status(200).json({
      success: true,
      data: costConfig
    });
  } catch (error) {
    console.error('Get cost configuration error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving cost configuration'
    });
  }
};

// @desc    Add cost type
// @route   POST /api/company/cost-configuration/cost-types
// @access  Private (Company Super Admin)
const addCostType = async (req, res) => {
  try {
    const { cost_type, currency_id, default_tax_rate, default_tax_type, section_type, change_currency  } = req.body;
    
    let costConfig = await CostConfiguration.findOne({
      company_id: req.user.company_id
    });
    
    if (!costConfig) {
      costConfig = await CostConfiguration.create({
        company_id: req.user.company_id,
        cost_types: [],
        created_by: req.user.id
      });
    }
    
    // Calculate display order
    const maxOrder = costConfig.cost_types.reduce((max, ct) => 
      ct.display_order > max ? ct.display_order : max, 0
    );
    
    const newCostType = {
      cost_type,
      currency_id,
      default_tax_rate: default_tax_rate || '',
      default_tax_type: default_tax_type || '',
      section_type: section_type || '',
      change_currency: change_currency || false,
      display_order: maxOrder + 1
    };
    
    costConfig.cost_types.push(newCostType);
    await costConfig.save();
    
    // Populate currency data
    let responseConfig = await populateCurrencyData(costConfig.toObject(), req.user.company_id);
    
    await logEvent(
      req.user.company_id,
      'create',
      'cost_type',
      costConfig._id,
      req.user.id,
      null,
      { cost_type, section_type }
    );
    
    res.status(201).json({
      success: true,
      data: responseConfig,
      message: 'Cost type added successfully'
    });
  } catch (error) {
    console.error('Add cost type error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding cost type'
    });
  }
};

// @desc    Update cost type
// @route   PUT /api/company/cost-configuration/cost-types/:costTypeId
// @access  Private (Company Super Admin)
const updateCostType = async (req, res) => {
  try {
    const { costTypeId } = req.params;
    const { cost_type, currency_id, default_tax_rate, default_tax_type, section_type, change_currency } = req.body;
    
    const costConfig = await CostConfiguration.findOne({
      company_id: req.user.company_id
    });
    
    if (!costConfig) {
      return res.status(404).json({
        success: false,
        message: 'Cost configuration not found'
      });
    }
    
    const costTypeIndex = costConfig.cost_types.findIndex(
      ct => ct._id.toString() === costTypeId
    );
    
    if (costTypeIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Cost type not found'
      });
    }
    
    const oldData = costConfig.cost_types[costTypeIndex].toObject();
    
    if (cost_type) costConfig.cost_types[costTypeIndex].cost_type = cost_type;
    if (currency_id) costConfig.cost_types[costTypeIndex].currency_id = currency_id;
    if (default_tax_rate !== undefined) costConfig.cost_types[costTypeIndex].default_tax_rate = default_tax_rate;
    if (default_tax_type !== undefined) costConfig.cost_types[costTypeIndex].default_tax_type = default_tax_type;
    if (section_type !== undefined) costConfig.cost_types[costTypeIndex].section_type = section_type;
    if (change_currency !== undefined) costConfig.cost_types[costTypeIndex].change_currency = change_currency;

    costConfig.cost_types[costTypeIndex].updated_at = new Date();
    
    await costConfig.save();
    
    // Populate currency data
    let responseConfig = await populateCurrencyData(costConfig.toObject(), req.user.company_id);
    
    await logEvent(
      req.user.company_id,
      'update',
      'cost_type',
      costConfig._id,
      req.user.id,
      oldData,
      costConfig.cost_types[costTypeIndex].toObject()
    );
    
    res.status(200).json({
      success: true,
      data: responseConfig,
      message: 'Cost type updated successfully'
    });
  } catch (error) {
    console.error('Update cost type error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating cost type'
    });
  }
};

// @desc    Delete cost type
// @route   DELETE /api/company/cost-configuration/cost-types/:costTypeId
// @access  Private (Company Super Admin)
const deleteCostType = async (req, res) => {
  try {
    const { costTypeId } = req.params;
    
    const costConfig = await CostConfiguration.findOne({
      company_id: req.user.company_id
    });
    
    if (!costConfig) {
      return res.status(404).json({
        success: false,
        message: 'Cost configuration not found'
      });
    }
    
    const costTypeIndex = costConfig.cost_types.findIndex(
      ct => ct._id.toString() === costTypeId
    );
    
    if (costTypeIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Cost type not found'
      });
    }
    
    const oldData = costConfig.cost_types[costTypeIndex].toObject();
    
    costConfig.cost_types.splice(costTypeIndex, 1);
    await costConfig.save();
    
    // Populate currency data
    let responseConfig = await populateCurrencyData(costConfig.toObject(), req.user.company_id);
    
    await logEvent(
      req.user.company_id,
      'delete',
      'cost_type',
      costConfig._id,
      req.user.id,
      oldData,
      null
    );
    
    res.status(200).json({
      success: true,
      data: responseConfig,
      message: 'Cost type deleted successfully'
    });
  } catch (error) {
    console.error('Delete cost type error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting cost type'
    });
  }
};

// @desc    Reorder cost types
// @route   PUT /api/company/cost-configuration/cost-types/reorder
// @access  Private (Company Super Admin)
const reorderCostTypes = async (req, res) => {
  try {
    const { section_type, cost_type_ids } = req.body;
    
    const costConfig = await CostConfiguration.findOne({
      company_id: req.user.company_id
    });
    
    if (!costConfig) {
      return res.status(404).json({
        success: false,
        message: 'Cost configuration not found'
      });
    }
    
    // Update display order for cost types in the section
    cost_type_ids.forEach((id, index) => {
      const costType = costConfig.cost_types.find(ct => ct._id.toString() === id);
      if (costType) {
        costType.display_order = index + 1;
        costType.updated_at = new Date();
      }
    });
    
    await costConfig.save();
    
    // Populate currency data
    let responseConfig = await populateCurrencyData(costConfig.toObject(), req.user.company_id);
    
    await logEvent(
      req.user.company_id,
      'reorder',
      'cost_types',
      costConfig._id,
      req.user.id,
      null,
      { section_type, new_order: cost_type_ids }
    );
    
    res.status(200).json({
      success: true,
      data: responseConfig,
      message: 'Cost types reordered successfully'
    });
  } catch (error) {
    console.error('Reorder cost types error:', error);
    res.status(500).json({
      success: false,
      message: 'Error reordering cost types'
    });
  }
};


// @desc    Get cost configuration by vehicle purchase type
// @route   GET /api/company/cost-configuration/vehicle-type/:vehiclePurchaseType
// @access  Private
const getCostConfigurationByVehicleType = async (req, res) => {

  try {
    const { vehiclePurchaseType } = req.params;
    // Find cost configuration for the company
    const costConfig = await CostConfiguration.findOne({
      company_id: req.user.company_id
    }).lean();

    if (!costConfig) {
      return res.status(404).json({
        success: false,
        message: 'Cost configuration not found'
      });
    }

    // Find cost setter configuration for the specific vehicle purchase type
    const costSetter = costConfig.cost_setter.find(
      cs => cs.vehicle_purchase_type.toLowerCase() === vehiclePurchaseType.toLowerCase()
    );

    if (!costSetter) {
      return res.status(404).json({
        success: false,
        message: `Cost configuration for vehicle type '${vehiclePurchaseType}' not found`
      });
    }

    // Get all available currencies for the company
    const currencyDoc = await Currency.findOne({ company_id: req.user.company_id }).lean();
    const available_company_currency = currencyDoc ? currencyDoc.currencies : [];

    // Get enabled cost types for this vehicle purchase type
    const enabledCostTypeIds = costSetter.enabled_cost_types.map(id => id.toString());
    
    // Filter cost types that are enabled for this vehicle type
    let enabledCostTypes = costConfig.cost_types.filter(ct => 
      enabledCostTypeIds.includes(ct._id.toString())
    );

    // Populate currency data for enabled cost types
    const populatedData = await populateCurrencyData(
      { cost_types: enabledCostTypes }, 
      req.user.company_id
    );
    
    // Replace the currency_id with populated data
    enabledCostTypes = populatedData.cost_types;

    // Group cost types by section_type
    const groupedCostTypes = enabledCostTypes.reduce((acc, costType) => {
      const section = costType.section_type || 'Uncategorized';
      
      if (!acc[section]) {
        acc[section] = [];
      }
      
      // Transform cost type data for frontend
      const transformedCostType = {
        _id: costType._id,
        cost_type: costType.cost_type,
        currency_id: costType.currency_id, // This now contains populated currency data
        default_tax_rate: costType.default_tax_rate,
        default_tax_type: costType.default_tax_type,
        section_type: costType.section_type,
        change_currency: costType.change_currency,
        display_order: costType.display_order,
        created_at: costType.created_at,
        updated_at: costType.updated_at
      };
      
      acc[section].push(transformedCostType);
      return acc;
    }, {});

    // Sort cost types within each section by display_order
    Object.keys(groupedCostTypes).forEach(section => {
      groupedCostTypes[section].sort((a, b) => a.display_order - b.display_order);
    });

    // Convert to array format for easier frontend consumption
    const sections = Object.keys(groupedCostTypes).map(sectionName => ({
      section_name: sectionName,
      cost_types: groupedCostTypes[sectionName],
      display_order: Math.min(...groupedCostTypes[sectionName].map(ct => ct.display_order))
    }));

    // Sort sections by display order
    sections.sort((a, b) => a.display_order - b.display_order);

    const response = {
      vehicle_purchase_type: vehiclePurchaseType,
      sections: sections,
      cost_setter_id: costSetter._id,
      total_enabled_cost_types: enabledCostTypes.length,
      available_company_currency: available_company_currency // Add all available currencies
    };

    await logEvent(
      req.user.company_id,
      'view',
      'cost_configuration_by_vehicle_type',
      costConfig._id,
      req.user.id,
      null,
      { 
        vehicle_purchase_type: vehiclePurchaseType, 
        enabled_cost_types_count: enabledCostTypes.length,
        available_currencies_count: available_company_currency.length 
      }
    );

    res.status(200).json({
      success: true,
      data: response,
      message: `Cost configuration for ${vehiclePurchaseType} retrieved successfully`
    });

  } catch (error) {
    console.error('Get cost configuration by vehicle type error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving cost configuration for vehicle type'
    });
  }
};

module.exports = {
  getCostConfiguration,
  addCostType,
  updateCostType,
  deleteCostType,
  reorderCostTypes,
  getCostConfigurationByVehicleType
};
