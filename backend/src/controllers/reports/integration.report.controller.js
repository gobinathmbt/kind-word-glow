/**
 * Integration Report Controller
 * Handles all integration analytics and reporting endpoints
 * Provides comprehensive integration health, environment usage, and type distribution metrics
 */

const Integration = require('../../models/Integration');
const { 
  getDealershipFilter, 
  getDateFilter, 
  formatReportResponse, 
  handleReportError,
  buildBasePipeline 
} = require('../../utils/reportHelpers');

/**
 * Get Integration Status Overview
 * Analyzes integration health and status across all integrations
 * Includes active/inactive status, environment health, and configuration completeness
 * 
 * @route GET /api/company/reports/integration/status-overview
 * @access Private (company_super_admin, company_admin)
 */
const getIntegrationStatusOverview = async (req, res) => {
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

    // 1. Get all integrations for the company
    const integrations = await Integration.find(matchFilter)
      .populate('created_by', 'first_name last_name email')
      .populate('updated_by', 'first_name last_name email')
      .lean();

    if (integrations.length === 0) {
      return res.json(formatReportResponse({
        integrations: [],
        summary: {
          totalIntegrations: 0,
          message: 'No integrations found'
        }
      }, {
        reportType: 'integration-status-overview'
      }));
    }

    // 2. Analyze integration status
    const activeIntegrations = integrations.filter(i => i.is_active === true);
    const inactiveIntegrations = integrations.filter(i => i.is_active === false);

    // 3. Analyze environment status for each integration
    const integrationAnalysis = integrations.map(integration => {
      const environments = integration.environments || {};
      
      // Check environment status
      const devActive = environments.development?.is_active || false;
      const testActive = environments.testing?.is_active || false;
      const prodActive = environments.production?.is_active || false;
      
      // Check configuration completeness
      const devConfigured = environments.development?.configuration && 
        Object.keys(environments.development.configuration).length > 0;
      const testConfigured = environments.testing?.configuration && 
        Object.keys(environments.testing.configuration).length > 0;
      const prodConfigured = environments.production?.configuration && 
        Object.keys(environments.production.configuration).length > 0;

      // Count active environments
      const activeEnvironments = [devActive, testActive, prodActive].filter(Boolean).length;
      const configuredEnvironments = [devConfigured, testConfigured, prodConfigured].filter(Boolean).length;

      // Calculate health score
      let healthScore = 0;
      if (integration.is_active) healthScore += 20;
      if (prodActive) healthScore += 30;
      if (prodConfigured) healthScore += 20;
      if (activeEnvironments >= 2) healthScore += 15;
      if (configuredEnvironments >= 2) healthScore += 15;

      // Determine health status
      const healthStatus = healthScore >= 80 ? 'Healthy' :
                          healthScore >= 60 ? 'Good' :
                          healthScore >= 40 ? 'Fair' : 'Poor';

      // Check for issues
      const issues = [];
      if (!integration.is_active) issues.push('Integration is inactive');
      if (!prodActive) issues.push('Production environment is not active');
      if (!prodConfigured) issues.push('Production environment not configured');
      if (activeEnvironments === 0) issues.push('No environments are active');
      if (configuredEnvironments === 0) issues.push('No environments are configured');
      if (integration.active_environment && !environments[integration.active_environment]?.is_active) {
        issues.push(`Active environment (${integration.active_environment}) is not enabled`);
      }

      return {
        integrationId: integration._id,
        integrationType: integration.integration_type,
        displayName: integration.display_name,
        isActive: integration.is_active,
        activeEnvironment: integration.active_environment,
        environments: {
          development: {
            isActive: devActive,
            isConfigured: devConfigured,
            configKeys: devConfigured ? Object.keys(environments.development.configuration).length : 0
          },
          testing: {
            isActive: testActive,
            isConfigured: testConfigured,
            configKeys: testConfigured ? Object.keys(environments.testing.configuration).length : 0
          },
          production: {
            isActive: prodActive,
            isConfigured: prodConfigured,
            configKeys: prodConfigured ? Object.keys(environments.production.configuration).length : 0
          }
        },
        activeEnvironmentsCount: activeEnvironments,
        configuredEnvironmentsCount: configuredEnvironments,
        healthScore,
        healthStatus,
        issues,
        createdBy: integration.created_by ? {
          name: `${integration.created_by.first_name} ${integration.created_by.last_name}`,
          email: integration.created_by.email
        } : null,
        updatedBy: integration.updated_by ? {
          name: `${integration.updated_by.first_name} ${integration.updated_by.last_name}`,
          email: integration.updated_by.email
        } : null,
        createdAt: integration.created_at,
        updatedAt: integration.updated_at
      };
    });

    // 4. Analyze health status distribution
    const healthyIntegrations = integrationAnalysis.filter(i => i.healthStatus === 'Healthy');
    const goodIntegrations = integrationAnalysis.filter(i => i.healthStatus === 'Good');
    const fairIntegrations = integrationAnalysis.filter(i => i.healthStatus === 'Fair');
    const poorIntegrations = integrationAnalysis.filter(i => i.healthStatus === 'Poor');

    // 5. Analyze environment activation across all integrations
    const totalDevActive = integrationAnalysis.filter(i => i.environments.development.isActive).length;
    const totalTestActive = integrationAnalysis.filter(i => i.environments.testing.isActive).length;
    const totalProdActive = integrationAnalysis.filter(i => i.environments.production.isActive).length;

    const totalDevConfigured = integrationAnalysis.filter(i => i.environments.development.isConfigured).length;
    const totalTestConfigured = integrationAnalysis.filter(i => i.environments.testing.isConfigured).length;
    const totalProdConfigured = integrationAnalysis.filter(i => i.environments.production.isConfigured).length;

    // 6. Analyze active environment preferences
    const activeEnvironmentDistribution = integrations.reduce((acc, integration) => {
      const env = integration.active_environment || 'not_set';
      acc[env] = (acc[env] || 0) + 1;
      return acc;
    }, {});

    // 7. Identify integrations with issues
    const integrationsWithIssues = integrationAnalysis.filter(i => i.issues.length > 0);
    const criticalIssues = integrationAnalysis.filter(i => 
      i.issues.some(issue => 
        issue.includes('Production') || 
        issue.includes('inactive') || 
        issue.includes('No environments')
      )
    );

    // 8. Top performing integrations
    const topIntegrations = integrationAnalysis
      .sort((a, b) => b.healthScore - a.healthScore)
      .slice(0, 5)
      .map(i => ({
        displayName: i.displayName,
        integrationType: i.integrationType,
        healthScore: i.healthScore,
        healthStatus: i.healthStatus,
        activeEnvironmentsCount: i.activeEnvironmentsCount
      }));

    // 9. Integrations needing attention
    const integrationsNeedingAttention = integrationAnalysis
      .filter(i => i.healthStatus === 'Poor' || i.issues.length > 2)
      .sort((a, b) => a.healthScore - b.healthScore)
      .slice(0, 5)
      .map(i => ({
        displayName: i.displayName,
        integrationType: i.integrationType,
        healthScore: i.healthScore,
        healthStatus: i.healthStatus,
        issues: i.issues
      }));

    // 10. Summary statistics
    const summaryStats = {
      totalIntegrations: integrations.length,
      activeIntegrations: activeIntegrations.length,
      inactiveIntegrations: inactiveIntegrations.length,
      activePercentage: integrations.length > 0 
        ? Math.round((activeIntegrations.length / integrations.length) * 100) 
        : 0,
      healthyIntegrations: healthyIntegrations.length,
      goodIntegrations: goodIntegrations.length,
      fairIntegrations: fairIntegrations.length,
      poorIntegrations: poorIntegrations.length,
      healthyPercentage: integrations.length > 0 
        ? Math.round((healthyIntegrations.length / integrations.length) * 100) 
        : 0,
      avgHealthScore: integrations.length > 0
        ? Math.round(integrationAnalysis.reduce((sum, i) => sum + i.healthScore, 0) / integrations.length)
        : 0,
      developmentActive: totalDevActive,
      testingActive: totalTestActive,
      productionActive: totalProdActive,
      developmentConfigured: totalDevConfigured,
      testingConfigured: totalTestConfigured,
      productionConfigured: totalProdConfigured,
      integrationsWithIssues: integrationsWithIssues.length,
      criticalIssues: criticalIssues.length,
      overallHealth: healthyIntegrations.length / integrations.length >= 0.7 ? 'Excellent' :
                    healthyIntegrations.length / integrations.length >= 0.5 ? 'Good' :
                    healthyIntegrations.length / integrations.length >= 0.3 ? 'Fair' : 'Needs Improvement'
    };

    res.json(formatReportResponse({
      integrations: integrationAnalysis,
      topIntegrations,
      integrationsNeedingAttention,
      activeEnvironmentDistribution: Object.entries(activeEnvironmentDistribution).map(([env, count]) => ({
        environment: env,
        count,
        percentage: integrations.length > 0 ? Math.round((count / integrations.length) * 100) : 0
      })),
      summary: summaryStats
    }, {
      reportType: 'integration-status-overview',
      filters: matchFilter
    }));

  } catch (error) {
    return handleReportError(error, res, 'Integration Status Overview');
  }
};

