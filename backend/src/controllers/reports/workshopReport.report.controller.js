/**
 * WorkshopReport Report Controller
 * Handles all workshop report-related analytics and reporting endpoints
 * Covers workshop performance, cost breakdown, quality metrics, and operational insights
 */

const WorkshopReport = require('../../models/WorkshopReport');
const { 
  getDealershipFilter, 
  getDateFilter, 
  formatReportResponse, 
  handleReportError,
  buildBasePipeline 
} = require('../../utils/reportHelpers');

/**
 * Get Workshop Report Overview
 * Provides overall workshop performance metrics
 * Includes total reports, completion rates, revenue metrics, vehicle type and report type distributions
 * 
 * @route GET /api/company/reports/workshop-report/overview
 * @access Private (company_super_admin, company_admin)
 */
const getWorkshopReportOverview = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    // Build base match criteria
    const baseMatch = {
      company_id,
      ...dateFilter
    };

    // Apply dealership filter if needed (through vehicle lookup)
    const dealershipLookupStage = Object.keys(dealershipFilter).length > 0 ? [
      {
        $lookup: {
          from: 'vehicles',
          localField: 'vehicle_id',
          foreignField: '_id',
          as: 'vehicleData'
        }
      },
      { $unwind: { path: '$vehicleData', preserveNullAndEmptyArrays: true } },
      { $match: { 'vehicleData.dealership_id': dealershipFilter.dealership_id } }
    ] : [];

    // 1. Overall Summary Metrics
    const summaryMetrics = await WorkshopReport.aggregate([
      { $match: baseMatch },
      ...dealershipLookupStage,
      {
        $group: {
          _id: null,
          totalReports: { $sum: 1 },
          totalCost: { $sum: '$workshop_summary.grand_total' },
          totalPartsCost: { $sum: '$workshop_summary.parts_cost' },
          totalLaborCost: { $sum: '$workshop_summary.labor_cost' },
          totalGST: { $sum: '$workshop_summary.total_gst' },
          avgReportCost: { $avg: '$workshop_summary.grand_total' },
          avgCompletionDays: { $avg: '$workshop_summary.duration_days' },
          totalFields: { $sum: '$workshop_summary.total_fields' },
          totalQuotes: { $sum: '$workshop_summary.total_quotes' },
          totalWorkCompleted: { $sum: '$workshop_summary.total_work_completed' },
          totalWorkEntries: { $sum: '$workshop_summary.total_work_entries' },
          completionRate: {
            $avg: {
              $cond: [
                { $gt: ['$workshop_summary.total_fields', 0] },
                {
                  $multiply: [
                    { $divide: ['$workshop_summary.total_work_completed', '$workshop_summary.total_fields'] },
                    100
                  ]
                },
                0
              ]
            }
          }
        }
      }
    ]);

    // 2. Vehicle Type Distribution
    const vehicleTypeDistribution = await WorkshopReport.aggregate([
      { $match: baseMatch },
      ...dealershipLookupStage,
      {
        $group: {
          _id: '$vehicle_type',
          count: { $sum: 1 },
          totalCost: { $sum: '$workshop_summary.grand_total' },
          avgCost: { $avg: '$workshop_summary.grand_total' },
          avgCompletionDays: { $avg: '$workshop_summary.duration_days' },
          totalWorkEntries: { $sum: '$workshop_summary.total_work_entries' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // 3. Report Type Distribution
    const reportTypeDistribution = await WorkshopReport.aggregate([
      { $match: baseMatch },
      ...dealershipLookupStage,
      {
        $group: {
          _id: '$report_type',
          count: { $sum: 1 },
          totalCost: { $sum: '$workshop_summary.grand_total' },
          avgCost: { $avg: '$workshop_summary.grand_total' },
          avgFields: { $avg: '$workshop_summary.total_fields' },
          avgWorkEntries: { $avg: '$workshop_summary.total_work_entries' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // 4. Monthly Trends
    const monthlyTrends = await WorkshopReport.aggregate([
      { $match: baseMatch },
      ...dealershipLookupStage,
      {
        $group: {
          _id: {
            year: { $year: '$generated_at' },
            month: { $month: '$generated_at' }
          },
          reportCount: { $sum: 1 },
          totalRevenue: { $sum: '$workshop_summary.grand_total' },
          avgCost: { $avg: '$workshop_summary.grand_total' },
          avgCompletionDays: { $avg: '$workshop_summary.duration_days' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // 5. Revenue Metrics
    const revenueMetrics = await WorkshopReport.aggregate([
      { $match: baseMatch },
      ...dealershipLookupStage,
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$workshop_summary.grand_total' },
          partsRevenue: { $sum: '$workshop_summary.parts_cost' },
          laborRevenue: { $sum: '$workshop_summary.labor_cost' },
          gstRevenue: { $sum: '$workshop_summary.total_gst' }
        }
      },
      {
        $project: {
          _id: 0,
          totalRevenue: 1,
          partsRevenue: 1,
          laborRevenue: 1,
          gstRevenue: 1,
          partsPercentage: {
            $multiply: [
              { $divide: ['$partsRevenue', '$totalRevenue'] },
              100
            ]
          },
          laborPercentage: {
            $multiply: [
              { $divide: ['$laborRevenue', '$totalRevenue'] },
              100
            ]
          },
          gstPercentage: {
            $multiply: [
              { $divide: ['$gstRevenue', '$totalRevenue'] },
              100
            ]
          }
        }
      }
    ]);

    // 6. Top Vehicles by Cost
    const topVehiclesByCost = await WorkshopReport.aggregate([
      { $match: baseMatch },
      ...dealershipLookupStage,
      {
        $project: {
          vehicle_stock_id: 1,
          vehicle_details: 1,
          vehicle_type: 1,
          total_cost: '$workshop_summary.grand_total',
          work_entries: '$workshop_summary.total_work_entries',
          completion_days: '$workshop_summary.duration_days'
        }
      },
      { $sort: { total_cost: -1 } },
      { $limit: 10 }
    ]);

    const response = formatReportResponse({
      summary: summaryMetrics[0] || {
        totalReports: 0,
        totalCost: 0,
        totalPartsCost: 0,
        totalLaborCost: 0,
        totalGST: 0,
        avgReportCost: 0,
        avgCompletionDays: 0,
        totalFields: 0,
        totalQuotes: 0,
        totalWorkCompleted: 0,
        totalWorkEntries: 0,
        completionRate: 0
      },
      vehicleTypeDistribution,
      reportTypeDistribution,
      monthlyTrends,
      revenueMetrics: revenueMetrics[0] || {
        totalRevenue: 0,
        partsRevenue: 0,
        laborRevenue: 0,
        gstRevenue: 0,
        partsPercentage: 0,
        laborPercentage: 0,
        gstPercentage: 0
      },
      topVehiclesByCost
    }, {
      reportType: 'workshop_report_overview',
      filters: { dealershipFilter, dateFilter }
    });

    res.json(response);
  } catch (error) {
    handleReportError(error, res, 'Workshop Report Overview');
  }
};



/**
 * Get Workshop Cost Breakdown
 * Aggregates parts, labor, and GST costs
 * Calculates cost efficiency metrics and tracks cost trends over time
 * 
 * @route GET /api/company/reports/workshop-report/cost-breakdown
 * @access Private (company_super_admin, company_admin)
 */
const getWorkshopCostBreakdown = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    const baseMatch = {
      company_id,
      ...dateFilter
    };

    const dealershipLookupStage = Object.keys(dealershipFilter).length > 0 ? [
      {
        $lookup: {
          from: 'vehicles',
          localField: 'vehicle_id',
          foreignField: '_id',
          as: 'vehicleData'
        }
      },
      { $unwind: { path: '$vehicleData', preserveNullAndEmptyArrays: true } },
      { $match: { 'vehicleData.dealership_id': dealershipFilter.dealership_id } }
    ] : [];

    // 1. Overall Cost Breakdown
    const overallCostBreakdown = await WorkshopReport.aggregate([
      { $match: baseMatch },
      ...dealershipLookupStage,
      {
        $group: {
          _id: null,
          totalReports: { $sum: 1 },
          totalPartsCost: { $sum: '$workshop_summary.parts_cost' },
          totalLaborCost: { $sum: '$workshop_summary.labor_cost' },
          totalGST: { $sum: '$workshop_summary.total_gst' },
          totalCost: { $sum: '$workshop_summary.grand_total' },
          avgPartsCost: { $avg: '$workshop_summary.parts_cost' },
          avgLaborCost: { $avg: '$workshop_summary.labor_cost' },
          avgGST: { $avg: '$workshop_summary.total_gst' },
          avgTotalCost: { $avg: '$workshop_summary.grand_total' }
        }
      },
      {
        $project: {
          _id: 0,
          totalReports: 1,
          totalPartsCost: 1,
          totalLaborCost: 1,
          totalGST: 1,
          totalCost: 1,
          avgPartsCost: 1,
          avgLaborCost: 1,
          avgGST: 1,
          avgTotalCost: 1,
          partsPercentage: {
            $multiply: [
              { $divide: ['$totalPartsCost', '$totalCost'] },
              100
            ]
          },
          laborPercentage: {
            $multiply: [
              { $divide: ['$totalLaborCost', '$totalCost'] },
              100
            ]
          },
          gstPercentage: {
            $multiply: [
              { $divide: ['$totalGST', '$totalCost'] },
              100
            ]
          }
        }
      }
    ]);

    // 2. Cost Breakdown by Vehicle Type
    const costByVehicleType = await WorkshopReport.aggregate([
      { $match: baseMatch },
      ...dealershipLookupStage,
      {
        $group: {
          _id: '$vehicle_type',
          reportCount: { $sum: 1 },
          totalPartsCost: { $sum: '$workshop_summary.parts_cost' },
          totalLaborCost: { $sum: '$workshop_summary.labor_cost' },
          totalGST: { $sum: '$workshop_summary.total_gst' },
          totalCost: { $sum: '$workshop_summary.grand_total' },
          avgPartsCost: { $avg: '$workshop_summary.parts_cost' },
          avgLaborCost: { $avg: '$workshop_summary.labor_cost' },
          avgGST: { $avg: '$workshop_summary.total_gst' }
        }
      },
      {
        $project: {
          vehicleType: '$_id',
          reportCount: 1,
          totalPartsCost: 1,
          totalLaborCost: 1,
          totalGST: 1,
          totalCost: 1,
          avgPartsCost: 1,
          avgLaborCost: 1,
          avgGST: 1,
          partsRatio: {
            $divide: ['$totalPartsCost', '$totalCost']
          },
          laborRatio: {
            $divide: ['$totalLaborCost', '$totalCost']
          }
        }
      },
      { $sort: { totalCost: -1 } }
    ]);

    // 3. Cost Breakdown by Report Type
    const costByReportType = await WorkshopReport.aggregate([
      { $match: baseMatch },
      ...dealershipLookupStage,
      {
        $group: {
          _id: '$report_type',
          reportCount: { $sum: 1 },
          totalPartsCost: { $sum: '$workshop_summary.parts_cost' },
          totalLaborCost: { $sum: '$workshop_summary.labor_cost' },
          totalGST: { $sum: '$workshop_summary.total_gst' },
          totalCost: { $sum: '$workshop_summary.grand_total' },
          avgCostPerReport: { $avg: '$workshop_summary.grand_total' }
        }
      },
      { $sort: { totalCost: -1 } }
    ]);

    // 4. Monthly Cost Trends
    const monthlyCostTrends = await WorkshopReport.aggregate([
      { $match: baseMatch },
      ...dealershipLookupStage,
      {
        $group: {
          _id: {
            year: { $year: '$generated_at' },
            month: { $month: '$generated_at' }
          },
          reportCount: { $sum: 1 },
          totalPartsCost: { $sum: '$workshop_summary.parts_cost' },
          totalLaborCost: { $sum: '$workshop_summary.labor_cost' },
          totalGST: { $sum: '$workshop_summary.total_gst' },
          totalCost: { $sum: '$workshop_summary.grand_total' },
          avgCostPerReport: { $avg: '$workshop_summary.grand_total' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // 5. Cost Efficiency Metrics
    const costEfficiencyMetrics = await WorkshopReport.aggregate([
      { $match: baseMatch },
      ...dealershipLookupStage,
      {
        $project: {
          vehicle_type: 1,
          report_type: 1,
          total_cost: '$workshop_summary.grand_total',
          total_work_entries: '$workshop_summary.total_work_entries',
          total_fields: '$workshop_summary.total_fields',
          costPerWorkEntry: {
            $cond: [
              { $gt: ['$workshop_summary.total_work_entries', 0] },
              { $divide: ['$workshop_summary.grand_total', '$workshop_summary.total_work_entries'] },
              0
            ]
          },
          costPerField: {
            $cond: [
              { $gt: ['$workshop_summary.total_fields', 0] },
              { $divide: ['$workshop_summary.grand_total', '$workshop_summary.total_fields'] },
              0
            ]
          }
        }
      },
      {
        $group: {
          _id: {
            vehicleType: '$vehicle_type',
            reportType: '$report_type'
          },
          avgCostPerWorkEntry: { $avg: '$costPerWorkEntry' },
          avgCostPerField: { $avg: '$costPerField' },
          minCostPerWorkEntry: { $min: '$costPerWorkEntry' },
          maxCostPerWorkEntry: { $max: '$costPerWorkEntry' },
          reportCount: { $sum: 1 }
        }
      },
      { $sort: { avgCostPerWorkEntry: 1 } }
    ]);

    // 6. Cost Distribution Ranges
    const costDistribution = await WorkshopReport.aggregate([
      { $match: baseMatch },
      ...dealershipLookupStage,
      {
        $bucket: {
          groupBy: '$workshop_summary.grand_total',
          boundaries: [0, 1000, 2500, 5000, 10000, 25000, 50000],
          default: 'Over 50000',
          output: {
            count: { $sum: 1 },
            avgPartsCost: { $avg: '$workshop_summary.parts_cost' },
            avgLaborCost: { $avg: '$workshop_summary.labor_cost' },
            avgGST: { $avg: '$workshop_summary.total_gst' },
            totalCost: { $sum: '$workshop_summary.grand_total' }
          }
        }
      }
    ]);

    // 7. Work Entry Level Cost Analysis
    const workEntryCostAnalysis = await WorkshopReport.aggregate([
      { $match: baseMatch },
      ...dealershipLookupStage,
      { $unwind: { path: '$quotes_data', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$quotes_data.work_details.work_entries', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: null,
          totalWorkEntries: { $sum: 1 },
          avgPartsPerEntry: { $avg: '$quotes_data.work_details.work_entries.parts_cost' },
          avgLaborPerEntry: { $avg: '$quotes_data.work_details.work_entries.labor_cost' },
          avgGSTPerEntry: { $avg: '$quotes_data.work_details.work_entries.gst' },
          totalPartsFromEntries: { $sum: '$quotes_data.work_details.work_entries.parts_cost' },
          totalLaborFromEntries: { $sum: '$quotes_data.work_details.work_entries.labor_cost' },
          totalGSTFromEntries: { $sum: '$quotes_data.work_details.work_entries.gst' }
        }
      }
    ]);

    const response = formatReportResponse({
      overallCostBreakdown: overallCostBreakdown[0] || {
        totalReports: 0,
        totalPartsCost: 0,
        totalLaborCost: 0,
        totalGST: 0,
        totalCost: 0,
        avgPartsCost: 0,
        avgLaborCost: 0,
        avgGST: 0,
        avgTotalCost: 0,
        partsPercentage: 0,
        laborPercentage: 0,
        gstPercentage: 0
      },
      costByVehicleType,
      costByReportType,
      monthlyCostTrends,
      costEfficiencyMetrics,
      costDistribution,
      workEntryCostAnalysis: workEntryCostAnalysis[0] || {
        totalWorkEntries: 0,
        avgPartsPerEntry: 0,
        avgLaborPerEntry: 0,
        avgGSTPerEntry: 0,
        totalPartsFromEntries: 0,
        totalLaborFromEntries: 0,
        totalGSTFromEntries: 0
      }
    }, {
      reportType: 'workshop_cost_breakdown',
      filters: { dealershipFilter, dateFilter }
    });

    res.json(response);
  } catch (error) {
    handleReportError(error, res, 'Workshop Cost Breakdown');
  }
};

/**
 * Get Workshop Quality Metrics
 * Tracks quality check pass rates (visual, functional, road, safety)
 * Calculates overall quality scores and identifies quality improvement trends
 * 
 * @route GET /api/company/reports/workshop-report/quality-metrics
 * @access Private (company_super_admin, company_admin)
 */
const getWorkshopQualityMetrics = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    const baseMatch = {
      company_id,
      ...dateFilter
    };

    const dealershipLookupStage = Object.keys(dealershipFilter).length > 0 ? [
      {
        $lookup: {
          from: 'vehicles',
          localField: 'vehicle_id',
          foreignField: '_id',
          as: 'vehicleData'
        }
      },
      { $unwind: { path: '$vehicleData', preserveNullAndEmptyArrays: true } },
      { $match: { 'vehicleData.dealership_id': dealershipFilter.dealership_id } }
    ] : [];

    // 1. Overall Quality Metrics from Statistics
    const overallQualityMetrics = await WorkshopReport.aggregate([
      { $match: baseMatch },
      ...dealershipLookupStage,
      {
        $group: {
          _id: null,
          totalReports: { $sum: 1 },
          totalVisualPassed: { $sum: '$statistics.quality_metrics.visual_inspection_passed' },
          totalFunctionalPassed: { $sum: '$statistics.quality_metrics.functional_test_passed' },
          totalRoadPassed: { $sum: '$statistics.quality_metrics.road_test_passed' },
          totalSafetyPassed: { $sum: '$statistics.quality_metrics.safety_check_passed' },
          avgVisualPassed: { $avg: '$statistics.quality_metrics.visual_inspection_passed' },
          avgFunctionalPassed: { $avg: '$statistics.quality_metrics.functional_test_passed' },
          avgRoadPassed: { $avg: '$statistics.quality_metrics.road_test_passed' },
          avgSafetyPassed: { $avg: '$statistics.quality_metrics.safety_check_passed' }
        }
      },
      {
        $project: {
          _id: 0,
          totalReports: 1,
          totalVisualPassed: 1,
          totalFunctionalPassed: 1,
          totalRoadPassed: 1,
          totalSafetyPassed: 1,
          avgVisualPassed: 1,
          avgFunctionalPassed: 1,
          avgRoadPassed: 1,
          avgSafetyPassed: 1,
          overallQualityScore: {
            $avg: [
              '$avgVisualPassed',
              '$avgFunctionalPassed',
              '$avgRoadPassed',
              '$avgSafetyPassed'
            ]
          }
        }
      }
    ]);

    // 2. Quality Metrics by Vehicle Type
    const qualityByVehicleType = await WorkshopReport.aggregate([
      { $match: baseMatch },
      ...dealershipLookupStage,
      {
        $group: {
          _id: '$vehicle_type',
          reportCount: { $sum: 1 },
          visualPassed: { $sum: '$statistics.quality_metrics.visual_inspection_passed' },
          functionalPassed: { $sum: '$statistics.quality_metrics.functional_test_passed' },
          roadPassed: { $sum: '$statistics.quality_metrics.road_test_passed' },
          safetyPassed: { $sum: '$statistics.quality_metrics.safety_check_passed' },
          avgVisualPassed: { $avg: '$statistics.quality_metrics.visual_inspection_passed' },
          avgFunctionalPassed: { $avg: '$statistics.quality_metrics.functional_test_passed' },
          avgRoadPassed: { $avg: '$statistics.quality_metrics.road_test_passed' },
          avgSafetyPassed: { $avg: '$statistics.quality_metrics.safety_check_passed' }
        }
      },
      {
        $project: {
          vehicleType: '$_id',
          reportCount: 1,
          visualPassed: 1,
          functionalPassed: 1,
          roadPassed: 1,
          safetyPassed: 1,
          avgVisualPassed: 1,
          avgFunctionalPassed: 1,
          avgRoadPassed: 1,
          avgSafetyPassed: 1,
          overallQualityScore: {
            $avg: [
              '$avgVisualPassed',
              '$avgFunctionalPassed',
              '$avgRoadPassed',
              '$avgSafetyPassed'
            ]
          }
        }
      },
      { $sort: { overallQualityScore: -1 } }
    ]);

    // 3. Work Entry Level Quality Analysis
    const workEntryQualityAnalysis = await WorkshopReport.aggregate([
      { $match: baseMatch },
      ...dealershipLookupStage,
      { $unwind: { path: '$quotes_data', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$quotes_data.work_details.work_entries', preserveNullAndEmptyArrays: true } },
      {
        $match: {
          'quotes_data.work_details.work_entries.quality_check': { $exists: true }
        }
      },
      {
        $group: {
          _id: null,
          totalWorkEntries: { $sum: 1 },
          visualInspectionPassed: {
            $sum: {
              $cond: [
                { $eq: ['$quotes_data.work_details.work_entries.quality_check.visual_inspection', true] },
                1,
                0
              ]
            }
          },
          functionalTestPassed: {
            $sum: {
              $cond: [
                { $eq: ['$quotes_data.work_details.work_entries.quality_check.functional_test', true] },
                1,
                0
              ]
            }
          },
          roadTestPassed: {
            $sum: {
              $cond: [
                { $eq: ['$quotes_data.work_details.work_entries.quality_check.road_test', true] },
                1,
                0
              ]
            }
          },
          safetyCheckPassed: {
            $sum: {
              $cond: [
                { $eq: ['$quotes_data.work_details.work_entries.quality_check.safety_check', true] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalWorkEntries: 1,
          visualInspectionPassed: 1,
          functionalTestPassed: 1,
          roadTestPassed: 1,
          safetyCheckPassed: 1,
          visualPassRate: {
            $multiply: [
              { $divide: ['$visualInspectionPassed', '$totalWorkEntries'] },
              100
            ]
          },
          functionalPassRate: {
            $multiply: [
              { $divide: ['$functionalTestPassed', '$totalWorkEntries'] },
              100
            ]
          },
          roadPassRate: {
            $multiply: [
              { $divide: ['$roadTestPassed', '$totalWorkEntries'] },
              100
            ]
          },
          safetyPassRate: {
            $multiply: [
              { $divide: ['$safetyCheckPassed', '$totalWorkEntries'] },
              100
            ]
          }
        }
      }
    ]);

    // 4. Monthly Quality Trends
    const monthlyQualityTrends = await WorkshopReport.aggregate([
      { $match: baseMatch },
      ...dealershipLookupStage,
      {
        $group: {
          _id: {
            year: { $year: '$generated_at' },
            month: { $month: '$generated_at' }
          },
          reportCount: { $sum: 1 },
          avgVisualPassed: { $avg: '$statistics.quality_metrics.visual_inspection_passed' },
          avgFunctionalPassed: { $avg: '$statistics.quality_metrics.functional_test_passed' },
          avgRoadPassed: { $avg: '$statistics.quality_metrics.road_test_passed' },
          avgSafetyPassed: { $avg: '$statistics.quality_metrics.safety_check_passed' }
        }
      },
      {
        $project: {
          _id: 1,
          reportCount: 1,
          avgVisualPassed: 1,
          avgFunctionalPassed: 1,
          avgRoadPassed: 1,
          avgSafetyPassed: 1,
          overallQualityScore: {
            $avg: [
              '$avgVisualPassed',
              '$avgFunctionalPassed',
              '$avgRoadPassed',
              '$avgSafetyPassed'
            ]
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // 5. Quality Score Distribution
    const qualityScoreDistribution = await WorkshopReport.aggregate([
      { $match: baseMatch },
      ...dealershipLookupStage,
      {
        $project: {
          vehicle_stock_id: 1,
          vehicle_type: 1,
          overallQualityScore: {
            $avg: [
              '$statistics.quality_metrics.visual_inspection_passed',
              '$statistics.quality_metrics.functional_test_passed',
              '$statistics.quality_metrics.road_test_passed',
              '$statistics.quality_metrics.safety_check_passed'
            ]
          }
        }
      },
      {
        $bucket: {
          groupBy: '$overallQualityScore',
          boundaries: [0, 0.25, 0.5, 0.75, 1.0],
          default: 'No Quality Data',
          output: {
            count: { $sum: 1 },
            vehicles: {
              $push: {
                stockId: '$vehicle_stock_id',
                vehicleType: '$vehicle_type',
                qualityScore: '$overallQualityScore'
              }
            }
          }
        }
      }
    ]);

    // 6. Quality Issues Identification (Low Pass Rates)
    const qualityIssues = await WorkshopReport.aggregate([
      { $match: baseMatch },
      ...dealershipLookupStage,
      {
        $project: {
          vehicle_stock_id: 1,
          vehicle_details: 1,
          vehicle_type: 1,
          visualPassed: '$statistics.quality_metrics.visual_inspection_passed',
          functionalPassed: '$statistics.quality_metrics.functional_test_passed',
          roadPassed: '$statistics.quality_metrics.road_test_passed',
          safetyPassed: '$statistics.quality_metrics.safety_check_passed',
          overallQualityScore: {
            $avg: [
              '$statistics.quality_metrics.visual_inspection_passed',
              '$statistics.quality_metrics.functional_test_passed',
              '$statistics.quality_metrics.road_test_passed',
              '$statistics.quality_metrics.safety_check_passed'
            ]
          }
        }
      },
      {
        $match: {
          overallQualityScore: { $lt: 0.75 } // Less than 75% quality score
        }
      },
      { $sort: { overallQualityScore: 1 } },
      { $limit: 20 }
    ]);

    // 7. Quality by Report Type
    const qualityByReportType = await WorkshopReport.aggregate([
      { $match: baseMatch },
      ...dealershipLookupStage,
      {
        $group: {
          _id: '$report_type',
          reportCount: { $sum: 1 },
          avgVisualPassed: { $avg: '$statistics.quality_metrics.visual_inspection_passed' },
          avgFunctionalPassed: { $avg: '$statistics.quality_metrics.functional_test_passed' },
          avgRoadPassed: { $avg: '$statistics.quality_metrics.road_test_passed' },
          avgSafetyPassed: { $avg: '$statistics.quality_metrics.safety_check_passed' }
        }
      },
      {
        $project: {
          reportType: '$_id',
          reportCount: 1,
          avgVisualPassed: 1,
          avgFunctionalPassed: 1,
          avgRoadPassed: 1,
          avgSafetyPassed: 1,
          overallQualityScore: {
            $avg: [
              '$avgVisualPassed',
              '$avgFunctionalPassed',
              '$avgRoadPassed',
              '$avgSafetyPassed'
            ]
          }
        }
      },
      { $sort: { overallQualityScore: -1 } }
    ]);

    const response = formatReportResponse({
      overallQualityMetrics: overallQualityMetrics[0] || {
        totalReports: 0,
        totalVisualPassed: 0,
        totalFunctionalPassed: 0,
        totalRoadPassed: 0,
        totalSafetyPassed: 0,
        avgVisualPassed: 0,
        avgFunctionalPassed: 0,
        avgRoadPassed: 0,
        avgSafetyPassed: 0,
        overallQualityScore: 0
      },
      qualityByVehicleType,
      workEntryQualityAnalysis: workEntryQualityAnalysis[0] || {
        totalWorkEntries: 0,
        visualInspectionPassed: 0,
        functionalTestPassed: 0,
        roadTestPassed: 0,
        safetyCheckPassed: 0,
        visualPassRate: 0,
        functionalPassRate: 0,
        roadPassRate: 0,
        safetyPassRate: 0
      },
      monthlyQualityTrends,
      qualityScoreDistribution,
      qualityIssues,
      qualityByReportType
    }, {
      reportType: 'workshop_quality_metrics',
      filters: { dealershipFilter, dateFilter }
    });

    res.json(response);
  } catch (error) {
    handleReportError(error, res, 'Workshop Quality Metrics');
  }
};

/**
 * Get Workshop Technician Performance
 * Tracks technician efficiency and quality metrics
 * Analyzes work completion rates, average times, and quality scores
 * 
 * @route GET /api/company/reports/workshop-report/technician-performance
 * @access Private (company_super_admin, company_admin)
 */
const getWorkshopTechnicianPerformance = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    const baseMatch = {
      company_id,
      ...dateFilter
    };

    const dealershipLookupStage = Object.keys(dealershipFilter).length > 0 ? [
      {
        $lookup: {
          from: 'vehicles',
          localField: 'vehicle_id',
          foreignField: '_id',
          as: 'vehicleData'
        }
      },
      { $unwind: { path: '$vehicleData', preserveNullAndEmptyArrays: true } },
      { $match: { 'vehicleData.dealership_id': dealershipFilter.dealership_id } }
    ] : [];

    // 1. Technician Performance from Statistics
    let technicianPerformance = [];
    try {
      technicianPerformance = await WorkshopReport.aggregate([
        { $match: baseMatch },
        ...dealershipLookupStage,
        { 
          $match: { 
            'statistics.technician_performance': { 
              $exists: true, 
              $ne: null
            }
          }
        },
        { $unwind: { path: '$statistics.technician_performance', preserveNullAndEmptyArrays: true } },
        {
          $match: {
            'statistics.technician_performance': { $ne: null },
            'statistics.technician_performance.technician_name': { $exists: true, $ne: null, $ne: '' }
          }
        },
        {
          $group: {
            _id: '$statistics.technician_performance.technician_name',
            totalWorkEntries: { 
              $sum: { 
                $ifNull: ['$statistics.technician_performance.work_entries_completed', 0] 
              } 
            },
            avgCompletionTime: { 
              $avg: { 
                $ifNull: ['$statistics.technician_performance.avg_completion_time', null] 
              } 
            },
            avgQualityScore: { 
              $avg: { 
                $ifNull: ['$statistics.technician_performance.quality_score', null] 
              } 
            },
            reportsWorkedOn: { $sum: 1 }
          }
        },
        { $sort: { totalWorkEntries: -1 } }
      ]);
    } catch (err) {
      console.error('Error in technicianPerformance aggregation:', err);
      technicianPerformance = [];
    }

    // 2. Work Entry Level Technician Analysis
    let workEntryTechnicianAnalysis = [];
    try {
      workEntryTechnicianAnalysis = await WorkshopReport.aggregate([
        { $match: baseMatch },
        ...dealershipLookupStage,
        {
          $match: {
            quotes_data: { 
              $exists: true, 
              $ne: null
            }
          }
        },
        { $unwind: { path: '$quotes_data', preserveNullAndEmptyArrays: true } },
        {
          $match: {
            'quotes_data.work_details': { $exists: true, $ne: null },
            'quotes_data.work_details.work_entries': { 
              $exists: true, 
              $ne: null
            }
          }
        },
        { $unwind: { path: '$quotes_data.work_details.work_entries', preserveNullAndEmptyArrays: true } },
        {
          $match: {
            'quotes_data.work_details.work_entries.technician': { $exists: true, $ne: null, $ne: '' }
          }
        },
        {
          $group: {
            _id: '$quotes_data.work_details.work_entries.technician',
            totalWorkEntries: { $sum: 1 },
            completedWorkEntries: {
              $sum: {
                $cond: [
                  { $eq: [{ $ifNull: ['$quotes_data.work_details.work_entries.completed', false] }, true] },
                  1,
                  0
                ]
              }
            },
            totalPartsCost: { 
              $sum: { 
                $ifNull: ['$quotes_data.work_details.work_entries.parts_cost', 0] 
              } 
            },
            totalLaborCost: { 
              $sum: { 
                $ifNull: ['$quotes_data.work_details.work_entries.labor_cost', 0] 
              } 
            },
            avgLaborHours: { 
              $avg: { 
                $toDouble: { 
                  $ifNull: ['$quotes_data.work_details.work_entries.labor_hours', 0] 
                } 
              } 
            }
          }
        },
        {
          $project: {
            technicianName: '$_id',
            totalWorkEntries: 1,
            completedWorkEntries: 1,
            totalPartsCost: { $ifNull: ['$totalPartsCost', 0] },
            totalLaborCost: { $ifNull: ['$totalLaborCost', 0] },
            avgLaborHours: { $ifNull: ['$avgLaborHours', 0] },
            completionRate: {
              $cond: [
                { $gt: ['$totalWorkEntries', 0] },
                {
                  $multiply: [
                    { $divide: ['$completedWorkEntries', '$totalWorkEntries'] },
                    100
                  ]
                },
                0
              ]
            },
            totalRevenue: { 
              $add: [
                { $ifNull: ['$totalPartsCost', 0] }, 
                { $ifNull: ['$totalLaborCost', 0] }
              ] 
            }
          }
        },
        { $sort: { totalRevenue: -1 } }
      ]);
    } catch (err) {
      console.error('Error in workEntryTechnicianAnalysis aggregation:', err);
      workEntryTechnicianAnalysis = [];
    }

    // 3. Top Performing Technicians
    let topTechnicians = [];
    try {
      topTechnicians = await WorkshopReport.aggregate([
        { $match: baseMatch },
        ...dealershipLookupStage,
        { 
          $match: { 
            'statistics.technician_performance': { 
              $exists: true, 
              $ne: null
            }
          }
        },
        { $unwind: { path: '$statistics.technician_performance', preserveNullAndEmptyArrays: true } },
        {
          $match: {
            'statistics.technician_performance': { $ne: null },
            'statistics.technician_performance.technician_name': { $exists: true, $ne: null, $ne: '' }
          }
        },
        {
          $project: {
            technicianName: '$statistics.technician_performance.technician_name',
            workEntriesCompleted: { 
              $ifNull: ['$statistics.technician_performance.work_entries_completed', 0] 
            },
            avgCompletionTime: { 
              $ifNull: ['$statistics.technician_performance.avg_completion_time', 0] 
            },
            qualityScore: { 
              $ifNull: ['$statistics.technician_performance.quality_score', 0] 
            }
          }
        },
        { $sort: { qualityScore: -1, workEntriesCompleted: -1 } },
        { $limit: 10 }
      ]);
    } catch (err) {
      console.error('Error in topTechnicians aggregation:', err);
      topTechnicians = [];
    }

    const response = formatReportResponse({
      technicianPerformance,
      workEntryTechnicianAnalysis,
      topTechnicians
    }, {
      reportType: 'workshop_technician_performance',
      filters: { dealershipFilter, dateFilter }
    });

    res.json(response);
  } catch (error) {
    handleReportError(error, res, 'Workshop Technician Performance');
  }
};

/**
 * Get Workshop Supplier Scorecard
 * Analyzes supplier performance from completed workshop reports
 * Tracks jobs completed, costs, quality scores, and earnings
 * 
 * @route GET /api/company/reports/workshop-report/supplier-scorecard
 * @access Private (company_super_admin, company_admin)
 */
const getWorkshopSupplierScorecard = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    const baseMatch = {
      company_id,
      ...dateFilter
    };

    const dealershipLookupStage = Object.keys(dealershipFilter).length > 0 ? [
      {
        $lookup: {
          from: 'vehicles',
          localField: 'vehicle_id',
          foreignField: '_id',
          as: 'vehicleData'
        }
      },
      { $unwind: { path: '$vehicleData', preserveNullAndEmptyArrays: true } },
      { $match: { 'vehicleData.dealership_id': dealershipFilter.dealership_id } }
    ] : [];

    // 1. Supplier Performance from Statistics
    const supplierPerformance = await WorkshopReport.aggregate([
      { $match: baseMatch },
      ...dealershipLookupStage,
      { $unwind: { path: '$statistics.supplier_performance', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$statistics.supplier_performance.supplier_id',
          supplierName: { $first: '$statistics.supplier_performance.supplier_name' },
          totalJobsCompleted: { $sum: '$statistics.supplier_performance.jobs_completed' },
          totalWorkEntries: { $sum: '$statistics.supplier_performance.work_entries_completed' },
          avgCost: { $avg: '$statistics.supplier_performance.avg_cost' },
          avgTime: { $avg: '$statistics.supplier_performance.avg_time' },
          totalEarned: { $sum: '$statistics.supplier_performance.total_earned' },
          avgQualityScore: { $avg: '$statistics.supplier_performance.quality_score' },
          reportsWorkedOn: { $sum: 1 }
        }
      },
      { $sort: { totalEarned: -1 } }
    ]);

    // 2. Approved Supplier Analysis from Quotes Data
    const approvedSupplierAnalysis = await WorkshopReport.aggregate([
      { $match: baseMatch },
      ...dealershipLookupStage,
      { $unwind: { path: '$quotes_data', preserveNullAndEmptyArrays: true } },
      {
        $match: {
          'quotes_data.approved_supplier.supplier_id': { $exists: true }
        }
      },
      {
        $group: {
          _id: '$quotes_data.approved_supplier.supplier_id',
          supplierName: { $first: '$quotes_data.approved_supplier.supplier_name' },
          supplierEmail: { $first: '$quotes_data.approved_supplier.supplier_email' },
          totalQuotesApproved: { $sum: 1 },
          totalQuoteAmount: { $sum: '$quotes_data.quote_amount' },
          avgQuoteAmount: { $avg: '$quotes_data.quote_amount' },
          totalFinalPrice: { $sum: '$quotes_data.work_details.final_price' },
          avgFinalPrice: { $avg: '$quotes_data.work_details.final_price' }
        }
      },
      {
        $project: {
          supplierId: '$_id',
          supplierName: 1,
          supplierEmail: 1,
          totalQuotesApproved: 1,
          totalQuoteAmount: 1,
          avgQuoteAmount: 1,
          totalFinalPrice: 1,
          avgFinalPrice: 1,
          quoteAccuracy: {
            $subtract: [
              100,
              {
                $multiply: [
                  {
                    $divide: [
                      { $abs: { $subtract: ['$totalFinalPrice', '$totalQuoteAmount'] } },
                      '$totalQuoteAmount'
                    ]
                  },
                  100
                ]
              }
            ]
          }
        }
      },
      { $sort: { totalFinalPrice: -1 } }
    ]);

    // 3. Top Suppliers by Revenue
    const topSuppliersByRevenue = await WorkshopReport.aggregate([
      { $match: baseMatch },
      ...dealershipLookupStage,
      { $unwind: { path: '$statistics.supplier_performance', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$statistics.supplier_performance.supplier_id',
          supplierName: { $first: '$statistics.supplier_performance.supplier_name' },
          totalEarned: { $sum: '$statistics.supplier_performance.total_earned' },
          jobsCompleted: { $sum: '$statistics.supplier_performance.jobs_completed' },
          avgQualityScore: { $avg: '$statistics.supplier_performance.quality_score' }
        }
      },
      { $sort: { totalEarned: -1 } },
      { $limit: 10 }
    ]);

    const response = formatReportResponse({
      supplierPerformance,
      approvedSupplierAnalysis,
      topSuppliersByRevenue
    }, {
      reportType: 'workshop_supplier_scorecard',
      filters: { dealershipFilter, dateFilter }
    });

    res.json(response);
  } catch (error) {
    handleReportError(error, res, 'Workshop Supplier Scorecard');
  }
};

/**
 * Get Workshop Warranty Tracking
 * Tracks warranty claims and patterns from workshop reports
 * Analyzes warranty coverage, parts, and supplier warranty performance
 * 
 * @route GET /api/company/reports/workshop-report/warranty-tracking
 * @access Private (company_super_admin, company_admin)
 */
const getWorkshopWarrantyTracking = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    const baseMatch = {
      company_id,
      ...dateFilter
    };

    const dealershipLookupStage = Object.keys(dealershipFilter).length > 0 ? [
      {
        $lookup: {
          from: 'vehicles',
          localField: 'vehicle_id',
          foreignField: '_id',
          as: 'vehicleData'
        }
      },
      { $unwind: { path: '$vehicleData', preserveNullAndEmptyArrays: true } },
      { $match: { 'vehicleData.dealership_id': dealershipFilter.dealership_id } }
    ] : [];

    // 1. Overall Warranty Summary
    const warrantySummary = await WorkshopReport.aggregate([
      { $match: baseMatch },
      ...dealershipLookupStage,
      { $unwind: { path: '$quotes_data', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$quotes_data.work_details.work_entries', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$quotes_data.work_details.work_entries.warranties', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: null,
          totalWarranties: { $sum: 1 },
          avgWarrantyMonths: { $avg: { $toInt: '$quotes_data.work_details.work_entries.warranties.months' } },
          uniqueParts: { $addToSet: '$quotes_data.work_details.work_entries.warranties.part' },
          uniqueSuppliers: { $addToSet: '$quotes_data.work_details.work_entries.warranties.supplier' }
        }
      },
      {
        $project: {
          _id: 0,
          totalWarranties: 1,
          avgWarrantyMonths: 1,
          uniquePartsCount: { $size: '$uniqueParts' },
          uniqueSuppliersCount: { $size: '$uniqueSuppliers' }
        }
      }
    ]);

    // 2. Warranty by Part Type
    const warrantyByPart = await WorkshopReport.aggregate([
      { $match: baseMatch },
      ...dealershipLookupStage,
      { $unwind: { path: '$quotes_data', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$quotes_data.work_details.work_entries', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$quotes_data.work_details.work_entries.warranties', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$quotes_data.work_details.work_entries.warranties.part',
          count: { $sum: 1 },
          avgWarrantyMonths: { $avg: { $toInt: '$quotes_data.work_details.work_entries.warranties.months' } },
          suppliers: { $addToSet: '$quotes_data.work_details.work_entries.warranties.supplier' }
        }
      },
      {
        $project: {
          part: '$_id',
          count: 1,
          avgWarrantyMonths: 1,
          supplierCount: { $size: '$suppliers' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    // 3. Warranty by Supplier
    const warrantyBySupplier = await WorkshopReport.aggregate([
      { $match: baseMatch },
      ...dealershipLookupStage,
      { $unwind: { path: '$quotes_data', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$quotes_data.work_details.work_entries', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$quotes_data.work_details.work_entries.warranties', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$quotes_data.work_details.work_entries.warranties.supplier',
          totalWarranties: { $sum: 1 },
          avgWarrantyMonths: { $avg: { $toInt: '$quotes_data.work_details.work_entries.warranties.months' } },
          parts: { $addToSet: '$quotes_data.work_details.work_entries.warranties.part' }
        }
      },
      {
        $project: {
          supplier: '$_id',
          totalWarranties: 1,
          avgWarrantyMonths: 1,
          partsCount: { $size: '$parts' }
        }
      },
      { $sort: { totalWarranties: -1 } }
    ]);

    // 4. Warranty Duration Distribution
    const warrantyDurationDistribution = await WorkshopReport.aggregate([
      { $match: baseMatch },
      ...dealershipLookupStage,
      { $unwind: { path: '$quotes_data', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$quotes_data.work_details.work_entries', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$quotes_data.work_details.work_entries.warranties', preserveNullAndEmptyArrays: true } },
      {
        $bucket: {
          groupBy: { $toInt: '$quotes_data.work_details.work_entries.warranties.months' },
          boundaries: [0, 3, 6, 12, 24, 36],
          default: 'Over 36 months',
          output: {
            count: { $sum: 1 },
            parts: { $addToSet: '$quotes_data.work_details.work_entries.warranties.part' }
          }
        }
      }
    ]);

    const response = formatReportResponse({
      warrantySummary: warrantySummary[0] || {
        totalWarranties: 0,
        avgWarrantyMonths: 0,
        uniquePartsCount: 0,
        uniqueSuppliersCount: 0
      },
      warrantyByPart,
      warrantyBySupplier,
      warrantyDurationDistribution
    }, {
      reportType: 'workshop_warranty_tracking',
      filters: { dealershipFilter, dateFilter }
    });

    res.json(response);
  } catch (error) {
    handleReportError(error, res, 'Workshop Warranty Tracking');
  }
};

/**
 * Get Workshop Completion Time Analysis
 * Analyzes duration and efficiency metrics for workshop reports
 * Tracks completion times, identifies delays, and measures efficiency
 * 
 * @route GET /api/company/reports/workshop-report/completion-time-analysis
 * @access Private (company_super_admin, company_admin)
 */
const getWorkshopCompletionTimeAnalysis = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    const baseMatch = {
      company_id,
      ...dateFilter
    };

    const dealershipLookupStage = Object.keys(dealershipFilter).length > 0 ? [
      {
        $lookup: {
          from: 'vehicles',
          localField: 'vehicle_id',
          foreignField: '_id',
          as: 'vehicleData'
        }
      },
      { $unwind: { path: '$vehicleData', preserveNullAndEmptyArrays: true } },
      { $match: { 'vehicleData.dealership_id': dealershipFilter.dealership_id } }
    ] : [];

    // 1. Overall Completion Time Metrics
    const overallMetrics = await WorkshopReport.aggregate([
      { $match: baseMatch },
      ...dealershipLookupStage,
      {
        $group: {
          _id: null,
          totalReports: { $sum: 1 },
          avgDurationDays: { $avg: '$workshop_summary.duration_days' },
          minDurationDays: { $min: '$workshop_summary.duration_days' },
          maxDurationDays: { $max: '$workshop_summary.duration_days' },
          avgWorkEntries: { $avg: '$workshop_summary.total_work_entries' },
          avgFields: { $avg: '$workshop_summary.total_fields' }
        }
      }
    ]);

    // 2. Completion Time by Vehicle Type
    const completionByVehicleType = await WorkshopReport.aggregate([
      { $match: baseMatch },
      ...dealershipLookupStage,
      {
        $group: {
          _id: '$vehicle_type',
          reportCount: { $sum: 1 },
          avgDurationDays: { $avg: '$workshop_summary.duration_days' },
          minDurationDays: { $min: '$workshop_summary.duration_days' },
          maxDurationDays: { $max: '$workshop_summary.duration_days' },
          avgWorkEntries: { $avg: '$workshop_summary.total_work_entries' }
        }
      },
      { $sort: { avgDurationDays: -1 } }
    ]);

    // 3. Completion Time by Report Type
    const completionByReportType = await WorkshopReport.aggregate([
      { $match: baseMatch },
      ...dealershipLookupStage,
      {
        $group: {
          _id: '$report_type',
          reportCount: { $sum: 1 },
          avgDurationDays: { $avg: '$workshop_summary.duration_days' },
          avgFields: { $avg: '$workshop_summary.total_fields' },
          avgWorkEntries: { $avg: '$workshop_summary.total_work_entries' }
        }
      },
      { $sort: { avgDurationDays: -1 } }
    ]);

    // 4. Duration Distribution
    const durationDistribution = await WorkshopReport.aggregate([
      { $match: baseMatch },
      ...dealershipLookupStage,
      {
        $bucket: {
          groupBy: '$workshop_summary.duration_days',
          boundaries: [0, 7, 14, 21, 30, 60, 90],
          default: 'Over 90 days',
          output: {
            count: { $sum: 1 },
            avgCost: { $avg: '$workshop_summary.grand_total' },
            avgWorkEntries: { $avg: '$workshop_summary.total_work_entries' }
          }
        }
      }
    ]);

    // 5. Efficiency Metrics (Duration vs Work Complexity)
    const efficiencyMetrics = await WorkshopReport.aggregate([
      { $match: baseMatch },
      ...dealershipLookupStage,
      {
        $project: {
          vehicle_type: 1,
          report_type: 1,
          duration_days: '$workshop_summary.duration_days',
          total_work_entries: '$workshop_summary.total_work_entries',
          total_fields: '$workshop_summary.total_fields',
          daysPerWorkEntry: {
            $cond: [
              { $gt: ['$workshop_summary.total_work_entries', 0] },
              { $divide: ['$workshop_summary.duration_days', '$workshop_summary.total_work_entries'] },
              0
            ]
          },
          daysPerField: {
            $cond: [
              { $gt: ['$workshop_summary.total_fields', 0] },
              { $divide: ['$workshop_summary.duration_days', '$workshop_summary.total_fields'] },
              0
            ]
          }
        }
      },
      {
        $group: {
          _id: {
            vehicleType: '$vehicle_type',
            reportType: '$report_type'
          },
          avgDaysPerWorkEntry: { $avg: '$daysPerWorkEntry' },
          avgDaysPerField: { $avg: '$daysPerField' },
          reportCount: { $sum: 1 }
        }
      },
      { $sort: { avgDaysPerWorkEntry: 1 } }
    ]);

    // 6. Monthly Completion Time Trends
    const monthlyTrends = await WorkshopReport.aggregate([
      { $match: baseMatch },
      ...dealershipLookupStage,
      {
        $group: {
          _id: {
            year: { $year: '$generated_at' },
            month: { $month: '$generated_at' }
          },
          reportCount: { $sum: 1 },
          avgDurationDays: { $avg: '$workshop_summary.duration_days' },
          avgWorkEntries: { $avg: '$workshop_summary.total_work_entries' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // 7. Longest Running Reports
    const longestRunningReports = await WorkshopReport.aggregate([
      { $match: baseMatch },
      ...dealershipLookupStage,
      {
        $project: {
          vehicle_stock_id: 1,
          vehicle_details: 1,
          vehicle_type: 1,
          report_type: 1,
          duration_days: '$workshop_summary.duration_days',
          total_work_entries: '$workshop_summary.total_work_entries',
          total_cost: '$workshop_summary.grand_total',
          start_date: '$workshop_summary.start_date',
          completion_date: '$workshop_summary.completion_date'
        }
      },
      { $sort: { duration_days: -1 } },
      { $limit: 20 }
    ]);

    const response = formatReportResponse({
      overallMetrics: overallMetrics[0] || {
        totalReports: 0,
        avgDurationDays: 0,
        minDurationDays: 0,
        maxDurationDays: 0,
        avgWorkEntries: 0,
        avgFields: 0
      },
      completionByVehicleType,
      completionByReportType,
      durationDistribution,
      efficiencyMetrics,
      monthlyTrends,
      longestRunningReports
    }, {
      reportType: 'workshop_completion_time_analysis',
      filters: { dealershipFilter, dateFilter }
    });

    res.json(response);
  } catch (error) {
    handleReportError(error, res, 'Workshop Completion Time Analysis');
  }
};

/**
 * Get Workshop Revenue Analysis
 * Analyzes revenue and profitability from workshop reports
 * Tracks revenue trends, cost-to-revenue ratios, and profitability metrics
 * 
 * @route GET /api/company/reports/workshop-report/revenue-analysis
 * @access Private (company_super_admin, company_admin)
 */
const getWorkshopRevenueAnalysis = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    const baseMatch = {
      company_id,
      ...dateFilter
    };

    const dealershipLookupStage = Object.keys(dealershipFilter).length > 0 ? [
      {
        $lookup: {
          from: 'vehicles',
          localField: 'vehicle_id',
          foreignField: '_id',
          as: 'vehicleData'
        }
      },
      { $unwind: { path: '$vehicleData', preserveNullAndEmptyArrays: true } },
      { $match: { 'vehicleData.dealership_id': dealershipFilter.dealership_id } }
    ] : [];

    // 1. Overall Revenue Metrics
    const overallRevenue = await WorkshopReport.aggregate([
      { $match: baseMatch },
      ...dealershipLookupStage,
      {
        $group: {
          _id: null,
          totalReports: { $sum: 1 },
          totalRevenue: { $sum: '$workshop_summary.grand_total' },
          totalPartsCost: { $sum: '$workshop_summary.parts_cost' },
          totalLaborCost: { $sum: '$workshop_summary.labor_cost' },
          totalGST: { $sum: '$workshop_summary.total_gst' },
          avgRevenuePerReport: { $avg: '$workshop_summary.grand_total' },
          avgPartsRevenue: { $avg: '$workshop_summary.parts_cost' },
          avgLaborRevenue: { $avg: '$workshop_summary.labor_cost' }
        }
      },
      {
        $project: {
          _id: 0,
          totalReports: 1,
          totalRevenue: 1,
          totalPartsCost: 1,
          totalLaborCost: 1,
          totalGST: 1,
          avgRevenuePerReport: 1,
          avgPartsRevenue: 1,
          avgLaborRevenue: 1,
          partsRevenuePercentage: {
            $multiply: [
              { $divide: ['$totalPartsCost', '$totalRevenue'] },
              100
            ]
          },
          laborRevenuePercentage: {
            $multiply: [
              { $divide: ['$totalLaborCost', '$totalRevenue'] },
              100
            ]
          },
          gstPercentage: {
            $multiply: [
              { $divide: ['$totalGST', '$totalRevenue'] },
              100
            ]
          }
        }
      }
    ]);

    // 2. Revenue by Vehicle Type
    const revenueByVehicleType = await WorkshopReport.aggregate([
      { $match: baseMatch },
      ...dealershipLookupStage,
      {
        $group: {
          _id: '$vehicle_type',
          reportCount: { $sum: 1 },
          totalRevenue: { $sum: '$workshop_summary.grand_total' },
          avgRevenue: { $avg: '$workshop_summary.grand_total' },
          totalPartsCost: { $sum: '$workshop_summary.parts_cost' },
          totalLaborCost: { $sum: '$workshop_summary.labor_cost' }
        }
      },
      {
        $project: {
          vehicleType: '$_id',
          reportCount: 1,
          totalRevenue: 1,
          avgRevenue: 1,
          totalPartsCost: 1,
          totalLaborCost: 1,
          partsToLaborRatio: {
            $cond: [
              { $gt: ['$totalLaborCost', 0] },
              { $divide: ['$totalPartsCost', '$totalLaborCost'] },
              0
            ]
          }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    // 3. Revenue by Report Type
    const revenueByReportType = await WorkshopReport.aggregate([
      { $match: baseMatch },
      ...dealershipLookupStage,
      {
        $group: {
          _id: '$report_type',
          reportCount: { $sum: 1 },
          totalRevenue: { $sum: '$workshop_summary.grand_total' },
          avgRevenue: { $avg: '$workshop_summary.grand_total' },
          avgWorkEntries: { $avg: '$workshop_summary.total_work_entries' }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    // 4. Monthly Revenue Trends
    const monthlyRevenueTrends = await WorkshopReport.aggregate([
      { $match: baseMatch },
      ...dealershipLookupStage,
      {
        $group: {
          _id: {
            year: { $year: '$generated_at' },
            month: { $month: '$generated_at' }
          },
          reportCount: { $sum: 1 },
          totalRevenue: { $sum: '$workshop_summary.grand_total' },
          totalPartsCost: { $sum: '$workshop_summary.parts_cost' },
          totalLaborCost: { $sum: '$workshop_summary.labor_cost' },
          avgRevenuePerReport: { $avg: '$workshop_summary.grand_total' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // 5. Revenue Distribution Ranges
    const revenueDistribution = await WorkshopReport.aggregate([
      { $match: baseMatch },
      ...dealershipLookupStage,
      {
        $bucket: {
          groupBy: '$workshop_summary.grand_total',
          boundaries: [0, 1000, 2500, 5000, 10000, 25000, 50000],
          default: 'Over 50000',
          output: {
            count: { $sum: 1 },
            totalRevenue: { $sum: '$workshop_summary.grand_total' },
            avgRevenue: { $avg: '$workshop_summary.grand_total' }
          }
        }
      }
    ]);

    // 6. Top Revenue Generating Reports
    const topRevenueReports = await WorkshopReport.aggregate([
      { $match: baseMatch },
      ...dealershipLookupStage,
      {
        $project: {
          vehicle_stock_id: 1,
          vehicle_details: 1,
          vehicle_type: 1,
          report_type: 1,
          total_revenue: '$workshop_summary.grand_total',
          parts_cost: '$workshop_summary.parts_cost',
          labor_cost: '$workshop_summary.labor_cost',
          work_entries: '$workshop_summary.total_work_entries',
          duration_days: '$workshop_summary.duration_days'
        }
      },
      { $sort: { total_revenue: -1 } },
      { $limit: 20 }
    ]);

    // 7. Profitability Metrics (Revenue per Day, per Work Entry)
    const profitabilityMetrics = await WorkshopReport.aggregate([
      { $match: baseMatch },
      ...dealershipLookupStage,
      {
        $project: {
          vehicle_type: 1,
          report_type: 1,
          total_revenue: '$workshop_summary.grand_total',
          duration_days: '$workshop_summary.duration_days',
          work_entries: '$workshop_summary.total_work_entries',
          revenuePerDay: {
            $cond: [
              { $gt: ['$workshop_summary.duration_days', 0] },
              { $divide: ['$workshop_summary.grand_total', '$workshop_summary.duration_days'] },
              0
            ]
          },
          revenuePerWorkEntry: {
            $cond: [
              { $gt: ['$workshop_summary.total_work_entries', 0] },
              { $divide: ['$workshop_summary.grand_total', '$workshop_summary.total_work_entries'] },
              0
            ]
          }
        }
      },
      {
        $group: {
          _id: {
            vehicleType: '$vehicle_type',
            reportType: '$report_type'
          },
          avgRevenuePerDay: { $avg: '$revenuePerDay' },
          avgRevenuePerWorkEntry: { $avg: '$revenuePerWorkEntry' },
          reportCount: { $sum: 1 }
        }
      },
      { $sort: { avgRevenuePerDay: -1 } }
    ]);

    const response = formatReportResponse({
      overallRevenue: overallRevenue[0] || {
        totalReports: 0,
        totalRevenue: 0,
        totalPartsCost: 0,
        totalLaborCost: 0,
        totalGST: 0,
        avgRevenuePerReport: 0,
        avgPartsRevenue: 0,
        avgLaborRevenue: 0,
        partsRevenuePercentage: 0,
        laborRevenuePercentage: 0,
        gstPercentage: 0
      },
      revenueByVehicleType,
      revenueByReportType,
      monthlyRevenueTrends,
      revenueDistribution,
      topRevenueReports,
      profitabilityMetrics
    }, {
      reportType: 'workshop_revenue_analysis',
      filters: { dealershipFilter, dateFilter }
    });

    res.json(response);
  } catch (error) {
    handleReportError(error, res, 'Workshop Revenue Analysis');
  }
};


module.exports = {
  getWorkshopReportOverview,
  getWorkshopCostBreakdown,
  getWorkshopQualityMetrics,
  getWorkshopTechnicianPerformance,
  getWorkshopSupplierScorecard,
  getWorkshopWarrantyTracking,
  getWorkshopCompletionTimeAnalysis,
  getWorkshopRevenueAnalysis
};