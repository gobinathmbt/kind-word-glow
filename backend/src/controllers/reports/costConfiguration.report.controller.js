/**
 * Cost Configuration Report Controller
 * Handles all cost configuration analytics and reporting endpoints
 * Provides comprehensive cost type utilization, cost setter effectiveness, and currency distribution analysis
 */

const CostConfiguration = require('../../models/CostConfiguration');
const Currency = require('../../models/Currency');
const Vehicle = require('../../models/Vehicle');
const MasterVehicle = require('../../models/MasterVehicle');
const { 
  getDealershipFilter, 
  getDateFilter, 
  formatReportResponse, 
  handleReportError,
  buildBasePipeline 
} = require('../../utils/reportHelpers');

/**
 * Get Cost Type Utilization
 * Analyzes cost type usage patterns across the system
 * Includes usage frequency, default values, tax configurations, and section type distribution
 * 
 * @route GET /api/company/reports/cost-configuration/type-utilization
 * @access Private (company_super_admin, company_admin)
 */
const getCostTypeUtilization = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    // 1. Get cost configuration for the company
    const costConfig = await CostConfiguration.findOne({ company_id })
      .populate('cost_types.currency_id', 'currency_name currency_code currency_symbol')
      .lean();

    if (!costConfig) {
      return res.json(formatReportResponse({
        costTypes: [],
        summary: {
          totalCostTypes: 0,
          message: 'No cost configuration found for this company'
        }
      }, {
        reportType: 'cost-type-utilization'
      }));
    }

    // 2. Analyze cost types
    const costTypes = costConfig.cost_types || [];
    
    // Group by section type
    const bySectionType = costTypes.reduce((acc, ct) => {
      const sectionType = ct.section_type || 'unspecified';
      if (!acc[sectionType]) {
        acc[sectionType] = {
          sectionType,
          count: 0,
          costTypes: []
        };
      }
      acc[sectionType].count++;
      acc[sectionType].costTypes.push({
        costType: ct.cost_type,
        currencyCode: ct.currency_id?.currency_code,
        defaultTaxRate: ct.default_tax_rate,
        defaultTaxType: ct.default_tax_type,
        changeCurrency: ct.change_currency,
        defaultValue: ct.default_value,
        displayOrder: ct.display_order
      });
      return acc;
    }, {});

    const sectionTypeAnalysis = Object.values(bySectionType).sort((a, b) => b.count - a.count);

    // 3. Analyze currency usage
    const currencyUsage = costTypes.reduce((acc, ct) => {
      const currencyCode = ct.currency_id?.currency_code || 'unknown';
      const currencyName = ct.currency_id?.currency_name || 'Unknown';
      
      if (!acc[currencyCode]) {
        acc[currencyCode] = {
          currencyCode,
          currencyName,
          currencySymbol: ct.currency_id?.currency_symbol,
          count: 0,
          costTypes: []
        };
      }
      acc[currencyCode].count++;
      acc[currencyCode].costTypes.push(ct.cost_type);
      return acc;
    }, {});

    const currencyDistribution = Object.values(currencyUsage).sort((a, b) => b.count - a.count);

    // 4. Analyze tax configurations
    const taxTypeDistribution = costTypes.reduce((acc, ct) => {
      const taxType = ct.default_tax_type || 'none';
      acc[taxType] = (acc[taxType] || 0) + 1;
      return acc;
    }, {});

    const taxRateDistribution = costTypes.reduce((acc, ct) => {
      const taxRate = ct.default_tax_rate || 'none';
      acc[taxRate] = (acc[taxRate] || 0) + 1;
      return acc;
    }, {});

    // 5. Analyze currency change capability
    const changeCurrencyEnabled = costTypes.filter(ct => ct.change_currency === true).length;
    const changeCurrencyDisabled = costTypes.filter(ct => ct.change_currency === false).length;

    // 6. Analyze default values
    const withDefaultValue = costTypes.filter(ct => ct.default_value && ct.default_value.trim() !== '').length;
    const withoutDefaultValue = costTypes.length - withDefaultValue;

    // 7. Get most used cost types (based on display order - lower order = more prominent)
    const topCostTypes = costTypes
      .sort((a, b) => (a.display_order || 999) - (b.display_order || 999))
      .slice(0, 10)
      .map(ct => ({
        costType: ct.cost_type,
        sectionType: ct.section_type,
        currencyCode: ct.currency_id?.currency_code,
        defaultTaxRate: ct.default_tax_rate,
        defaultTaxType: ct.default_tax_type,
        changeCurrency: ct.change_currency,
        hasDefaultValue: !!(ct.default_value && ct.default_value.trim() !== ''),
        displayOrder: ct.display_order
      }));

    // 8. Summary statistics
    const summaryStats = {
      totalCostTypes: costTypes.length,
      uniqueSectionTypes: Object.keys(bySectionType).length,
      uniqueCurrencies: Object.keys(currencyUsage).length,
      uniqueTaxTypes: Object.keys(taxTypeDistribution).length,
      uniqueTaxRates: Object.keys(taxRateDistribution).length,
      changeCurrencyEnabled,
      changeCurrencyDisabled,
      changeCurrencyPercentage: costTypes.length > 0 
        ? Math.round((changeCurrencyEnabled / costTypes.length) * 100) 
        : 0,
      withDefaultValue,
      withoutDefaultValue,
      defaultValuePercentage: costTypes.length > 0 
        ? Math.round((withDefaultValue / costTypes.length) * 100) 
        : 0,
      configurationCompleteness: costTypes.length > 0
        ? Math.round(((withDefaultValue + changeCurrencyEnabled) / (costTypes.length * 2)) * 100)
        : 0
    };

    res.json(formatReportResponse({
      costTypes: costTypes.map(ct => ({
        costType: ct.cost_type,
        sectionType: ct.section_type,
        currencyCode: ct.currency_id?.currency_code,
        currencyName: ct.currency_id?.currency_name,
        currencySymbol: ct.currency_id?.currency_symbol,
        defaultTaxRate: ct.default_tax_rate,
        defaultTaxType: ct.default_tax_type,
        changeCurrency: ct.change_currency,
        defaultValue: ct.default_value,
        displayOrder: ct.display_order,
        createdAt: ct.created_at,
        updatedAt: ct.updated_at
      })),
      sectionTypeAnalysis,
      currencyDistribution,
      taxTypeDistribution: Object.entries(taxTypeDistribution).map(([type, count]) => ({
        taxType: type,
        count
      })),
      taxRateDistribution: Object.entries(taxRateDistribution).map(([rate, count]) => ({
        taxRate: rate,
        count
      })),
      topCostTypes,
      summary: summaryStats
    }, {
      reportType: 'cost-type-utilization',
      filters: {
        company_id
      }
    }));

  } catch (error) {
    return handleReportError(error, res, 'Cost Type Utilization');
  }
};

