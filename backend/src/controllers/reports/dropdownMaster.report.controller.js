/**
 * DropdownMaster Report Controller
 * Handles all dropdown master analytics and reporting endpoints
 * Provides comprehensive dropdown usage analysis, value distribution, and configuration health metrics
 */

const { 
  getDealershipFilter, 
  getDateFilter, 
  formatReportResponse, 
  handleReportError,
  buildBasePipeline 
} = require('../../utils/reportHelpers');

/**
 * Get Dropdown Usage Analysis
 * Analyzes dropdown utilization metrics across the system
 * Includes usage frequency, active vs inactive dropdowns, and configuration patterns
 * 
 * @route GET /api/company/reports/dropdown-master/usage-analysis
 * @access Private (company_super_admin, company_admin)
 */
const getDropdownUsageAnalysis = async (req, res) => {
  try {
    const DropdownMaster = req.getModel('DropdownMaster');
    
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    // Build base match filter
    const matchFilter = {
      company_id,
      ...dealershipFilter,
      ...dateFilter
    };

    // 1. Get all dropdowns for the company
    const dropdowns = await DropdownMaster.find(matchFilter)
      .populate('created_by', 'first_name last_name email')
      .lean();

    if (dropdowns.length === 0) {
      return res.json(formatReportResponse({
        dropdowns: [],
        summary: {
          totalDropdowns: 0,
          message: 'No dropdown configurations found'
        }
      }, {
        reportType: 'dropdown-usage-analysis'
      }));
    }

    // 2. Analyze dropdown status distribution
    const activeDropdowns = dropdowns.filter(d => d.is_active === true);
    const inactiveDropdowns = dropdowns.filter(d => d.is_active === false);

    // 3. Analyze standard vs custom dropdowns
    const standardDropdowns = dropdowns.filter(d => d.is_standard === true);
    const customDropdowns = dropdowns.filter(d => d.is_standard === false);

    // 4. Analyze dropdown configuration features
    const multipleSelectionEnabled = dropdowns.filter(d => d.allow_multiple_selection === true);
    const requiredDropdowns = dropdowns.filter(d => d.is_required === true);
    const dropdownsWithValidation = dropdowns.filter(d => 
      d.validation_rules && (
        d.validation_rules.min_length || 
        d.validation_rules.max_length || 
        d.validation_rules.pattern
      )
    );

    // 5. Analyze dropdown values
    const dropdownValueAnalysis = dropdowns.map(dropdown => {
      const values = dropdown.values || [];
      const activeValues = values.filter(v => v.is_active === true);
      const inactiveValues = values.filter(v => v.is_active === false);
      const defaultValues = values.filter(v => v.is_default === true);

      return {
        dropdownId: dropdown._id,
        dropdownName: dropdown.dropdown_name,
        displayName: dropdown.display_name,
        isActive: dropdown.is_active,
        isStandard: dropdown.is_standard,
        isRequired: dropdown.is_required,
        allowMultipleSelection: dropdown.allow_multiple_selection,
        hasValidation: !!(dropdown.validation_rules && (
          dropdown.validation_rules.min_length || 
          dropdown.validation_rules.max_length || 
          dropdown.validation_rules.pattern
        )),
        totalValues: values.length,
        activeValues: activeValues.length,
        inactiveValues: inactiveValues.length,
        defaultValues: defaultValues.length,
        hasDefaultValue: defaultValues.length > 0,
        valueUtilizationRate: values.length > 0 
          ? Math.round((activeValues.length / values.length) * 100) 
          : 0,
        configurationScore: calculateDropdownConfigScore(dropdown, values),
        createdBy: dropdown.created_by ? {
          name: `${dropdown.created_by.first_name} ${dropdown.created_by.last_name}`,
          email: dropdown.created_by.email
        } : null,
        createdAt: dropdown.created_at,
        updatedAt: dropdown.updated_at
      };
    });

    // 6. Calculate usage metrics
    const totalValues = dropdowns.reduce((sum, d) => sum + (d.values?.length || 0), 0);
    const avgValuesPerDropdown = dropdowns.length > 0 
      ? Math.round((totalValues / dropdowns.length) * 10) / 10 
      : 0;

    // 7. Identify dropdowns with issues
    const emptyDropdowns = dropdowns.filter(d => !d.values || d.values.length === 0);
    const dropdownsWithoutDefault = dropdowns.filter(d => 
      d.is_required && (!d.values || !d.values.some(v => v.is_default))
    );
    const dropdownsWithAllInactiveValues = dropdowns.filter(d => 
      d.values && d.values.length > 0 && d.values.every(v => v.is_active === false)
    );

    // 8. Analyze by dealership (if applicable)
    const dealershipDistribution = dropdowns.reduce((acc, d) => {
      const dealershipId = d.dealership_id || 'company_wide';
      if (!acc[dealershipId]) {
        acc[dealershipId] = {
          dealershipId,
          count: 0,
          activeCount: 0,
          standardCount: 0,
          customCount: 0
        };
      }
      acc[dealershipId].count++;
      if (d.is_active) acc[dealershipId].activeCount++;
      if (d.is_standard) acc[dealershipId].standardCount++;
      else acc[dealershipId].customCount++;
      return acc;
    }, {});

    // 9. Top performing dropdowns (by configuration score)
    const topDropdowns = dropdownValueAnalysis
      .sort((a, b) => b.configurationScore - a.configurationScore)
      .slice(0, 10);

    // 10. Summary statistics
    const summaryStats = {
      totalDropdowns: dropdowns.length,
      activeDropdowns: activeDropdowns.length,
      inactiveDropdowns: inactiveDropdowns.length,
      activePercentage: dropdowns.length > 0 
        ? Math.round((activeDropdowns.length / dropdowns.length) * 100) 
        : 0,
      standardDropdowns: standardDropdowns.length,
      customDropdowns: customDropdowns.length,
      standardPercentage: dropdowns.length > 0 
        ? Math.round((standardDropdowns.length / dropdowns.length) * 100) 
        : 0,
      multipleSelectionEnabled: multipleSelectionEnabled.length,
      requiredDropdowns: requiredDropdowns.length,
      dropdownsWithValidation: dropdownsWithValidation.length,
      totalValues,
      avgValuesPerDropdown,
      emptyDropdowns: emptyDropdowns.length,
      dropdownsWithoutDefault: dropdownsWithoutDefault.length,
      dropdownsWithAllInactiveValues: dropdownsWithAllInactiveValues.length,
      avgConfigurationScore: dropdowns.length > 0
        ? Math.round(dropdownValueAnalysis.reduce((sum, d) => sum + d.configurationScore, 0) / dropdowns.length)
        : 0,
      overallHealth: calculateOverallHealth(dropdowns, emptyDropdowns, dropdownsWithoutDefault),
      uniqueDealerships: Object.keys(dealershipDistribution).length
    };

    res.json(formatReportResponse({
      dropdowns: dropdownValueAnalysis,
      topDropdowns,
      dealershipDistribution: Object.values(dealershipDistribution),
      issueDropdowns: {
        empty: emptyDropdowns.map(d => ({
          dropdownId: d._id,
          dropdownName: d.dropdown_name,
          displayName: d.display_name
        })),
        withoutDefault: dropdownsWithoutDefault.map(d => ({
          dropdownId: d._id,
          dropdownName: d.dropdown_name,
          displayName: d.display_name,
          isRequired: d.is_required
        })),
        allInactiveValues: dropdownsWithAllInactiveValues.map(d => ({
          dropdownId: d._id,
          dropdownName: d.dropdown_name,
          displayName: d.display_name,
          totalValues: d.values.length
        }))
      },
      summary: summaryStats
    }, {
      reportType: 'dropdown-usage-analysis',
      filters: matchFilter
    }));

  } catch (error) {
    return handleReportError(error, res, 'Dropdown Usage Analysis');
  }
};

