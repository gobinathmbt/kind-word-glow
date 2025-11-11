/**
 * User Report Controller
 * Handles all user-related analytics and reporting endpoints
 * Provides comprehensive user performance, activity, and utilization metrics
 */

const User = require('../../models/User');
const Vehicle = require('../../models/Vehicle');
const WorkshopQuote = require('../../models/WorkshopQuote');
const WorkshopReport = require('../../models/WorkshopReport');
const GroupPermission = require('../../models/GroupPermission');
const { 
  getDealershipFilter, 
  getDateFilter, 
  formatReportResponse, 
  handleReportError,
  buildBasePipeline 
} = require('../../utils/reportHelpers');

/**
 * Get User Performance Metrics
 * Analyzes user activity and productivity metrics including vehicle creation, quote management, and task completion
 * 
 * @route GET /api/company/reports/user/performance-metrics
 * @access Private (company_super_admin, company_admin)
 */
const getUserPerformanceMetrics = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    // Get users based on dealership filter
    let userQuery = { company_id, is_active: true };
    
    if (dealershipFilter.dealership_id) {
      userQuery.dealership_ids = dealershipFilter.dealership_id;
    }

    const users = await User.find(userQuery)
      .select('_id username first_name last_name email role dealership_ids last_login')
      .lean();

    const userIds = users.map(u => u._id);

    // 1. Vehicle creation activity by user
    const vehicleActivity = await Vehicle.aggregate([
      {
        $match: {
          company_id,
          created_by: { $in: userIds },
          ...dateFilter
        }
      },
      {
        $group: {
          _id: '$created_by',
          totalVehiclesCreated: { $sum: 1 },
          inspectionVehicles: {
            $sum: { $cond: [{ $eq: ['$vehicle_type', 'inspection'] }, 1, 0] }
          },
          tradeinVehicles: {
            $sum: { $cond: [{ $eq: ['$vehicle_type', 'tradein'] }, 1, 0] }
          },
          masterVehicles: {
            $sum: { $cond: [{ $eq: ['$vehicle_type', 'master'] }, 1, 0] }
          },
          advertisementVehicles: {
            $sum: { $cond: [{ $eq: ['$vehicle_type', 'advertisement'] }, 1, 0] }
          },
          lastVehicleCreated: { $max: '$created_at' }
        }
      }
    ]);

    // 2. Workshop quote activity by user
    const quoteActivity = await WorkshopQuote.aggregate([
      {
        $match: {
          created_by: { $in: userIds },
          ...dateFilter
        }
      },
      {
        $group: {
          _id: '$created_by',
          totalQuotesCreated: { $sum: 1 },
          completedQuotes: {
            $sum: { $cond: [{ $eq: ['$status', 'completed_jobs'] }, 1, 0] }
          },
          inProgressQuotes: {
            $sum: { $cond: [{ $eq: ['$status', 'work_in_progress'] }, 1, 0] }
          },
          totalQuoteValue: { $sum: '$quote_amount' },
          avgQuoteAmount: { $avg: '$quote_amount' },
          lastQuoteCreated: { $max: '$created_at' }
        }
      }
    ]);

    // 3. Workshop report activity by user
    const reportActivity = await WorkshopReport.aggregate([
      {
        $match: {
          created_by: { $in: userIds },
          ...dateFilter
        }
      },
      {
        $group: {
          _id: '$created_by',
          totalReportsCreated: { $sum: 1 },
          totalRevenue: { $sum: '$final_price' },
          avgRevenue: { $avg: '$final_price' },
          lastReportCreated: { $max: '$created_at' }
        }
      }
    ]);

    // 4. Calculate activity scores and productivity metrics
    const performanceMetrics = users.map(user => {
      const vehicleData = vehicleActivity.find(v => v._id?.toString() === user._id.toString()) || {};
      const quoteData = quoteActivity.find(q => q._id?.toString() === user._id.toString()) || {};
      const reportData = reportActivity.find(r => r._id?.toString() === user._id.toString()) || {};

      // Calculate days since last login
      const daysSinceLastLogin = user.last_login 
        ? Math.floor((new Date() - new Date(user.last_login)) / (1000 * 60 * 60 * 24))
        : null;

      // Calculate productivity score (0-100)
      const vehicleScore = Math.min((vehicleData.totalVehiclesCreated || 0) * 2, 40);
      const quoteScore = Math.min((quoteData.totalQuotesCreated || 0) * 3, 30);
      const reportScore = Math.min((reportData.totalReportsCreated || 0) * 3, 30);
      const productivityScore = Math.round(vehicleScore + quoteScore + reportScore);

      return {
        userId: user._id,
        username: user.username,
        fullName: `${user.first_name} ${user.last_name}`,
        email: user.email,
        role: user.role,
        dealershipCount: user.dealership_ids?.length || 0,
        lastLogin: user.last_login,
        daysSinceLastLogin,
        vehicleActivity: {
          total: vehicleData.totalVehiclesCreated || 0,
          inspection: vehicleData.inspectionVehicles || 0,
          tradein: vehicleData.tradeinVehicles || 0,
          master: vehicleData.masterVehicles || 0,
          advertisement: vehicleData.advertisementVehicles || 0,
          lastCreated: vehicleData.lastVehicleCreated
        },
        quoteActivity: {
          total: quoteData.totalQuotesCreated || 0,
          completed: quoteData.completedQuotes || 0,
          inProgress: quoteData.inProgressQuotes || 0,
          totalValue: quoteData.totalQuoteValue || 0,
          avgAmount: quoteData.avgQuoteAmount || 0,
          completionRate: quoteData.totalQuotesCreated 
            ? Math.round((quoteData.completedQuotes / quoteData.totalQuotesCreated) * 100)
            : 0,
          lastCreated: quoteData.lastQuoteCreated
        },
        reportActivity: {
          total: reportData.totalReportsCreated || 0,
          totalRevenue: reportData.totalRevenue || 0,
          avgRevenue: reportData.avgRevenue || 0,
          lastCreated: reportData.lastReportCreated
        },
        productivityScore,
        activityLevel: productivityScore >= 70 ? 'High' : productivityScore >= 40 ? 'Medium' : 'Low'
      };
    });

    // Sort by productivity score descending
    performanceMetrics.sort((a, b) => b.productivityScore - a.productivityScore);

    res.json(formatReportResponse(performanceMetrics, {
      reportType: 'user-performance-metrics',
      totalUsers: users.length,
      filters: {
        dealership: dealershipFilter,
        dateRange: dateFilter
      }
    }));

  } catch (error) {
    return handleReportError(error, res, 'User Performance Metrics');
  }
};