/**
 * Get Cost Setter Effectiveness
 * Analyzes cost setter configuration effectiveness and usage patterns
 * Includes vehicle purchase type analysis, enabled cost types distribution, and configuration completeness
 * 
 * @route GET /api/company/reports/cost-configuration/setter-effectiveness
 * @access Private (company_super_admin, company_admin)
 */
const getCostSetterEffectiveness = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    // 1. Get cost configuration for the company
    const costConfig = await CostConfiguration.findOne({ company_id }).lean();

    if (!costConfig) {
      return res.json(formatReportResponse({
        costSetters: [],
        summary: {
          totalCostSetters: 0,
          message: 'No cost configuration found for this company'
        }
      }, {
        reportType: 'cost-setter-effectiveness'
      }));
    }

    const costSetters = costConfig.cost_setter || [];
    const costTypes = costConfig.cost_types || [];

    // 2. Analyze cost setters by vehicle purchase type
    const costSetterAnalysis = costSetters.map(setter => {
      const enabledCostTypeIds = setter.enabled_cost_types || [];
      const enabledCostTypeCount = enabledCostTypeIds.length;
      
      // Get details of enabled cost types
      const enabledCostTypeDetails = enabledCostTypeIds.map(typeId => {
        const costType = costTypes.find(ct => ct._id.toString() === typeId.toString());
        return costType ? {
          costType: costType.cost_type,
          sectionType: costType.section_type,
          currencyCode: costType.currency_id?.currency_code
        } : null;
      }).filter(Boolean);

      // Calculate effectiveness score
      const totalAvailableCostTypes = costTypes.length;
      const utilizationRate = totalAvailableCostTypes > 0 
        ? Math.round((enabledCostTypeCount / totalAvailableCostTypes) * 100) 
        : 0;

      let effectivenessScore = 0;
      if (enabledCostTypeCount > 0) effectivenessScore += 40;
      if (utilizationRate >= 50) effectivenessScore += 30;
      if (utilizationRate >= 80) effectivenessScore += 30;

      return {
        vehiclePurchaseType: setter.vehicle_purchase_type,
        enabledCostTypeCount,
        enabledCostTypes: enabledCostTypeDetails,
        utilizationRate,
        effectivenessScore,
        effectivenessLevel: effectivenessScore >= 70 ? 'High' : 
                           effectivenessScore >= 40 ? 'Medium' : 'Low',
        createdAt: setter.created_at,
        updatedAt: setter.updated_at
      };
    });

    // 3. Analyze vehicle purchase type distribution
    const purchaseTypeDistribution = costSetters.reduce((acc, setter) => {
      const purchaseType = setter.vehicle_purchase_type || 'unspecified';
      acc[purchaseType] = (acc[purchaseType] || 0) + 1;
      return acc;
    }, {});

    // 4. Analyze enabled cost types across all setters
    const allEnabledCostTypes = new Set();
    const costTypeUsageCount = {};

    costSetters.forEach(setter => {
      (setter.enabled_cost_types || []).forEach(typeId => {
        const typeIdStr = typeId.toString();
        allEnabledCostTypes.add(typeIdStr);
        costTypeUsageCount[typeIdStr] = (costTypeUsageCount[typeIdStr] || 0) + 1;
      });
    });

    // Get most used cost types across setters
    const costTypeUsageAnalysis = Object.entries(costTypeUsageCount)
      .map(([typeId, count]) => {
        const costType = costTypes.find(ct => ct._id.toString() === typeId);
        return {
          costTypeId: typeId,
          costType: costType?.cost_type || 'Unknown',
          sectionType: costType?.section_type,
          usageCount: count,
          usagePercentage: costSetters.length > 0 
            ? Math.round((count / costSetters.length) * 100) 
            : 0
        };
      })
      .sort((a, b) => b.usageCount - a.usageCount);

    // 5. Identify unused cost types
    const unusedCostTypes = costTypes.filter(ct => 
      !allEnabledCostTypes.has(ct._id.toString())
    ).map(ct => ({
      costType: ct.cost_type,
      sectionType: ct.section_type,
      currencyCode: ct.currency_id?.currency_code
    }));

    // 6. Calculate configuration completeness
    const fullyConfiguredSetters = costSetterAnalysis.filter(s => s.enabledCostTypeCount > 0).length;
    const emptySetters = costSetterAnalysis.filter(s => s.enabledCostTypeCount === 0).length;
    const highEffectivenessSetters = costSetterAnalysis.filter(s => s.effectivenessLevel === 'High').length;

    // 7. Summary statistics
    const summaryStats = {
      totalCostSetters: costSetters.length,
      totalCostTypes: costTypes.length,
      uniquePurchaseTypes: Object.keys(purchaseTypeDistribution).length,
      fullyConfiguredSetters,
      emptySetters,
      highEffectivenessSetters,
      mediumEffectivenessSetters: costSetterAnalysis.filter(s => s.effectivenessLevel === 'Medium').length,
      lowEffectivenessSetters: costSetterAnalysis.filter(s => s.effectivenessLevel === 'Low').length,
      avgEnabledCostTypesPerSetter: costSetters.length > 0
        ? Math.round((costSetterAnalysis.reduce((sum, s) => sum + s.enabledCostTypeCount, 0) / costSetters.length) * 10) / 10
        : 0,
      avgUtilizationRate: costSetters.length > 0
        ? Math.round(costSetterAnalysis.reduce((sum, s) => sum + s.utilizationRate, 0) / costSetters.length)
        : 0,
      avgEffectivenessScore: costSetters.length > 0
        ? Math.round(costSetterAnalysis.reduce((sum, s) => sum + s.effectivenessScore, 0) / costSetters.length)
        : 0,
      totalEnabledCostTypes: allEnabledCostTypes.size,
      unusedCostTypesCount: unusedCostTypes.length,
      costTypeUtilizationRate: costTypes.length > 0
        ? Math.round((allEnabledCostTypes.size / costTypes.length) * 100)
        : 0,
      overallHealth: costSetters.length > 0 && fullyConfiguredSetters / costSetters.length >= 0.7 
        ? 'Healthy' 
        : fullyConfiguredSetters / costSetters.length >= 0.4 
        ? 'Moderate' 
        : 'Needs Improvement'
    };

    res.json(formatReportResponse({
      costSetters: costSetterAnalysis,
      purchaseTypeDistribution: Object.entries(purchaseTypeDistribution).map(([type, count]) => ({
        purchaseType: type,
        count,
        percentage: costSetters.length > 0 
          ? Math.round((count / costSetters.length) * 100) 
          : 0
      })),
      costTypeUsage: costTypeUsageAnalysis,
      unusedCostTypes,
      summary: summaryStats
    }, {
      reportType: 'cost-setter-effectiveness',
      filters: {
        company_id
      }
    }));

  } catch (error) {
    return handleReportError(error, res, 'Cost Setter Effectiveness');
  }
};