/**
 * Get Dropdown Value Distribution
 * Analyzes value selection patterns across all dropdowns
 * Includes value usage frequency, active/inactive distribution, and default value analysis
 * 
 * @route GET /api/company/reports/dropdown-master/value-distribution
 * @access Private (company_super_admin, company_admin)
 */
const getDropdownValueDistribution = async (req, res) => {
  try {
    const DropdownMaster = req.getModel('DropdownMaster');
    
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    // Build base match filter
    const matchFilter = {
      company_id,
      ...dealershipFilter,
      ...dateFilter
    };

    // 1. Get all dropdowns with their values
    const dropdowns = await DropdownMaster.find(matchFilter).lean();

    if (dropdowns.length === 0) {
      return res.json(formatReportResponse({
        valueDistribution: [],
        summary: {
          totalValues: 0,
          message: 'No dropdown configurations found'
        }
      }, {
        reportType: 'dropdown-value-distribution'
      }));
    }

    // 2. Aggregate all values across dropdowns
    let allValues = [];
    let totalActiveValues = 0;
    let totalInactiveValues = 0;
    let totalDefaultValues = 0;

    dropdowns.forEach(dropdown => {
      const values = dropdown.values || [];
      values.forEach(value => {
        allValues.push({
          dropdownId: dropdown._id,
          dropdownName: dropdown.dropdown_name,
          displayName: dropdown.display_name,
          isDropdownActive: dropdown.is_active,
          valueId: value._id,
          optionValue: value.option_value,
          displayValue: value.display_value,
          displayOrder: value.display_order,
          isActive: value.is_active,
          isDefault: value.is_default,
          createdAt: value.created_at,
          updatedAt: value.updated_at
        });

        if (value.is_active) totalActiveValues++;
        else totalInactiveValues++;
        if (value.is_default) totalDefaultValues++;
      });
    });

    // 3. Analyze value distribution by dropdown
    const valuesByDropdown = dropdowns.map(dropdown => {
      const values = dropdown.values || [];
      const activeValues = values.filter(v => v.is_active);
      const inactiveValues = values.filter(v => !v.is_active);
      const defaultValues = values.filter(v => v.is_default);

      // Analyze display order usage
      const valuesWithOrder = values.filter(v => v.display_order !== undefined && v.display_order !== null);
      const avgDisplayOrder = valuesWithOrder.length > 0
        ? Math.round((valuesWithOrder.reduce((sum, v) => sum + v.display_order, 0) / valuesWithOrder.length) * 10) / 10
        : 0;

      return {
        dropdownId: dropdown._id,
        dropdownName: dropdown.dropdown_name,
        displayName: dropdown.display_name,
        isActive: dropdown.is_active,
        totalValues: values.length,
        activeValues: activeValues.length,
        inactiveValues: inactiveValues.length,
        defaultValues: defaultValues.length,
        activePercentage: values.length > 0 
          ? Math.round((activeValues.length / values.length) * 100) 
          : 0,
        hasMultipleDefaults: defaultValues.length > 1,
        hasNoDefault: defaultValues.length === 0,
        valuesWithDisplayOrder: valuesWithOrder.length,
        avgDisplayOrder,
        displayOrderUsage: values.length > 0
          ? Math.round((valuesWithOrder.length / values.length) * 100)
          : 0
      };
    }).sort((a, b) => b.totalValues - a.totalValues);

    // 4. Analyze value status patterns
    const statusDistribution = {
      activeOnly: dropdowns.filter(d => {
        const values = d.values || [];
        return values.length > 0 && values.every(v => v.is_active);
      }).length,
      inactiveOnly: dropdowns.filter(d => {
        const values = d.values || [];
        return values.length > 0 && values.every(v => !v.is_active);
      }).length,
      mixed: dropdowns.filter(d => {
        const values = d.values || [];
        return values.length > 0 && values.some(v => v.is_active) && values.some(v => !v.is_active);
      }).length,
      empty: dropdowns.filter(d => !d.values || d.values.length === 0).length
    };

    // 5. Analyze default value patterns
    const defaultValuePatterns = {
      noDefault: dropdowns.filter(d => {
        const values = d.values || [];
        return values.length > 0 && !values.some(v => v.is_default);
      }).length,
      singleDefault: dropdowns.filter(d => {
        const values = d.values || [];
        return values.filter(v => v.is_default).length === 1;
      }).length,
      multipleDefaults: dropdowns.filter(d => {
        const values = d.values || [];
        return values.filter(v => v.is_default).length > 1;
      }).length
    };

    // 6. Analyze display order usage
    const displayOrderAnalysis = {
      dropdownsUsingOrder: dropdowns.filter(d => {
        const values = d.values || [];
        return values.some(v => v.display_order !== undefined && v.display_order !== null);
      }).length,
      dropdownsNotUsingOrder: dropdowns.filter(d => {
        const values = d.values || [];
        return values.length > 0 && !values.some(v => v.display_order !== undefined && v.display_order !== null);
      }).length,
      totalValuesWithOrder: allValues.filter(v => v.displayOrder !== undefined && v.displayOrder !== null).length,
      orderUsagePercentage: dropdowns.length > 0
        ? Math.round((dropdowns.filter(d => {
            const values = d.values || [];
            return values.some(v => v.display_order !== undefined && v.display_order !== null);
          }).length / dropdowns.length) * 100)
        : 0
    };

    // 7. Find dropdowns with most/least values
    const dropdownsWithMostValues = valuesByDropdown.slice(0, 5);
    const dropdownsWithLeastValues = valuesByDropdown
      .filter(d => d.totalValues > 0)
      .sort((a, b) => a.totalValues - b.totalValues)
      .slice(0, 5);

    // 8. Analyze value length distribution
    const valueLengthAnalysis = allValues.reduce((acc, v) => {
      const length = v.displayValue?.length || 0;
      if (length <= 10) acc.short++;
      else if (length <= 30) acc.medium++;
      else acc.long++;
      return acc;
    }, { short: 0, medium: 0, long: 0 });

    // 9. Summary statistics
    const summaryStats = {
      totalDropdowns: dropdowns.length,
      totalValues: allValues.length,
      totalActiveValues,
      totalInactiveValues,
      totalDefaultValues,
      avgValuesPerDropdown: dropdowns.length > 0
        ? Math.round((allValues.length / dropdowns.length) * 10) / 10
        : 0,
      activeValuePercentage: allValues.length > 0
        ? Math.round((totalActiveValues / allValues.length) * 100)
        : 0,
      defaultValuePercentage: allValues.length > 0
        ? Math.round((totalDefaultValues / allValues.length) * 100)
        : 0,
      statusDistribution,
      defaultValuePatterns,
      displayOrderAnalysis,
      valueLengthDistribution: {
        short: valueLengthAnalysis.short,
        medium: valueLengthAnalysis.medium,
        long: valueLengthAnalysis.long,
        shortPercentage: allValues.length > 0 
          ? Math.round((valueLengthAnalysis.short / allValues.length) * 100) 
          : 0,
        mediumPercentage: allValues.length > 0 
          ? Math.round((valueLengthAnalysis.medium / allValues.length) * 100) 
          : 0,
        longPercentage: allValues.length > 0 
          ? Math.round((valueLengthAnalysis.long / allValues.length) * 100) 
          : 0
      },
      healthIndicators: {
        dropdownsWithNoValues: statusDistribution.empty,
        dropdownsWithAllInactive: statusDistribution.inactiveOnly,
        dropdownsWithNoDefault: defaultValuePatterns.noDefault,
        dropdownsWithMultipleDefaults: defaultValuePatterns.multipleDefaults
      }
    };

    res.json(formatReportResponse({
      valuesByDropdown,
      dropdownsWithMostValues,
      dropdownsWithLeastValues,
      summary: summaryStats
    }, {
      reportType: 'dropdown-value-distribution',
      filters: matchFilter
    }));

  } catch (error) {
    return handleReportError(error, res, 'Dropdown Value Distribution');
  }
};

