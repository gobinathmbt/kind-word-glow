/**
 * TradeinConfig Report Controller
 * Handles all trade-in configuration analytics and reporting endpoints
 * Provides comprehensive configuration usage patterns, field analysis, and category effectiveness metrics
 */

const TradeinConfig = require('../../models/TradeinConfig');
const { 
  getDealershipFilter, 
  getDateFilter, 
  formatReportResponse, 
  handleReportError,
  buildBasePipeline 
} = require('../../utils/reportHelpers');

/**
 * Get Tradein Config Usage
 * Analyzes trade-in configuration usage patterns across the system
 * Includes active/inactive configs, default configurations, and version distribution
 * 
 * @route GET /api/company/reports/tradein-config/usage
 * @access Private (company_super_admin, company_admin)
 */
const getTradeinConfigUsage = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    // Build base match filter
    const matchFilter = {
      company_id,
      ...dealershipFilter,
      ...dateFilter
    };

    // 1. Get all tradein configs for the company
    const configs = await TradeinConfig.find(matchFilter)
      .populate('created_by', 'first_name last_name email')
      .lean();

    if (configs.length === 0) {
      return res.json(formatReportResponse({
        configs: [],
        summary: {
          totalConfigs: 0,
          message: 'No trade-in configurations found'
        }
      }, {
        reportType: 'tradein-config-usage'
      }));
    }

    // 2. Analyze configuration status
    const activeConfigs = configs.filter(c => c.is_active === true);
    const inactiveConfigs = configs.filter(c => c.is_active === false);
    const defaultConfigs = configs.filter(c => c.is_default === true);

    // 3. Analyze configuration structure
    const configAnalysis = configs.map(config => {
      const categories = config.categories || [];
      const totalSections = categories.reduce((sum, cat) => sum + (cat.sections?.length || 0), 0);
      const totalFields = categories.reduce((sum, cat) => {
        return sum + cat.sections.reduce((sectionSum, section) => {
          return sectionSum + (section.fields?.length || 0);
        }, 0);
      }, 0);

      // Analyze field types
      const fieldTypes = {};
      const requiredFields = [];
      const fieldsWithValidation = [];
      const fieldsWithDropdown = [];
      const fieldsWithImage = [];
      const fieldsWithNotes = [];

      categories.forEach(category => {
        category.sections.forEach(section => {
          (section.fields || []).forEach(field => {
            // Count field types
            fieldTypes[field.field_type] = (fieldTypes[field.field_type] || 0) + 1;

            // Track required fields
            if (field.is_required) {
              requiredFields.push({
                fieldName: field.field_name,
                fieldType: field.field_type,
                categoryName: category.category_name,
                sectionName: section.section_name
              });
            }

            // Track fields with validation
            if (field.validation_rules && (
              field.validation_rules.min_value ||
              field.validation_rules.max_value ||
              field.validation_rules.min_length ||
              field.validation_rules.max_length ||
              field.validation_rules.pattern
            )) {
              fieldsWithValidation.push(field.field_name);
            }

            // Track dropdown fields
            if (field.dropdown_config && field.dropdown_config.dropdown_id) {
              fieldsWithDropdown.push(field.field_name);
            }

            // Track fields with image support
            if (field.has_image) {
              fieldsWithImage.push(field.field_name);
            }

            // Track fields with notes support
            if (field.has_notes) {
              fieldsWithNotes.push(field.field_name);
            }
          });
        });
      });

      // Calculate configuration score
      let configScore = 0;
      if (categories.length > 0) configScore += 20;
      if (totalSections > 0) configScore += 20;
      if (totalFields > 0) configScore += 20;
      if (config.description && config.description.trim() !== '') configScore += 10;
      if (config.settings) configScore += 10;
      if (requiredFields.length > 0) configScore += 10;
      if (fieldsWithValidation.length > 0) configScore += 10;

      return {
        configId: config._id,
        configName: config.config_name,
        description: config.description,
        version: config.version,
        isActive: config.is_active,
        isDefault: config.is_default,
        dealershipId: config.dealership_id,
        totalCategories: categories.length,
        totalSections,
        totalFields,
        requiredFieldsCount: requiredFields.length,
        fieldsWithValidationCount: fieldsWithValidation.length,
        fieldsWithDropdownCount: fieldsWithDropdown.length,
        fieldsWithImageCount: fieldsWithImage.length,
        fieldsWithNotesCount: fieldsWithNotes.length,
        fieldTypes,
        avgFieldsPerSection: totalSections > 0 
          ? Math.round((totalFields / totalSections) * 10) / 10 
          : 0,
        avgSectionsPerCategory: categories.length > 0
          ? Math.round((totalSections / categories.length) * 10) / 10
          : 0,
        configScore,
        configHealth: configScore >= 80 ? 'Excellent' :
                     configScore >= 60 ? 'Good' :
                     configScore >= 40 ? 'Fair' : 'Poor',
        settings: config.settings,
        createdBy: config.created_by ? {
          name: `${config.created_by.first_name} ${config.created_by.last_name}`,
          email: config.created_by.email
        } : null,
        createdAt: config.created_at,
        updatedAt: config.updated_at
      };
    });

    // 4. Analyze version distribution
    const versionDistribution = configs.reduce((acc, config) => {
      const version = config.version || 'unknown';
      acc[version] = (acc[version] || 0) + 1;
      return acc;
    }, {});

    // 5. Analyze by dealership (if applicable)
    const dealershipDistribution = configs.reduce((acc, config) => {
      const dealershipId = config.dealership_id || 'company_wide';
      if (!acc[dealershipId]) {
        acc[dealershipId] = {
          dealershipId,
          count: 0,
          activeCount: 0,
          defaultCount: 0
        };
      }
      acc[dealershipId].count++;
      if (config.is_active) acc[dealershipId].activeCount++;
      if (config.is_default) acc[dealershipId].defaultCount++;
      return acc;
    }, {});

    // 6. Aggregate field type usage across all configs
    const globalFieldTypeUsage = configAnalysis.reduce((acc, config) => {
      Object.entries(config.fieldTypes).forEach(([type, count]) => {
        acc[type] = (acc[type] || 0) + count;
      });
      return acc;
    }, {});

    // 7. Top performing configs
    const topConfigs = configAnalysis
      .sort((a, b) => b.configScore - a.configScore)
      .slice(0, 5);

    // 8. Identify configs needing attention
    const configsNeedingAttention = configAnalysis.filter(c => 
      c.configHealth === 'Poor' || c.totalFields === 0
    );

    // 9. Analyze settings usage
    const settingsAnalysis = {
      requirePhotos: configs.filter(c => c.settings?.require_photos).length,
      allowVideoUpload: configs.filter(c => c.settings?.allow_video_upload).length,
      requireCustomerSignature: configs.filter(c => c.settings?.require_customer_signature).length,
      generateOfferImmediately: configs.filter(c => c.settings?.generate_offer_immediately).length,
      avgMaxPhotosPerSection: configs.length > 0
        ? Math.round(configs.reduce((sum, c) => sum + (c.settings?.max_photos_per_section || 0), 0) / configs.length)
        : 0,
      avgMaxVideoSizeMb: configs.length > 0
        ? Math.round(configs.reduce((sum, c) => sum + (c.settings?.max_video_size_mb || 0), 0) / configs.length)
        : 0,
      avgAutoSaveInterval: configs.length > 0
        ? Math.round(configs.reduce((sum, c) => sum + (c.settings?.auto_save_interval || 0), 0) / configs.length)
        : 0
    };

    // 10. Summary statistics
    const summaryStats = {
      totalConfigs: configs.length,
      activeConfigs: activeConfigs.length,
      inactiveConfigs: inactiveConfigs.length,
      defaultConfigs: defaultConfigs.length,
      activePercentage: configs.length > 0 
        ? Math.round((activeConfigs.length / configs.length) * 100) 
        : 0,
      totalCategories: configAnalysis.reduce((sum, c) => sum + c.totalCategories, 0),
      totalSections: configAnalysis.reduce((sum, c) => sum + c.totalSections, 0),
      totalFields: configAnalysis.reduce((sum, c) => sum + c.totalFields, 0),
      avgCategoriesPerConfig: configs.length > 0
        ? Math.round((configAnalysis.reduce((sum, c) => sum + c.totalCategories, 0) / configs.length) * 10) / 10
        : 0,
      avgSectionsPerConfig: configs.length > 0
        ? Math.round((configAnalysis.reduce((sum, c) => sum + c.totalSections, 0) / configs.length) * 10) / 10
        : 0,
      avgFieldsPerConfig: configs.length > 0
        ? Math.round((configAnalysis.reduce((sum, c) => sum + c.totalFields, 0) / configs.length) * 10) / 10
        : 0,
      avgConfigScore: configs.length > 0
        ? Math.round(configAnalysis.reduce((sum, c) => sum + c.configScore, 0) / configs.length)
        : 0,
      uniqueVersions: Object.keys(versionDistribution).length,
      uniqueDealerships: Object.keys(dealershipDistribution).length,
      configsNeedingAttention: configsNeedingAttention.length,
      overallHealth: activeConfigs.length / configs.length >= 0.7 ? 'Healthy' :
                    activeConfigs.length / configs.length >= 0.4 ? 'Moderate' : 'Needs Improvement'
    };

    res.json(formatReportResponse({
      configs: configAnalysis,
      topConfigs,
      configsNeedingAttention,
      versionDistribution: Object.entries(versionDistribution).map(([version, count]) => ({
        version,
        count,
        percentage: configs.length > 0 ? Math.round((count / configs.length) * 100) : 0
      })),
      dealershipDistribution: Object.values(dealershipDistribution),
      globalFieldTypeUsage: Object.entries(globalFieldTypeUsage).map(([type, count]) => ({
        fieldType: type,
        count,
        percentage: summaryStats.totalFields > 0 
          ? Math.round((count / summaryStats.totalFields) * 100) 
          : 0
      })).sort((a, b) => b.count - a.count),
      settingsAnalysis,
      summary: summaryStats
    }, {
      reportType: 'tradein-config-usage',
      filters: matchFilter
    }));

  } catch (error) {
    return handleReportError(error, res, 'Tradein Config Usage');
  }
};

