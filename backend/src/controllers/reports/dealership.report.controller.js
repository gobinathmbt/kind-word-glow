/**
 * Dealership Report Controller
 * Handles all dealership-related analytics and reporting endpoints
 * Provides comprehensive dealership performance metrics across all business operations
 */

const Dealership = require('../../models/Dealership');
const Vehicle = require('../../models/Vehicle');
const MasterVehicle = require('../../models/MasterVehicle');
const AdvertiseVehicle = require('../../models/AdvertiseVehicle');
const WorkshopQuote = require('../../models/WorkshopQuote');
const WorkshopReport = require('../../models/WorkshopReport');
const User = require('../../models/User');
const ServiceBay = require('../../models/ServiceBay');
const { 
  getDealershipFilter, 
  getDateFilter, 
  formatReportResponse, 
  handleReportError,
  buildBasePipeline 
} = require('../../utils/reportHelpers');

/**
 * Get Dealership Overview
 * Provides summary metrics per dealership including vehicle counts, workshop stats, and user activity
 * 
 * @route GET /api/company/reports/dealership/overview
 * @access Private (company_super_admin, company_admin)
 */
const getDealershipOverview = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    // Base match criteria
    const baseMatch = {
      company_id,
      ...dealershipFilter
    };

    // 1. Get all dealerships with basic info
    const dealerships = await Dealership.find(baseMatch)
      .select('_id name address phone email status')
      .lean();

    const dealershipIds = dealerships.map(d => d._id);

    // 2. Vehicle counts per dealership
    const vehicleCounts = await Vehicle.aggregate([
      { 
        $match: { 
          company_id,
          dealership_id: { $in: dealershipIds },
          ...dateFilter
        } 
      },
      {
        $group: {
          _id: '$dealership_id',
          totalVehicles: { $sum: 1 },
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
          }
        }
      }
    ]);

    // 3. Workshop quote counts per dealership
    const workshopQuoteCounts = await WorkshopQuote.aggregate([
      {
        $lookup: {
          from: 'vehicles',
          localField: 'vehicle',
          foreignField: '_id',
          as: 'vehicleData'
        }
      },
      { $unwind: { path: '$vehicleData', preserveNullAndEmptyArrays: true } },
      {
        $match: {
          'vehicleData.company_id': company_id,
          'vehicleData.dealership_id': { $in: dealershipIds },
          ...dateFilter
        }
      },
      {
        $group: {
          _id: '$vehicleData.dealership_id',
          totalQuotes: { $sum: 1 },
          completedQuotes: {
            $sum: { $cond: [{ $eq: ['$status', 'completed_jobs'] }, 1, 0] }
          },
          inProgressQuotes: {
            $sum: { $cond: [{ $eq: ['$status', 'work_in_progress'] }, 1, 0] }
          },
          totalQuoteValue: { $sum: '$quote_amount' }
        }
      }
    ]);

    // 4. Workshop report counts per dealership
    const workshopReportCounts = await WorkshopReport.aggregate([
      {
        $lookup: {
          from: 'vehicles',
          localField: 'vehicle',
          foreignField: '_id',
          as: 'vehicleData'
        }
      },
      { $unwind: { path: '$vehicleData', preserveNullAndEmptyArrays: true } },
      {
        $match: {
          'vehicleData.company_id': company_id,
          'vehicleData.dealership_id': { $in: dealershipIds },
          ...dateFilter
        }
      },
      {
        $group: {
          _id: '$vehicleData.dealership_id',
          totalReports: { $sum: 1 },
          totalPartsCost: { $sum: '$parts_cost' },
          totalLaborCost: { $sum: '$labor_cost' },
          totalGST: { $sum: '$gst' },
          totalRevenue: { $sum: '$final_price' }
        }
      }
    ]);

    // 5. User counts per dealership
    const userCounts = await User.aggregate([
      {
        $match: {
          company_id,
          dealership_ids: { $in: dealershipIds }
        }
      },
      { $unwind: '$dealership_ids' },
      {
        $match: {
          dealership_ids: { $in: dealershipIds }
        }
      },
      {
        $group: {
          _id: '$dealership_ids',
          totalUsers: { $sum: 1 },
          activeUsers: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          }
        }
      }
    ]);

    // 6. Service bay counts per dealership
    const serviceBayCounts = await ServiceBay.aggregate([
      {
        $match: {
          company_id,
          dealership_id: { $in: dealershipIds }
        }
      },
      {
        $group: {
          _id: '$dealership_id',
          totalBays: { $sum: 1 },
          activeBays: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          }
        }
      }
    ]);

    // Combine all data
    const dealershipOverview = dealerships.map(dealership => {
      const vehicleData = vehicleCounts.find(v => v._id?.toString() === dealership._id.toString()) || {};
      const quoteData = workshopQuoteCounts.find(q => q._id?.toString() === dealership._id.toString()) || {};
      const reportData = workshopReportCounts.find(r => r._id?.toString() === dealership._id.toString()) || {};
      const userData = userCounts.find(u => u._id?.toString() === dealership._id.toString()) || {};
      const bayData = serviceBayCounts.find(b => b._id?.toString() === dealership._id.toString()) || {};

      return {
        dealershipId: dealership._id,
        dealershipName: dealership.name,
        address: dealership.address,
        phone: dealership.phone,
        email: dealership.email,
        status: dealership.status,
        vehicles: {
          total: vehicleData.totalVehicles || 0,
          inspection: vehicleData.inspectionVehicles || 0,
          tradein: vehicleData.tradeinVehicles || 0,
          master: vehicleData.masterVehicles || 0,
          advertisement: vehicleData.advertisementVehicles || 0
        },
        workshop: {
          totalQuotes: quoteData.totalQuotes || 0,
          completedQuotes: quoteData.completedQuotes || 0,
          inProgressQuotes: quoteData.inProgressQuotes || 0,
          totalQuoteValue: quoteData.totalQuoteValue || 0,
          totalReports: reportData.totalReports || 0,
          totalPartsCost: reportData.totalPartsCost || 0,
          totalLaborCost: reportData.totalLaborCost || 0,
          totalGST: reportData.totalGST || 0,
          totalRevenue: reportData.totalRevenue || 0
        },
        users: {
          total: userData.totalUsers || 0,
          active: userData.activeUsers || 0
        },
        serviceBays: {
          total: bayData.totalBays || 0,
          active: bayData.activeBays || 0
        }
      };
    });

    res.json(formatReportResponse(dealershipOverview, {
      reportType: 'dealership-overview',
      filters: {
        dealership: dealershipFilter,
        dateRange: dateFilter
      }
    }));

  } catch (error) {
    return handleReportError(error, res, 'Dealership Overview');
  }
};