/**
 * Get Integration Environment Usage
 * Analyzes environment-wise usage patterns across all integrations
 * Includes activation rates, configuration completeness, and environment preferences
 * 
 * @route GET /api/company/reports/integration/environment-usage
 * @access Private (company_super_admin, company_admin)
 */
const getIntegrationEnvironmentUsage = async (req, res) => {
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

    // 1. Get all integrations
    const integrations = await Integration.find(matchFilter).lean();

    if (integrations.length === 0) {
      return res.json(formatReportResponse({
        environments: [],
        summary: {
          totalIntegrations: 0,
          message: 'No integrations found'
        }
      }, {
        reportType: 'integration-environment-usage'
      }));
    }

    // 2. Analyze each environment across all integrations
    const environmentAnalysis = {
      development: {
        environmentName: 'Development',
        totalIntegrations: integrations.length,
        activeCount: 0,
        inactiveCount: 0,
        configuredCount: 0,
        notConfiguredCount: 0,
        totalConfigKeys: 0,
        integrations: []
      },
      testing: {
        environmentName: 'Testing',
        totalIntegrations: integrations.length,
        activeCount: 0,
        inactiveCount: 0,
        configuredCount: 0,
        notConfiguredCount: 0,
        totalConfigKeys: 0,
        integrations: []
      },
      production: {
        environmentName: 'Production',
        totalIntegrations: integrations.length,
        activeCount: 0,
        inactiveCount: 0,
        configuredCount: 0,
        notConfiguredCount: 0,
        totalConfigKeys: 0,
        integrations: []
      }
    };

    // 3. Process each integration
    integrations.forEach(integration => {
      const environments = integration.environments || {};

      ['development', 'testing', 'production'].forEach(envName => {
        const env = environments[envName];
        const envAnalysis = environmentAnalysis[envName];

        const isActive = env?.is_active || false;
        const isConfigured = env?.configuration && Object.keys(env.configuration).length > 0;
        const configKeys = isConfigured ? Object.keys(env.configuration).length : 0;

        if (isActive) {
          envAnalysis.activeCount++;
        } else {
          envAnalysis.inactiveCount++;
        }

        if (isConfigured) {
          envAnalysis.configuredCount++;
          envAnalysis.totalConfigKeys += configKeys;
        } else {
          envAnalysis.notConfiguredCount++;
        }

        envAnalysis.integrations.push({
          integrationId: integration._id,
          integrationType: integration.integration_type,
          displayName: integration.display_name,
          isActive,
          isConfigured,
          configKeys,
          isActiveEnvironment: integration.active_environment === envName
        });
      });
    });

    // 4. Calculate percentages and averages for each environment
    Object.values(environmentAnalysis).forEach(env => {
      env.activePercentage = env.totalIntegrations > 0 
        ? Math.round((env.activeCount / env.totalIntegrations) * 100) 
        : 0;
      env.configuredPercentage = env.totalIntegrations > 0 
        ? Math.round((env.configuredCount / env.totalIntegrations) * 100) 
        : 0;
      env.avgConfigKeys = env.configuredCount > 0 
        ? Math.round((env.totalConfigKeys / env.configuredCount) * 10) / 10 
        : 0;
      
      // Sort integrations by active status and config keys
      env.integrations.sort((a, b) => {
        if (a.isActive !== b.isActive) return b.isActive - a.isActive;
        return b.configKeys - a.configKeys;
      });
    });

    // 5. Analyze active environment preferences
    const activeEnvironmentPreferences = integrations.reduce((acc, integration) => {
      const env = integration.active_environment || 'not_set';
      acc[env] = (acc[env] || 0) + 1;
      return acc;
    }, {});

    // 6. Compare environments
    const environmentComparison = [
      {
        environment: 'Development',
        activeCount: environmentAnalysis.development.activeCount,
        configuredCount: environmentAnalysis.development.configuredCount,
        activePercentage: environmentAnalysis.development.activePercentage,
        configuredPercentage: environmentAnalysis.development.configuredPercentage,
        avgConfigKeys: environmentAnalysis.development.avgConfigKeys
      },
      {
        environment: 'Testing',
        activeCount: environmentAnalysis.testing.activeCount,
        configuredCount: environmentAnalysis.testing.configuredCount,
        activePercentage: environmentAnalysis.testing.activePercentage,
        configuredPercentage: environmentAnalysis.testing.configuredPercentage,
        avgConfigKeys: environmentAnalysis.testing.avgConfigKeys
      },
      {
        environment: 'Production',
        activeCount: environmentAnalysis.production.activeCount,
        configuredCount: environmentAnalysis.production.configuredCount,
        activePercentage: environmentAnalysis.production.activePercentage,
        configuredPercentage: environmentAnalysis.production.configuredPercentage,
        avgConfigKeys: environmentAnalysis.production.avgConfigKeys
      }
    ];

    // 7. Identify integrations with all environments active
    const fullyActiveIntegrations = integrations.filter(integration => {
      const envs = integration.environments || {};
      return envs.development?.is_active && 
             envs.testing?.is_active && 
             envs.production?.is_active;
    });

    // 8. Identify integrations with no environments active
    const noActiveEnvironments = integrations.filter(integration => {
      const envs = integration.environments || {};
      return !envs.development?.is_active && 
             !envs.testing?.is_active && 
             !envs.production?.is_active;
    });

    // 9. Identify integrations with mismatched active environment
    const mismatchedActiveEnvironment = integrations.filter(integration => {
      const activeEnv = integration.active_environment;
      if (!activeEnv) return false;
      const envs = integration.environments || {};
      return !envs[activeEnv]?.is_active;
    });

    // 10. Configuration completeness analysis
    const fullyConfiguredIntegrations = integrations.filter(integration => {
      const envs = integration.environments || {};
      const devConfigured = envs.development?.configuration && Object.keys(envs.development.configuration).length > 0;
      const testConfigured = envs.testing?.configuration && Object.keys(envs.testing.configuration).length > 0;
      const prodConfigured = envs.production?.configuration && Object.keys(envs.production.configuration).length > 0;
      return devConfigured && testConfigured && prodConfigured;
    });

    const notConfiguredIntegrations = integrations.filter(integration => {
      const envs = integration.environments || {};
      const devConfigured = envs.development?.configuration && Object.keys(envs.development.configuration).length > 0;
      const testConfigured = envs.testing?.configuration && Object.keys(envs.testing.configuration).length > 0;
      const prodConfigured = envs.production?.configuration && Object.keys(envs.production.configuration).length > 0;
      return !devConfigured && !testConfigured && !prodConfigured;
    });

    // 11. Summary statistics
    const summaryStats = {
      totalIntegrations: integrations.length,
      developmentActive: environmentAnalysis.development.activeCount,
      developmentConfigured: environmentAnalysis.development.configuredCount,
      testingActive: environmentAnalysis.testing.activeCount,
      testingConfigured: environmentAnalysis.testing.configuredCount,
      productionActive: environmentAnalysis.production.activeCount,
      productionConfigured: environmentAnalysis.production.configuredCount,
      fullyActiveIntegrations: fullyActiveIntegrations.length,
      noActiveEnvironments: noActiveEnvironments.length,
      mismatchedActiveEnvironment: mismatchedActiveEnvironment.length,
      fullyConfiguredIntegrations: fullyConfiguredIntegrations.length,
      notConfiguredIntegrations: notConfiguredIntegrations.length,
      mostUsedEnvironment: Object.entries(activeEnvironmentPreferences)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'none',
      avgEnvironmentsActivePerIntegration: integrations.length > 0
        ? Math.round(((environmentAnalysis.development.activeCount + 
                      environmentAnalysis.testing.activeCount + 
                      environmentAnalysis.production.activeCount) / integrations.length) * 10) / 10
        : 0,
      avgEnvironmentsConfiguredPerIntegration: integrations.length > 0
        ? Math.round(((environmentAnalysis.development.configuredCount + 
                      environmentAnalysis.testing.configuredCount + 
                      environmentAnalysis.production.configuredCount) / integrations.length) * 10) / 10
        : 0
    };

    res.json(formatReportResponse({
      environments: Object.values(environmentAnalysis),
      environmentComparison,
      activeEnvironmentPreferences: Object.entries(activeEnvironmentPreferences).map(([env, count]) => ({
        environment: env,
        count,
        percentage: integrations.length > 0 ? Math.round((count / integrations.length) * 100) : 0
      })),
      fullyActiveIntegrations: fullyActiveIntegrations.map(i => ({
        integrationId: i._id,
        integrationType: i.integration_type,
        displayName: i.display_name
      })),
      noActiveEnvironments: noActiveEnvironments.map(i => ({
        integrationId: i._id,
        integrationType: i.integration_type,
        displayName: i.display_name
      })),
      mismatchedActiveEnvironment: mismatchedActiveEnvironment.map(i => ({
        integrationId: i._id,
        integrationType: i.integration_type,
        displayName: i.display_name,
        activeEnvironment: i.active_environment
      })),
      summary: summaryStats
    }, {
      reportType: 'integration-environment-usage',
      filters: matchFilter
    }));

  } catch (error) {
    return handleReportError(error, res, 'Integration Environment Usage');
  }
};