/**
 * Get Dropdown Configuration Health
 * Analyzes configuration completeness and identifies potential issues
 * Includes health scores, validation coverage, and configuration recommendations
 * 
 * @route GET /api/company/reports/dropdown-master/configuration-health
 * @access Private (company_super_admin, company_admin)
 */
const getDropdownConfigurationHealth = async (req, res) => {
  try {
    const DropdownMaster = req.getModel('DropdownMaster');
    
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    // Build base match filter
    const matchFilter = {
      company_id,
      ...dealershipFilter,
      ...dateFilter
    };

    // 1. Get all dropdowns
    const dropdowns = await DropdownMaster.find(matchFilter)
      .populate('created_by', 'first_name last_name email')
      .lean();

    if (dropdowns.length === 0) {
      return res.json(formatReportResponse({
        healthReport: [],
        summary: {
          totalDropdowns: 0,
          message: 'No dropdown configurations found'
        }
      }, {
        reportType: 'dropdown-configuration-health'
      }));
    }

    // 2. Analyze each dropdown's health
    const healthReport = dropdowns.map(dropdown => {
      const values = dropdown.values || [];
      const activeValues = values.filter(v => v.is_active);
      const defaultValues = values.filter(v => v.is_default);
      
      // Calculate health metrics
      const issues = [];
      const warnings = [];
      const recommendations = [];
      let healthScore = 100;

      // Check for critical issues
      if (values.length === 0) {
        issues.push('No values configured');
        healthScore -= 40;
      }

      if (values.length > 0 && activeValues.length === 0) {
        issues.push('All values are inactive');
        healthScore -= 30;
      }

      if (dropdown.is_required && defaultValues.length === 0) {
        issues.push('Required dropdown has no default value');
        healthScore -= 20;
      }

      if (defaultValues.length > 1 && !dropdown.allow_multiple_selection) {
        warnings.push('Multiple default values but multiple selection not allowed');
        healthScore -= 10;
      }

      // Check for warnings
      if (values.length > 0 && activeValues.length < values.length * 0.5) {
        warnings.push('More than 50% of values are inactive');
        healthScore -= 10;
      }

      if (values.length > 50) {
        warnings.push('Large number of values may impact usability');
        healthScore -= 5;
      }

      if (!dropdown.description || dropdown.description.trim() === '') {
        warnings.push('Missing description');
        healthScore -= 5;
      }

      const valuesWithOrder = values.filter(v => v.display_order !== undefined && v.display_order !== null);
      if (values.length > 0 && valuesWithOrder.length === 0) {
        warnings.push('No display order configured for values');
        healthScore -= 5;
      }

      // Generate recommendations
      if (values.length === 0) {
        recommendations.push('Add at least one value to make this dropdown functional');
      }

      if (dropdown.is_required && defaultValues.length === 0) {
        recommendations.push('Set a default value for required dropdown');
      }

      if (activeValues.length > 0 && activeValues.length < 3) {
        recommendations.push('Consider adding more active values for better user choice');
      }

      if (!dropdown.validation_rules || (!dropdown.validation_rules.min_length && !dropdown.validation_rules.max_length)) {
        recommendations.push('Consider adding validation rules for data quality');
      }

      if (values.length > 20 && !dropdown.description) {
        recommendations.push('Add description to help users understand this dropdown');
      }

      // Determine health status
      let healthStatus;
      if (healthScore >= 80) healthStatus = 'Healthy';
      else if (healthScore >= 60) healthStatus = 'Fair';
      else if (healthScore >= 40) healthStatus = 'Poor';
      else healthStatus = 'Critical';

      return {
        dropdownId: dropdown._id,
        dropdownName: dropdown.dropdown_name,
        displayName: dropdown.display_name,
        isActive: dropdown.is_active,
        isStandard: dropdown.is_standard,
        isRequired: dropdown.is_required,
        allowMultipleSelection: dropdown.allow_multiple_selection,
        hasDescription: !!(dropdown.description && dropdown.description.trim() !== ''),
        hasValidation: !!(dropdown.validation_rules && (
          dropdown.validation_rules.min_length || 
          dropdown.validation_rules.max_length || 
          dropdown.validation_rules.pattern
        )),
        totalValues: values.length,
        activeValues: activeValues.length,
        inactiveValues: values.length - activeValues.length,
        defaultValues: defaultValues.length,
        valuesWithDisplayOrder: valuesWithOrder.length,
        healthScore: Math.max(0, healthScore),
        healthStatus,
        issueCount: issues.length,
        warningCount: warnings.length,
        recommendationCount: recommendations.length,
        issues,
        warnings,
        recommendations,
        createdBy: dropdown.created_by ? {
          name: `${dropdown.created_by.first_name} ${dropdown.created_by.last_name}`,
          email: dropdown.created_by.email
        } : null,
        createdAt: dropdown.created_at,
        updatedAt: dropdown.updated_at,
        lastModified: dropdown.updated_at
      };
    });

    // 3. Categorize dropdowns by health status
    const healthyDropdowns = healthReport.filter(d => d.healthStatus === 'Healthy');
    const fairDropdowns = healthReport.filter(d => d.healthStatus === 'Fair');
    const poorDropdowns = healthReport.filter(d => d.healthStatus === 'Poor');
    const criticalDropdowns = healthReport.filter(d => d.healthStatus === 'Critical');

    // 4. Identify dropdowns needing immediate attention
    const needsAttention = healthReport
      .filter(d => d.healthStatus === 'Critical' || d.healthStatus === 'Poor')
      .sort((a, b) => a.healthScore - b.healthScore);

    // 5. Analyze common issues
    const allIssues = healthReport.flatMap(d => d.issues);
    const issueFrequency = allIssues.reduce((acc, issue) => {
      acc[issue] = (acc[issue] || 0) + 1;
      return acc;
    }, {});

    const commonIssues = Object.entries(issueFrequency)
      .map(([issue, count]) => ({
        issue,
        count,
        percentage: Math.round((count / dropdowns.length) * 100)
      }))
      .sort((a, b) => b.count - a.count);

    // 6. Analyze common warnings
    const allWarnings = healthReport.flatMap(d => d.warnings);
    const warningFrequency = allWarnings.reduce((acc, warning) => {
      acc[warning] = (acc[warning] || 0) + 1;
      return acc;
    }, {});

    const commonWarnings = Object.entries(warningFrequency)
      .map(([warning, count]) => ({
        warning,
        count,
        percentage: Math.round((count / dropdowns.length) * 100)
      }))
      .sort((a, b) => b.count - a.count);

    // 7. Configuration completeness analysis
    const completenessMetrics = {
      withDescription: healthReport.filter(d => d.hasDescription).length,
      withValidation: healthReport.filter(d => d.hasValidation).length,
      withValues: healthReport.filter(d => d.totalValues > 0).length,
      withActiveValues: healthReport.filter(d => d.activeValues > 0).length,
      withDefaultValues: healthReport.filter(d => d.defaultValues > 0).length,
      withDisplayOrder: healthReport.filter(d => d.valuesWithDisplayOrder > 0).length,
      fullyConfigured: healthReport.filter(d => 
        d.hasDescription && 
        d.totalValues > 0 && 
        d.activeValues > 0 && 
        d.valuesWithDisplayOrder > 0
      ).length
    };

    // 8. Calculate overall system health
    const avgHealthScore = healthReport.length > 0
      ? Math.round(healthReport.reduce((sum, d) => sum + d.healthScore, 0) / healthReport.length)
      : 0;

    let overallSystemHealth;
    if (avgHealthScore >= 80) overallSystemHealth = 'Excellent';
    else if (avgHealthScore >= 70) overallSystemHealth = 'Good';
    else if (avgHealthScore >= 60) overallSystemHealth = 'Fair';
    else if (avgHealthScore >= 40) overallSystemHealth = 'Poor';
    else overallSystemHealth = 'Critical';

    // 9. Best and worst performing dropdowns
    const bestPerforming = healthReport
      .sort((a, b) => b.healthScore - a.healthScore)
      .slice(0, 5)
      .map(d => ({
        dropdownName: d.dropdownName,
        displayName: d.displayName,
        healthScore: d.healthScore,
        healthStatus: d.healthStatus
      }));

    const worstPerforming = healthReport
      .sort((a, b) => a.healthScore - b.healthScore)
      .slice(0, 5)
      .map(d => ({
        dropdownName: d.dropdownName,
        displayName: d.displayName,
        healthScore: d.healthScore,
        healthStatus: d.healthStatus,
        issueCount: d.issueCount
      }));

    // 10. Summary statistics
    const summaryStats = {
      totalDropdowns: dropdowns.length,
      avgHealthScore,
      overallSystemHealth,
      healthDistribution: {
        healthy: healthyDropdowns.length,
        fair: fairDropdowns.length,
        poor: poorDropdowns.length,
        critical: criticalDropdowns.length,
        healthyPercentage: Math.round((healthyDropdowns.length / dropdowns.length) * 100),
        fairPercentage: Math.round((fairDropdowns.length / dropdowns.length) * 100),
        poorPercentage: Math.round((poorDropdowns.length / dropdowns.length) * 100),
        criticalPercentage: Math.round((criticalDropdowns.length / dropdowns.length) * 100)
      },
      totalIssues: allIssues.length,
      totalWarnings: allWarnings.length,
      dropdownsNeedingAttention: needsAttention.length,
      completenessMetrics: {
        ...completenessMetrics,
        descriptionCoverage: Math.round((completenessMetrics.withDescription / dropdowns.length) * 100),
        validationCoverage: Math.round((completenessMetrics.withValidation / dropdowns.length) * 100),
        valueCoverage: Math.round((completenessMetrics.withValues / dropdowns.length) * 100),
        activeValueCoverage: Math.round((completenessMetrics.withActiveValues / dropdowns.length) * 100),
        defaultValueCoverage: Math.round((completenessMetrics.withDefaultValues / dropdowns.length) * 100),
        displayOrderCoverage: Math.round((completenessMetrics.withDisplayOrder / dropdowns.length) * 100),
        fullyConfiguredPercentage: Math.round((completenessMetrics.fullyConfigured / dropdowns.length) * 100)
      },
      actionableInsights: {
        criticalActionRequired: criticalDropdowns.length,
        improvementOpportunities: poorDropdowns.length + fairDropdowns.length,
        wellConfigured: healthyDropdowns.length
      }
    };

    res.json(formatReportResponse({
      healthReport,
      needsAttention,
      bestPerforming,
      worstPerforming,
      commonIssues,
      commonWarnings,
      summary: summaryStats
    }, {
      reportType: 'dropdown-configuration-health',
      filters: matchFilter
    }));

  } catch (error) {
    return handleReportError(error, res, 'Dropdown Configuration Health');
  }
};