/**
 * Get User Login Patterns
 * Analyzes login frequency, session duration, and activity patterns
 * 
 * @route GET /api/company/reports/user/login-patterns
 * @access Private (company_super_admin, company_admin)
 */
const getUserLoginPatterns = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    // Get users based on dealership filter
    let userQuery = { company_id };
    
    if (dealershipFilter.dealership_id) {
      userQuery.dealership_ids = dealershipFilter.dealership_id;
    }

    // 1. User login statistics
    const loginStats = await User.aggregate([
      { $match: userQuery },
      {
        $project: {
          username: 1,
          first_name: 1,
          last_name: 1,
          email: 1,
          role: 1,
          is_active: 1,
          last_login: 1,
          is_first_login: 1,
          login_attempts: 1,
          account_locked_until: 1,
          created_at: 1,
          daysSinceLastLogin: {
            $cond: [
              { $ne: ['$last_login', null] },
              {
                $divide: [
                  { $subtract: [new Date(), '$last_login'] },
                  86400000
                ]
              },
              null
            ]
          },
          daysSinceCreation: {
            $divide: [
              { $subtract: [new Date(), '$created_at'] },
              86400000
            ]
          },
          hasLoggedIn: { $ne: ['$last_login', null] },
          isLocked: {
            $cond: [
              { $and: ['$account_locked_until', { $gt: ['$account_locked_until', new Date()] }] },
              true,
              false
            ]
          }
        }
      },
      {
        $addFields: {
          loginFrequency: {
            $cond: [
              { $eq: ['$hasLoggedIn', false] },
              'Never',
              {
                $cond: [
                  { $lte: ['$daysSinceLastLogin', 1] },
                  'Daily',
                  {
                    $cond: [
                      { $lte: ['$daysSinceLastLogin', 7] },
                      'Weekly',
                      {
                        $cond: [
                          { $lte: ['$daysSinceLastLogin', 30] },
                          'Monthly',
                          'Inactive'
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          },
          activityStatus: {
            $cond: [
              { $eq: ['$is_active', false] },
              'Disabled',
              {
                $cond: [
                  { $eq: ['$isLocked', true] },
                  'Locked',
                  {
                    $cond: [
                      { $eq: ['$hasLoggedIn', false] },
                      'Never Logged In',
                      {
                        $cond: [
                          { $lte: ['$daysSinceLastLogin', 7] },
                          'Active',
                          {
                            $cond: [
                              { $lte: ['$daysSinceLastLogin', 30] },
                              'Moderately Active',
                              'Inactive'
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        }
      },
      {
        $sort: { last_login: -1 }
      }
    ]);

    // 2. Login frequency distribution
    const frequencyDistribution = await User.aggregate([
      { $match: userQuery },
      {
        $project: {
          daysSinceLastLogin: {
            $cond: [
              { $ne: ['$last_login', null] },
              {
                $divide: [
                  { $subtract: [new Date(), '$last_login'] },
                  86400000
                ]
              },
              999
            ]
          }
        }
      },
      {
        $bucket: {
          groupBy: '$daysSinceLastLogin',
          boundaries: [0, 1, 7, 30, 90, 999],
          default: 'Never',
          output: {
            count: { $sum: 1 }
          }
        }
      },
      {
        $addFields: {
          category: {
            $switch: {
              branches: [
                { case: { $eq: ['$_id', 0] }, then: 'Today' },
                { case: { $eq: ['$_id', 1] }, then: 'This Week' },
                { case: { $eq: ['$_id', 7] }, then: 'This Month' },
                { case: { $eq: ['$_id', 30] }, then: 'Last 3 Months' },
                { case: { $eq: ['$_id', 90] }, then: 'Inactive' }
              ],
              default: 'Never'
            }
          }
        }
      }
    ]);

    // 3. Role-based login patterns
    const roleLoginPatterns = await User.aggregate([
      { $match: userQuery },
      {
        $group: {
          _id: '$role',
          totalUsers: { $sum: 1 },
          usersWithLogin: {
            $sum: { $cond: [{ $ne: ['$last_login', null] }, 1, 0] }
          },
          activeUsers: {
            $sum: { $cond: [{ $eq: ['$is_active', true] }, 1, 0] }
          },
          avgDaysSinceLastLogin: {
            $avg: {
              $cond: [
                { $ne: ['$last_login', null] },
                {
                  $divide: [
                    { $subtract: [new Date(), '$last_login'] },
                    86400000
                  ]
                },
                null
              ]
            }
          },
          recentlyActive: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$last_login', null] },
                    {
                      $lte: [
                        {
                          $divide: [
                            { $subtract: [new Date(), '$last_login'] },
                            86400000
                          ]
                        },
                        7
                      ]
                    }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          totalUsers: 1,
          usersWithLogin: 1,
          activeUsers: 1,
          avgDaysSinceLastLogin: { $round: ['$avgDaysSinceLastLogin', 1] },
          recentlyActive: 1,
          loginRate: {
            $round: [
              { $multiply: [{ $divide: ['$usersWithLogin', '$totalUsers'] }, 100] },
              1
            ]
          },
          activityRate: {
            $round: [
              { $multiply: [{ $divide: ['$recentlyActive', '$totalUsers'] }, 100] },
              1
            ]
          }
        }
      }
    ]);

    // 4. First login status
    const firstLoginStatus = await User.aggregate([
      { $match: userQuery },
      {
        $group: {
          _id: '$is_first_login',
          count: { $sum: 1 }
        }
      }
    ]);

    // 5. Account security metrics
    const securityMetrics = await User.aggregate([
      { $match: userQuery },
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          lockedAccounts: {
            $sum: {
              $cond: [
                { $and: ['$account_locked_until', { $gt: ['$account_locked_until', new Date()] }] },
                1,
                0
              ]
            }
          },
          usersWithFailedAttempts: {
            $sum: { $cond: [{ $gt: ['$login_attempts', 0] }, 1, 0] }
          },
          avgLoginAttempts: { $avg: '$login_attempts' }
        }
      },
      {
        $project: {
          _id: 0,
          totalUsers: 1,
          lockedAccounts: 1,
          usersWithFailedAttempts: 1,
          avgLoginAttempts: { $round: ['$avgLoginAttempts', 2] },
          lockRate: {
            $round: [
              { $multiply: [{ $divide: ['$lockedAccounts', '$totalUsers'] }, 100] },
              2
            ]
          }
        }
      }
    ]);

    res.json(formatReportResponse({
      userLoginDetails: loginStats,
      frequencyDistribution,
      roleLoginPatterns,
      firstLoginStatus,
      securityMetrics: securityMetrics[0] || {}
    }, {
      reportType: 'user-login-patterns',
      totalUsers: loginStats.length,
      filters: {
        dealership: dealershipFilter,
        dateRange: dateFilter
      }
    }));

  } catch (error) {
    return handleReportError(error, res, 'User Login Patterns');
  }
};

/**
 * Get User Role Distribution
 * Analyzes role-based user distribution and characteristics
 * 
 * @route GET /api/company/reports/user/role-distribution
 * @access Private (company_super_admin, company_admin)
 */
const getUserRoleDistribution = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);

    // Get users based on dealership filter
    let userQuery = { company_id };
    
    if (dealershipFilter.dealership_id) {
      userQuery.dealership_ids = dealershipFilter.dealership_id;
    }

    // 1. Role distribution with detailed metrics
    const roleDistribution = await User.aggregate([
      { $match: userQuery },
      {
        $group: {
          _id: '$role',
          totalUsers: { $sum: 1 },
          activeUsers: {
            $sum: { $cond: [{ $eq: ['$is_active', true] }, 1, 0] }
          },
          inactiveUsers: {
            $sum: { $cond: [{ $eq: ['$is_active', false] }, 1, 0] }
          },
          primaryAdmins: {
            $sum: { $cond: [{ $eq: ['$is_primary_admin', true] }, 1, 0] }
          },
          usersWithLogin: {
            $sum: { $cond: [{ $ne: ['$last_login', null] }, 1, 0] }
          },
          avgDealershipCount: {
            $avg: { $size: { $ifNull: ['$dealership_ids', []] } }
          },
          avgPermissionCount: {
            $avg: { $size: { $ifNull: ['$permissions', []] } }
          },
          avgModuleAccessCount: {
            $avg: { $size: { $ifNull: ['$module_access', []] } }
          },
          usersWithGroupPermissions: {
            $sum: { $cond: [{ $ne: ['$group_permissions', null] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          _id: 1,
          totalUsers: 1,
          activeUsers: 1,
          inactiveUsers: 1,
          primaryAdmins: 1,
          usersWithLogin: 1,
          avgDealershipCount: { $round: ['$avgDealershipCount', 1] },
          avgPermissionCount: { $round: ['$avgPermissionCount', 1] },
          avgModuleAccessCount: { $round: ['$avgModuleAccessCount', 1] },
          usersWithGroupPermissions: 1,
          activeRate: {
            $round: [
              { $multiply: [{ $divide: ['$activeUsers', '$totalUsers'] }, 100] },
              1
            ]
          },
          loginRate: {
            $round: [
              { $multiply: [{ $divide: ['$usersWithLogin', '$totalUsers'] }, 100] },
              1
            ]
          },
          groupPermissionRate: {
            $round: [
              { $multiply: [{ $divide: ['$usersWithGroupPermissions', '$totalUsers'] }, 100] },
              1
            ]
          }
        }
      },
      {
        $sort: { totalUsers: -1 }
      }
    ]);

    // 2. Role and status combination
    const roleStatusMatrix = await User.aggregate([
      { $match: userQuery },
      {
        $group: {
          _id: {
            role: '$role',
            is_active: '$is_active',
            is_primary_admin: '$is_primary_admin'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.role',
          statusBreakdown: {
            $push: {
              is_active: '$_id.is_active',
              is_primary_admin: '$_id.is_primary_admin',
              count: '$count'
            }
          }
        }
      }
    ]);

    // 3. Dealership assignment patterns by role
    const dealershipAssignmentByRole = await User.aggregate([
      { $match: userQuery },
      {
        $project: {
          role: 1,
          dealershipCount: { $size: { $ifNull: ['$dealership_ids', []] } }
        }
      },
      {
        $bucket: {
          groupBy: '$dealershipCount',
          boundaries: [0, 1, 2, 5, 10, 100],
          default: '10+',
          output: {
            count: { $sum: 1 },
            roles: { $push: '$role' }
          }
        }
      }
    ]);

    // 4. Permission complexity by role
    const permissionComplexityByRole = await User.aggregate([
      { $match: userQuery },
      {
        $group: {
          _id: '$role',
          avgPermissions: {
            $avg: { $size: { $ifNull: ['$permissions', []] } }
          },
          avgModuleAccess: {
            $avg: { $size: { $ifNull: ['$module_access', []] } }
          },
          maxPermissions: {
            $max: { $size: { $ifNull: ['$permissions', []] } }
          },
          minPermissions: {
            $min: { $size: { $ifNull: ['$permissions', []] } }
          },
          usersWithNoPermissions: {
            $sum: {
              $cond: [
                { $eq: [{ $size: { $ifNull: ['$permissions', []] } }, 0] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          avgPermissions: { $round: ['$avgPermissions', 1] },
          avgModuleAccess: { $round: ['$avgModuleAccess', 1] },
          maxPermissions: 1,
          minPermissions: 1,
          usersWithNoPermissions: 1
        }
      }
    ]);

    // 5. Role creation timeline
    const roleCreationTimeline = await User.aggregate([
      { $match: userQuery },
      {
        $project: {
          role: 1,
          yearMonth: {
            $dateToString: {
              format: '%Y-%m',
              date: '$created_at'
            }
          }
        }
      },
      {
        $group: {
          _id: {
            yearMonth: '$yearMonth',
            role: '$role'
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.yearMonth': -1 }
      },
      {
        $limit: 12
      }
    ]);

    // 6. Overall statistics
    const overallStats = await User.aggregate([
      { $match: userQuery },
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          uniqueRoles: { $addToSet: '$role' },
          totalPrimaryAdmins: {
            $sum: { $cond: [{ $eq: ['$is_primary_admin', true] }, 1, 0] }
          },
          totalActiveUsers: {
            $sum: { $cond: [{ $eq: ['$is_active', true] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalUsers: 1,
          uniqueRoleCount: { $size: '$uniqueRoles' },
          totalPrimaryAdmins: 1,
          totalActiveUsers: 1,
          activeRate: {
            $round: [
              { $multiply: [{ $divide: ['$totalActiveUsers', '$totalUsers'] }, 100] },
              1
            ]
          }
        }
      }
    ]);

    res.json(formatReportResponse({
      roleDistribution,
      roleStatusMatrix,
      dealershipAssignmentByRole,
      permissionComplexityByRole,
      roleCreationTimeline,
      overallStats: overallStats[0] || {}
    }, {
      reportType: 'user-role-distribution',
      filters: {
        dealership: dealershipFilter
      }
    }));

  } catch (error) {
    return handleReportError(error, res, 'User Role Distribution');
  }
};

/**
 * Get User Dealership Assignment
 * Analyzes dealership assignment patterns and user distribution across dealerships
 * 
 * @route GET /api/company/reports/user/dealership-assignment
 * @access Private (company_super_admin, company_admin)
 */
const getUserDealershipAssignment = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);

    // Get users based on dealership filter
    let userQuery = { company_id };
    
    if (dealershipFilter.dealership_id) {
      userQuery.dealership_ids = dealershipFilter.dealership_id;
    }

    // 1. Users by dealership count
    const usersByDealershipCount = await User.aggregate([
      { $match: userQuery },
      {
        $project: {
          username: 1,
          first_name: 1,
          last_name: 1,
          role: 1,
          is_primary_admin: 1,
          is_active: 1,
          dealershipCount: { $size: { $ifNull: ['$dealership_ids', []] } }
        }
      },
      {
        $bucket: {
          groupBy: '$dealershipCount',
          boundaries: [0, 1, 2, 3, 5, 10, 100],
          default: '10+',
          output: {
            count: { $sum: 1 },
            users: {
              $push: {
                username: '$username',
                fullName: { $concat: ['$first_name', ' ', '$last_name'] },
                role: '$role',
                is_primary_admin: '$is_primary_admin',
                dealershipCount: '$dealershipCount'
              }
            }
          }
        }
      }
    ]);

    // 2. Dealership assignment by role
    const assignmentByRole = await User.aggregate([
      { $match: userQuery },
      {
        $project: {
          role: 1,
          is_primary_admin: 1,
          dealershipCount: { $size: { $ifNull: ['$dealership_ids', []] } }
        }
      },
      {
        $group: {
          _id: '$role',
          totalUsers: { $sum: 1 },
          avgDealershipCount: { $avg: '$dealershipCount' },
          maxDealershipCount: { $max: '$dealershipCount' },
          minDealershipCount: { $min: '$dealershipCount' },
          usersWithNoDealerships: {
            $sum: { $cond: [{ $eq: ['$dealershipCount', 0] }, 1, 0] }
          },
          usersWithMultipleDealerships: {
            $sum: { $cond: [{ $gt: ['$dealershipCount', 1] }, 1, 0] }
          },
          primaryAdmins: {
            $sum: { $cond: [{ $eq: ['$is_primary_admin', true] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          _id: 1,
          totalUsers: 1,
          avgDealershipCount: { $round: ['$avgDealershipCount', 1] },
          maxDealershipCount: 1,
          minDealershipCount: 1,
          usersWithNoDealerships: 1,
          usersWithMultipleDealerships: 1,
          primaryAdmins: 1,
          multiDealershipRate: {
            $round: [
              { $multiply: [{ $divide: ['$usersWithMultipleDealerships', '$totalUsers'] }, 100] },
              1
            ]
          }
        }
      }
    ]);

    // 3. Detailed user dealership assignments
    const detailedAssignments = await User.aggregate([
      { $match: userQuery },
      { $unwind: { path: '$dealership_ids', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'dealerships',
          localField: 'dealership_ids',
          foreignField: '_id',
          as: 'dealershipInfo'
        }
      },
      { $unwind: { path: '$dealershipInfo', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$_id',
          username: { $first: '$username' },
          first_name: { $first: '$first_name' },
          last_name: { $first: '$last_name' },
          email: { $first: '$email' },
          role: { $first: '$role' },
          is_primary_admin: { $first: '$is_primary_admin' },
          is_active: { $first: '$is_active' },
          dealerships: {
            $push: {
              $cond: [
                { $ne: ['$dealershipInfo', null] },
                {
                  id: '$dealershipInfo._id',
                  name: '$dealershipInfo.name',
                  status: '$dealershipInfo.status'
                },
                null
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          username: 1,
          fullName: { $concat: ['$first_name', ' ', '$last_name'] },
          email: 1,
          role: 1,
          is_primary_admin: 1,
          is_active: 1,
          dealerships: {
            $filter: {
              input: '$dealerships',
              as: 'dealership',
              cond: { $ne: ['$$dealership', null] }
            }
          },
          dealershipCount: {
            $size: {
              $filter: {
                input: '$dealerships',
                as: 'dealership',
                cond: { $ne: ['$$dealership', null] }
              }
            }
          }
        }
      },
      {
        $sort: { dealershipCount: -1, username: 1 }
      }
    ]);

    // 4. Dealership coverage analysis
    const dealershipCoverage = await User.aggregate([
      { $match: userQuery },
      { $unwind: { path: '$dealership_ids', preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: '$dealership_ids',
          userCount: { $sum: 1 },
          roles: { $addToSet: '$role' },
          primaryAdminCount: {
            $sum: { $cond: [{ $eq: ['$is_primary_admin', true] }, 1, 0] }
          },
          activeUserCount: {
            $sum: { $cond: [{ $eq: ['$is_active', true] }, 1, 0] }
          }
        }
      },
      {
        $lookup: {
          from: 'dealerships',
          localField: '_id',
          foreignField: '_id',
          as: 'dealershipInfo'
        }
      },
      { $unwind: { path: '$dealershipInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          dealershipName: '$dealershipInfo.name',
          dealershipStatus: '$dealershipInfo.status',
          userCount: 1,
          activeUserCount: 1,
          primaryAdminCount: 1,
          roleCount: { $size: '$roles' },
          roles: 1
        }
      },
      {
        $sort: { userCount: -1 }
      }
    ]);

    // 5. Primary admin analysis
    const primaryAdminAnalysis = await User.aggregate([
      {
        $match: {
          company_id,
          is_primary_admin: true
        }
      },
      {
        $project: {
          username: 1,
          first_name: 1,
          last_name: 1,
          email: 1,
          role: 1,
          is_active: 1,
          dealershipCount: { $size: { $ifNull: ['$dealership_ids', []] } },
          last_login: 1
        }
      }
    ]);

    // 6. Assignment statistics
    const assignmentStats = await User.aggregate([
      { $match: userQuery },
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          usersWithAssignments: {
            $sum: {
              $cond: [
                { $gt: [{ $size: { $ifNull: ['$dealership_ids', []] } }, 0] },
                1,
                0
              ]
            }
          },
          usersWithoutAssignments: {
            $sum: {
              $cond: [
                { $eq: [{ $size: { $ifNull: ['$dealership_ids', []] } }, 0] },
                1,
                0
              ]
            }
          },
          totalAssignments: {
            $sum: { $size: { $ifNull: ['$dealership_ids', []] } }
          },
          primaryAdmins: {
            $sum: { $cond: [{ $eq: ['$is_primary_admin', true] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalUsers: 1,
          usersWithAssignments: 1,
          usersWithoutAssignments: 1,
          totalAssignments: 1,
          primaryAdmins: 1,
          avgAssignmentsPerUser: {
            $round: [
              { $divide: ['$totalAssignments', '$totalUsers'] },
              2
            ]
          },
          assignmentRate: {
            $round: [
              { $multiply: [{ $divide: ['$usersWithAssignments', '$totalUsers'] }, 100] },
              1
            ]
          }
        }
      }
    ]);

    res.json(formatReportResponse({
      usersByDealershipCount,
      assignmentByRole,
      detailedAssignments,
      dealershipCoverage,
      primaryAdminAnalysis,
      assignmentStats: assignmentStats[0] || {}
    }, {
      reportType: 'user-dealership-assignment',
      filters: {
        dealership: dealershipFilter
      }
    }));

  } catch (error) {
    return handleReportError(error, res, 'User Dealership Assignment');
  }
};

/**
 * Get User Permission Utilization
 * Analyzes permission and module access usage patterns
 * 
 * @route GET /api/company/reports/user/permission-utilization
 * @access Private (company_super_admin, company_admin)
 */
const getUserPermissionUtilization = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);

    // Get users based on dealership filter
    let userQuery = { company_id };
    
    if (dealershipFilter.dealership_id) {
      userQuery.dealership_ids = dealershipFilter.dealership_id;
    }

    // 1. Permission distribution analysis
    const permissionDistribution = await User.aggregate([
      { $match: userQuery },
      {
        $project: {
          username: 1,
          role: 1,
          permissionCount: { $size: { $ifNull: ['$permissions', []] } },
          moduleAccessCount: { $size: { $ifNull: ['$module_access', []] } },
          hasGroupPermissions: { $ne: ['$group_permissions', null] }
        }
      },
      {
        $bucket: {
          groupBy: '$permissionCount',
          boundaries: [0, 1, 5, 10, 20, 50, 1000],
          default: '50+',
          output: {
            count: { $sum: 1 },
            avgModuleAccess: { $avg: '$moduleAccessCount' },
            usersWithGroupPermissions: {
              $sum: { $cond: ['$hasGroupPermissions', 1, 0] }
            }
          }
        }
      }
    ]);

    // 2. Most common permissions
    const commonPermissions = await User.aggregate([
      { $match: userQuery },
      { $unwind: { path: '$permissions', preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: '$permissions',
          userCount: { $sum: 1 },
          roles: { $addToSet: '$role' }
        }
      },
      {
        $project: {
          _id: 1,
          permission: '$_id',
          userCount: 1,
          roleCount: { $size: '$roles' },
          roles: 1
        }
      },
      {
        $sort: { userCount: -1 }
      },
      {
        $limit: 20
      }
    ]);

    // 3. Most common module access
    const commonModuleAccess = await User.aggregate([
      { $match: userQuery },
      { $unwind: { path: '$module_access', preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: '$module_access',
          userCount: { $sum: 1 },
          roles: { $addToSet: '$role' }
        }
      },
      {
        $project: {
          _id: 1,
          module: '$_id',
          userCount: 1,
          roleCount: { $size: '$roles' },
          roles: 1
        }
      },
      {
        $sort: { userCount: -1 }
      },
      {
        $limit: 20
      }
    ]);

    // 4. Permission by role analysis
    const permissionByRole = await User.aggregate([
      { $match: userQuery },
      {
        $group: {
          _id: '$role',
          totalUsers: { $sum: 1 },
          avgPermissions: {
            $avg: { $size: { $ifNull: ['$permissions', []] } }
          },
          avgModuleAccess: {
            $avg: { $size: { $ifNull: ['$module_access', []] } }
          },
          maxPermissions: {
            $max: { $size: { $ifNull: ['$permissions', []] } }
          },
          minPermissions: {
            $min: { $size: { $ifNull: ['$permissions', []] } }
          },
          usersWithNoPermissions: {
            $sum: {
              $cond: [
                { $eq: [{ $size: { $ifNull: ['$permissions', []] } }, 0] },
                1,
                0
              ]
            }
          },
          usersWithGroupPermissions: {
            $sum: { $cond: [{ $ne: ['$group_permissions', null] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          _id: 1,
          totalUsers: 1,
          avgPermissions: { $round: ['$avgPermissions', 1] },
          avgModuleAccess: { $round: ['$avgModuleAccess', 1] },
          maxPermissions: 1,
          minPermissions: 1,
          usersWithNoPermissions: 1,
          usersWithGroupPermissions: 1,
          groupPermissionRate: {
            $round: [
              { $multiply: [{ $divide: ['$usersWithGroupPermissions', '$totalUsers'] }, 100] },
              1
            ]
          }
        }
      }
    ]);

    // 5. Group permission usage
    const groupPermissionUsage = await User.aggregate([
      {
        $match: {
          ...userQuery,
          group_permissions: { $ne: null }
        }
      },
      {
        $lookup: {
          from: 'grouppermissions',
          localField: 'group_permissions',
          foreignField: '_id',
          as: 'groupPermissionInfo'
        }
      },
      { $unwind: { path: '$groupPermissionInfo', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$group_permissions',
          groupName: { $first: '$groupPermissionInfo.name' },
          userCount: { $sum: 1 },
          roles: { $addToSet: '$role' },
          users: {
            $push: {
              username: '$username',
              fullName: { $concat: ['$first_name', ' ', '$last_name'] },
              role: '$role'
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          groupName: 1,
          userCount: 1,
          roleCount: { $size: '$roles' },
          roles: 1,
          users: 1
        }
      },
      {
        $sort: { userCount: -1 }
      }
    ]);

    // 6. Detailed user permission profiles
    const userPermissionProfiles = await User.aggregate([
      { $match: userQuery },
      {
        $lookup: {
          from: 'grouppermissions',
          localField: 'group_permissions',
          foreignField: '_id',
          as: 'groupPermissionInfo'
        }
      },
      { $unwind: { path: '$groupPermissionInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          username: 1,
          fullName: { $concat: ['$first_name', ' ', '$last_name'] },
          email: 1,
          role: 1,
          is_active: 1,
          permissionCount: { $size: { $ifNull: ['$permissions', []] } },
          moduleAccessCount: { $size: { $ifNull: ['$module_access', []] } },
          permissions: 1,
          module_access: 1,
          groupPermissionName: '$groupPermissionInfo.name',
          hasGroupPermissions: { $ne: ['$group_permissions', null] }
        }
      },
      {
        $sort: { permissionCount: -1 }
      }
    ]);

    // 7. Permission coverage statistics
    const permissionStats = await User.aggregate([
      { $match: userQuery },
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          usersWithPermissions: {
            $sum: {
              $cond: [
                { $gt: [{ $size: { $ifNull: ['$permissions', []] } }, 0] },
                1,
                0
              ]
            }
          },
          usersWithModuleAccess: {
            $sum: {
              $cond: [
                { $gt: [{ $size: { $ifNull: ['$module_access', []] } }, 0] },
                1,
                0
              ]
            }
          },
          usersWithGroupPermissions: {
            $sum: { $cond: [{ $ne: ['$group_permissions', null] }, 1, 0] }
          },
          totalPermissions: {
            $sum: { $size: { $ifNull: ['$permissions', []] } }
          },
          totalModuleAccess: {
            $sum: { $size: { $ifNull: ['$module_access', []] } }
          },
          uniquePermissions: { $addToSet: '$permissions' },
          uniqueModuleAccess: { $addToSet: '$module_access' }
        }
      },
      {
        $project: {
          _id: 0,
          totalUsers: 1,
          usersWithPermissions: 1,
          usersWithModuleAccess: 1,
          usersWithGroupPermissions: 1,
          totalPermissions: 1,
          totalModuleAccess: 1,
          avgPermissionsPerUser: {
            $round: [
              { $divide: ['$totalPermissions', '$totalUsers'] },
              1
            ]
          },
          avgModuleAccessPerUser: {
            $round: [
              { $divide: ['$totalModuleAccess', '$totalUsers'] },
              1
            ]
          },
          permissionCoverage: {
            $round: [
              { $multiply: [{ $divide: ['$usersWithPermissions', '$totalUsers'] }, 100] },
              1
            ]
          },
          moduleAccessCoverage: {
            $round: [
              { $multiply: [{ $divide: ['$usersWithModuleAccess', '$totalUsers'] }, 100] },
              1
            ]
          },
          groupPermissionUsage: {
            $round: [
              { $multiply: [{ $divide: ['$usersWithGroupPermissions', '$totalUsers'] }, 100] },
              1
            ]
          }
        }
      }
    ]);

    res.json(formatReportResponse({
      permissionDistribution,
      commonPermissions,
      commonModuleAccess,
      permissionByRole,
      groupPermissionUsage,
      userPermissionProfiles,
      permissionStats: permissionStats[0] || {}
    }, {
      reportType: 'user-permission-utilization',
      filters: {
        dealership: dealershipFilter
      }
    }));

  } catch (error) {
    return handleReportError(error, res, 'User Permission Utilization');
  }
};

module.exports = {
  getUserPerformanceMetrics,
  getUserLoginPatterns,
  getUserRoleDistribution,
  getUserDealershipAssignment,
  getUserPermissionUtilization
};
