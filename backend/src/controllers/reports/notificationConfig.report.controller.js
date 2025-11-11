/**
 * Notification Configuration Report Controller
 * Handles all notification configuration analytics and reporting endpoints
 * Provides comprehensive engagement metrics, trigger analysis, and channel performance
 */

const NotificationConfiguration = require('../../models/NotificationConfiguration');
const Notification = require('../../models/Notification');
const { 
  getDealershipFilter, 
  getDateFilter, 
  formatReportResponse, 
  handleReportError,
  buildBasePipeline 
} = require('../../utils/reportHelpers');

/**
 * Get Notification Engagement Metrics
 * Analyzes notification delivery and engagement across all configurations
 * Includes delivery rates, read rates, engagement patterns, and performance metrics
 * 
 * @route GET /api/company/reports/notification-config/engagement-metrics
 * @access Private (company_super_admin, company_admin)
 */
const getNotificationEngagementMetrics = async (req, res) => {
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

    // 1. Get all notification configurations
    const configurations = await NotificationConfiguration.find({ 
      company_id,
      ...dateFilter 
    })
      .populate('created_by', 'first_name last_name email')
      .populate('updated_by', 'first_name last_name email')
      .lean();

    if (configurations.length === 0) {
      return res.json(formatReportResponse({
        configurations: [],
        summary: {
          totalConfigurations: 0,
          message: 'No notification configurations found'
        }
      }, {
        reportType: 'notification-engagement-metrics'
      }));
    }

    // 2. Get all notifications for these configurations
    const configIds = configurations.map(c => c._id);
    const notifications = await Notification.find({
      company_id,
      configuration_id: { $in: configIds },
      ...dateFilter
    }).lean();

    // 3. Analyze engagement for each configuration
    const configurationAnalysis = configurations.map(config => {
      const configNotifications = notifications.filter(n => 
        n.configuration_id.toString() === config._id.toString()
      );

      const totalSent = configNotifications.length;
      const delivered = configNotifications.filter(n => 
        n.status === 'delivered' || n.status === 'read'
      ).length;
      const read = configNotifications.filter(n => n.is_read).length;
      const failed = configNotifications.filter(n => n.status === 'failed').length;
      const pending = configNotifications.filter(n => n.status === 'pending').length;

      // Calculate engagement rates
      const deliveryRate = totalSent > 0 ? Math.round((delivered / totalSent) * 100) : 0;
      const readRate = delivered > 0 ? Math.round((read / delivered) * 100) : 0;
      const failureRate = totalSent > 0 ? Math.round((failed / totalSent) * 100) : 0;
      const engagementRate = totalSent > 0 ? Math.round((read / totalSent) * 100) : 0;

      // Calculate average time to read
      const readNotifications = configNotifications.filter(n => n.is_read && n.read_at && n.created_at);
      const avgTimeToRead = readNotifications.length > 0
        ? Math.round(readNotifications.reduce((sum, n) => {
            const timeToRead = new Date(n.read_at) - new Date(n.created_at);
            return sum + timeToRead;
          }, 0) / readNotifications.length / 1000 / 60) // Convert to minutes
        : 0;

      // Analyze by priority
      const priorityBreakdown = {
        low: configNotifications.filter(n => n.priority === 'low').length,
        medium: configNotifications.filter(n => n.priority === 'medium').length,
        high: configNotifications.filter(n => n.priority === 'high').length,
        urgent: configNotifications.filter(n => n.priority === 'urgent').length
      };

      // Analyze by type
      const typeBreakdown = {
        info: configNotifications.filter(n => n.type === 'info').length,
        success: configNotifications.filter(n => n.type === 'success').length,
        warning: configNotifications.filter(n => n.type === 'warning').length,
        error: configNotifications.filter(n => n.type === 'error').length
      };

      // Calculate engagement score
      let engagementScore = 0;
      if (deliveryRate >= 90) engagementScore += 30;
      else if (deliveryRate >= 70) engagementScore += 20;
      else if (deliveryRate >= 50) engagementScore += 10;

      if (readRate >= 70) engagementScore += 40;
      else if (readRate >= 50) engagementScore += 25;
      else if (readRate >= 30) engagementScore += 15;

      if (failureRate <= 5) engagementScore += 20;
      else if (failureRate <= 10) engagementScore += 10;
      else if (failureRate <= 20) engagementScore += 5;

      if (avgTimeToRead <= 30) engagementScore += 10;
      else if (avgTimeToRead <= 60) engagementScore += 5;

      const engagementStatus = engagementScore >= 80 ? 'Excellent' :
                              engagementScore >= 60 ? 'Good' :
                              engagementScore >= 40 ? 'Fair' : 'Poor';

      return {
        configurationId: config._id,
        name: config.name,
        description: config.description,
        isActive: config.is_active,
        triggerType: config.trigger_type,
        targetSchema: config.target_schema,
        channels: config.notification_channels,
        metrics: {
          totalSent,
          delivered,
          read,
          failed,
          pending,
          deliveryRate,
          readRate,
          failureRate,
          engagementRate,
          avgTimeToReadMinutes: avgTimeToRead
        },
        priorityBreakdown,
        typeBreakdown,
        engagementScore,
        engagementStatus,
        createdBy: config.created_by ? {
          name: `${config.created_by.first_name} ${config.created_by.last_name}`,
          email: config.created_by.email
        } : null,
        createdAt: config.created_at
      };
    });

    // 4. Overall engagement statistics
    const totalNotifications = notifications.length;
    const totalDelivered = notifications.filter(n => 
      n.status === 'delivered' || n.status === 'read'
    ).length;
    const totalRead = notifications.filter(n => n.is_read).length;
    const totalFailed = notifications.filter(n => n.status === 'failed').length;

    const overallDeliveryRate = totalNotifications > 0 
      ? Math.round((totalDelivered / totalNotifications) * 100) 
      : 0;
    const overallReadRate = totalDelivered > 0 
      ? Math.round((totalRead / totalDelivered) * 100) 
      : 0;
    const overallEngagementRate = totalNotifications > 0 
      ? Math.round((totalRead / totalNotifications) * 100) 
      : 0;

    // 5. Top performing configurations
    const topConfigurations = configurationAnalysis
      .filter(c => c.metrics.totalSent > 0)
      .sort((a, b) => b.engagementScore - a.engagementScore)
      .slice(0, 5)
      .map(c => ({
        name: c.name,
        engagementScore: c.engagementScore,
        engagementStatus: c.engagementStatus,
        readRate: c.metrics.readRate,
        totalSent: c.metrics.totalSent
      }));

    // 6. Configurations needing attention
    const configurationsNeedingAttention = configurationAnalysis
      .filter(c => c.engagementStatus === 'Poor' || c.metrics.failureRate > 20)
      .sort((a, b) => a.engagementScore - b.engagementScore)
      .slice(0, 5)
      .map(c => ({
        name: c.name,
        engagementScore: c.engagementScore,
        engagementStatus: c.engagementStatus,
        failureRate: c.metrics.failureRate,
        totalSent: c.metrics.totalSent
      }));

    // 7. Engagement trends by priority
    const priorityEngagement = {
      low: {
        sent: notifications.filter(n => n.priority === 'low').length,
        read: notifications.filter(n => n.priority === 'low' && n.is_read).length
      },
      medium: {
        sent: notifications.filter(n => n.priority === 'medium').length,
        read: notifications.filter(n => n.priority === 'medium' && n.is_read).length
      },
      high: {
        sent: notifications.filter(n => n.priority === 'high').length,
        read: notifications.filter(n => n.priority === 'high' && n.is_read).length
      },
      urgent: {
        sent: notifications.filter(n => n.priority === 'urgent').length,
        read: notifications.filter(n => n.priority === 'urgent' && n.is_read).length
      }
    };

    Object.keys(priorityEngagement).forEach(priority => {
      const data = priorityEngagement[priority];
      data.readRate = data.sent > 0 ? Math.round((data.read / data.sent) * 100) : 0;
    });

    // 8. Engagement trends by type
    const typeEngagement = {
      info: {
        sent: notifications.filter(n => n.type === 'info').length,
        read: notifications.filter(n => n.type === 'info' && n.is_read).length
      },
      success: {
        sent: notifications.filter(n => n.type === 'success').length,
        read: notifications.filter(n => n.type === 'success' && n.is_read).length
      },
      warning: {
        sent: notifications.filter(n => n.type === 'warning').length,
        read: notifications.filter(n => n.type === 'warning' && n.is_read).length
      },
      error: {
        sent: notifications.filter(n => n.type === 'error').length,
        read: notifications.filter(n => n.type === 'error' && n.is_read).length
      }
    };

    Object.keys(typeEngagement).forEach(type => {
      const data = typeEngagement[type];
      data.readRate = data.sent > 0 ? Math.round((data.read / data.sent) * 100) : 0;
    });

    // 9. Active vs inactive configuration performance
    const activeConfigs = configurationAnalysis.filter(c => c.isActive);
    const inactiveConfigs = configurationAnalysis.filter(c => !c.isActive);

    const avgActiveEngagement = activeConfigs.length > 0
      ? Math.round(activeConfigs.reduce((sum, c) => sum + c.engagementScore, 0) / activeConfigs.length)
      : 0;

    // 10. Summary statistics
    const summaryStats = {
      totalConfigurations: configurations.length,
      activeConfigurations: activeConfigs.length,
      inactiveConfigurations: inactiveConfigs.length,
      totalNotificationsSent: totalNotifications,
      totalDelivered,
      totalRead,
      totalFailed,
      overallDeliveryRate,
      overallReadRate,
      overallEngagementRate,
      avgEngagementScore: configurationAnalysis.length > 0
        ? Math.round(configurationAnalysis.reduce((sum, c) => sum + c.engagementScore, 0) / configurationAnalysis.length)
        : 0,
      excellentConfigurations: configurationAnalysis.filter(c => c.engagementStatus === 'Excellent').length,
      goodConfigurations: configurationAnalysis.filter(c => c.engagementStatus === 'Good').length,
      fairConfigurations: configurationAnalysis.filter(c => c.engagementStatus === 'Fair').length,
      poorConfigurations: configurationAnalysis.filter(c => c.engagementStatus === 'Poor').length,
      avgActiveEngagement,
      configurationsWithHighFailureRate: configurationAnalysis.filter(c => c.metrics.failureRate > 20).length
    };

    res.json(formatReportResponse({
      configurations: configurationAnalysis,
      topConfigurations,
      configurationsNeedingAttention,
      priorityEngagement: Object.entries(priorityEngagement).map(([priority, data]) => ({
        priority,
        ...data
      })),
      typeEngagement: Object.entries(typeEngagement).map(([type, data]) => ({
        type,
        ...data
      })),
      summary: summaryStats
    }, {
      reportType: 'notification-engagement-metrics',
      filters: matchFilter
    }));

  } catch (error) {
    return handleReportError(error, res, 'Notification Engagement Metrics');
  }
};