/**
 * Helper function to calculate dropdown configuration score
 * @param {Object} dropdown - Dropdown document
 * @param {Array} values - Array of dropdown values
 * @returns {number} Configuration score (0-100)
 */
function calculateDropdownConfigScore(dropdown, values) {
  let score = 0;

  // Has values (30 points)
  if (values.length > 0) score += 30;

  // Has active values (20 points)
  const activeValues = values.filter(v => v.is_active);
  if (activeValues.length > 0) score += 20;

  // Has default value (15 points)
  const defaultValues = values.filter(v => v.is_default);
  if (defaultValues.length > 0) score += 15;

  // Has description (10 points)
  if (dropdown.description && dropdown.description.trim() !== '') score += 10;

  // Has validation rules (10 points)
  if (dropdown.validation_rules && (
    dropdown.validation_rules.min_length || 
    dropdown.validation_rules.max_length || 
    dropdown.validation_rules.pattern
  )) score += 10;

  // Has display order (10 points)
  const valuesWithOrder = values.filter(v => v.display_order !== undefined && v.display_order !== null);
  if (valuesWithOrder.length > 0) score += 10;

  // Bonus: Good value count (5 points)
  if (values.length >= 3 && values.length <= 30) score += 5;

  return score;
}

/**
 * Helper function to calculate overall health
 * @param {Array} dropdowns - Array of dropdown documents
 * @param {Array} emptyDropdowns - Array of empty dropdowns
 * @param {Array} dropdownsWithoutDefault - Array of dropdowns without default
 * @returns {string} Health status
 */
function calculateOverallHealth(dropdowns, emptyDropdowns, dropdownsWithoutDefault) {
  if (dropdowns.length === 0) return 'Unknown';

  const issuePercentage = ((emptyDropdowns.length + dropdownsWithoutDefault.length) / dropdowns.length) * 100;

  if (issuePercentage <= 10) return 'Excellent';
  if (issuePercentage <= 25) return 'Good';
  if (issuePercentage <= 50) return 'Fair';
  return 'Needs Improvement';
}

module.exports = {
  getDropdownUsageAnalysis,
  getDropdownValueDistribution,
  getDropdownConfigurationHealth
};
