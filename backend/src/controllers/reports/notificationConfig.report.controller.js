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

    // 1. Get all notification configurations with populated fields
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

    const configIds = configurations.map(c => c._id);

    // 2. Use aggregation pipeline to calculate metrics per configuration
    const configMetrics = await Notification.aggregate([
      {
        $match: {
          company_id,
          configuration_id: { $in: configIds },
          ...dateFilter
        }
      },
      {
        $facet: {
          // Per-configuration metrics
          perConfig: [
            {
              $group: {
                _id: '$configuration_id',
                totalSent: { $sum: 1 },
                delivered: {
                  $sum: {
                    $cond: [
                      { $in: ['$status', ['delivered', 'read']] },
                      1,
                      0
                    ]
                  }
                },
                read: { $sum: { $cond: ['$is_read', 1, 0] } },
                failed: {
                  $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
                },
                pending: {
                  $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
                },
                // Priority breakdown
                priorityLow: {
                  $sum: { $cond: [{ $eq: ['$priority', 'low'] }, 1, 0] }
                },
                priorityMedium: {
                  $sum: { $cond: [{ $eq: ['$priority', 'medium'] }, 1, 0] }
                },
                priorityHigh: {
                  $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] }
                },
                priorityUrgent: {
                  $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] }
                },
                // Type breakdown
                typeInfo: {
                  $sum: { $cond: [{ $eq: ['$type', 'info'] }, 1, 0] }
                },
                typeSuccess: {
                  $sum: { $cond: [{ $eq: ['$type', 'success'] }, 1, 0] }
                },
                typeWarning: {
                  $sum: { $cond: [{ $eq: ['$type', 'warning'] }, 1, 0] }
                },
                typeError: {
                  $sum: { $cond: [{ $eq: ['$type', 'error'] }, 1, 0] }
                },
                // Average time to read (in milliseconds)
                avgTimeToRead: {
                  $avg: {
                    $cond: [
                      { $and: ['$is_read', '$read_at', '$created_at'] },
                      { $subtract: ['$read_at', '$created_at'] },
                      null
                    ]
                  }
                }
              }
            }
          ],
          // Overall statistics
          overall: [
            {
              $group: {
                _id: null,
                totalNotifications: { $sum: 1 },
                totalDelivered: {
                  $sum: {
                    $cond: [
                      { $in: ['$status', ['delivered', 'read']] },
                      1,
                      0
                    ]
                  }
                },
                totalRead: { $sum: { $cond: ['$is_read', 1, 0] } },
                totalFailed: {
                  $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
                }
              }
            }
          ],
          // Priority engagement
          priorityStats: [
            {
              $group: {
                _id: '$priority',
                sent: { $sum: 1 },
                read: { $sum: { $cond: ['$is_read', 1, 0] } }
              }
            }
          ],
          // Type engagement
          typeStats: [
            {
              $group: {
                _id: '$type',
                sent: { $sum: 1 },
                read: { $sum: { $cond: ['$is_read', 1, 0] } }
              }
            }
          ]
        }
      }
    ]);

    const aggregatedData = configMetrics[0];
    const perConfigMetrics = aggregatedData.perConfig || [];
    const overallStats = aggregatedData.overall[0] || {
      totalNotifications: 0,
      totalDelivered: 0,
      totalRead: 0,
      totalFailed: 0
    };

    // Create a map for quick lookup
    const metricsMap = new Map();
    perConfigMetrics.forEach(metric => {
      metricsMap.set(metric._id.toString(), metric);
    });

    // Helper function to calculate engagement score
    const calculateEngagementScore = (deliveryRate, readRate, failureRate, avgTimeToRead) => {
      let score = 0;

      if (deliveryRate >= 90) score += 30;
      else if (deliveryRate >= 70) score += 20;
      else if (deliveryRate >= 50) score += 10;

      if (readRate >= 70) score += 40;
      else if (readRate >= 50) score += 25;
      else if (readRate >= 30) score += 15;

      if (failureRate <= 5) score += 20;
      else if (failureRate <= 10) score += 10;
      else if (failureRate <= 20) score += 5;

      if (avgTimeToRead <= 30) score += 10;
      else if (avgTimeToRead <= 60) score += 5;

      return score;
    };

    // 3. Build configuration analysis with aggregated metrics
    const configurationAnalysis = configurations.map(config => {
      const metrics = metricsMap.get(config._id.toString()) || {
        totalSent: 0,
        delivered: 0,
        read: 0,
        failed: 0,
        pending: 0,
        priorityLow: 0,
        priorityMedium: 0,
        priorityHigh: 0,
        priorityUrgent: 0,
        typeInfo: 0,
        typeSuccess: 0,
        typeWarning: 0,
        typeError: 0,
        avgTimeToRead: 0
      };

      const totalSent = metrics.totalSent;
      const delivered = metrics.delivered;
      const read = metrics.read;
      const failed = metrics.failed;
      const pending = metrics.pending;

      // Calculate rates
      const deliveryRate = totalSent > 0 ? Math.round((delivered / totalSent) * 100) : 0;
      const readRate = delivered > 0 ? Math.round((read / delivered) * 100) : 0;
      const failureRate = totalSent > 0 ? Math.round((failed / totalSent) * 100) : 0;
      const engagementRate = totalSent > 0 ? Math.round((read / totalSent) * 100) : 0;

      // Convert avgTimeToRead from milliseconds to minutes
      const avgTimeToRead = metrics.avgTimeToRead
        ? Math.round(metrics.avgTimeToRead / 1000 / 60)
        : 0;

      // Calculate engagement score
      const engagementScore = calculateEngagementScore(
        deliveryRate,
        readRate,
        failureRate,
        avgTimeToRead
      );

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
        priorityBreakdown: {
          low: metrics.priorityLow,
          medium: metrics.priorityMedium,
          high: metrics.priorityHigh,
          urgent: metrics.priorityUrgent
        },
        typeBreakdown: {
          info: metrics.typeInfo,
          success: metrics.typeSuccess,
          warning: metrics.typeWarning,
          error: metrics.typeError
        },
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
    const totalNotifications = overallStats.totalNotifications;
    const totalDelivered = overallStats.totalDelivered;
    const totalRead = overallStats.totalRead;
    const totalFailed = overallStats.totalFailed;

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

    // 7. Process priority engagement from aggregation
    const priorityEngagement = {
      low: { sent: 0, read: 0, readRate: 0 },
      medium: { sent: 0, read: 0, readRate: 0 },
      high: { sent: 0, read: 0, readRate: 0 },
      urgent: { sent: 0, read: 0, readRate: 0 }
    };

    aggregatedData.priorityStats.forEach(stat => {
      if (stat._id && priorityEngagement[stat._id]) {
        priorityEngagement[stat._id].sent = stat.sent;
        priorityEngagement[stat._id].read = stat.read;
        priorityEngagement[stat._id].readRate = stat.sent > 0
          ? Math.round((stat.read / stat.sent) * 100)
          : 0;
      }
    });

    // 8. Process type engagement from aggregation
    const typeEngagement = {
      info: { sent: 0, read: 0, readRate: 0 },
      success: { sent: 0, read: 0, readRate: 0 },
      warning: { sent: 0, read: 0, readRate: 0 },
      error: { sent: 0, read: 0, readRate: 0 }
    };

    aggregatedData.typeStats.forEach(stat => {
      if (stat._id && typeEngagement[stat._id]) {
        typeEngagement[stat._id].sent = stat.sent;
        typeEngagement[stat._id].read = stat.read;
        typeEngagement[stat._id].readRate = stat.sent > 0
          ? Math.round((stat.read / stat.sent) * 100)
          : 0;
      }
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

    const configIds = configurations.map(c => c._id);

    // 2. Create configuration lookup maps for grouping
    const configByTriggerType = new Map();
    const configByTargetSchema = new Map();
    const configByTargetUserType = new Map();

    configurations.forEach(config => {
      const triggerType = config.trigger_type || 'unknown';
      const targetSchema = config.target_schema || 'unknown';
      const targetUserType = config.target_users?.type || 'all';

      if (!configByTriggerType.has(triggerType)) {
        configByTriggerType.set(triggerType, []);
      }
      configByTriggerType.get(triggerType).push(config);

      if (!configByTargetSchema.has(targetSchema)) {
        configByTargetSchema.set(targetSchema, []);
      }
      configByTargetSchema.get(targetSchema).push(config);

      if (!configByTargetUserType.has(targetUserType)) {
        configByTargetUserType.set(targetUserType, []);
      }
      configByTargetUserType.get(targetUserType).push(config);
    });

    // 3. Use aggregation to get notification metrics grouped by configuration
    const notificationMetrics = await Notification.aggregate([
      {
        $match: {
          company_id,
          configuration_id: { $in: configIds },
          ...dateFilter
        }
      },
      {
        $group: {
          _id: '$configuration_id',
          totalSent: { $sum: 1 },
          delivered: {
            $sum: {
              $cond: [
                { $in: ['$status', ['delivered', 'read']] },
                1,
                0
              ]
            }
          },
          read: { $sum: { $cond: ['$is_read', 1, 0] } }
        }
      }
    ]);

    // Create metrics lookup map
    const metricsMap = new Map();
    notificationMetrics.forEach(metric => {
      metricsMap.set(metric._id.toString(), metric);
    });

    // Helper function to calculate effectiveness score
    const calculateEffectivenessScore = (deliveryRate, readRate, activeRatio) => {
      let score = 0;

      if (deliveryRate >= 90) score += 40;
      else if (deliveryRate >= 70) score += 25;
      else if (deliveryRate >= 50) score += 15;

      if (readRate >= 70) score += 40;
      else if (readRate >= 50) score += 25;
      else if (readRate >= 30) score += 15;

      if (activeRatio >= 0.7) score += 20;
      else if (activeRatio >= 0.5) score += 10;

      return score;
    };

    // 4. Analyze by trigger type
    const triggerTypeAnalysis = Array.from(configByTriggerType.entries()).map(([triggerType, configs]) => {
      let totalSent = 0;
      let delivered = 0;
      let read = 0;

      configs.forEach(config => {
        const metrics = metricsMap.get(config._id.toString());
        if (metrics) {
          totalSent += metrics.totalSent;
          delivered += metrics.delivered;
          read += metrics.read;
        }
      });

      const deliveryRate = totalSent > 0 ? Math.round((delivered / totalSent) * 100) : 0;
      const readRate = delivered > 0 ? Math.round((read / delivered) * 100) : 0;
      const activeCount = configs.filter(c => c.is_active).length;
      const activeRatio = configs.length > 0 ? activeCount / configs.length : 0;

      const effectivenessScore = calculateEffectivenessScore(deliveryRate, readRate, activeRatio);
      const effectivenessStatus = effectivenessScore >= 80 ? 'Highly Effective' :
        effectivenessScore >= 60 ? 'Effective' :
          effectivenessScore >= 40 ? 'Moderately Effective' : 'Needs Improvement';

      return {
        triggerType,
        configurationCount: configs.length,
        activeConfigurations: activeCount,
        inactiveConfigurations: configs.length - activeCount,
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

    // 5. Analyze by target schema
    const targetSchemaAnalysis = Array.from(configByTargetSchema.entries()).map(([schema, configs]) => {
      let totalSent = 0;
      let read = 0;

      configs.forEach(config => {
        const metrics = metricsMap.get(config._id.toString());
        if (metrics) {
          totalSent += metrics.totalSent;
          read += metrics.read;
        }
      });

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

    // 6. Analyze target user configurations
    const targetUserAnalysis = Array.from(configByTargetUserType.entries()).map(([userType, configs]) => {
      let totalSent = 0;
      let read = 0;

      configs.forEach(config => {
        const metrics = metricsMap.get(config._id.toString());
        if (metrics) {
          totalSent += metrics.totalSent;
          read += metrics.read;
        }
      });

      return {
        targetUserType: userType,
        configurationCount: configs.length,
        percentage: Math.round((configs.length / configurations.length) * 100),
        totalNotificationsSent: totalSent,
        totalRead: read,
        readRate: totalSent > 0 ? Math.round((read / totalSent) * 100) : 0
      };
    }).sort((a, b) => b.configurationCount - a.configurationCount);

    // 7. Analyze condition complexity (done in memory as it's config-level data)
    const configurationsWithTimeConditions = configurations.filter(c =>
      c.conditions?.time_based?.enabled
    );
    const configurationsWithFrequencyLimits = configurations.filter(c =>
      c.conditions?.frequency_limit?.enabled
    );
    const configurationsWithTargetFields = configurations.filter(c =>
      c.target_fields && c.target_fields.length > 0
    );

    // 8. Analyze custom event configurations
    const customEventConfigs = configurations.filter(c =>
      c.custom_event_config && c.custom_event_config.event_name
    );

    // 9. Most and least effective triggers
    const mostEffectiveTrigger = triggerTypeAnalysis[0];
    const leastEffectiveTrigger = triggerTypeAnalysis[triggerTypeAnalysis.length - 1];

    // 10. Most active target schemas
    const mostActiveSchema = targetSchemaAnalysis[0];

    // 11. Trigger complexity analysis
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

    // 12. Calculate total notifications sent
    const totalNotificationsSent = notificationMetrics.reduce((sum, m) => sum + m.totalSent, 0);

    // 13. Summary statistics
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
      totalNotificationsSent,
      avgNotificationsPerConfig: configurations.length > 0
        ? Math.round((totalNotificationsSent / configurations.length) * 10) / 10
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

    const configIds = configurations.map(c => c._id);

    // 2. Use aggregation pipeline to calculate channel metrics
    const channelMetrics = await Notification.aggregate([
      {
        $match: {
          company_id,
          configuration_id: { $in: configIds },
          ...dateFilter
        }
      },
      {
        $facet: {
          // Per-configuration metrics
          perConfig: [
            {
              $group: {
                _id: '$configuration_id',
                totalNotifications: { $sum: 1 },
                inAppSent: {
                  $sum: { $cond: ['$channels.in_app.sent', 1, 0] }
                },
                inAppDelivered: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          '$channels.in_app',
                          { $in: ['$status', ['delivered', 'read']] }
                        ]
                      },
                      1,
                      0
                    ]
                  }
                },
                inAppRead: {
                  $sum: {
                    $cond: [
                      { $and: ['$channels.in_app', '$is_read'] },
                      1,
                      0
                    ]
                  }
                },
                inAppFailed: {
                  $sum: { $cond: ['$channels.in_app.error', 1, 0] }
                }
              }
            }
          ],
          // Overall in-app metrics
          overallInApp: [
            {
              $match: { 'channels.in_app': { $exists: true } }
            },
            {
              $group: {
                _id: null,
                totalSent: {
                  $sum: { $cond: ['$channels.in_app.sent', 1, 0] }
                },
                totalDelivered: {
                  $sum: {
                    $cond: [
                      { $in: ['$status', ['delivered', 'read']] },
                      1,
                      0
                    ]
                  }
                },
                totalRead: { $sum: { $cond: ['$is_read', 1, 0] } },
                totalFailed: {
                  $sum: { $cond: ['$channels.in_app.error', 1, 0] }
                },
                avgDeliveryTime: {
                  $avg: {
                    $cond: [
                      {
                        $and: [
                          '$channels.in_app.sent',
                          '$channels.in_app.sent_at',
                          '$created_at'
                        ]
                      },
                      {
                        $subtract: ['$channels.in_app.sent_at', '$created_at']
                      },
                      null
                    ]
                  }
                }
              }
            }
          ],
          // Hourly patterns
          hourlyPatterns: [
            {
              $project: {
                hour: { $hour: '$created_at' },
                status: 1,
                is_read: 1
              }
            },
            {
              $group: {
                _id: '$hour',
                sent: { $sum: 1 },
                delivered: {
                  $sum: {
                    $cond: [
                      { $in: ['$status', ['delivered', 'read']] },
                      1,
                      0
                    ]
                  }
                },
                read: { $sum: { $cond: ['$is_read', 1, 0] } }
              }
            },
            { $sort: { _id: 1 } }
          ],
          // Priority performance
          priorityStats: [
            {
              $group: {
                _id: '$priority',
                sent: { $sum: 1 },
                delivered: {
                  $sum: {
                    $cond: [
                      { $in: ['$status', ['delivered', 'read']] },
                      1,
                      0
                    ]
                  }
                },
                read: { $sum: { $cond: ['$is_read', 1, 0] } }
              }
            }
          ]
        }
      }
    ]);

    const aggregatedData = channelMetrics[0];
    const perConfigMetrics = aggregatedData.perConfig || [];
    const overallInAppStats = aggregatedData.overallInApp[0] || {
      totalSent: 0,
      totalDelivered: 0,
      totalRead: 0,
      totalFailed: 0,
      avgDeliveryTime: 0
    };

    // Create metrics lookup map
    const metricsMap = new Map();
    perConfigMetrics.forEach(metric => {
      metricsMap.set(metric._id.toString(), metric);
    });

    // 3. Calculate overall in-app metrics
    const inAppSent = overallInAppStats.totalSent;
    const inAppDelivered = overallInAppStats.totalDelivered;
    const inAppRead = overallInAppStats.totalRead;
    const inAppFailed = overallInAppStats.totalFailed;

    const inAppDeliveryRate = inAppSent > 0
      ? Math.round((inAppDelivered / inAppSent) * 100)
      : 0;
    const inAppReadRate = inAppDelivered > 0
      ? Math.round((inAppRead / inAppDelivered) * 100)
      : 0;
    const inAppFailureRate = inAppSent > 0
      ? Math.round((inAppFailed / inAppSent) * 100)
      : 0;

    // Convert average delivery time from milliseconds to seconds
    const avgInAppDeliveryTime = overallInAppStats.avgDeliveryTime
      ? Math.round(overallInAppStats.avgDeliveryTime / 1000)
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

    // Helper function to calculate performance score
    const calculatePerformanceScore = (deliveryRate, readRate, failureRate) => {
      let score = 0;

      if (deliveryRate >= 95) score += 40;
      else if (deliveryRate >= 85) score += 30;
      else if (deliveryRate >= 70) score += 20;

      if (readRate >= 70) score += 40;
      else if (readRate >= 50) score += 25;
      else if (readRate >= 30) score += 15;

      if (failureRate === 0) score += 20;
      else if (failureRate <= 5) score += 10;

      return score;
    };

    // 5. Analyze performance by configuration
    const configurationChannelAnalysis = configurations.map(config => {
      const metrics = metricsMap.get(config._id.toString()) || {
        totalNotifications: 0,
        inAppSent: 0,
        inAppDelivered: 0,
        inAppRead: 0,
        inAppFailed: 0
      };

      const deliveryRate = metrics.inAppSent > 0
        ? Math.round((metrics.inAppDelivered / metrics.inAppSent) * 100)
        : 0;
      const readRate = metrics.inAppDelivered > 0
        ? Math.round((metrics.inAppRead / metrics.inAppDelivered) * 100)
        : 0;
      const failureRate = metrics.inAppSent > 0
        ? Math.round((metrics.inAppFailed / metrics.inAppSent) * 100)
        : 0;

      const performanceScore = calculatePerformanceScore(deliveryRate, readRate, failureRate);
      const performanceStatus = performanceScore >= 80 ? 'Excellent' :
        performanceScore >= 60 ? 'Good' :
          performanceScore >= 40 ? 'Fair' : 'Poor';

      return {
        configurationId: config._id,
        name: config.name,
        isActive: config.is_active,
        inAppEnabled: config.notification_channels?.in_app !== false,
        metrics: {
          totalNotifications: metrics.totalNotifications,
          inAppSent: metrics.inAppSent,
          inAppDelivered: metrics.inAppDelivered,
          inAppRead: metrics.inAppRead,
          inAppFailed: metrics.inAppFailed,
          deliveryRate,
          readRate,
          failureRate
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

    // 8. Process hourly patterns from aggregation
    const deliveryPatternsByHour = aggregatedData.hourlyPatterns.map(pattern => ({
      hour: pattern._id,
      sent: pattern.sent,
      delivered: pattern.delivered,
      read: pattern.read,
      deliveryRate: pattern.sent > 0 ? Math.round((pattern.delivered / pattern.sent) * 100) : 0,
      readRate: pattern.delivered > 0 ? Math.round((pattern.read / pattern.delivered) * 100) : 0
    }));

    // 9. Process priority performance from aggregation
    const priorityChannelPerformance = {
      low: { sent: 0, delivered: 0, read: 0, deliveryRate: 0, readRate: 0 },
      medium: { sent: 0, delivered: 0, read: 0, deliveryRate: 0, readRate: 0 },
      high: { sent: 0, delivered: 0, read: 0, deliveryRate: 0, readRate: 0 },
      urgent: { sent: 0, delivered: 0, read: 0, deliveryRate: 0, readRate: 0 }
    };

    aggregatedData.priorityStats.forEach(stat => {
      if (stat._id && priorityChannelPerformance[stat._id]) {
        priorityChannelPerformance[stat._id].sent = stat.sent;
        priorityChannelPerformance[stat._id].delivered = stat.delivered;
        priorityChannelPerformance[stat._id].read = stat.read;
        priorityChannelPerformance[stat._id].deliveryRate = stat.sent > 0
          ? Math.round((stat.delivered / stat.sent) * 100)
          : 0;
        priorityChannelPerformance[stat._id].readRate = stat.delivered > 0
          ? Math.round((stat.read / stat.delivered) * 100)
          : 0;
      }
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

    // 11. Calculate total notifications from aggregation
    const totalNotifications = perConfigMetrics.reduce((sum, m) => sum + m.totalNotifications, 0);

    // 12. Summary statistics
    const summaryStats = {
      totalConfigurations: configurations.length,
      totalNotifications,
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