/**
 * Get Integration Type Distribution
 * Analyzes integration type usage patterns and distribution
 * Includes type popularity, configuration patterns, and health metrics by type
 * 
 * @route GET /api/company/reports/integration/type-distribution
 * @access Private (company_super_admin, company_admin)
 */
const getIntegrationTypeDistribution = async (req, res) => {
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

    // 1. Get all integrations
    const integrations = await Integration.find(matchFilter)
      .populate('created_by', 'first_name last_name email')
      .lean();

    if (integrations.length === 0) {
      return res.json(formatReportResponse({
        types: [],
        summary: {
          totalIntegrations: 0,
          message: 'No integrations found'
        }
      }, {
        reportType: 'integration-type-distribution'
      }));
    }

    // 2. Group integrations by type
    const typeGroups = integrations.reduce((acc, integration) => {
      const type = integration.integration_type || 'unknown';
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(integration);
      return acc;
    }, {});

    // 3. Analyze each integration type
    const typeAnalysis = Object.entries(typeGroups).map(([type, integrationsOfType]) => {
      // Count active/inactive
      const activeCount = integrationsOfType.filter(i => i.is_active).length;
      const inactiveCount = integrationsOfType.filter(i => !i.is_active).length;

      // Analyze environments for this type
      let devActiveCount = 0;
      let testActiveCount = 0;
      let prodActiveCount = 0;
      let devConfiguredCount = 0;
      let testConfiguredCount = 0;
      let prodConfiguredCount = 0;
      let totalConfigKeys = 0;

      integrationsOfType.forEach(integration => {
        const envs = integration.environments || {};
        
        if (envs.development?.is_active) devActiveCount++;
        if (envs.testing?.is_active) testActiveCount++;
        if (envs.production?.is_active) prodActiveCount++;

        const devConfigured = envs.development?.configuration && Object.keys(envs.development.configuration).length > 0;
        const testConfigured = envs.testing?.configuration && Object.keys(envs.testing.configuration).length > 0;
        const prodConfigured = envs.production?.configuration && Object.keys(envs.production.configuration).length > 0;

        if (devConfigured) {
          devConfiguredCount++;
          totalConfigKeys += Object.keys(envs.development.configuration).length;
        }
        if (testConfigured) {
          testConfiguredCount++;
          totalConfigKeys += Object.keys(envs.testing.configuration).length;
        }
        if (prodConfigured) {
          prodConfiguredCount++;
          totalConfigKeys += Object.keys(envs.production.configuration).length;
        }
      });

      // Calculate health score for this type
      const avgActivePercentage = (activeCount / integrationsOfType.length) * 100;
      const avgProdActivePercentage = (prodActiveCount / integrationsOfType.length) * 100;
      const avgConfiguredPercentage = ((devConfiguredCount + testConfiguredCount + prodConfiguredCount) / (integrationsOfType.length * 3)) * 100;

      let typeHealthScore = 0;
      if (avgActivePercentage >= 70) typeHealthScore += 30;
      else if (avgActivePercentage >= 50) typeHealthScore += 20;
      else if (avgActivePercentage >= 30) typeHealthScore += 10;

      if (avgProdActivePercentage >= 70) typeHealthScore += 40;
      else if (avgProdActivePercentage >= 50) typeHealthScore += 25;
      else if (avgProdActivePercentage >= 30) typeHealthScore += 15;

      if (avgConfiguredPercentage >= 70) typeHealthScore += 30;
      else if (avgConfiguredPercentage >= 50) typeHealthScore += 20;
      else if (avgConfiguredPercentage >= 30) typeHealthScore += 10;

      const typeHealthStatus = typeHealthScore >= 80 ? 'Excellent' :
                              typeHealthScore >= 60 ? 'Good' :
                              typeHealthScore >= 40 ? 'Fair' : 'Poor';

      // Analyze active environment preferences for this type
      const activeEnvPreferences = integrationsOfType.reduce((acc, i) => {
        const env = i.active_environment || 'not_set';
        acc[env] = (acc[env] || 0) + 1;
        return acc;
      }, {});

      const mostUsedEnvironment = Object.entries(activeEnvPreferences)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'none';

      // Get creation timeline
      const createdDates = integrationsOfType.map(i => new Date(i.created_at));
      const oldestCreation = new Date(Math.min(...createdDates));
      const newestCreation = new Date(Math.max(...createdDates));

      return {
        integrationType: type,
        count: integrationsOfType.length,
        percentage: Math.round((integrationsOfType.length / integrations.length) * 100),
        activeCount,
        inactiveCount,
        activePercentage: Math.round((activeCount / integrationsOfType.length) * 100),
        environments: {
          development: {
            activeCount: devActiveCount,
            configuredCount: devConfiguredCount,
            activePercentage: Math.round((devActiveCount / integrationsOfType.length) * 100)
          },
          testing: {
            activeCount: testActiveCount,
            configuredCount: testConfiguredCount,
            activePercentage: Math.round((testActiveCount / integrationsOfType.length) * 100)
          },
          production: {
            activeCount: prodActiveCount,
            configuredCount: prodConfiguredCount,
            activePercentage: Math.round((prodActiveCount / integrationsOfType.length) * 100)
          }
        },
        totalConfigKeys,
        avgConfigKeysPerIntegration: integrationsOfType.length > 0 
          ? Math.round((totalConfigKeys / integrationsOfType.length) * 10) / 10 
          : 0,
        typeHealthScore,
        typeHealthStatus,
        mostUsedEnvironment,
        oldestCreation,
        newestCreation,
        integrations: integrationsOfType.map(i => ({
          integrationId: i._id,
          displayName: i.display_name,
          isActive: i.is_active,
          activeEnvironment: i.active_environment,
          createdAt: i.created_at
        }))
      };
    }).sort((a, b) => b.count - a.count);

    // 4. Identify most and least popular types
    const mostPopularType = typeAnalysis[0];
    const leastPopularType = typeAnalysis[typeAnalysis.length - 1];

    // 5. Identify healthiest and least healthy types
    const healthiestType = typeAnalysis.reduce((max, type) => 
      type.typeHealthScore > max.typeHealthScore ? type : max
    , typeAnalysis[0]);

    const leastHealthyType = typeAnalysis.reduce((min, type) => 
      type.typeHealthScore < min.typeHealthScore ? type : min
    , typeAnalysis[0]);

    // 6. Analyze type diversity
    const uniqueTypes = typeAnalysis.length;
    const typesWithMultipleInstances = typeAnalysis.filter(t => t.count > 1).length;
    const typesWithSingleInstance = typeAnalysis.filter(t => t.count === 1).length;

    // 7. Analyze production readiness by type
    const productionReadyTypes = typeAnalysis.filter(t => 
      t.environments.production.activePercentage >= 70
    );

    const notProductionReadyTypes = typeAnalysis.filter(t => 
      t.environments.production.activePercentage < 50
    );

    // 8. Analyze type health distribution
    const excellentTypes = typeAnalysis.filter(t => t.typeHealthStatus === 'Excellent');
    const goodTypes = typeAnalysis.filter(t => t.typeHealthStatus === 'Good');
    const fairTypes = typeAnalysis.filter(t => t.typeHealthStatus === 'Fair');
    const poorTypes = typeAnalysis.filter(t => t.typeHealthStatus === 'Poor');

    // 9. Calculate type concentration (Herfindahl index)
    const typeConcentration = typeAnalysis.reduce((sum, type) => {
      const marketShare = type.count / integrations.length;
      return sum + (marketShare * marketShare);
    }, 0);

    const concentrationLevel = typeConcentration > 0.5 ? 'High' :
                               typeConcentration > 0.25 ? 'Medium' : 'Low';

    // 10. Summary statistics
    const summaryStats = {
      totalIntegrations: integrations.length,
      uniqueTypes,
      typesWithMultipleInstances,
      typesWithSingleInstance,
      mostPopularType: mostPopularType?.integrationType || 'none',
      mostPopularTypeCount: mostPopularType?.count || 0,
      leastPopularType: leastPopularType?.integrationType || 'none',
      leastPopularTypeCount: leastPopularType?.count || 0,
      healthiestType: healthiestType?.integrationType || 'none',
      healthiestTypeScore: healthiestType?.typeHealthScore || 0,
      leastHealthyType: leastHealthyType?.integrationType || 'none',
      leastHealthyTypeScore: leastHealthyType?.typeHealthScore || 0,
      excellentTypes: excellentTypes.length,
      goodTypes: goodTypes.length,
      fairTypes: fairTypes.length,
      poorTypes: poorTypes.length,
      productionReadyTypes: productionReadyTypes.length,
      notProductionReadyTypes: notProductionReadyTypes.length,
      typeConcentration: Math.round(typeConcentration * 1000) / 1000,
      concentrationLevel,
      avgIntegrationsPerType: uniqueTypes > 0 
        ? Math.round((integrations.length / uniqueTypes) * 10) / 10 
        : 0,
      avgTypeHealthScore: uniqueTypes > 0
        ? Math.round(typeAnalysis.reduce((sum, t) => sum + t.typeHealthScore, 0) / uniqueTypes)
        : 0
    };

    res.json(formatReportResponse({
      types: typeAnalysis,
      mostPopularType: mostPopularType ? {
        integrationType: mostPopularType.integrationType,
        count: mostPopularType.count,
        percentage: mostPopularType.percentage,
        activePercentage: mostPopularType.activePercentage
      } : null,
      healthiestType: healthiestType ? {
        integrationType: healthiestType.integrationType,
        typeHealthScore: healthiestType.typeHealthScore,
        typeHealthStatus: healthiestType.typeHealthStatus,
        count: healthiestType.count
      } : null,
      productionReadyTypes: productionReadyTypes.map(t => ({
        integrationType: t.integrationType,
        count: t.count,
        productionActivePercentage: t.environments.production.activePercentage
      })),
      notProductionReadyTypes: notProductionReadyTypes.map(t => ({
        integrationType: t.integrationType,
        count: t.count,
        productionActivePercentage: t.environments.production.activePercentage
      })),
      summary: summaryStats
    }, {
      reportType: 'integration-type-distribution',
      filters: matchFilter
    }));

  } catch (error) {
    return handleReportError(error, res, 'Integration Type Distribution');
  }
};

module.exports = {
  getIntegrationStatusOverview,
  getIntegrationEnvironmentUsage,
  getIntegrationTypeDistribution
};