/**
 * Get Tradein Field Analysis
 * Analyzes field completion rates and usage patterns
 * Includes field type distribution, required fields analysis, and validation coverage
 * 
 * @route GET /api/company/reports/tradein-config/field-analysis
 * @access Private (company_super_admin, company_admin)
 */
const getTradeinFieldAnalysis = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    // Build base match filter
    const matchFilter = {
      company_id,
      ...dealershipFilter,
      ...dateFilter
    };

    // 1. Get all tradein configs
    const configs = await TradeinConfig.find(matchFilter).lean();

    if (configs.length === 0) {
      return res.json(formatReportResponse({
        fields: [],
        summary: {
          totalFields: 0,
          message: 'No trade-in configurations found'
        }
      }, {
        reportType: 'tradein-field-analysis'
      }));
    }

    // 2. Extract and analyze all fields
    const allFields = [];
    const fieldTypeDistribution = {};
    const requiredFieldsByType = {};
    const validationRulesByType = {};

    configs.forEach(config => {
      const categories = config.categories || [];
      
      categories.forEach(category => {
        category.sections.forEach(section => {
          (section.fields || []).forEach(field => {
            // Track field type distribution
            fieldTypeDistribution[field.field_type] = (fieldTypeDistribution[field.field_type] || 0) + 1;

            // Track required fields by type
            if (field.is_required) {
              requiredFieldsByType[field.field_type] = (requiredFieldsByType[field.field_type] || 0) + 1;
            }

            // Track validation rules by type
            if (field.validation_rules && (
              field.validation_rules.min_value ||
              field.validation_rules.max_value ||
              field.validation_rules.min_length ||
              field.validation_rules.max_length ||
              field.validation_rules.pattern
            )) {
              validationRulesByType[field.field_type] = (validationRulesByType[field.field_type] || 0) + 1;
            }

            // Collect field details
            allFields.push({
              configId: config._id,
              configName: config.config_name,
              categoryId: category.category_id,
              categoryName: category.category_name,
              sectionId: section.section_id,
              sectionName: section.section_name,
              fieldId: field.field_id,
              fieldName: field.field_name,
              fieldType: field.field_type,
              isRequired: field.is_required,
              hasValidation: !!(field.validation_rules && (
                field.validation_rules.min_value ||
                field.validation_rules.max_value ||
                field.validation_rules.min_length ||
                field.validation_rules.max_length ||
                field.validation_rules.pattern
              )),
              validationRules: field.validation_rules,
              hasDropdown: !!(field.dropdown_config && field.dropdown_config.dropdown_id),
              dropdownAllowMultiple: field.dropdown_config?.allow_multiple,
              hasImage: field.has_image,
              hasNotes: field.has_notes,
              displayOrder: field.display_order,
              hasPlaceholder: !!(field.placeholder && field.placeholder.trim() !== ''),
              hasHelpText: !!(field.help_text && field.help_text.trim() !== ''),
              completenessScore: calculateFieldCompletenessScore(field)
            });
          });
        });
      });
    });

    // 3. Analyze field type usage patterns
    const fieldTypeAnalysis = Object.entries(fieldTypeDistribution).map(([type, count]) => {
      const requiredCount = requiredFieldsByType[type] || 0;
      const validationCount = validationRulesByType[type] || 0;
      const fieldsOfType = allFields.filter(f => f.fieldType === type);
      
      const withImage = fieldsOfType.filter(f => f.hasImage).length;
      const withNotes = fieldsOfType.filter(f => f.hasNotes).length;
      const withDropdown = fieldsOfType.filter(f => f.hasDropdown).length;
      const withPlaceholder = fieldsOfType.filter(f => f.hasPlaceholder).length;
      const withHelpText = fieldsOfType.filter(f => f.hasHelpText).length;

      return {
        fieldType: type,
        totalCount: count,
        requiredCount,
        validationCount,
        withImage,
        withNotes,
        withDropdown,
        withPlaceholder,
        withHelpText,
        requiredPercentage: count > 0 ? Math.round((requiredCount / count) * 100) : 0,
        validationPercentage: count > 0 ? Math.round((validationCount / count) * 100) : 0,
        imagePercentage: count > 0 ? Math.round((withImage / count) * 100) : 0,
        notesPercentage: count > 0 ? Math.round((withNotes / count) * 100) : 0,
        dropdownPercentage: count > 0 ? Math.round((withDropdown / count) * 100) : 0,
        avgCompletenessScore: fieldsOfType.length > 0
          ? Math.round(fieldsOfType.reduce((sum, f) => sum + f.completenessScore, 0) / fieldsOfType.length)
          : 0
      };
    }).sort((a, b) => b.totalCount - a.totalCount);

    // 4. Analyze required fields
    const requiredFields = allFields.filter(f => f.isRequired);
    const requiredFieldsWithValidation = requiredFields.filter(f => f.hasValidation);
    const requiredFieldsWithoutValidation = requiredFields.filter(f => !f.hasValidation);

    // 5. Analyze validation coverage
    const fieldsWithValidation = allFields.filter(f => f.hasValidation);
    const validationTypeUsage = {
      minValue: 0,
      maxValue: 0,
      minLength: 0,
      maxLength: 0,
      pattern: 0
    };

    fieldsWithValidation.forEach(field => {
      if (field.validationRules) {
        if (field.validationRules.min_value) validationTypeUsage.minValue++;
        if (field.validationRules.max_value) validationTypeUsage.maxValue++;
        if (field.validationRules.min_length) validationTypeUsage.minLength++;
        if (field.validationRules.max_length) validationTypeUsage.maxLength++;
        if (field.validationRules.pattern) validationTypeUsage.pattern++;
      }
    });

    // 6. Analyze dropdown usage
    const fieldsWithDropdown = allFields.filter(f => f.hasDropdown);
    const dropdownsAllowingMultiple = fieldsWithDropdown.filter(f => f.dropdownAllowMultiple);

    // 7. Analyze field enhancements
    const fieldsWithImage = allFields.filter(f => f.hasImage);
    const fieldsWithNotes = allFields.filter(f => f.hasNotes);
    const fieldsWithPlaceholder = allFields.filter(f => f.hasPlaceholder);
    const fieldsWithHelpText = allFields.filter(f => f.hasHelpText);

    // 8. Identify well-configured and poorly-configured fields
    const wellConfiguredFields = allFields
      .filter(f => f.completenessScore >= 70)
      .sort((a, b) => b.completenessScore - a.completenessScore)
      .slice(0, 10)
      .map(f => ({
        fieldName: f.fieldName,
        fieldType: f.fieldType,
        configName: f.configName,
        categoryName: f.categoryName,
        sectionName: f.sectionName,
        completenessScore: f.completenessScore
      }));

    const poorlyConfiguredFields = allFields
      .filter(f => f.completenessScore < 40)
      .sort((a, b) => a.completenessScore - b.completenessScore)
      .slice(0, 10)
      .map(f => ({
        fieldName: f.fieldName,
        fieldType: f.fieldType,
        configName: f.configName,
        categoryName: f.categoryName,
        sectionName: f.sectionName,
        completenessScore: f.completenessScore,
        missingFeatures: getMissingFeatures(f)
      }));

    // 9. Analyze display order usage
    const fieldsWithDisplayOrder = allFields.filter(f => 
      f.displayOrder !== undefined && f.displayOrder !== null && f.displayOrder > 0
    );

    // 10. Analyze trade-in specific field types
    const currencyFields = allFields.filter(f => f.fieldType === 'currency');
    const videoFields = allFields.filter(f => f.fieldType === 'video');
    const calculationFields = allFields.filter(f => f.fieldType === 'calculation_field');
    const multiplierFields = allFields.filter(f => f.fieldType === 'mutiplier');

    // 11. Summary statistics
    const summaryStats = {
      totalFields: allFields.length,
      totalConfigs: configs.length,
      uniqueFieldTypes: Object.keys(fieldTypeDistribution).length,
      requiredFields: requiredFields.length,
      requiredPercentage: allFields.length > 0 
        ? Math.round((requiredFields.length / allFields.length) * 100) 
        : 0,
      fieldsWithValidation: fieldsWithValidation.length,
      validationCoverage: allFields.length > 0 
        ? Math.round((fieldsWithValidation.length / allFields.length) * 100) 
        : 0,
      requiredFieldsWithValidation: requiredFieldsWithValidation.length,
      requiredFieldsWithoutValidation: requiredFieldsWithoutValidation.length,
      fieldsWithDropdown: fieldsWithDropdown.length,
      dropdownUsagePercentage: allFields.length > 0 
        ? Math.round((fieldsWithDropdown.length / allFields.length) * 100) 
        : 0,
      dropdownsAllowingMultiple: dropdownsAllowingMultiple.length,
      fieldsWithImage: fieldsWithImage.length,
      imageUsagePercentage: allFields.length > 0 
        ? Math.round((fieldsWithImage.length / allFields.length) * 100) 
        : 0,
      fieldsWithNotes: fieldsWithNotes.length,
      notesUsagePercentage: allFields.length > 0 
        ? Math.round((fieldsWithNotes.length / allFields.length) * 100) 
        : 0,
      fieldsWithPlaceholder: fieldsWithPlaceholder.length,
      placeholderUsagePercentage: allFields.length > 0 
        ? Math.round((fieldsWithPlaceholder.length / allFields.length) * 100) 
        : 0,
      fieldsWithHelpText: fieldsWithHelpText.length,
      helpTextUsagePercentage: allFields.length > 0 
        ? Math.round((fieldsWithHelpText.length / allFields.length) * 100) 
        : 0,
      fieldsWithDisplayOrder: fieldsWithDisplayOrder.length,
      displayOrderUsagePercentage: allFields.length > 0 
        ? Math.round((fieldsWithDisplayOrder.length / allFields.length) * 100) 
        : 0,
      avgCompletenessScore: allFields.length > 0
        ? Math.round(allFields.reduce((sum, f) => sum + f.completenessScore, 0) / allFields.length)
        : 0,
      wellConfiguredFieldsCount: allFields.filter(f => f.completenessScore >= 70).length,
      poorlyConfiguredFieldsCount: allFields.filter(f => f.completenessScore < 40).length,
      avgFieldsPerConfig: configs.length > 0
        ? Math.round((allFields.length / configs.length) * 10) / 10
        : 0,
      // Trade-in specific metrics
      currencyFieldsCount: currencyFields.length,
      videoFieldsCount: videoFields.length,
      calculationFieldsCount: calculationFields.length,
      multiplierFieldsCount: multiplierFields.length
    };

    res.json(formatReportResponse({
      fieldTypeAnalysis,
      validationTypeUsage,
      wellConfiguredFields,
      poorlyConfiguredFields,
      requiredFieldsWithoutValidation: requiredFieldsWithoutValidation.slice(0, 10).map(f => ({
        fieldName: f.fieldName,
        fieldType: f.fieldType,
        configName: f.configName,
        categoryName: f.categoryName,
        sectionName: f.sectionName
      })),
      summary: summaryStats
    }, {
      reportType: 'tradein-field-analysis',
      filters: matchFilter
    }));

  } catch (error) {
    return handleReportError(error, res, 'Tradein Field Analysis');
  }
};