/**
 * Get Dealership Vehicle Distribution
 * Analyzes vehicles across all schemas by dealership
 * 
 * @route GET /api/company/reports/dealership/vehicle-distribution
 * @access Private (company_super_admin, company_admin)
 */
const getDealershipVehicleDistribution = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    const baseMatch = {
      company_id,
      ...dealershipFilter
    };

    // Get dealerships
    const dealerships = await Dealership.find(baseMatch).select('_id name').lean();
    const dealershipIds = dealerships.map(d => d._id);

    // 1. Vehicle schema distribution
    const vehicleDistribution = await Vehicle.aggregate([
      {
        $match: {
          company_id,
          dealership_id: { $in: dealershipIds },
          ...dateFilter
        }
      },
      {
        $group: {
          _id: {
            dealership: '$dealership_id',
            type: '$vehicle_type',
            status: '$status'
          },
          count: { $sum: 1 },
          avgRetailPrice: {
            $avg: { $arrayElemAt: ['$vehicle_other_details.retail_price', 0] }
          }
        }
      },
      {
        $group: {
          _id: '$_id.dealership',
          vehiclesByType: {
            $push: {
              type: '$_id.type',
              status: '$_id.status',
              count: '$count',
              avgRetailPrice: '$avgRetailPrice'
            }
          },
          totalVehicles: { $sum: '$count' }
        }
      }
    ]);

    // 2. MasterVehicle distribution
    const masterVehicleDistribution = await MasterVehicle.aggregate([
      {
        $match: {
          company_id,
          dealership_id: { $in: dealershipIds },
          ...dateFilter
        }
      },
      {
        $group: {
          _id: {
            dealership: '$dealership_id',
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.dealership',
          masterVehiclesByStatus: {
            $push: {
              status: '$_id.status',
              count: '$count'
            }
          },
          totalMasterVehicles: { $sum: '$count' }
        }
      }
    ]);

    // 3. AdvertiseVehicle distribution
    const advertiseVehicleDistribution = await AdvertiseVehicle.aggregate([
      {
        $match: {
          company_id,
          dealership_id: { $in: dealershipIds },
          ...dateFilter
        }
      },
      {
        $group: {
          _id: {
            dealership: '$dealership_id',
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.dealership',
          advertiseVehiclesByStatus: {
            $push: {
              status: '$_id.status',
              count: '$count'
            }
          },
          totalAdvertiseVehicles: { $sum: '$count' }
        }
      }
    ]);

    // 4. Vehicle age distribution by dealership
    const vehicleAgeDistribution = await Vehicle.aggregate([
      {
        $match: {
          company_id,
          dealership_id: { $in: dealershipIds },
          ...dateFilter
        }
      },
      {
        $project: {
          dealership_id: 1,
          vehicleAge: { $subtract: [new Date().getFullYear(), '$year'] }
        }
      },
      {
        $bucket: {
          groupBy: '$vehicleAge',
          boundaries: [0, 3, 5, 10, 15, 20, 50],
          default: '50+',
          output: {
            count: { $sum: 1 },
            dealerships: { $addToSet: '$dealership_id' }
          }
        }
      }
    ]);

    // Combine all data
    const distributionData = dealerships.map(dealership => {
      const vehicleData = vehicleDistribution.find(v => v._id?.toString() === dealership._id.toString()) || {};
      const masterData = masterVehicleDistribution.find(m => m._id?.toString() === dealership._id.toString()) || {};
      const advertiseData = advertiseVehicleDistribution.find(a => a._id?.toString() === dealership._id.toString()) || {};

      return {
        dealershipId: dealership._id,
        dealershipName: dealership.name,
        vehicles: {
          total: vehicleData.totalVehicles || 0,
          byType: vehicleData.vehiclesByType || []
        },
        masterVehicles: {
          total: masterData.totalMasterVehicles || 0,
          byStatus: masterData.masterVehiclesByStatus || []
        },
        advertiseVehicles: {
          total: advertiseData.totalAdvertiseVehicles || 0,
          byStatus: advertiseData.advertiseVehiclesByStatus || []
        },
        grandTotal: (vehicleData.totalVehicles || 0) + (masterData.totalMasterVehicles || 0) + (advertiseData.totalAdvertiseVehicles || 0)
      };
    });

    res.json(formatReportResponse({
      distributionByDealership: distributionData,
      vehicleAgeDistribution
    }, {
      reportType: 'dealership-vehicle-distribution',
      filters: {
        dealership: dealershipFilter,
        dateRange: dateFilter
      }
    }));

  } catch (error) {
    return handleReportError(error, res, 'Dealership Vehicle Distribution');
  }
};

/**
 * Get Dealership Workshop Performance
 * Analyzes workshop metrics by dealership including quotes, reports, and efficiency
 * 
 * @route GET /api/company/reports/dealership/workshop-performance
 * @access Private (company_super_admin, company_admin)
 */