/**
 * Get Cost Currency Distribution
 * Analyzes currency usage patterns across cost configurations
 * Includes currency distribution, multi-currency support analysis, and currency change patterns
 * 
 * @route GET /api/company/reports/cost-configuration/currency-distribution
 * @access Private (company_super_admin, company_admin)
 */
const getCostCurrencyDistribution = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    // 1. Get cost configuration for the company
    const costConfig = await CostConfiguration.findOne({ company_id })
      .populate('cost_types.currency_id', 'currency_name currency_code currency_symbol is_active')
      .lean();

    if (!costConfig) {
      return res.json(formatReportResponse({
        currencies: [],
        summary: {
          totalCurrencies: 0,
          message: 'No cost configuration found for this company'
        }
      }, {
        reportType: 'cost-currency-distribution'
      }));
    }

    const costTypes = costConfig.cost_types || [];

    // 2. Analyze currency distribution
    const currencyUsage = costTypes.reduce((acc, ct) => {
      const currencyId = ct.currency_id?._id?.toString() || 'unknown';
      const currencyCode = ct.currency_id?.currency_code || 'Unknown';
      const currencyName = ct.currency_id?.currency_name || 'Unknown';
      const currencySymbol = ct.currency_id?.currency_symbol || '';
      const isActive = ct.currency_id?.is_active !== false;

      if (!acc[currencyId]) {
        acc[currencyId] = {
          currencyId,
          currencyCode,
          currencyName,
          currencySymbol,
          isActive,
          costTypeCount: 0,
          costTypes: [],
          sectionTypes: new Set(),
          changeCurrencyEnabled: 0,
          changeCurrencyDisabled: 0,
          withDefaultValue: 0,
          withoutDefaultValue: 0
        };
      }

      acc[currencyId].costTypeCount++;
      acc[currencyId].costTypes.push({
        costType: ct.cost_type,
        sectionType: ct.section_type,
        changeCurrency: ct.change_currency,
        hasDefaultValue: !!(ct.default_value && ct.default_value.trim() !== '')
      });
      
      if (ct.section_type) {
        acc[currencyId].sectionTypes.add(ct.section_type);
      }

      if (ct.change_currency) {
        acc[currencyId].changeCurrencyEnabled++;
      } else {
        acc[currencyId].changeCurrencyDisabled++;
      }

      if (ct.default_value && ct.default_value.trim() !== '') {
        acc[currencyId].withDefaultValue++;
      } else {
        acc[currencyId].withoutDefaultValue++;
      }

      return acc;
    }, {});

    // Convert Set to Array for section types
    const currencyAnalysis = Object.values(currencyUsage).map(currency => ({
      ...currency,
      sectionTypes: Array.from(currency.sectionTypes),
      sectionTypeCount: currency.sectionTypes.size,
      changeCurrencyPercentage: currency.costTypeCount > 0
        ? Math.round((currency.changeCurrencyEnabled / currency.costTypeCount) * 100)
        : 0,
      defaultValuePercentage: currency.costTypeCount > 0
        ? Math.round((currency.withDefaultValue / currency.costTypeCount) * 100)
        : 0,
      usagePercentage: costTypes.length > 0
        ? Math.round((currency.costTypeCount / costTypes.length) * 100)
        : 0
    })).sort((a, b) => b.costTypeCount - a.costTypeCount);

    // 3. Identify primary and secondary currencies
    const primaryCurrency = currencyAnalysis[0] || null;
    const secondaryCurrencies = currencyAnalysis.slice(1);

    // 4. Analyze multi-currency support
    const multiCurrencyEnabled = currencyAnalysis.length > 1;
    const activeCurrencies = currencyAnalysis.filter(c => c.isActive);
    const inactiveCurrencies = currencyAnalysis.filter(c => !c.isActive);

    // 5. Analyze currency change capability
    const totalChangeCurrencyEnabled = costTypes.filter(ct => ct.change_currency === true).length;
    const totalChangeCurrencyDisabled = costTypes.filter(ct => ct.change_currency === false).length;

    // 6. Analyze currency by section type
    const currencyBySectionType = costTypes.reduce((acc, ct) => {
      const sectionType = ct.section_type || 'unspecified';
      const currencyCode = ct.currency_id?.currency_code || 'Unknown';

      if (!acc[sectionType]) {
        acc[sectionType] = {
          sectionType,
          currencies: {},
          totalCostTypes: 0
        };
      }

      if (!acc[sectionType].currencies[currencyCode]) {
        acc[sectionType].currencies[currencyCode] = {
          currencyCode,
          count: 0
        };
      }

      acc[sectionType].currencies[currencyCode].count++;
      acc[sectionType].totalCostTypes++;

      return acc;
    }, {});

    const sectionTypeCurrencyAnalysis = Object.values(currencyBySectionType).map(section => ({
      sectionType: section.sectionType,
      totalCostTypes: section.totalCostTypes,
      currencies: Object.values(section.currencies).sort((a, b) => b.count - a.count),
      uniqueCurrencies: Object.keys(section.currencies).length,
      dominantCurrency: Object.values(section.currencies).sort((a, b) => b.count - a.count)[0]?.currencyCode
    }));

    // 7. Get all available currencies in the system
    const allCurrencies = await Currency.find({ company_id }).lean();
    const configuredCurrencyIds = new Set(
      costTypes.map(ct => ct.currency_id?._id?.toString()).filter(Boolean)
    );
    
    const unusedCurrencies = allCurrencies
      .filter(currency => !configuredCurrencyIds.has(currency._id.toString()))
      .map(currency => ({
        currencyId: currency._id,
        currencyCode: currency.currency_code,
        currencyName: currency.currency_name,
        currencySymbol: currency.currency_symbol,
        isActive: currency.is_active
      }));

    // 8. Summary statistics
    const summaryStats = {
      totalCostTypes: costTypes.length,
      totalCurrenciesUsed: currencyAnalysis.length,
      totalCurrenciesAvailable: allCurrencies.length,
      unusedCurrenciesCount: unusedCurrencies.length,
      currencyUtilizationRate: allCurrencies.length > 0
        ? Math.round((currencyAnalysis.length / allCurrencies.length) * 100)
        : 0,
      multiCurrencyEnabled,
      activeCurrenciesCount: activeCurrencies.length,
      inactiveCurrenciesCount: inactiveCurrencies.length,
      primaryCurrency: primaryCurrency ? {
        currencyCode: primaryCurrency.currencyCode,
        currencyName: primaryCurrency.currencyName,
        usagePercentage: primaryCurrency.usagePercentage
      } : null,
      changeCurrencyEnabled: totalChangeCurrencyEnabled,
      changeCurrencyDisabled: totalChangeCurrencyDisabled,
      changeCurrencyPercentage: costTypes.length > 0
        ? Math.round((totalChangeCurrencyEnabled / costTypes.length) * 100)
        : 0,
      avgCostTypesPerCurrency: currencyAnalysis.length > 0
        ? Math.round((costTypes.length / currencyAnalysis.length) * 10) / 10
        : 0,
      currencyDiversity: currencyAnalysis.length >= 3 ? 'High' :
                        currencyAnalysis.length === 2 ? 'Medium' : 'Low',
      configurationHealth: multiCurrencyEnabled && totalChangeCurrencyEnabled > 0 
        ? 'Flexible' 
        : multiCurrencyEnabled 
        ? 'Moderate' 
        : 'Limited'
    };

    res.json(formatReportResponse({
      currencies: currencyAnalysis,
      primaryCurrency,
      secondaryCurrencies,
      sectionTypeCurrencyAnalysis,
      unusedCurrencies,
      summary: summaryStats
    }, {
      reportType: 'cost-currency-distribution',
      filters: {
        company_id
      }
    }));

  } catch (error) {
    return handleReportError(error, res, 'Cost Currency Distribution');
  }
};

module.exports = {
  getCostTypeUtilization,
  getCostSetterEffectiveness,
  getCostCurrencyDistribution
};