/**
 * Get Tradein Category Effectiveness
 * Analyzes category and section performance metrics
 * Includes category distribution, section analysis, and calculation effectiveness
 * 
 * @route GET /api/company/reports/tradein-config/category-effectiveness
 * @access Private (company_super_admin, company_admin)
 */
const getTradeinCategoryEffectiveness = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    // Build base match filter
    const matchFilter = {
      company_id,
      ...dealershipFilter,
      ...dateFilter
    };

    // 1. Get all tradein configs
    const configs = await TradeinConfig.find(matchFilter).lean();

    if (configs.length === 0) {
      return res.json(formatReportResponse({
        categories: [],
        summary: {
          totalCategories: 0,
          message: 'No trade-in configurations found'
        }
      }, {
        reportType: 'tradein-category-effectiveness'
      }));
    }

    // 2. Extract and analyze all categories
    const allCategories = [];
    const categoryNameDistribution = {};

    configs.forEach(config => {
      const categories = config.categories || [];
      
      categories.forEach(category => {
        const sections = category.sections || [];
        const totalFields = sections.reduce((sum, section) => sum + (section.fields?.length || 0), 0);
        const requiredFields = sections.reduce((sum, section) => {
          return sum + (section.fields?.filter(f => f.is_required).length || 0);
        }, 0);
        const fieldsWithValidation = sections.reduce((sum, section) => {
          return sum + (section.fields?.filter(f => 
            f.validation_rules && (
              f.validation_rules.min_value ||
              f.validation_rules.max_value ||
              f.validation_rules.min_length ||
              f.validation_rules.max_length ||
              f.validation_rules.pattern
            )
          ).length || 0);
        }, 0);

        // Analyze calculations
        const calculations = category.calculations || [];
        const activeCalculations = calculations.filter(c => c.is_active);

        // Analyze sections
        const collapsibleSections = sections.filter(s => s.is_collapsible);
        const expandedByDefaultSections = sections.filter(s => s.is_expanded_by_default);
        const sectionsWithDescription = sections.filter(s => s.description && s.description.trim() !== '');

        // Calculate effectiveness score
        let effectivenessScore = 0;
        if (sections.length > 0) effectivenessScore += 20;
        if (totalFields > 0) effectivenessScore += 20;
        if (category.description && category.description.trim() !== '') effectivenessScore += 10;
        if (category.is_active) effectivenessScore += 10;
        if (requiredFields > 0) effectivenessScore += 10;
        if (fieldsWithValidation > 0) effectivenessScore += 10;
        if (calculations.length > 0) effectivenessScore += 10;
        if (category.display_order !== undefined) effectivenessScore += 10;

        // Track category name distribution
        categoryNameDistribution[category.category_name] = (categoryNameDistribution[category.category_name] || 0) + 1;

        allCategories.push({
          configId: config._id,
          configName: config.config_name,
          categoryId: category.category_id,
          categoryName: category.category_name,
          description: category.description,
          isActive: category.is_active,
          displayOrder: category.display_order,
          totalSections: sections.length,
          totalFields,
          requiredFields,
          fieldsWithValidation,
          totalCalculations: calculations.length,
          activeCalculations: activeCalculations.length,
          collapsibleSections: collapsibleSections.length,
          expandedByDefaultSections: expandedByDefaultSections.length,
          sectionsWithDescription: sectionsWithDescription.length,
          avgFieldsPerSection: sections.length > 0 
            ? Math.round((totalFields / sections.length) * 10) / 10 
            : 0,
          requiredFieldsPercentage: totalFields > 0 
            ? Math.round((requiredFields / totalFields) * 100) 
            : 0,
          validationCoverage: totalFields > 0 
            ? Math.round((fieldsWithValidation / totalFields) * 100) 
            : 0,
          effectivenessScore,
          effectivenessLevel: effectivenessScore >= 70 ? 'High' :
                             effectivenessScore >= 50 ? 'Medium' : 'Low',
          sections: sections.map(section => ({
            sectionId: section.section_id,
            sectionName: section.section_name,
            description: section.description,
            displayOrder: section.display_order,
            isCollapsible: section.is_collapsible,
            isExpandedByDefault: section.is_expanded_by_default,
            fieldCount: section.fields?.length || 0,
            requiredFieldCount: section.fields?.filter(f => f.is_required).length || 0
          }))
        });
      });
    });

    // 3. Analyze category name patterns
    const categoryNameAnalysis = Object.entries(categoryNameDistribution)
      .map(([name, count]) => ({
        categoryName: name,
        count,
        percentage: configs.length > 0 ? Math.round((count / configs.length) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);

    // 4. Analyze active vs inactive categories
    const activeCategories = allCategories.filter(c => c.isActive);
    const inactiveCategories = allCategories.filter(c => !c.isActive);

    // 5. Analyze categories by effectiveness level
    const highEffectiveness = allCategories.filter(c => c.effectivenessLevel === 'High');
    const mediumEffectiveness = allCategories.filter(c => c.effectivenessLevel === 'Medium');
    const lowEffectiveness = allCategories.filter(c => c.effectivenessLevel === 'Low');

    // 6. Analyze calculation usage
    const categoriesWithCalculations = allCategories.filter(c => c.totalCalculations > 0);
    const totalCalculations = allCategories.reduce((sum, c) => sum + c.totalCalculations, 0);
    const totalActiveCalculations = allCategories.reduce((sum, c) => sum + c.activeCalculations, 0);

    // 7. Top performing categories
    const topCategories = allCategories
      .sort((a, b) => b.effectivenessScore - a.effectivenessScore)
      .slice(0, 10)
      .map(c => ({
        categoryName: c.categoryName,
        configName: c.configName,
        effectivenessScore: c.effectivenessScore,
        effectivenessLevel: c.effectivenessLevel,
        totalSections: c.totalSections,
        totalFields: c.totalFields,
        totalCalculations: c.totalCalculations
      }));

    // 8. Categories needing improvement
    const categoriesNeedingImprovement = allCategories
      .filter(c => c.effectivenessLevel === 'Low' || c.totalFields === 0)
      .sort((a, b) => a.effectivenessScore - b.effectivenessScore)
      .slice(0, 10)
      .map(c => ({
        categoryName: c.categoryName,
        configName: c.configName,
        effectivenessScore: c.effectivenessScore,
        effectivenessLevel: c.effectivenessLevel,
        totalSections: c.totalSections,
        totalFields: c.totalFields,
        issues: getCategoryIssues(c)
      }));

    // 9. Section analysis across all categories
    const allSections = allCategories.flatMap(c => c.sections);
    const sectionsWithDescription = allSections.filter(s => s.description && s.description.trim() !== '');
    const collapsibleSections = allSections.filter(s => s.isCollapsible);
    const expandedSections = allSections.filter(s => s.isExpandedByDefault);

    // 10. Summary statistics
    const summaryStats = {
      totalCategories: allCategories.length,
      totalConfigs: configs.length,
      activeCategories: activeCategories.length,
      inactiveCategories: inactiveCategories.length,
      activePercentage: allCategories.length > 0 
        ? Math.round((activeCategories.length / allCategories.length) * 100) 
        : 0,
      uniqueCategoryNames: Object.keys(categoryNameDistribution).length,
      avgCategoriesPerConfig: configs.length > 0
        ? Math.round((allCategories.length / configs.length) * 10) / 10
        : 0,
      totalSections: allCategories.reduce((sum, c) => sum + c.totalSections, 0),
      totalFields: allCategories.reduce((sum, c) => sum + c.totalFields, 0),
      avgSectionsPerCategory: allCategories.length > 0
        ? Math.round((allCategories.reduce((sum, c) => sum + c.totalSections, 0) / allCategories.length) * 10) / 10
        : 0,
      avgFieldsPerCategory: allCategories.length > 0
        ? Math.round((allCategories.reduce((sum, c) => sum + c.totalFields, 0) / allCategories.length) * 10) / 10
        : 0,
      highEffectiveness: highEffectiveness.length,
      mediumEffectiveness: mediumEffectiveness.length,
      lowEffectiveness: lowEffectiveness.length,
      highEffectivenessPercentage: allCategories.length > 0 
        ? Math.round((highEffectiveness.length / allCategories.length) * 100) 
        : 0,
      avgEffectivenessScore: allCategories.length > 0
        ? Math.round(allCategories.reduce((sum, c) => sum + c.effectivenessScore, 0) / allCategories.length)
        : 0,
      totalCalculations,
      totalActiveCalculations,
      categoriesWithCalculations: categoriesWithCalculations.length,
      calculationUsagePercentage: allCategories.length > 0 
        ? Math.round((categoriesWithCalculations.length / allCategories.length) * 100) 
        : 0,
      avgCalculationsPerCategory: allCategories.length > 0
        ? Math.round((totalCalculations / allCategories.length) * 10) / 10
        : 0,
      sectionsWithDescription: sectionsWithDescription.length,
      sectionDescriptionPercentage: allSections.length > 0 
        ? Math.round((sectionsWithDescription.length / allSections.length) * 100) 
        : 0,
      collapsibleSections: collapsibleSections.length,
      collapsiblePercentage: allSections.length > 0 
        ? Math.round((collapsibleSections.length / allSections.length) * 100) 
        : 0,
      expandedByDefaultSections: expandedSections.length,
      overallHealth: highEffectiveness.length / allCategories.length >= 0.6 ? 'Excellent' :
                    highEffectiveness.length / allCategories.length >= 0.4 ? 'Good' :
                    highEffectiveness.length / allCategories.length >= 0.2 ? 'Fair' : 'Needs Improvement'
    };

    res.json(formatReportResponse({
      categories: allCategories,
      topCategories,
      categoriesNeedingImprovement,
      categoryNameAnalysis,
      summary: summaryStats
    }, {
      reportType: 'tradein-category-effectiveness',
      filters: matchFilter
    }));

  } catch (error) {
    return handleReportError(error, res, 'Tradein Category Effectiveness');
  }
};

/**
 * Helper function to calculate field completeness score
 * @param {Object} field - Field object
 * @returns {number} Completeness score (0-100)
 */
function calculateFieldCompletenessScore(field) {
  let score = 0;

  // Basic field configuration (30 points)
  if (field.field_name && field.field_name.trim() !== '') score += 15;
  if (field.field_type) score += 15;

  // Required field (10 points)
  if (field.is_required) score += 10;

  // Validation rules (20 points)
  if (field.validation_rules && (
    field.validation_rules.min_value ||
    field.validation_rules.max_value ||
    field.validation_rules.min_length ||
    field.validation_rules.max_length ||
    field.validation_rules.pattern
  )) score += 20;

  // Dropdown configuration (10 points)
  if (field.dropdown_config && field.dropdown_config.dropdown_id) score += 10;

  // User assistance features (20 points)
  if (field.placeholder && field.placeholder.trim() !== '') score += 10;
  if (field.help_text && field.help_text.trim() !== '') score += 10;

  // Enhancement features (10 points)
  if (field.has_image) score += 5;
  if (field.has_notes) score += 5;

  return score;
}

/**
 * Helper function to get missing features for a field
 * @param {Object} field - Field object
 * @returns {Array} Array of missing features
 */
function getMissingFeatures(field) {
  const missing = [];

  if (!field.hasValidation) missing.push('validation_rules');
  if (!field.hasPlaceholder) missing.push('placeholder');
  if (!field.hasHelpText) missing.push('help_text');
  if (field.fieldType === 'dropdown' && !field.hasDropdown) missing.push('dropdown_config');
  if (!field.hasImage && ['text', 'dropdown', 'currency'].includes(field.fieldType)) missing.push('image_support');
  if (!field.hasNotes) missing.push('notes_support');

  return missing;
}

/**
 * Helper function to get category issues
 * @param {Object} category - Category object
 * @returns {Array} Array of issues
 */
function getCategoryIssues(category) {
  const issues = [];

  if (category.totalSections === 0) issues.push('No sections configured');
  if (category.totalFields === 0) issues.push('No fields configured');
  if (!category.description || category.description.trim() === '') issues.push('Missing description');
  if (!category.isActive) issues.push('Category is inactive');
  if (category.requiredFields === 0 && category.totalFields > 0) issues.push('No required fields');
  if (category.validationCoverage < 30) issues.push('Low validation coverage');
  if (category.totalCalculations === 0 && category.totalFields > 5) issues.push('No calculations configured');

  return issues;
}

module.exports = {
  getTradeinConfigUsage,
  getTradeinFieldAnalysis,
  getTradeinCategoryEffectiveness
};