/**
 * Get Notification Trigger Analysis
 * Analyzes trigger effectiveness and patterns across all notification configurations
 * Includes trigger type distribution, target schema analysis, and condition effectiveness
 * 
 * @route GET /api/company/reports/notification-config/trigger-analysis
 * @access Private (company_super_admin, company_admin)
 */
const getNotificationTriggerAnalysis = async (req, res) => {
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

    // 1. Get all notification configurations
    const configurations = await NotificationConfiguration.find({ 
      company_id,
      ...dateFilter 
    })
      .populate('created_by', 'first_name last_name email')
      .lean();

    if (configurations.length === 0) {
      return res.json(formatReportResponse({
        triggers: [],
        summary: {
          totalConfigurations: 0,
          message: 'No notification configurations found'
        }
      }, {
        reportType: 'notification-trigger-analysis'
      }));
    }

    // 2. Get notifications for effectiveness analysis
    const configIds = configurations.map(c => c._id);
    const notifications = await Notification.find({
      company_id,
      configuration_id: { $in: configIds },
      ...dateFilter
    }).lean();

    // 3. Analyze by trigger type
    const triggerTypeGroups = configurations.reduce((acc, config) => {
      const triggerType = config.trigger_type || 'unknown';
      if (!acc[triggerType]) {
        acc[triggerType] = [];
      }
      acc[triggerType].push(config);
      return acc;
    }, {});

    const triggerTypeAnalysis = Object.entries(triggerTypeGroups).map(([triggerType, configs]) => {
      const configIds = configs.map(c => c._id.toString());
      const triggerNotifications = notifications.filter(n => 
        configIds.includes(n.configuration_id.toString())
      );

      const totalSent = triggerNotifications.length;
      const delivered = triggerNotifications.filter(n => 
        n.status === 'delivered' || n.status === 'read'
      ).length;
      const read = triggerNotifications.filter(n => n.is_read).length;

      const deliveryRate = totalSent > 0 ? Math.round((delivered / totalSent) * 100) : 0;
      const readRate = delivered > 0 ? Math.round((read / delivered) * 100) : 0;

      // Calculate effectiveness score
      let effectivenessScore = 0;
      if (deliveryRate >= 90) effectivenessScore += 40;
      else if (deliveryRate >= 70) effectivenessScore += 25;
      else if (deliveryRate >= 50) effectivenessScore += 15;

      if (readRate >= 70) effectivenessScore += 40;
      else if (readRate >= 50) effectivenessScore += 25;
      else if (readRate >= 30) effectivenessScore += 15;

      if (configs.filter(c => c.is_active).length / configs.length >= 0.7) effectivenessScore += 20;
      else if (configs.filter(c => c.is_active).length / configs.length >= 0.5) effectivenessScore += 10;

      const effectivenessStatus = effectivenessScore >= 80 ? 'Highly Effective' :
                                 effectivenessScore >= 60 ? 'Effective' :
                                 effectivenessScore >= 40 ? 'Moderately Effective' : 'Needs Improvement';

      return {
        triggerType,
        configurationCount: configs.length,
        activeConfigurations: configs.filter(c => c.is_active).length,
        inactiveConfigurations: configs.filter(c => !c.is_active).length,
        totalNotificationsSent: totalSent,
        delivered,
        read,
        deliveryRate,
        readRate,
        effectivenessScore,
        effectivenessStatus,
        avgNotificationsPerConfig: configs.length > 0 
          ? Math.round((totalSent / configs.length) * 10) / 10 
          : 0,
        configurations: configs.map(c => ({
          configurationId: c._id,
          name: c.name,
          isActive: c.is_active,
          targetSchema: c.target_schema
        }))
      };
    }).sort((a, b) => b.effectivenessScore - a.effectivenessScore);

    // 4. Analyze by target schema
    const targetSchemaGroups = configurations.reduce((acc, config) => {
      const schema = config.target_schema || 'unknown';
      if (!acc[schema]) {
        acc[schema] = [];
      }
      acc[schema].push(config);
      return acc;
    }, {});

    const targetSchemaAnalysis = Object.entries(targetSchemaGroups).map(([schema, configs]) => {
      const configIds = configs.map(c => c._id.toString());
      const schemaNotifications = notifications.filter(n => 
        configIds.includes(n.configuration_id.toString())
      );

      const totalSent = schemaNotifications.length;
      const read = schemaNotifications.filter(n => n.is_read).length;

      // Analyze trigger type distribution for this schema
      const triggerDistribution = configs.reduce((acc, c) => {
        acc[c.trigger_type] = (acc[c.trigger_type] || 0) + 1;
        return acc;
      }, {});

      return {
        targetSchema: schema,
        configurationCount: configs.length,
        activeConfigurations: configs.filter(c => c.is_active).length,
        totalNotificationsSent: totalSent,
        totalRead: read,
        readRate: totalSent > 0 ? Math.round((read / totalSent) * 100) : 0,
        triggerDistribution,
        avgNotificationsPerConfig: configs.length > 0 
          ? Math.round((totalSent / configs.length) * 10) / 10 
          : 0
      };
    }).sort((a, b) => b.totalNotificationsSent - a.totalNotificationsSent);

    // 5. Analyze target user configurations
    const targetUserTypeDistribution = configurations.reduce((acc, config) => {
      const userType = config.target_users?.type || 'all';
      acc[userType] = (acc[userType] || 0) + 1;
      return acc;
    }, {});

    const targetUserAnalysis = Object.entries(targetUserTypeDistribution).map(([userType, count]) => {
      const configs = configurations.filter(c => c.target_users?.type === userType);
      const configIds = configs.map(c => c._id.toString());
      const userTypeNotifications = notifications.filter(n => 
        configIds.includes(n.configuration_id.toString())
      );

      const totalSent = userTypeNotifications.length;
      const read = userTypeNotifications.filter(n => n.is_read).length;

      return {
        targetUserType: userType,
        configurationCount: count,
        percentage: Math.round((count / configurations.length) * 100),
        totalNotificationsSent: totalSent,
        totalRead: read,
        readRate: totalSent > 0 ? Math.round((read / totalSent) * 100) : 0
      };
    }).sort((a, b) => b.configurationCount - a.configurationCount);

    // 6. Analyze condition complexity
    const configurationsWithTimeConditions = configurations.filter(c => 
      c.conditions?.time_based?.enabled
    );
    const configurationsWithFrequencyLimits = configurations.filter(c => 
      c.conditions?.frequency_limit?.enabled
    );
    const configurationsWithTargetFields = configurations.filter(c => 
      c.target_fields && c.target_fields.length > 0
    );

    // 7. Analyze custom event configurations
    const customEventConfigs = configurations.filter(c => 
      c.custom_event_config && c.custom_event_config.event_name
    );

    // 8. Most and least effective triggers
    const mostEffectiveTrigger = triggerTypeAnalysis[0];
    const leastEffectiveTrigger = triggerTypeAnalysis[triggerTypeAnalysis.length - 1];

    // 9. Most active target schemas
    const mostActiveSchema = targetSchemaAnalysis[0];

    // 10. Trigger complexity analysis
    const avgTargetFieldsPerConfig = configurations.length > 0
      ? Math.round((configurations.reduce((sum, c) => 
          sum + (c.target_fields?.length || 0), 0) / configurations.length) * 10) / 10
      : 0;

    const avgConditionsPerConfig = configurations.length > 0
      ? Math.round((configurations.reduce((sum, c) => {
          let conditionCount = 0;
          if (c.conditions?.time_based?.enabled) conditionCount++;
          if (c.conditions?.frequency_limit?.enabled) conditionCount++;
          return sum + conditionCount;
        }, 0) / configurations.length) * 10) / 10
      : 0;

    // 11. Summary statistics
    const summaryStats = {
      totalConfigurations: configurations.length,
      activeConfigurations: configurations.filter(c => c.is_active).length,
      uniqueTriggerTypes: triggerTypeAnalysis.length,
      uniqueTargetSchemas: targetSchemaAnalysis.length,
      mostEffectiveTrigger: mostEffectiveTrigger?.triggerType || 'none',
      mostEffectiveTriggerScore: mostEffectiveTrigger?.effectivenessScore || 0,
      leastEffectiveTrigger: leastEffectiveTrigger?.triggerType || 'none',
      leastEffectiveTriggerScore: leastEffectiveTrigger?.effectivenessScore || 0,
      mostActiveSchema: mostActiveSchema?.targetSchema || 'none',
      mostActiveSchemaNotifications: mostActiveSchema?.totalNotificationsSent || 0,
      configurationsWithTimeConditions: configurationsWithTimeConditions.length,
      configurationsWithFrequencyLimits: configurationsWithFrequencyLimits.length,
      configurationsWithTargetFields: configurationsWithTargetFields.length,
      customEventConfigurations: customEventConfigs.length,
      avgTargetFieldsPerConfig,
      avgConditionsPerConfig,
      totalNotificationsSent: notifications.length,
      avgNotificationsPerConfig: configurations.length > 0
        ? Math.round((notifications.length / configurations.length) * 10) / 10
        : 0
    };

    res.json(formatReportResponse({
      triggerTypes: triggerTypeAnalysis,
      targetSchemas: targetSchemaAnalysis,
      targetUserTypes: targetUserAnalysis,
      mostEffectiveTrigger: mostEffectiveTrigger ? {
        triggerType: mostEffectiveTrigger.triggerType,
        effectivenessScore: mostEffectiveTrigger.effectivenessScore,
        effectivenessStatus: mostEffectiveTrigger.effectivenessStatus,
        configurationCount: mostEffectiveTrigger.configurationCount
      } : null,
      leastEffectiveTrigger: leastEffectiveTrigger ? {
        triggerType: leastEffectiveTrigger.triggerType,
        effectivenessScore: leastEffectiveTrigger.effectivenessScore,
        effectivenessStatus: leastEffectiveTrigger.effectivenessStatus,
        configurationCount: leastEffectiveTrigger.configurationCount
      } : null,
      conditionUsage: {
        timeBasedConditions: configurationsWithTimeConditions.length,
        frequencyLimits: configurationsWithFrequencyLimits.length,
        targetFieldFilters: configurationsWithTargetFields.length,
        customEvents: customEventConfigs.length
      },
      summary: summaryStats
    }, {
      reportType: 'notification-trigger-analysis',
      filters: matchFilter
    }));

  } catch (error) {
    return handleReportError(error, res, 'Notification Trigger Analysis');
  }
};

