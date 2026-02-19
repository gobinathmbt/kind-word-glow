/**
 * GroupPermission Report Controller
 * Handles all group permission-related analytics and reporting endpoints
 * Provides comprehensive group permission usage and effectiveness metrics
 */

const User = require('../../models/User');
const { 
  getDealershipFilter, 
  getDateFilter, 
  formatReportResponse, 
  handleReportError,
  buildBasePipeline 
} = require('../../utils/reportHelpers');

/**
 * Get Group Permission Usage
 * Analyzes group permission assignment patterns and utilization across users
 * 
 * @route GET /api/company/reports/group-permission/usage
 * @access Private (company_super_admin, company_admin)
 */
const getGroupPermissionUsage = async (req, res) => {
  try {
    const GroupPermission = req.getModel('GroupPermission');
    
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    // 1. Get all group permissions for the company
    const groupPermissions = await GroupPermission.find({ company_id })
      .populate('created_by', 'first_name last_name email')
      .lean();

    // 2. Get user assignment counts for each group permission
    const groupPermissionUsage = await Promise.all(
      groupPermissions.map(async (gp) => {
        // Build user query with dealership filter if applicable
        let userQuery = {
          company_id,
          group_permissions: gp._id
        };

        // Apply dealership filter if user is not primary admin
        if (dealershipFilter.dealership_id) {
          userQuery.dealership_ids = dealershipFilter.dealership_id;
        }

        // Count total users assigned to this group permission
        const totalAssignedUsers = await User.countDocuments(userQuery);

        // Count active users assigned to this group permission
        const activeAssignedUsers = await User.countDocuments({
          ...userQuery,
          is_active: true
        });

        // Count inactive users assigned to this group permission
        const inactiveAssignedUsers = await User.countDocuments({
          ...userQuery,
          is_active: false
        });

        // Get user details for this group permission
        const assignedUsers = await User.find(userQuery)
          .select('username first_name last_name email role is_active dealership_ids last_login')
          .lean();

        // Analyze role distribution
        const roleDistribution = assignedUsers.reduce((acc, user) => {
          acc[user.role] = (acc[user.role] || 0) + 1;
          return acc;
        }, {});

        // Analyze dealership distribution
        const dealershipDistribution = {};
        assignedUsers.forEach(user => {
          if (user.dealership_ids && user.dealership_ids.length > 0) {
            user.dealership_ids.forEach(dealershipId => {
              const dealershipKey = dealershipId.toString();
              dealershipDistribution[dealershipKey] = (dealershipDistribution[dealershipKey] || 0) + 1;
            });
          }
        });

        // Calculate activity metrics
        const usersWithRecentLogin = assignedUsers.filter(user => {
          if (!user.last_login) return false;
          const daysSinceLogin = (new Date() - new Date(user.last_login)) / (1000 * 60 * 60 * 24);
          return daysSinceLogin <= 30;
        }).length;

        // Calculate permission count
        const permissionCount = gp.permissions ? gp.permissions.length : 0;

        return {
          groupPermissionId: gp._id,
          name: gp.name,
          description: gp.description,
          isActive: gp.is_active,
          permissionCount,
          permissions: gp.permissions || [],
          createdBy: gp.created_by ? {
            name: `${gp.created_by.first_name} ${gp.created_by.last_name}`,
            email: gp.created_by.email
          } : null,
          createdAt: gp.created_at,
          updatedAt: gp.updated_at,
          usage: {
            totalAssignedUsers,
            activeAssignedUsers,
            inactiveAssignedUsers,
            usersWithRecentLogin,
            assignmentRate: totalAssignedUsers > 0 
              ? Math.round((activeAssignedUsers / totalAssignedUsers) * 100) 
              : 0,
            activityRate: totalAssignedUsers > 0
              ? Math.round((usersWithRecentLogin / totalAssignedUsers) * 100)
              : 0
          },
          roleDistribution,
          dealershipDistribution,
          dealershipCount: Object.keys(dealershipDistribution).length,
          assignedUsers: assignedUsers.map(user => ({
            userId: user._id,
            username: user.username,
            fullName: `${user.first_name} ${user.last_name}`,
            email: user.email,
            role: user.role,
            isActive: user.is_active,
            dealershipCount: user.dealership_ids ? user.dealership_ids.length : 0,
            lastLogin: user.last_login,
            daysSinceLastLogin: user.last_login 
              ? Math.floor((new Date() - new Date(user.last_login)) / (1000 * 60 * 60 * 24))
              : null
          }))
        };
      })
    );

    // Sort by total assigned users descending
    groupPermissionUsage.sort((a, b) => b.usage.totalAssignedUsers - a.usage.totalAssignedUsers);

    // 3. Calculate overall statistics
    const totalGroupPermissions = groupPermissions.length;
    const activeGroupPermissions = groupPermissions.filter(gp => gp.is_active).length;
    const inactiveGroupPermissions = totalGroupPermissions - activeGroupPermissions;

    const totalAssignedUsers = groupPermissionUsage.reduce((sum, gp) => sum + gp.usage.totalAssignedUsers, 0);
    const avgUsersPerGroup = totalGroupPermissions > 0 
      ? Math.round(totalAssignedUsers / totalGroupPermissions) 
      : 0;

    const totalPermissions = groupPermissions.reduce((sum, gp) => sum + (gp.permissions ? gp.permissions.length : 0), 0);
    const avgPermissionsPerGroup = totalGroupPermissions > 0
      ? Math.round(totalPermissions / totalGroupPermissions)
      : 0;

    // 4. Identify unused group permissions
    const unusedGroupPermissions = groupPermissionUsage.filter(gp => gp.usage.totalAssignedUsers === 0);

    // 5. Identify most popular group permissions
    const mostPopularGroupPermissions = groupPermissionUsage
      .filter(gp => gp.usage.totalAssignedUsers > 0)
      .slice(0, 10);

    // 6. Permission complexity analysis
    const permissionComplexity = groupPermissionUsage.map(gp => ({
      name: gp.name,
      permissionCount: gp.permissionCount,
      userCount: gp.usage.totalAssignedUsers,
      complexity: gp.permissionCount > 20 ? 'High' : gp.permissionCount > 10 ? 'Medium' : 'Low'
    }));

    // 7. Group permission creation timeline
    const creationTimeline = groupPermissions.reduce((acc, gp) => {
      const monthYear = new Date(gp.created_at).toISOString().substring(0, 7); // YYYY-MM
      acc[monthYear] = (acc[monthYear] || 0) + 1;
      return acc;
    }, {});

    // 8. Users without group permissions
    let usersWithoutGroupPermissionsQuery = {
      company_id,
      $or: [
        { group_permissions: { $exists: false } },
        { group_permissions: null }
      ]
    };

    if (dealershipFilter.dealership_id) {
      usersWithoutGroupPermissionsQuery.dealership_ids = dealershipFilter.dealership_id;
    }

    const usersWithoutGroupPermissions = await User.countDocuments(usersWithoutGroupPermissionsQuery);

    // 9. Total users in scope
    let totalUsersQuery = { company_id };
    if (dealershipFilter.dealership_id) {
      totalUsersQuery.dealership_ids = dealershipFilter.dealership_id;
    }
    const totalUsers = await User.countDocuments(totalUsersQuery);

    const groupPermissionCoverage = totalUsers > 0
      ? Math.round(((totalUsers - usersWithoutGroupPermissions) / totalUsers) * 100)
      : 0;

    res.json(formatReportResponse({
      groupPermissions: groupPermissionUsage,
      overallStatistics: {
        totalGroupPermissions,
        activeGroupPermissions,
        inactiveGroupPermissions,
        totalAssignedUsers,
        avgUsersPerGroup,
        totalPermissions,
        avgPermissionsPerGroup,
        unusedGroupPermissionsCount: unusedGroupPermissions.length,
        totalUsers,
        usersWithoutGroupPermissions,
        groupPermissionCoverage
      },
      unusedGroupPermissions: unusedGroupPermissions.map(gp => ({
        id: gp.groupPermissionId,
        name: gp.name,
        description: gp.description,
        permissionCount: gp.permissionCount,
        createdAt: gp.createdAt
      })),
      mostPopularGroupPermissions: mostPopularGroupPermissions.map(gp => ({
        id: gp.groupPermissionId,
        name: gp.name,
        userCount: gp.usage.totalAssignedUsers,
        activeUserCount: gp.usage.activeAssignedUsers,
        activityRate: gp.usage.activityRate,
        permissionCount: gp.permissionCount
      })),
      permissionComplexity,
      creationTimeline
    }, {
      reportType: 'group-permission-usage',
      filters: {
        dealership: dealershipFilter,
        dateRange: dateFilter
      }
    }));

  } catch (error) {
    return handleReportError(error, res, 'Group Permission Usage');
  }
};