const getDealershipWorkshopPerformance = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    const baseMatch = {
      company_id,
      ...dealershipFilter
    };

    // Get dealerships
    const dealerships = await Dealership.find(baseMatch).select('_id name').lean();
    const dealershipIds = dealerships.map(d => d._id);

    // 1. Workshop quote performance by dealership
    const quotePerformance = await WorkshopQuote.aggregate([
      {
        $lookup: {
          from: 'vehicles',
          localField: 'vehicle',
          foreignField: '_id',
          as: 'vehicleData'
        }
      },
      { $unwind: { path: '$vehicleData', preserveNullAndEmptyArrays: true } },
      {
        $match: {
          'vehicleData.company_id': company_id,
          'vehicleData.dealership_id': { $in: dealershipIds },
          ...dateFilter
        }
      },
      {
        $group: {
          _id: '$vehicleData.dealership_id',
          totalQuotes: { $sum: 1 },
          completedQuotes: {
            $sum: { $cond: [{ $eq: ['$status', 'completed_jobs'] }, 1, 0] }
          },
          inProgressQuotes: {
            $sum: { $cond: [{ $eq: ['$status', 'work_in_progress'] }, 1, 0] }
          },
          pendingQuotes: {
            $sum: {
              $cond: [
                { $in: ['$status', ['quote_request', 'quote_sent']] },
                1,
                0
              ]
            }
          },
          supplierQuotes: {
            $sum: { $cond: [{ $eq: ['$quote_type', 'supplier'] }, 1, 0] }
          },
          bayQuotes: {
            $sum: { $cond: [{ $eq: ['$quote_type', 'bay'] }, 1, 0] }
          },
          manualQuotes: {
            $sum: { $cond: [{ $eq: ['$quote_type', 'manual'] }, 1, 0] }
          },
          totalQuoteValue: { $sum: '$quote_amount' },
          avgQuoteAmount: { $avg: '$quote_amount' },
          avgCompletionTime: {
            $avg: {
              $cond: [
                { $and: ['$work_completed_at', '$created_at'] },
                { $divide: [{ $subtract: ['$work_completed_at', '$created_at'] }, 86400000] },
                null
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          totalQuotes: 1,
          completedQuotes: 1,
          inProgressQuotes: 1,
          pendingQuotes: 1,
          supplierQuotes: 1,
          bayQuotes: 1,
          manualQuotes: 1,
          totalQuoteValue: 1,
          avgQuoteAmount: 1,
          avgCompletionTime: { $round: ['$avgCompletionTime', 1] },
          completionRate: {
            $round: [
              { $multiply: [{ $divide: ['$completedQuotes', '$totalQuotes'] }, 100] },
              1
            ]
          }
        }
      }
    ]);

    // 2. Workshop report performance by dealership
    const reportPerformance = await WorkshopReport.aggregate([
      {
        $lookup: {
          from: 'vehicles',
          localField: 'vehicle',
          foreignField: '_id',
          as: 'vehicleData'
        }
      },
      { $unwind: { path: '$vehicleData', preserveNullAndEmptyArrays: true } },
      {
        $match: {
          'vehicleData.company_id': company_id,
          'vehicleData.dealership_id': { $in: dealershipIds },
          ...dateFilter
        }
      },
      {
        $group: {
          _id: '$vehicleData.dealership_id',
          totalReports: { $sum: 1 },
          totalPartsCost: { $sum: '$parts_cost' },
          totalLaborCost: { $sum: '$labor_cost' },
          totalGST: { $sum: '$gst' },
          totalRevenue: { $sum: '$final_price' },
          avgPartsCost: { $avg: '$parts_cost' },
          avgLaborCost: { $avg: '$labor_cost' },
          avgRevenue: { $avg: '$final_price' },
          qualityChecksPassed: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$quality_checks.visual_check', true] },
                    { $eq: ['$quality_checks.functional_check', true] },
                    { $eq: ['$quality_checks.road_test', true] },
                    { $eq: ['$quality_checks.safety_check', true] }
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
          totalReports: 1,
          totalPartsCost: 1,
          totalLaborCost: 1,
          totalGST: 1,
          totalRevenue: 1,
          avgPartsCost: 1,
          avgLaborCost: 1,
          avgRevenue: 1,
          qualityChecksPassed: 1,
          totalCost: { $add: ['$totalPartsCost', '$totalLaborCost', '$totalGST'] },
          profitMargin: {
            $round: [
              {
                $multiply: [
                  {
                    $divide: [
                      { $subtract: ['$totalRevenue', { $add: ['$totalPartsCost', '$totalLaborCost', '$totalGST'] }] },
                      '$totalRevenue'
                    ]
                  },
                  100
                ]
              },
              1
            ]
          },
          qualityPassRate: {
            $round: [
              { $multiply: [{ $divide: ['$qualityChecksPassed', '$totalReports'] }, 100] },
              1
            ]
          }
        }
      }
    ]);

    // 3. Workshop efficiency metrics
    const efficiencyMetrics = await WorkshopQuote.aggregate([
      {
        $lookup: {
          from: 'vehicles',
          localField: 'vehicle',
          foreignField: '_id',
          as: 'vehicleData'
        }
      },
      { $unwind: { path: '$vehicleData', preserveNullAndEmptyArrays: true } },
      {
        $match: {
          'vehicleData.company_id': company_id,
          'vehicleData.dealership_id': { $in: dealershipIds },
          status: 'completed_jobs',
          ...dateFilter
        }
      },
      {
        $project: {
          dealership_id: '$vehicleData.dealership_id',
          quote_amount: 1,
          final_price: '$comment_sheet.final_price',
          variance: {
            $subtract: ['$comment_sheet.final_price', '$quote_amount']
          },
          variancePercentage: {
            $multiply: [
              {
                $divide: [
                  { $subtract: ['$comment_sheet.final_price', '$quote_amount'] },
                  '$quote_amount'
                ]
              },
              100
            ]
          }
        }
      },
      {
        $group: {
          _id: '$dealership_id',
          totalCompletedJobs: { $sum: 1 },
          avgQuoteAccuracy: {
            $avg: {
              $abs: '$variancePercentage'
            }
          },
          onBudgetJobs: {
            $sum: {
              $cond: [
                { $and: [{ $gte: ['$variancePercentage', -5] }, { $lte: ['$variancePercentage', 5] }] },
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
          totalCompletedJobs: 1,
          avgQuoteAccuracy: { $round: ['$avgQuoteAccuracy', 1] },
          onBudgetRate: {
            $round: [
              { $multiply: [{ $divide: ['$onBudgetJobs', '$totalCompletedJobs'] }, 100] },
              1
            ]
          }
        }
      }
    ]);

    // Combine all data
    const workshopPerformance = dealerships.map(dealership => {
      const quoteData = quotePerformance.find(q => q._id?.toString() === dealership._id.toString()) || {};
      const reportData = reportPerformance.find(r => r._id?.toString() === dealership._id.toString()) || {};
      const efficiencyData = efficiencyMetrics.find(e => e._id?.toString() === dealership._id.toString()) || {};

      return {
        dealershipId: dealership._id,
        dealershipName: dealership.name,
        quotes: {
          total: quoteData.totalQuotes || 0,
          completed: quoteData.completedQuotes || 0,
          inProgress: quoteData.inProgressQuotes || 0,
          pending: quoteData.pendingQuotes || 0,
          byType: {
            supplier: quoteData.supplierQuotes || 0,
            bay: quoteData.bayQuotes || 0,
            manual: quoteData.manualQuotes || 0
          },
          totalValue: quoteData.totalQuoteValue || 0,
          avgAmount: quoteData.avgQuoteAmount || 0,
          avgCompletionTime: quoteData.avgCompletionTime || 0,
          completionRate: quoteData.completionRate || 0
        },
        reports: {
          total: reportData.totalReports || 0,
          totalPartsCost: reportData.totalPartsCost || 0,
          totalLaborCost: reportData.totalLaborCost || 0,
          totalGST: reportData.totalGST || 0,
          totalCost: reportData.totalCost || 0,
          totalRevenue: reportData.totalRevenue || 0,
          avgPartsCost: reportData.avgPartsCost || 0,
          avgLaborCost: reportData.avgLaborCost || 0,
          avgRevenue: reportData.avgRevenue || 0,
          profitMargin: reportData.profitMargin || 0,
          qualityPassRate: reportData.qualityPassRate || 0
        },
        efficiency: {
          completedJobs: efficiencyData.totalCompletedJobs || 0,
          avgQuoteAccuracy: efficiencyData.avgQuoteAccuracy || 0,
          onBudgetRate: efficiencyData.onBudgetRate || 0
        }
      };
    });

    res.json(formatReportResponse(workshopPerformance, {
      reportType: 'dealership-workshop-performance',
      filters: {
        dealership: dealershipFilter,
        dateRange: dateFilter
      }
    }));

  } catch (error) {
    return handleReportError(error, res, 'Dealership Workshop Performance');
  }
};

/**
 * Get Dealership User Activity
 * Analyzes user productivity by dealership
 * 
 * @route GET /api/company/reports/dealership/user-activity
 * @access Private (company_super_admin, company_admin)
 */
const getDealershipUserActivity = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    const baseMatch = {
      company_id,
      ...dealershipFilter
    };

    // Get dealerships
    const dealerships = await Dealership.find(baseMatch).select('_id name').lean();
    const dealershipIds = dealerships.map(d => d._id);

    // 1. User counts and status by dealership
    const userActivity = await User.aggregate([
      {
        $match: {
          company_id,
          dealership_ids: { $in: dealershipIds }
        }
      },
      { $unwind: '$dealership_ids' },
      {
        $match: {
          dealership_ids: { $in: dealershipIds }
        }
      },
      {
        $group: {
          _id: {
            dealership: '$dealership_ids',
            role: '$role',
            status: '$status'
          },
          count: { $sum: 1 },
          lastLoginDates: { $push: '$last_login' }
        }
      },
      {
        $group: {
          _id: '$_id.dealership',
          totalUsers: { $sum: '$count' },
          usersByRole: {
            $push: {
              role: '$_id.role',
              status: '$_id.status',
              count: '$count'
            }
          },
          activeUsers: {
            $sum: {
              $cond: [{ $eq: ['$_id.status', 'active'] }, '$count', 0]
            }
          },
          inactiveUsers: {
            $sum: {
              $cond: [{ $eq: ['$_id.status', 'inactive'] }, '$count', 0]
            }
          }
        }
      }
    ]);

    // 2. Vehicle creation activity by dealership users
    const vehicleCreationActivity = await Vehicle.aggregate([
      {
        $match: {
          company_id,
          dealership_id: { $in: dealershipIds },
          ...dateFilter
        }
      },
      {
        $group: {
          _id: {
            dealership: '$dealership_id',
            createdBy: '$created_by'
          },
          vehiclesCreated: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.dealership',
          totalVehiclesCreated: { $sum: '$vehiclesCreated' },
          activeCreators: { $sum: 1 },
          avgVehiclesPerUser: { $avg: '$vehiclesCreated' }
        }
      },
      {
        $project: {
          _id: 1,
          totalVehiclesCreated: 1,
          activeCreators: 1,
          avgVehiclesPerUser: { $round: ['$avgVehiclesPerUser', 1] }
        }
      }
    ]);

    // 3. Workshop quote activity by dealership users
    const quoteActivity = await WorkshopQuote.aggregate([
      {
        $lookup: {
          from: 'vehicles',
          localField: 'vehicle',
          foreignField: '_id',
          as: 'vehicleData'
        }
      },
      { $unwind: { path: '$vehicleData', preserveNullAndEmptyArrays: true } },
      {
        $match: {
          'vehicleData.company_id': company_id,
          'vehicleData.dealership_id': { $in: dealershipIds },
          ...dateFilter
        }
      },
      {
        $group: {
          _id: {
            dealership: '$vehicleData.dealership_id',
            createdBy: '$created_by'
          },
          quotesCreated: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.dealership',
          totalQuotesCreated: { $sum: '$quotesCreated' },
          activeQuoteCreators: { $sum: 1 },
          avgQuotesPerUser: { $avg: '$quotesCreated' }
        }
      },
      {
        $project: {
          _id: 1,
          totalQuotesCreated: 1,
          activeQuoteCreators: 1,
          avgQuotesPerUser: { $round: ['$avgQuotesPerUser', 1] }
        }
      }
    ]);

    // 4. User login patterns by dealership
    const loginPatterns = await User.aggregate([
      {
        $match: {
          company_id,
          dealership_ids: { $in: dealershipIds },
          last_login: { $exists: true, $ne: null }
        }
      },
      { $unwind: '$dealership_ids' },
      {
        $match: {
          dealership_ids: { $in: dealershipIds }
        }
      },
      {
        $project: {
          dealership_id: '$dealership_ids',
          daysSinceLastLogin: {
            $divide: [
              { $subtract: [new Date(), '$last_login'] },
              86400000
            ]
          }
        }
      },
      {
        $group: {
          _id: '$dealership_id',
          totalUsersWithLogin: { $sum: 1 },
          avgDaysSinceLastLogin: { $avg: '$daysSinceLastLogin' },
          recentlyActiveUsers: {
            $sum: {
              $cond: [{ $lte: ['$daysSinceLastLogin', 7] }, 1, 0]
            }
          },
          inactiveUsers: {
            $sum: {
              $cond: [{ $gt: ['$daysSinceLastLogin', 30] }, 1, 0]
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          totalUsersWithLogin: 1,
          avgDaysSinceLastLogin: { $round: ['$avgDaysSinceLastLogin', 1] },
          recentlyActiveUsers: 1,
          inactiveUsers: 1,
          activityRate: {
            $round: [
              { $multiply: [{ $divide: ['$recentlyActiveUsers', '$totalUsersWithLogin'] }, 100] },
              1
            ]
          }
        }
      }
    ]);

    // 5. Role distribution by dealership
    const roleDistribution = await User.aggregate([
      {
        $match: {
          company_id,
          dealership_ids: { $in: dealershipIds }
        }
      },
      { $unwind: '$dealership_ids' },
      {
        $match: {
          dealership_ids: { $in: dealershipIds }
        }
      },
      {
        $group: {
          _id: {
            dealership: '$dealership_ids',
            role: '$role'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.dealership',
          roles: {
            $push: {
              role: '$_id.role',
              count: '$count'
            }
          }
        }
      }
    ]);

    // Combine all data
    const userActivityData = dealerships.map(dealership => {
      const userData = userActivity.find(u => u._id?.toString() === dealership._id.toString()) || {};
      const vehicleData = vehicleCreationActivity.find(v => v._id?.toString() === dealership._id.toString()) || {};
      const quoteData = quoteActivity.find(q => q._id?.toString() === dealership._id.toString()) || {};
      const loginData = loginPatterns.find(l => l._id?.toString() === dealership._id.toString()) || {};
      const roleData = roleDistribution.find(r => r._id?.toString() === dealership._id.toString()) || {};

      return {
        dealershipId: dealership._id,
        dealershipName: dealership.name,
        users: {
          total: userData.totalUsers || 0,
          active: userData.activeUsers || 0,
          inactive: userData.inactiveUsers || 0,
          byRole: userData.usersByRole || []
        },
        productivity: {
          vehiclesCreated: vehicleData.totalVehiclesCreated || 0,
          activeVehicleCreators: vehicleData.activeCreators || 0,
          avgVehiclesPerUser: vehicleData.avgVehiclesPerUser || 0,
          quotesCreated: quoteData.totalQuotesCreated || 0,
          activeQuoteCreators: quoteData.activeQuoteCreators || 0,
          avgQuotesPerUser: quoteData.avgQuotesPerUser || 0
        },
        loginActivity: {
          usersWithLogin: loginData.totalUsersWithLogin || 0,
          avgDaysSinceLastLogin: loginData.avgDaysSinceLastLogin || 0,
          recentlyActive: loginData.recentlyActiveUsers || 0,
          inactive: loginData.inactiveUsers || 0,
          activityRate: loginData.activityRate || 0
        },
        roleDistribution: roleData.roles || []
      };
    });

    res.json(formatReportResponse(userActivityData, {
      reportType: 'dealership-user-activity',
      filters: {
        dealership: dealershipFilter,
        dateRange: dateFilter
      }
    }));

  } catch (error) {
    return handleReportError(error, res, 'Dealership User Activity');
  }
};

/**
 * Get Dealership Revenue Comparison
 * Compares revenue across dealerships from vehicles and workshop operations
 * 
 * @route GET /api/company/reports/dealership/revenue-comparison
 * @access Private (company_super_admin, company_admin)
 */
const getDealershipRevenueComparison = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    const baseMatch = {
      company_id,
      ...dealershipFilter
    };

    // Get dealerships
    const dealerships = await Dealership.find(baseMatch).select('_id name').lean();
    const dealershipIds = dealerships.map(d => d._id);

    // 1. Vehicle revenue by dealership
    const vehicleRevenue = await Vehicle.aggregate([
      {
        $match: {
          company_id,
          dealership_id: { $in: dealershipIds },
          ...dateFilter
        }
      },
      { $unwind: { path: '$vehicle_other_details', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$dealership_id',
          totalVehicles: { $sum: 1 },
          soldVehicles: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ['$vehicle_other_details.sold_price', null] }, { $gt: ['$vehicle_other_details.sold_price', 0] }] },
                1,
                0
              ]
            }
          },
          totalPurchaseCost: { $sum: '$vehicle_other_details.purchase_price' },
          totalRetailValue: { $sum: '$vehicle_other_details.retail_price' },
          totalSoldRevenue: { $sum: '$vehicle_other_details.sold_price' },
          avgPurchasePrice: { $avg: '$vehicle_other_details.purchase_price' },
          avgRetailPrice: { $avg: '$vehicle_other_details.retail_price' },
          avgSoldPrice: { $avg: '$vehicle_other_details.sold_price' }
        }
      },
      {
        $project: {
          _id: 1,
          totalVehicles: 1,
          soldVehicles: 1,
          totalPurchaseCost: 1,
          totalRetailValue: 1,
          totalSoldRevenue: 1,
          avgPurchasePrice: 1,
          avgRetailPrice: 1,
          avgSoldPrice: 1,
          grossProfit: { $subtract: ['$totalSoldRevenue', '$totalPurchaseCost'] },
          profitMargin: {
            $round: [
              {
                $multiply: [
                  {
                    $divide: [
                      { $subtract: ['$totalSoldRevenue', '$totalPurchaseCost'] },
                      '$totalSoldRevenue'
                    ]
                  },
                  100
                ]
              },
              1
            ]
          },
          sellThroughRate: {
            $round: [
              { $multiply: [{ $divide: ['$soldVehicles', '$totalVehicles'] }, 100] },
              1
            ]
          }
        }
      }
    ]);

    // 2. Workshop revenue by dealership
    const workshopRevenue = await WorkshopReport.aggregate([
      {
        $lookup: {
          from: 'vehicles',
          localField: 'vehicle',
          foreignField: '_id',
          as: 'vehicleData'
        }
      },
      { $unwind: { path: '$vehicleData', preserveNullAndEmptyArrays: true } },
      {
        $match: {
          'vehicleData.company_id': company_id,
          'vehicleData.dealership_id': { $in: dealershipIds },
          ...dateFilter
        }
      },
      {
        $group: {
          _id: '$vehicleData.dealership_id',
          totalReports: { $sum: 1 },
          totalPartsCost: { $sum: '$parts_cost' },
          totalLaborCost: { $sum: '$labor_cost' },
          totalGST: { $sum: '$gst' },
          totalRevenue: { $sum: '$final_price' },
          avgRevenue: { $avg: '$final_price' }
        }
      },
      {
        $project: {
          _id: 1,
          totalReports: 1,
          totalPartsCost: 1,
          totalLaborCost: 1,
          totalGST: 1,
          totalRevenue: 1,
          avgRevenue: 1,
          totalCost: { $add: ['$totalPartsCost', '$totalLaborCost', '$totalGST'] },
          grossProfit: {
            $subtract: ['$totalRevenue', { $add: ['$totalPartsCost', '$totalLaborCost', '$totalGST'] }]
          },
          profitMargin: {
            $round: [
              {
                $multiply: [
                  {
                    $divide: [
                      { $subtract: ['$totalRevenue', { $add: ['$totalPartsCost', '$totalLaborCost', '$totalGST'] }] },
                      '$totalRevenue'
                    ]
                  },
                  100
                ]
              },
              1
            ]
          }
        }
      }
    ]);

    // 3. Monthly revenue trends by dealership
    const monthlyTrends = await Vehicle.aggregate([
      {
        $match: {
          company_id,
          dealership_id: { $in: dealershipIds },
          ...dateFilter
        }
      },
      { $unwind: { path: '$vehicle_other_details', preserveNullAndEmptyArrays: true } },
      {
        $match: {
          'vehicle_other_details.sold_price': { $exists: true, $gt: 0 }
        }
      },
      {
        $group: {
          _id: {
            dealership: '$dealership_id',
            year: { $year: '$created_at' },
            month: { $month: '$created_at' }
          },
          revenue: { $sum: '$vehicle_other_details.sold_price' },
          vehiclesSold: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.dealership',
          monthlyData: {
            $push: {
              year: '$_id.year',
              month: '$_id.month',
              revenue: '$revenue',
              vehiclesSold: '$vehiclesSold'
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          monthlyData: {
            $sortArray: {
              input: '$monthlyData',
              sortBy: { year: 1, month: 1 }
            }
          }
        }
      }
    ]);

    // 4. Revenue by vehicle type and dealership
    const revenueByType = await Vehicle.aggregate([
      {
        $match: {
          company_id,
          dealership_id: { $in: dealershipIds },
          ...dateFilter
        }
      },
      { $unwind: { path: '$vehicle_other_details', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: {
            dealership: '$dealership_id',
            type: '$vehicle_type'
          },
          count: { $sum: 1 },
          totalRevenue: { $sum: '$vehicle_other_details.sold_price' },
          avgRevenue: { $avg: '$vehicle_other_details.sold_price' }
        }
      },
      {
        $group: {
          _id: '$_id.dealership',
          revenueByType: {
            $push: {
              type: '$_id.type',
              count: '$count',
              totalRevenue: '$totalRevenue',
              avgRevenue: '$avgRevenue'
            }
          }
        }
      }
    ]);

    // 5. Combined revenue summary
    const combinedRevenue = dealerships.map(dealership => {
      const vehicleData = vehicleRevenue.find(v => v._id?.toString() === dealership._id.toString()) || {};
      const workshopData = workshopRevenue.find(w => w._id?.toString() === dealership._id.toString()) || {};
      const trendsData = monthlyTrends.find(t => t._id?.toString() === dealership._id.toString()) || {};
      const typeData = revenueByType.find(r => r._id?.toString() === dealership._id.toString()) || {};

      const totalRevenue = (vehicleData.totalSoldRevenue || 0) + (workshopData.totalRevenue || 0);
      const totalCost = (vehicleData.totalPurchaseCost || 0) + (workshopData.totalCost || 0);
      const totalProfit = totalRevenue - totalCost;

      return {
        dealershipId: dealership._id,
        dealershipName: dealership.name,
        vehicleRevenue: {
          totalVehicles: vehicleData.totalVehicles || 0,
          soldVehicles: vehicleData.soldVehicles || 0,
          totalPurchaseCost: vehicleData.totalPurchaseCost || 0,
          totalRetailValue: vehicleData.totalRetailValue || 0,
          totalRevenue: vehicleData.totalSoldRevenue || 0,
          avgPurchasePrice: vehicleData.avgPurchasePrice || 0,
          avgRetailPrice: vehicleData.avgRetailPrice || 0,
          avgSoldPrice: vehicleData.avgSoldPrice || 0,
          grossProfit: vehicleData.grossProfit || 0,
          profitMargin: vehicleData.profitMargin || 0,
          sellThroughRate: vehicleData.sellThroughRate || 0
        },
        workshopRevenue: {
          totalReports: workshopData.totalReports || 0,
          totalPartsCost: workshopData.totalPartsCost || 0,
          totalLaborCost: workshopData.totalLaborCost || 0,
          totalGST: workshopData.totalGST || 0,
          totalCost: workshopData.totalCost || 0,
          totalRevenue: workshopData.totalRevenue || 0,
          avgRevenue: workshopData.avgRevenue || 0,
          grossProfit: workshopData.grossProfit || 0,
          profitMargin: workshopData.profitMargin || 0
        },
        combinedMetrics: {
          totalRevenue,
          totalCost,
          totalProfit,
          overallProfitMargin: totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100 * 10) / 10 : 0
        },
        monthlyTrends: trendsData.monthlyData || [],
        revenueByType: typeData.revenueByType || []
      };
    });

    // Sort by total revenue descending
    combinedRevenue.sort((a, b) => b.combinedMetrics.totalRevenue - a.combinedMetrics.totalRevenue);

    res.json(formatReportResponse(combinedRevenue, {
      reportType: 'dealership-revenue-comparison',
      filters: {
        dealership: dealershipFilter,
        dateRange: dateFilter
      }
    }));

  } catch (error) {
    return handleReportError(error, res, 'Dealership Revenue Comparison');
  }
};