/**
 * Get Notification Channel Performance
 * Analyzes channel-wise notification performance and delivery patterns
 * Includes in-app channel metrics, delivery success rates, and channel preferences
 * 
 * @route GET /api/company/reports/notification-config/channel-performance
 * @access Private (company_super_admin, company_admin)
 */
const getNotificationChannelPerformance = async (req, res) => {
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

    // 1. Get all notification configurations
    const configurations = await NotificationConfiguration.find({ 
      company_id,
      ...dateFilter 
    }).lean();

    if (configurations.length === 0) {
      return res.json(formatReportResponse({
        channels: [],
        summary: {
          totalConfigurations: 0,
          message: 'No notification configurations found'
        }
      }, {
        reportType: 'notification-channel-performance'
      }));
    }

    // 2. Get all notifications
    const configIds = configurations.map(c => c._id);
    const notifications = await Notification.find({
      company_id,
      configuration_id: { $in: configIds },
      ...dateFilter
    }).lean();

    // 3. Analyze in-app channel performance
    const inAppNotifications = notifications.filter(n => n.channels?.in_app);
    const inAppSent = inAppNotifications.filter(n => n.channels.in_app.sent).length;
    const inAppDelivered = inAppNotifications.filter(n => 
      n.status === 'delivered' || n.status === 'read'
    ).length;
    const inAppRead = inAppNotifications.filter(n => n.is_read).length;
    const inAppFailed = inAppNotifications.filter(n => 
      n.channels.in_app.error
    ).length;

    const inAppDeliveryRate = inAppSent > 0 
      ? Math.round((inAppDelivered / inAppSent) * 100) 
      : 0;
    const inAppReadRate = inAppDelivered > 0 
      ? Math.round((inAppRead / inAppDelivered) * 100) 
      : 0;
    const inAppFailureRate = inAppSent > 0 
      ? Math.round((inAppFailed / inAppSent) * 100) 
      : 0;

    // Calculate average delivery time for in-app
    const inAppDeliveredNotifications = inAppNotifications.filter(n => 
      n.channels.in_app.sent && n.channels.in_app.sent_at && n.created_at
    );
    const avgInAppDeliveryTime = inAppDeliveredNotifications.length > 0
      ? Math.round(inAppDeliveredNotifications.reduce((sum, n) => {
          const deliveryTime = new Date(n.channels.in_app.sent_at) - new Date(n.created_at);
          return sum + deliveryTime;
        }, 0) / inAppDeliveredNotifications.length / 1000) // Convert to seconds
      : 0;

    // 4. Analyze channel configuration preferences
    const inAppEnabledConfigs = configurations.filter(c => 
      c.notification_channels?.in_app !== false
    );

    const channelPreferences = {
      inAppEnabled: inAppEnabledConfigs.length,
      inAppDisabled: configurations.length - inAppEnabledConfigs.length,
      inAppEnabledPercentage: configurations.length > 0
        ? Math.round((inAppEnabledConfigs.length / configurations.length) * 100)
        : 0
    };

    // 5. Analyze performance by configuration
    const configurationChannelAnalysis = configurations.map(config => {
      const configNotifications = notifications.filter(n => 
        n.configuration_id.toString() === config._id.toString()
      );

      const inAppConfigNotifications = configNotifications.filter(n => n.channels?.in_app);
      const inAppSent = inAppConfigNotifications.filter(n => n.channels.in_app.sent).length;
      const inAppDelivered = inAppConfigNotifications.filter(n => 
        n.status === 'delivered' || n.status === 'read'
      ).length;
      const inAppRead = inAppConfigNotifications.filter(n => n.is_read).length;
      const inAppFailed = inAppConfigNotifications.filter(n => 
        n.channels.in_app.error
      ).length;

      const deliveryRate = inAppSent > 0 
        ? Math.round((inAppDelivered / inAppSent) * 100) 
        : 0;
      const readRate = inAppDelivered > 0 
        ? Math.round((inAppRead / inAppDelivered) * 100) 
        : 0;

      // Calculate channel performance score
      let performanceScore = 0;
      if (deliveryRate >= 95) performanceScore += 40;
      else if (deliveryRate >= 85) performanceScore += 30;
      else if (deliveryRate >= 70) performanceScore += 20;

      if (readRate >= 70) performanceScore += 40;
      else if (readRate >= 50) performanceScore += 25;
      else if (readRate >= 30) performanceScore += 15;

      if (inAppFailed === 0 && inAppSent > 0) performanceScore += 20;
      else if (inAppFailed / inAppSent <= 0.05) performanceScore += 10;

      const performanceStatus = performanceScore >= 80 ? 'Excellent' :
                               performanceScore >= 60 ? 'Good' :
                               performanceScore >= 40 ? 'Fair' : 'Poor';

      return {
        configurationId: config._id,
        name: config.name,
        isActive: config.is_active,
        inAppEnabled: config.notification_channels?.in_app !== false,
        metrics: {
          totalNotifications: configNotifications.length,
          inAppSent,
          inAppDelivered,
          inAppRead,
          inAppFailed,
          deliveryRate,
          readRate,
          failureRate: inAppSent > 0 ? Math.round((inAppFailed / inAppSent) * 100) : 0
        },
        performanceScore,
        performanceStatus
      };
    });

    // 6. Top performing configurations by channel
    const topChannelPerformers = configurationChannelAnalysis
      .filter(c => c.metrics.inAppSent > 0)
      .sort((a, b) => b.performanceScore - a.performanceScore)
      .slice(0, 5)
      .map(c => ({
        name: c.name,
        performanceScore: c.performanceScore,
        performanceStatus: c.performanceStatus,
        deliveryRate: c.metrics.deliveryRate,
        readRate: c.metrics.readRate
      }));

    // 7. Configurations with channel issues
    const configurationsWithIssues = configurationChannelAnalysis
      .filter(c => c.performanceStatus === 'Poor' || c.metrics.failureRate > 10)
      .sort((a, b) => a.performanceScore - b.performanceScore)
      .slice(0, 5)
      .map(c => ({
        name: c.name,
        performanceScore: c.performanceScore,
        performanceStatus: c.performanceStatus,
        failureRate: c.metrics.failureRate,
        totalSent: c.metrics.inAppSent
      }));

    // 8. Analyze delivery patterns by time
    const notificationsByHour = notifications.reduce((acc, n) => {
      const hour = new Date(n.created_at).getHours();
      if (!acc[hour]) {
        acc[hour] = { sent: 0, delivered: 0, read: 0 };
      }
      acc[hour].sent++;
      if (n.status === 'delivered' || n.status === 'read') acc[hour].delivered++;
      if (n.is_read) acc[hour].read++;
      return acc;
    }, {});

    const deliveryPatternsByHour = Object.entries(notificationsByHour).map(([hour, data]) => ({
      hour: parseInt(hour),
      sent: data.sent,
      delivered: data.delivered,
      read: data.read,
      deliveryRate: data.sent > 0 ? Math.round((data.delivered / data.sent) * 100) : 0,
      readRate: data.delivered > 0 ? Math.round((data.read / data.delivered) * 100) : 0
    })).sort((a, b) => a.hour - b.hour);

    // 9. Analyze by priority
    const priorityChannelPerformance = {
      low: {
        sent: notifications.filter(n => n.priority === 'low').length,
        delivered: notifications.filter(n => 
          n.priority === 'low' && (n.status === 'delivered' || n.status === 'read')
        ).length,
        read: notifications.filter(n => n.priority === 'low' && n.is_read).length
      },
      medium: {
        sent: notifications.filter(n => n.priority === 'medium').length,
        delivered: notifications.filter(n => 
          n.priority === 'medium' && (n.status === 'delivered' || n.status === 'read')
        ).length,
        read: notifications.filter(n => n.priority === 'medium' && n.is_read).length
      },
      high: {
        sent: notifications.filter(n => n.priority === 'high').length,
        delivered: notifications.filter(n => 
          n.priority === 'high' && (n.status === 'delivered' || n.status === 'read')
        ).length,
        read: notifications.filter(n => n.priority === 'high' && n.is_read).length
      },
      urgent: {
        sent: notifications.filter(n => n.priority === 'urgent').length,
        delivered: notifications.filter(n => 
          n.priority === 'urgent' && (n.status === 'delivered' || n.status === 'read')
        ).length,
        read: notifications.filter(n => n.priority === 'urgent' && n.is_read).length
      }
    };

    Object.keys(priorityChannelPerformance).forEach(priority => {
      const data = priorityChannelPerformance[priority];
      data.deliveryRate = data.sent > 0 ? Math.round((data.delivered / data.sent) * 100) : 0;
      data.readRate = data.delivered > 0 ? Math.round((data.read / data.delivered) * 100) : 0;
    });

    // 10. Calculate overall channel health
    const overallChannelHealth = {
      inApp: {
        totalSent: inAppSent,
        totalDelivered: inAppDelivered,
        totalRead: inAppRead,
        totalFailed: inAppFailed,
        deliveryRate: inAppDeliveryRate,
        readRate: inAppReadRate,
        failureRate: inAppFailureRate,
        avgDeliveryTimeSeconds: avgInAppDeliveryTime,
        configurationsEnabled: inAppEnabledConfigs.length,
        healthScore: 0
      }
    };

    // Calculate health score for in-app channel
    let inAppHealthScore = 0;
    if (inAppDeliveryRate >= 95) inAppHealthScore += 35;
    else if (inAppDeliveryRate >= 85) inAppHealthScore += 25;
    else if (inAppDeliveryRate >= 70) inAppHealthScore += 15;

    if (inAppReadRate >= 70) inAppHealthScore += 35;
    else if (inAppReadRate >= 50) inAppHealthScore += 20;
    else if (inAppReadRate >= 30) inAppHealthScore += 10;

    if (inAppFailureRate <= 2) inAppHealthScore += 20;
    else if (inAppFailureRate <= 5) inAppHealthScore += 10;
    else if (inAppFailureRate <= 10) inAppHealthScore += 5;

    if (avgInAppDeliveryTime <= 5) inAppHealthScore += 10;
    else if (avgInAppDeliveryTime <= 10) inAppHealthScore += 5;

    overallChannelHealth.inApp.healthScore = inAppHealthScore;
    overallChannelHealth.inApp.healthStatus = inAppHealthScore >= 80 ? 'Excellent' :
                                              inAppHealthScore >= 60 ? 'Good' :
                                              inAppHealthScore >= 40 ? 'Fair' : 'Poor';

    // 11. Summary statistics
    const summaryStats = {
      totalConfigurations: configurations.length,
      totalNotifications: notifications.length,
      inAppEnabledConfigurations: inAppEnabledConfigs.length,
      inAppDisabledConfigurations: configurations.length - inAppEnabledConfigs.length,
      overallInAppDeliveryRate: inAppDeliveryRate,
      overallInAppReadRate: inAppReadRate,
      overallInAppFailureRate: inAppFailureRate,
      avgInAppDeliveryTimeSeconds: avgInAppDeliveryTime,
      excellentPerformers: configurationChannelAnalysis.filter(c => c.performanceStatus === 'Excellent').length,
      goodPerformers: configurationChannelAnalysis.filter(c => c.performanceStatus === 'Good').length,
      fairPerformers: configurationChannelAnalysis.filter(c => c.performanceStatus === 'Fair').length,
      poorPerformers: configurationChannelAnalysis.filter(c => c.performanceStatus === 'Poor').length,
      configurationsWithIssues: configurationsWithIssues.length,
      avgChannelPerformanceScore: configurationChannelAnalysis.length > 0
        ? Math.round(configurationChannelAnalysis.reduce((sum, c) => sum + c.performanceScore, 0) / configurationChannelAnalysis.length)
        : 0,
      overallChannelHealthScore: inAppHealthScore
    };

    res.json(formatReportResponse({
      channelHealth: overallChannelHealth,
      configurations: configurationChannelAnalysis,
      topChannelPerformers,
      configurationsWithIssues,
      channelPreferences,
      deliveryPatternsByHour,
      priorityChannelPerformance: Object.entries(priorityChannelPerformance).map(([priority, data]) => ({
        priority,
        ...data
      })),
      summary: summaryStats
    }, {
      reportType: 'notification-channel-performance',
      filters: matchFilter
    }));

  } catch (error) {
    return handleReportError(error, res, 'Notification Channel Performance');
  }
};

module.exports = {
  getNotificationEngagementMetrics,
  getNotificationTriggerAnalysis,
  getNotificationChannelPerformance
};