/**
 * Get Group Permission Effectiveness
 * Analyzes the effectiveness of group permissions based on user activity and permission utilization
 * 
 * @route GET /api/company/reports/group-permission/effectiveness
 * @access Private (company_super_admin, company_admin)
 */
const getGroupPermissionEffectiveness = async (req, res) => {
  try {
    const GroupPermission = req.getModel('GroupPermission');
    
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    // 1. Get all group permissions for the company
    const groupPermissions = await GroupPermission.find({ company_id })
      .populate('created_by', 'first_name last_name email')
      .lean();

    // 2. Analyze effectiveness for each group permission
    const effectivenessAnalysis = await Promise.all(
      groupPermissions.map(async (gp) => {
        // Build user query with dealership filter if applicable
        let userQuery = {
          company_id,
          group_permissions: gp._id
        };

        if (dealershipFilter.dealership_id) {
          userQuery.dealership_ids = dealershipFilter.dealership_id;
        }

        // Get all users assigned to this group permission
        const assignedUsers = await User.find(userQuery)
          .select('username first_name last_name email role is_active last_login created_at')
          .lean();

        const totalUsers = assignedUsers.length;

        if (totalUsers === 0) {
          return {
            groupPermissionId: gp._id,
            name: gp.name,
            description: gp.description,
            isActive: gp.is_active,
            permissionCount: gp.permissions ? gp.permissions.length : 0,
            effectiveness: {
              totalUsers: 0,
              activeUsers: 0,
              utilizationScore: 0,
              activityScore: 0,
              retentionScore: 0,
              overallEffectivenessScore: 0,
              effectivenessRating: 'Not Used'
            }
          };
        }

        // Calculate active users
        const activeUsers = assignedUsers.filter(user => user.is_active).length;
        const activeUserRate = Math.round((activeUsers / totalUsers) * 100);

        // Calculate users with recent activity (logged in within last 30 days)
        const usersWithRecentActivity = assignedUsers.filter(user => {
          if (!user.last_login) return false;
          const daysSinceLogin = (new Date() - new Date(user.last_login)) / (1000 * 60 * 60 * 24);
          return daysSinceLogin <= 30;
        }).length;
        const activityRate = Math.round((usersWithRecentActivity / totalUsers) * 100);

        // Calculate users with very recent activity (logged in within last 7 days)
        const usersWithVeryRecentActivity = assignedUsers.filter(user => {
          if (!user.last_login) return false;
          const daysSinceLogin = (new Date() - new Date(user.last_login)) / (1000 * 60 * 60 * 24);
          return daysSinceLogin <= 7;
        }).length;
        const weeklyActivityRate = Math.round((usersWithVeryRecentActivity / totalUsers) * 100);

        // Calculate users who have never logged in
        const usersNeverLoggedIn = assignedUsers.filter(user => !user.last_login).length;
        const neverLoggedInRate = Math.round((usersNeverLoggedIn / totalUsers) * 100);

        // Calculate average days since last login for active users
        const activeUsersWithLogin = assignedUsers.filter(user => user.is_active && user.last_login);
        const avgDaysSinceLastLogin = activeUsersWithLogin.length > 0
          ? Math.round(
              activeUsersWithLogin.reduce((sum, user) => {
                const days = (new Date() - new Date(user.last_login)) / (1000 * 60 * 60 * 24);
                return sum + days;
              }, 0) / activeUsersWithLogin.length
            )
          : null;

        // Calculate retention (users still active after 30 days of assignment)
        const usersOlderThan30Days = assignedUsers.filter(user => {
          const daysSinceCreation = (new Date() - new Date(user.created_at)) / (1000 * 60 * 60 * 24);
          return daysSinceCreation > 30;
        });
        const retainedUsers = usersOlderThan30Days.filter(user => user.is_active && user.last_login).length;
        const retentionRate = usersOlderThan30Days.length > 0
          ? Math.round((retainedUsers / usersOlderThan30Days.length) * 100)
          : 100; // If no users older than 30 days, assume 100% retention

        // Calculate utilization score (0-100)
        // Based on: active rate (40%), activity rate (40%), retention rate (20%)
        const utilizationScore = Math.round(
          (activeUserRate * 0.4) + (activityRate * 0.4) + (retentionRate * 0.2)
        );

        // Calculate activity score (0-100)
        // Based on: weekly activity (60%), monthly activity (40%)
        const activityScore = Math.round(
          (weeklyActivityRate * 0.6) + (activityRate * 0.4)
        );

        // Calculate retention score (0-100)
        const retentionScore = retentionRate;

        // Calculate overall effectiveness score (0-100)
        // Weighted average: utilization (40%), activity (40%), retention (20%)
        const overallEffectivenessScore = Math.round(
          (utilizationScore * 0.4) + (activityScore * 0.4) + (retentionScore * 0.2)
        );

        // Determine effectiveness rating
        let effectivenessRating;
        if (overallEffectivenessScore >= 80) {
          effectivenessRating = 'Excellent';
        } else if (overallEffectivenessScore >= 60) {
          effectivenessRating = 'Good';
        } else if (overallEffectivenessScore >= 40) {
          effectivenessRating = 'Fair';
        } else if (overallEffectivenessScore >= 20) {
          effectivenessRating = 'Poor';
        } else {
          effectivenessRating = 'Very Poor';
        }

        // Calculate permission utilization metrics
        const permissionCount = gp.permissions ? gp.permissions.length : 0;
        const permissionDensity = totalUsers > 0 ? permissionCount / totalUsers : 0;

        // Identify potential issues
        const issues = [];
        if (neverLoggedInRate > 50) {
          issues.push('High percentage of users never logged in');
        }
        if (activeUserRate < 50) {
          issues.push('Low active user rate');
        }
        if (activityRate < 30) {
          issues.push('Low recent activity rate');
        }
        if (retentionRate < 60) {
          issues.push('Low user retention');
        }
        if (permissionCount === 0) {
          issues.push('No permissions assigned');
        }
        if (permissionCount > 50) {
          issues.push('Very high permission count - consider splitting');
        }

        // Recommendations
        const recommendations = [];
        if (totalUsers === 0) {
          recommendations.push('Consider assigning users or removing unused group permission');
        }
        if (neverLoggedInRate > 30) {
          recommendations.push('Review users who have never logged in');
        }
        if (activityRate < 50) {
          recommendations.push('Investigate low activity rates and user engagement');
        }
        if (permissionCount > 30) {
          recommendations.push('Consider breaking down into smaller, more focused permission groups');
        }
        if (retentionRate < 70) {
          recommendations.push('Review user onboarding and training processes');
        }

        return {
          groupPermissionId: gp._id,
          name: gp.name,
          description: gp.description,
          isActive: gp.is_active,
          permissionCount,
          createdAt: gp.created_at,
          updatedAt: gp.updated_at,
          createdBy: gp.created_by ? {
            name: `${gp.created_by.first_name} ${gp.created_by.last_name}`,
            email: gp.created_by.email
          } : null,
          effectiveness: {
            totalUsers,
            activeUsers,
            inactiveUsers: totalUsers - activeUsers,
            usersWithRecentActivity,
            usersWithVeryRecentActivity,
            usersNeverLoggedIn,
            activeUserRate,
            activityRate,
            weeklyActivityRate,
            neverLoggedInRate,
            avgDaysSinceLastLogin,
            retentionRate,
            utilizationScore,
            activityScore,
            retentionScore,
            overallEffectivenessScore,
            effectivenessRating,
            permissionDensity: Math.round(permissionDensity * 100) / 100
          },
          issues,
          recommendations
        };
      })
    );

    // Sort by overall effectiveness score descending
    effectivenessAnalysis.sort((a, b) => b.effectiveness.overallEffectivenessScore - a.effectiveness.overallEffectivenessScore);

    // 3. Calculate aggregate statistics
    const totalGroupPermissions = groupPermissions.length;
    const groupPermissionsInUse = effectivenessAnalysis.filter(gp => gp.effectiveness.totalUsers > 0).length;
    const unusedGroupPermissions = totalGroupPermissions - groupPermissionsInUse;

    const avgEffectivenessScore = groupPermissionsInUse > 0
      ? Math.round(
          effectivenessAnalysis
            .filter(gp => gp.effectiveness.totalUsers > 0)
            .reduce((sum, gp) => sum + gp.effectiveness.overallEffectivenessScore, 0) / groupPermissionsInUse
        )
      : 0;

    // 4. Effectiveness distribution
    const effectivenessDistribution = {
      excellent: effectivenessAnalysis.filter(gp => gp.effectiveness.effectivenessRating === 'Excellent').length,
      good: effectivenessAnalysis.filter(gp => gp.effectiveness.effectivenessRating === 'Good').length,
      fair: effectivenessAnalysis.filter(gp => gp.effectiveness.effectivenessRating === 'Fair').length,
      poor: effectivenessAnalysis.filter(gp => gp.effectiveness.effectivenessRating === 'Poor').length,
      veryPoor: effectivenessAnalysis.filter(gp => gp.effectiveness.effectivenessRating === 'Very Poor').length,
      notUsed: effectivenessAnalysis.filter(gp => gp.effectiveness.effectivenessRating === 'Not Used').length
    };

    // 5. Top performing group permissions
    const topPerformingGroupPermissions = effectivenessAnalysis
      .filter(gp => gp.effectiveness.totalUsers > 0)
      .slice(0, 10)
      .map(gp => ({
        id: gp.groupPermissionId,
        name: gp.name,
        effectivenessScore: gp.effectiveness.overallEffectivenessScore,
        effectivenessRating: gp.effectiveness.effectivenessRating,
        totalUsers: gp.effectiveness.totalUsers,
        activityRate: gp.effectiveness.activityRate
      }));

    // 6. Underperforming group permissions
    const underperformingGroupPermissions = effectivenessAnalysis
      .filter(gp => gp.effectiveness.totalUsers > 0 && gp.effectiveness.overallEffectivenessScore < 40)
      .map(gp => ({
        id: gp.groupPermissionId,
        name: gp.name,
        effectivenessScore: gp.effectiveness.overallEffectivenessScore,
        effectivenessRating: gp.effectiveness.effectivenessRating,
        totalUsers: gp.effectiveness.totalUsers,
        issues: gp.issues,
        recommendations: gp.recommendations
      }));

    // 7. Permission complexity vs effectiveness correlation
    const complexityVsEffectiveness = effectivenessAnalysis
      .filter(gp => gp.effectiveness.totalUsers > 0)
      .map(gp => ({
        name: gp.name,
        permissionCount: gp.permissionCount,
        effectivenessScore: gp.effectiveness.overallEffectivenessScore,
        userCount: gp.effectiveness.totalUsers
      }));

    // 8. Activity trends
    const activityTrends = {
      avgWeeklyActivityRate: groupPermissionsInUse > 0
        ? Math.round(
            effectivenessAnalysis
              .filter(gp => gp.effectiveness.totalUsers > 0)
              .reduce((sum, gp) => sum + gp.effectiveness.weeklyActivityRate, 0) / groupPermissionsInUse
          )
        : 0,
      avgMonthlyActivityRate: groupPermissionsInUse > 0
        ? Math.round(
            effectivenessAnalysis
              .filter(gp => gp.effectiveness.totalUsers > 0)
              .reduce((sum, gp) => sum + gp.effectiveness.activityRate, 0) / groupPermissionsInUse
          )
        : 0,
      avgRetentionRate: groupPermissionsInUse > 0
        ? Math.round(
            effectivenessAnalysis
              .filter(gp => gp.effectiveness.totalUsers > 0)
              .reduce((sum, gp) => sum + gp.effectiveness.retentionRate, 0) / groupPermissionsInUse
          )
        : 0
    };

    res.json(formatReportResponse({
      groupPermissions: effectivenessAnalysis,
      overallStatistics: {
        totalGroupPermissions,
        groupPermissionsInUse,
        unusedGroupPermissions,
        avgEffectivenessScore,
        effectivenessDistribution,
        activityTrends
      },
      topPerformingGroupPermissions,
      underperformingGroupPermissions,
      complexityVsEffectiveness
    }, {
      reportType: 'group-permission-effectiveness',
      filters: {
        dealership: dealershipFilter,
        dateRange: dateFilter
      }
    }));

  } catch (error) {
    return handleReportError(error, res, 'Group Permission Effectiveness');
  }
};

module.exports = {
  getGroupPermissionUsage,
  getGroupPermissionEffectiveness
};