/**
 * Get Dealership Service Bay Utilization
 * Analyzes service bay usage by dealership
 * 
 * @route GET /api/company/reports/dealership/service-bay-utilization
 * @access Private (company_super_admin, company_admin)
 */
const getDealershipServiceBayUtilization = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    const baseMatch = {
      company_id,
      ...dealershipFilter
    };

    // Get dealerships
    const dealerships = await Dealership.find(baseMatch).select('_id name').lean();
    const dealershipIds = dealerships.map(d => d._id);

    // 1. Service bay counts and status by dealership
    const serviceBayStatus = await ServiceBay.aggregate([
      {
        $match: {
          company_id,
          dealership_id: { $in: dealershipIds }
        }
      },
      {
        $group: {
          _id: {
            dealership: '$dealership_id',
            status: '$status'
          },
          count: { $sum: 1 },
          bayNames: { $push: '$bay_name' }
        }
      },
      {
        $group: {
          _id: '$_id.dealership',
          totalBays: { $sum: '$count' },
          baysByStatus: {
            $push: {
              status: '$_id.status',
              count: '$count',
              bayNames: '$bayNames'
            }
          },
          activeBays: {
            $sum: {
              $cond: [{ $eq: ['$_id.status', 'active'] }, '$count', 0]
            }
          },
          inactiveBays: {
            $sum: {
              $cond: [{ $eq: ['$_id.status', 'inactive'] }, '$count', 0]
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          totalBays: 1,
          baysByStatus: 1,
          activeBays: 1,
          inactiveBays: 1,
          utilizationCapacity: {
            $round: [
              { $multiply: [{ $divide: ['$activeBays', '$totalBays'] }, 100] },
              1
            ]
          }
        }
      }
    ]);

    // 2. Bay booking analysis by dealership
    const bayBookings = await WorkshopQuote.aggregate([
      {
        $match: {
          quote_type: 'bay',
          ...dateFilter
        }
      },
      {
        $lookup: {
          from: 'vehicles',
          localField: 'vehicle',
          foreignField: '_id',
          as: 'vehicleData'
        }
      },
      { $unwind: { path: '$vehicleData', preserveNullAndEmptyArrays: true } },
      {
        $match: {
          'vehicleData.company_id': company_id,
          'vehicleData.dealership_id': { $in: dealershipIds }
        }
      },
      {
        $group: {
          _id: '$vehicleData.dealership_id',
          totalBayBookings: { $sum: 1 },
          completedBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'completed_jobs'] }, 1, 0] }
          },
          inProgressBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'work_in_progress'] }, 1, 0] }
          },
          pendingBookings: {
            $sum: {
              $cond: [
                { $in: ['$status', ['quote_request', 'quote_sent']] },
                1,
                0
              ]
            }
          },
          avgBookingValue: { $avg: '$quote_amount' },
          totalBookingValue: { $sum: '$quote_amount' }
        }
      },
      {
        $project: {
          _id: 1,
          totalBayBookings: 1,
          completedBookings: 1,
          inProgressBookings: 1,
          pendingBookings: 1,
          avgBookingValue: 1,
          totalBookingValue: 1,
          completionRate: {
            $round: [
              { $multiply: [{ $divide: ['$completedBookings', '$totalBayBookings'] }, 100] },
              1
            ]
          }
        }
      }
    ]);

    // 3. Bay user assignment by dealership
    const bayUserAssignment = await ServiceBay.aggregate([
      {
        $match: {
          company_id,
          dealership_id: { $in: dealershipIds }
        }
      },
      { $unwind: { path: '$assigned_users', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$dealership_id',
          totalBays: { $addToSet: '$_id' },
          totalAssignedUsers: { $sum: 1 },
          uniqueUsers: { $addToSet: '$assigned_users' }
        }
      },
      {
        $project: {
          _id: 1,
          totalBays: { $size: '$totalBays' },
          totalAssignments: '$totalAssignedUsers',
          uniqueUsers: { $size: '$uniqueUsers' },
          avgUsersPerBay: {
            $round: [
              { $divide: ['$totalAssignedUsers', { $size: '$totalBays' }] },
              1
            ]
          }
        }
      }
    ]);

    // 4. Bay holiday impact by dealership
    const bayHolidays = await ServiceBay.aggregate([
      {
        $match: {
          company_id,
          dealership_id: { $in: dealershipIds }
        }
      },
      { $unwind: { path: '$holidays', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$dealership_id',
          totalHolidays: { $sum: 1 },
          upcomingHolidays: {
            $sum: {
              $cond: [
                { $gte: ['$holidays.date', new Date()] },
                1,
                0
              ]
            }
          },
          pastHolidays: {
            $sum: {
              $cond: [
                { $lt: ['$holidays.date', new Date()] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // 5. Bay performance metrics by dealership
    const bayPerformance = await WorkshopQuote.aggregate([
      {
        $match: {
          quote_type: 'bay',
          status: 'completed_jobs',
          ...dateFilter
        }
      },
      {
        $lookup: {
          from: 'vehicles',
          localField: 'vehicle',
          foreignField: '_id',
          as: 'vehicleData'
        }
      },
      { $unwind: { path: '$vehicleData', preserveNullAndEmptyArrays: true } },
      {
        $match: {
          'vehicleData.company_id': company_id,
          'vehicleData.dealership_id': { $in: dealershipIds }
        }
      },
      {
        $project: {
          dealership_id: '$vehicleData.dealership_id',
          completionTime: {
            $divide: [
              { $subtract: ['$work_completed_at', '$work_started_at'] },
              3600000 // Convert to hours
            ]
          },
          quote_amount: 1,
          final_price: '$comment_sheet.final_price'
        }
      },
      {
        $group: {
          _id: '$dealership_id',
          completedJobs: { $sum: 1 },
          avgCompletionTime: { $avg: '$completionTime' },
          minCompletionTime: { $min: '$completionTime' },
          maxCompletionTime: { $max: '$completionTime' },
          avgQuoteAmount: { $avg: '$quote_amount' },
          avgFinalPrice: { $avg: '$final_price' },
          totalRevenue: { $sum: '$final_price' }
        }
      },
      {
        $project: {
          _id: 1,
          completedJobs: 1,
          avgCompletionTime: { $round: ['$avgCompletionTime', 1] },
          minCompletionTime: { $round: ['$minCompletionTime', 1] },
          maxCompletionTime: { $round: ['$maxCompletionTime', 1] },
          avgQuoteAmount: 1,
          avgFinalPrice: 1,
          totalRevenue: 1,
          avgRevenuePerJob: {
            $round: [
              { $divide: ['$totalRevenue', '$completedJobs'] },
              2
            ]
          }
        }
      }
    ]);

    // Combine all data
    const serviceBayUtilization = dealerships.map(dealership => {
      const bayStatusData = serviceBayStatus.find(b => b._id?.toString() === dealership._id.toString()) || {};
      const bookingData = bayBookings.find(b => b._id?.toString() === dealership._id.toString()) || {};
      const assignmentData = bayUserAssignment.find(a => a._id?.toString() === dealership._id.toString()) || {};
      const holidayData = bayHolidays.find(h => h._id?.toString() === dealership._id.toString()) || {};
      const performanceData = bayPerformance.find(p => p._id?.toString() === dealership._id.toString()) || {};

      return {
        dealershipId: dealership._id,
        dealershipName: dealership.name,
        serviceBays: {
          total: bayStatusData.totalBays || 0,
          active: bayStatusData.activeBays || 0,
          inactive: bayStatusData.inactiveBays || 0,
          byStatus: bayStatusData.baysByStatus || [],
          utilizationCapacity: bayStatusData.utilizationCapacity || 0
        },
        bookings: {
          total: bookingData.totalBayBookings || 0,
          completed: bookingData.completedBookings || 0,
          inProgress: bookingData.inProgressBookings || 0,
          pending: bookingData.pendingBookings || 0,
          avgValue: bookingData.avgBookingValue || 0,
          totalValue: bookingData.totalBookingValue || 0,
          completionRate: bookingData.completionRate || 0
        },
        userAssignment: {
          totalBays: assignmentData.totalBays || 0,
          totalAssignments: assignmentData.totalAssignments || 0,
          uniqueUsers: assignmentData.uniqueUsers || 0,
          avgUsersPerBay: assignmentData.avgUsersPerBay || 0
        },
        holidays: {
          total: holidayData.totalHolidays || 0,
          upcoming: holidayData.upcomingHolidays || 0,
          past: holidayData.pastHolidays || 0
        },
        performance: {
          completedJobs: performanceData.completedJobs || 0,
          avgCompletionTime: performanceData.avgCompletionTime || 0,
          minCompletionTime: performanceData.minCompletionTime || 0,
          maxCompletionTime: performanceData.maxCompletionTime || 0,
          avgQuoteAmount: performanceData.avgQuoteAmount || 0,
          avgFinalPrice: performanceData.avgFinalPrice || 0,
          totalRevenue: performanceData.totalRevenue || 0,
          avgRevenuePerJob: performanceData.avgRevenuePerJob || 0
        }
      };
    });

    res.json(formatReportResponse(serviceBayUtilization, {
      reportType: 'dealership-service-bay-utilization',
      filters: {
        dealership: dealershipFilter,
        dateRange: dateFilter
      }
    }));

  } catch (error) {
    return handleReportError(error, res, 'Dealership Service Bay Utilization');
  }
};

module.exports = {
  getDealershipOverview,
  getDealershipVehicleDistribution,
  getDealershipWorkshopPerformance,
  getDealershipUserActivity,
  getDealershipRevenueComparison,
  getDealershipServiceBayUtilization
};
