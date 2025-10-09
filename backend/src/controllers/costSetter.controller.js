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

// @desc    Get cost setter configuration
// @route   GET /api/company/cost-configuration/cost-setter
// @access  Private (Company Super Admin)
const getCostSetter = async (req, res) => {
  try {
    let costConfig = await CostConfiguration.findOne({
      company_id: req.user.company_id
    }).lean();
    
    if (!costConfig) {
      costConfig = await CostConfiguration.create({
        company_id: req.user.company_id,
        cost_types: [],
        cost_setter: [],
        created_by: req.user.id
      });
      costConfig = costConfig.toObject();
    }
    
    // Populate currency data
    costConfig = await populateCurrencyData(costConfig, req.user.company_id);
    
    res.status(200).json({
      success: true,
      data: {
        cost_setter: costConfig.cost_setter || [],
        cost_types: costConfig.cost_types || []
      }
    });
  } catch (error) {
    console.error('Get cost setter error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving cost setter configuration'
    });
  }
};

// @desc    Update cost setter for a vehicle purchase type
// @route   PUT /api/company/cost-configuration/cost-setter
// @access  Private (Company Super Admin)
const updateCostSetter = async (req, res) => {
  try {
    const { vehicle_purchase_type, enabled_cost_types } = req.body;
    
    if (!vehicle_purchase_type) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle purchase type is required'
      });
    }
    
    let costConfig = await CostConfiguration.findOne({
      company_id: req.user.company_id
    });
    
    if (!costConfig) {
      costConfig = await CostConfiguration.create({
        company_id: req.user.company_id,
        cost_types: [],
        cost_setter: [],
        created_by: req.user.id
      });
    }
    
    // Find existing cost setter entry for this vehicle_purchase_type
    const existingIndex = costConfig.cost_setter.findIndex(
      cs => cs.vehicle_purchase_type === vehicle_purchase_type
    );
    
    const oldData = existingIndex !== -1 ? costConfig.cost_setter[existingIndex].toObject() : null;
    
    if (existingIndex !== -1) {
      // Update existing
      costConfig.cost_setter[existingIndex].enabled_cost_types = enabled_cost_types || [];
      costConfig.cost_setter[existingIndex].updated_at = new Date();
    } else {
      // Add new
      costConfig.cost_setter.push({
        vehicle_purchase_type,
        enabled_cost_types: enabled_cost_types || [],
      });
    }
    
    await costConfig.save();
    
    // Populate currency data
    let responseConfig = await populateCurrencyData(costConfig.toObject(), req.user.company_id);
    
    await logEvent(
      req.user.company_id,
      existingIndex !== -1 ? 'update' : 'create',
      'cost_setter',
      costConfig._id,
      req.user.id,
      oldData,
      { vehicle_purchase_type, enabled_cost_types }
    );
    
    res.status(200).json({
      success: true,
      data: responseConfig,
      message: 'Cost setter updated successfully'
    });
  } catch (error) {
    console.error('Update cost setter error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating cost setter'
    });
  }
};

// @desc    Delete cost setter entry
// @route   DELETE /api/company/cost-configuration/cost-setter/:vehiclePurchaseType
// @access  Private (Company Super Admin)
const deleteCostSetter = async (req, res) => {
  try {
    const { vehiclePurchaseType } = req.params;
    
    const costConfig = await CostConfiguration.findOne({
      company_id: req.user.company_id
    });
    
    if (!costConfig) {
      return res.status(404).json({
        success: false,
        message: 'Cost configuration not found'
      });
    }
    
    const setterIndex = costConfig.cost_setter.findIndex(
      cs => cs.vehicle_purchase_type === vehiclePurchaseType
    );
    
    if (setterIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Cost setter entry not found'
      });
    }
    
    const oldData = costConfig.cost_setter[setterIndex].toObject();
    
    costConfig.cost_setter.splice(setterIndex, 1);
    await costConfig.save();
    
    await logEvent(
      req.user.company_id,
      'delete',
      'cost_setter',
      costConfig._id,
      req.user.id,
      oldData,
      null
    );
    
    res.status(200).json({
      success: true,
      data: costConfig,
      message: 'Cost setter entry deleted successfully'
    });
  } catch (error) {
    console.error('Delete cost setter error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting cost setter entry'
    });
  }
};

module.exports = {
  getCostSetter,
  updateCostSetter,
  deleteCostSetter
};
