/**
 * WorkshopQuote Report Controller
 * Handles all workshop quote-related analytics and reporting endpoints
 * Covers quote lifecycle, supplier performance, cost analysis, and operational metrics
 */

const WorkshopQuote = require('../../models/WorkshopQuote');
const Supplier = require('../../models/Supplier');
const Conversation = require('../../models/Conversation');
const { 
  getDealershipFilter, 
  getDateFilter, 
  formatReportResponse, 
  handleReportError,
  buildBasePipeline 
} = require('../../utils/reportHelpers');

/**
 * Get Quote Overview by Status
 * Provides comprehensive status distribution across all quote types
 * Includes supplier vs bay vs manual quote breakdown and dealership-wise analysis
 * 
 * @route GET /api/company/reports/workshop-quote/overview-by-status
 * @access Private (company_super_admin, company_admin)
 */
const getQuoteOverviewByStatus = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    // Base match criteria
    const baseMatch = {
      company_id,
      ...dealershipFilter,
      ...dateFilter
    };

    // 1. Status Distribution with Quote Type Breakdown
    const statusDistribution = await WorkshopQuote.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: {
            status: '$status',
            quoteType: '$quote_type'
          },
          count: { $sum: 1 },
          avgQuoteAmount: { $avg: '$quote_amount' },
          totalQuoteAmount: { $sum: '$quote_amount' }
        }
      },
      {
        $group: {
          _id: '$_id.status',
          totalCount: { $sum: '$count' },
          avgQuoteAmount: { $avg: '$avgQuoteAmount' },
          totalQuoteAmount: { $sum: '$totalQuoteAmount' },
          quoteTypeBreakdown: {
            $push: {
              quoteType: '$_id.quoteType',
              count: '$count',
              avgAmount: '$avgQuoteAmount'
            }
          }
        }
      },
      { $sort: { totalCount: -1 } }
    ]);

    // 2. Quote Type Distribution
    const quoteTypeDistribution = await WorkshopQuote.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: '$quote_type',
          count: { $sum: 1 },
          avgQuoteAmount: { $avg: '$quote_amount' },
          statusBreakdown: {
            $push: {
              status: '$status',
              quoteAmount: '$quote_amount'
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          count: 1,
          avgQuoteAmount: 1,
          statusCounts: {
            $reduce: {
              input: '$statusBreakdown',
              initialValue: {},
              in: {
                $mergeObjects: [
                  '$$value',
                  {
                    $cond: [
                      { $ne: ['$$this.status', null] },
                      {
                        $arrayToObject: [[{
                          k: '$$this.status',
                          v: { $add: [{ $ifNull: [{ $getField: { field: '$$this.status', input: '$$value' } }, 0] }, 1] }
                        }]]
                      },
                      {}
                    ]
                  }
                ]
              }
            }
          }
        }
      }
    ]);

    // 3. Dealership-wise Quote Analysis (if not primary admin)
    let dealershipAnalysis = [];
    if (!req.user.is_primary_admin) {
      dealershipAnalysis = await WorkshopQuote.aggregate([
        { $match: baseMatch },
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
          $group: {
            _id: '$vehicleData.dealership_id',
            totalQuotes: { $sum: 1 },
            avgQuoteAmount: { $avg: '$quote_amount' },
            quoteTypeBreakdown: {
              $push: {
                type: '$quote_type',
                status: '$status'
              }
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
            dealershipId: '$_id',
            dealershipName: '$dealershipInfo.name',
            totalQuotes: 1,
            avgQuoteAmount: 1,
            supplierQuotes: {
              $size: {
                $filter: {
                  input: '$quoteTypeBreakdown',
                  as: 'qt',
                  cond: { $eq: ['$$qt.type', 'supplier'] }
                }
              }
            },
            bayQuotes: {
              $size: {
                $filter: {
                  input: '$quoteTypeBreakdown',
                  as: 'qt',
                  cond: { $eq: ['$$qt.type', 'bay'] }
                }
              }
            },
            manualQuotes: {
              $size: {
                $filter: {
                  input: '$quoteTypeBreakdown',
                  as: 'qt',
                  cond: { $eq: ['$$qt.type', 'manual'] }
                }
              }
            }
          }
        },
        { $sort: { totalQuotes: -1 } }
      ]);
    }

    // 4. Overall Summary Metrics
    const summaryMetrics = await WorkshopQuote.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: null,
          totalQuotes: { $sum: 1 },
          totalQuoteValue: { $sum: '$quote_amount' },
          avgQuoteAmount: { $avg: '$quote_amount' },
          supplierQuotes: {
            $sum: { $cond: [{ $eq: ['$quote_type', 'supplier'] }, 1, 0] }
          },
          bayQuotes: {
            $sum: { $cond: [{ $eq: ['$quote_type', 'bay'] }, 1, 0] }
          },
          manualQuotes: {
            $sum: { $cond: [{ $eq: ['$quote_type', 'manual'] }, 1, 0] }
          },
          completedQuotes: {
            $sum: { $cond: [{ $eq: ['$status', 'completed_jobs'] }, 1, 0] }
          },
          inProgressQuotes: {
            $sum: { $cond: [{ $eq: ['$status', 'work_in_progress'] }, 1, 0] }
          }
        }
      }
    ]);

    const response = formatReportResponse({
      statusDistribution,
      quoteTypeDistribution,
      dealershipAnalysis,
      summary: summaryMetrics[0] || {
        totalQuotes: 0,
        totalQuoteValue: 0,
        avgQuoteAmount: 0,
        supplierQuotes: 0,
        bayQuotes: 0,
        manualQuotes: 0,
        completedQuotes: 0,
        inProgressQuotes: 0
      }
    }, {
      reportType: 'quote_overview_by_status',
      filters: { dealershipFilter, dateFilter }
    });

    res.json(response);
  } catch (error) {
    handleReportError(error, res, 'Quote Overview by Status');
  }
};


/**
 * Get Quote Lifecycle Analysis
 * Tracks quote progression from request to completion
 * Calculates average time at each stage and identifies bottlenecks
 * 
 * @route GET /api/company/reports/workshop-quote/lifecycle-analysis
 * @access Private (company_super_admin, company_admin)
 */
const getQuoteLifecycleAnalysis = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    const baseMatch = {
      company_id,
      ...dealershipFilter,
      ...dateFilter
    };

    // 1. Stage Duration Analysis
    const stageDurations = await WorkshopQuote.aggregate([
      { $match: baseMatch },
      {
        $project: {
          quote_type: 1,
          status: 1,
          created_at: 1,
          approved_at: 1,
          work_started_at: 1,
          work_submitted_at: 1,
          work_completed_at: 1,
          // Calculate durations in hours
          timeToApproval: {
            $cond: [
              { $and: ['$approved_at', '$created_at'] },
              { $divide: [{ $subtract: ['$approved_at', '$created_at'] }, 3600000] },
              null
            ]
          },
          timeToWorkStart: {
            $cond: [
              { $and: ['$work_started_at', '$approved_at'] },
              { $divide: [{ $subtract: ['$work_started_at', '$approved_at'] }, 3600000] },
              null
            ]
          },
          timeToSubmission: {
            $cond: [
              { $and: ['$work_submitted_at', '$work_started_at'] },
              { $divide: [{ $subtract: ['$work_submitted_at', '$work_started_at'] }, 3600000] },
              null
            ]
          },
          timeToCompletion: {
            $cond: [
              { $and: ['$work_completed_at', '$work_submitted_at'] },
              { $divide: [{ $subtract: ['$work_completed_at', '$work_submitted_at'] }, 3600000] },
              null
            ]
          },
          totalCycleTime: {
            $cond: [
              { $and: ['$work_completed_at', '$created_at'] },
              { $divide: [{ $subtract: ['$work_completed_at', '$created_at'] }, 3600000] },
              null
            ]
          }
        }
      },
      {
        $group: {
          _id: '$quote_type',
          totalQuotes: { $sum: 1 },
          avgTimeToApproval: { $avg: '$timeToApproval' },
          avgTimeToWorkStart: { $avg: '$timeToWorkStart' },
          avgTimeToSubmission: { $avg: '$timeToSubmission' },
          avgTimeToCompletion: { $avg: '$timeToCompletion' },
          avgTotalCycleTime: { $avg: '$totalCycleTime' },
          minCycleTime: { $min: '$totalCycleTime' },
          maxCycleTime: { $max: '$totalCycleTime' }
        }
      }
    ]);

    // 2. Status Progression Funnel
    const statusFunnel = await WorkshopQuote.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgQuoteAmount: { $avg: '$quote_amount' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // 3. Bottleneck Identification (quotes stuck in stages for too long)
    const bottlenecks = await WorkshopQuote.aggregate([
      { 
        $match: { 
          ...baseMatch,
          status: { 
            $in: ['quote_request', 'quote_sent', 'work_in_progress', 'work_review'] 
          }
        } 
      },
      {
        $project: {
          status: 1,
          quote_type: 1,
          vehicle_stock_id: 1,
          field_name: 1,
          created_at: 1,
          daysInCurrentStatus: {
            $divide: [
              { $subtract: [new Date(), '$created_at'] },
              86400000 // milliseconds in a day
            ]
          }
        }
      },
      {
        $match: {
          daysInCurrentStatus: { $gt: 7 } // Stuck for more than 7 days
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgDaysStuck: { $avg: '$daysInCurrentStatus' },
          quotes: {
            $push: {
              vehicleStockId: '$vehicle_stock_id',
              fieldName: '$field_name',
              quoteType: '$quote_type',
              daysStuck: '$daysInCurrentStatus'
            }
          }
        }
      },
      {
        $sort: { avgDaysStuck: -1 }
      }
    ]);

    // 4. Completion Rate by Quote Type
    const completionRates = await WorkshopQuote.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: '$quote_type',
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
          completionRate: {
            $multiply: [
              { $divide: ['$completedQuotes', '$totalQuotes'] },
              100
            ]
          }
        }
      }
    ]);

    // 5. Monthly Lifecycle Trends
    const monthlyTrends = await WorkshopQuote.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: {
            year: { $year: '$created_at' },
            month: { $month: '$created_at' }
          },
          totalQuotes: { $sum: 1 },
          completedQuotes: {
            $sum: { $cond: [{ $eq: ['$status', 'completed_jobs'] }, 1, 0] }
          },
          avgCycleTime: {
            $avg: {
              $cond: [
                { $and: ['$work_completed_at', '$created_at'] },
                { $divide: [{ $subtract: ['$work_completed_at', '$created_at'] }, 3600000] },
                null
              ]
            }
          }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    const response = formatReportResponse({
      stageDurations,
      statusFunnel,
      bottlenecks,
      completionRates,
      monthlyTrends
    }, {
      reportType: 'quote_lifecycle_analysis',
      filters: { dealershipFilter, dateFilter }
    });

    res.json(response);
  } catch (error) {
    handleReportError(error, res, 'Quote Lifecycle Analysis');
  }
};

/**
 * Get Quote Supplier Performance
 * Ranks suppliers by response time, cost, and quality
 * Calculates approval rates per supplier and tracks response patterns
 * 
 * @route GET /api/company/reports/workshop-quote/supplier-performance
 * @access Private (company_super_admin, company_admin)
 */
const getQuoteSupplierPerformance = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    const baseMatch = {
      company_id,
      quote_type: 'supplier',
      ...dealershipFilter,
      ...dateFilter
    };

    // 1. Supplier Performance Ranking
    const supplierRanking = await WorkshopQuote.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$supplier_responses', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$supplier_responses.supplier_id',
          totalQuotesReceived: { $sum: 1 },
          approvedQuotes: {
            $sum: { 
              $cond: [
                { $eq: ['$supplier_responses.status', 'approved'] }, 
                1, 
                0
              ] 
            }
          },
          rejectedQuotes: {
            $sum: { 
              $cond: [
                { $eq: ['$supplier_responses.status', 'rejected'] }, 
                1, 
                0
              ] 
            }
          },
          notInterestedCount: {
            $sum: { 
              $cond: [
                { $eq: ['$supplier_responses.status', 'not_interested'] }, 
                1, 
                0
              ] 
            }
          },
          avgEstimatedCost: { $avg: '$supplier_responses.estimated_cost' },
          avgResponseTime: {
            $avg: {
              $divide: [
                { $subtract: ['$supplier_responses.responded_at', '$created_at'] },
                3600000 // Convert to hours
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'suppliers',
          localField: '_id',
          foreignField: '_id',
          as: 'supplierInfo'
        }
      },
      { $unwind: { path: '$supplierInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          supplierId: '$_id',
          supplierName: '$supplierInfo.name',
          supplierEmail: '$supplierInfo.email',
          totalQuotesReceived: 1,
          approvedQuotes: 1,
          rejectedQuotes: 1,
          notInterestedCount: 1,
          avgEstimatedCost: 1,
          avgResponseTime: 1,
          approvalRate: {
            $multiply: [
              { $divide: ['$approvedQuotes', '$totalQuotesReceived'] },
              100
            ]
          },
          responseRate: {
            $multiply: [
              { 
                $divide: [
                  { $subtract: ['$totalQuotesReceived', '$notInterestedCount'] },
                  '$totalQuotesReceived'
                ] 
              },
              100
            ]
          }
        }
      },
      {
        $sort: { approvalRate: -1, avgResponseTime: 1 }
      }
    ]);

    // 2. Supplier Response Time Analysis
    const responseTimeAnalysis = await WorkshopQuote.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$supplier_responses', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          supplier_id: '$supplier_responses.supplier_id',
          responseTimeHours: {
            $divide: [
              { $subtract: ['$supplier_responses.responded_at', '$created_at'] },
              3600000
            ]
          },
          status: '$supplier_responses.status'
        }
      },
      {
        $bucket: {
          groupBy: '$responseTimeHours',
          boundaries: [0, 2, 6, 12, 24, 48, 72, 168], // Hours: 0-2, 2-6, 6-12, 12-24, 24-48, 48-72, 72-168 (1 week)
          default: 'Over 1 week',
          output: {
            count: { $sum: 1 },
            suppliers: { $addToSet: '$supplier_id' }
          }
        }
      }
    ]);

    // 3. Cost Competitiveness Analysis
    const costAnalysis = await WorkshopQuote.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$supplier_responses', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$_id', // Group by quote
          quoteAmount: { $first: '$quote_amount' },
          responses: {
            $push: {
              supplier_id: '$supplier_responses.supplier_id',
              estimated_cost: '$supplier_responses.estimated_cost',
              status: '$supplier_responses.status'
            }
          },
          lowestCost: { $min: '$supplier_responses.estimated_cost' },
          highestCost: { $max: '$supplier_responses.estimated_cost' },
          avgCost: { $avg: '$supplier_responses.estimated_cost' }
        }
      },
      { $unwind: '$responses' },
      {
        $group: {
          _id: '$responses.supplier_id',
          totalQuotes: { $sum: 1 },
          timesLowestBidder: {
            $sum: {
              $cond: [
                { $eq: ['$responses.estimated_cost', '$lowestCost'] },
                1,
                0
              ]
            }
          },
          timesHighestBidder: {
            $sum: {
              $cond: [
                { $eq: ['$responses.estimated_cost', '$highestCost'] },
                1,
                0
              ]
            }
          },
          avgCostVsMarket: {
            $avg: {
              $subtract: ['$responses.estimated_cost', '$avgCost']
            }
          }
        }
      },
      {
        $lookup: {
          from: 'suppliers',
          localField: '_id',
          foreignField: '_id',
          as: 'supplierInfo'
        }
      },
      { $unwind: { path: '$supplierInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          supplierId: '$_id',
          supplierName: '$supplierInfo.name',
          totalQuotes: 1,
          timesLowestBidder: 1,
          timesHighestBidder: 1,
          avgCostVsMarket: 1,
          lowestBidderRate: {
            $multiply: [
              { $divide: ['$timesLowestBidder', '$totalQuotes'] },
              100
            ]
          }
        }
      },
      {
        $sort: { lowestBidderRate: -1 }
      }
    ]);

    // 4. Supplier Quality Metrics (based on completed work)
    const qualityMetrics = await WorkshopQuote.aggregate([
      { 
        $match: { 
          ...baseMatch,
          status: 'completed_jobs',
          approved_supplier: { $exists: true }
        } 
      },
      {
        $group: {
          _id: '$approved_supplier',
          completedJobs: { $sum: 1 },
          reworkCount: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'rework'] },
                1,
                0
              ]
            }
          },
          avgQuoteDifference: { $avg: '$comment_sheet.quote_difference' },
          avgFinalPrice: { $avg: '$comment_sheet.final_price' },
          totalRevenue: { $sum: '$comment_sheet.final_price' }
        }
      },
      {
        $lookup: {
          from: 'suppliers',
          localField: '_id',
          foreignField: '_id',
          as: 'supplierInfo'
        }
      },
      { $unwind: { path: '$supplierInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          supplierId: '$_id',
          supplierName: '$supplierInfo.name',
          completedJobs: 1,
          reworkCount: 1,
          avgQuoteDifference: 1,
          avgFinalPrice: 1,
          totalRevenue: 1,
          reworkRate: {
            $multiply: [
              { $divide: ['$reworkCount', '$completedJobs'] },
              100
            ]
          },
          quoteAccuracy: {
            $subtract: [
              100,
              {
                $multiply: [
                  { 
                    $divide: [
                      { $abs: '$avgQuoteDifference' },
                      '$avgFinalPrice'
                    ] 
                  },
                  100
                ]
              }
            ]
          }
        }
      },
      {
        $sort: { quoteAccuracy: -1, reworkRate: 1 }
      }
    ]);

    // 5. Top Performing Suppliers Summary
    const topSuppliers = await WorkshopQuote.aggregate([
      { $match: baseMatch },
      {
        $match: {
          approved_supplier: { $exists: true }
        }
      },
      {
        $group: {
          _id: '$approved_supplier',
          totalApprovedQuotes: { $sum: 1 },
          totalQuoteValue: { $sum: '$quote_amount' },
          completedJobs: {
            $sum: { $cond: [{ $eq: ['$status', 'completed_jobs'] }, 1, 0] }
          }
        }
      },
      {
        $lookup: {
          from: 'suppliers',
          localField: '_id',
          foreignField: '_id',
          as: 'supplierInfo'
        }
      },
      { $unwind: { path: '$supplierInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          supplierId: '$_id',
          supplierName: '$supplierInfo.name',
          totalApprovedQuotes: 1,
          totalQuoteValue: 1,
          completedJobs: 1,
          completionRate: {
            $multiply: [
              { $divide: ['$completedJobs', '$totalApprovedQuotes'] },
              100
            ]
          }
        }
      },
      {
        $sort: { totalApprovedQuotes: -1 }
      },
      {
        $limit: 10
      }
    ]);

    const response = formatReportResponse({
      supplierRanking,
      responseTimeAnalysis,
      costAnalysis,
      qualityMetrics,
      topSuppliers
    }, {
      reportType: 'quote_supplier_performance',
      filters: { dealershipFilter, dateFilter }
    });

    res.json(response);
  } catch (error) {
    handleReportError(error, res, 'Quote Supplier Performance');
  }
};

/**
 * Get Quote Cost Analysis
 * Compares quote amounts vs final costs
 * Calculates cost variance and accuracy, analyzes parts vs labor breakdown
 * 
 * @route GET /api/company/reports/workshop-quote/cost-analysis
 * @access Private (company_super_admin, company_admin)
 */
const getQuoteCostAnalysis = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    const baseMatch = {
      company_id,
      ...dealershipFilter,
      ...dateFilter
    };

    // 1. Quote vs Final Cost Variance Analysis
    const costVariance = await WorkshopQuote.aggregate([
      { 
        $match: { 
          ...baseMatch,
          'comment_sheet.final_price': { $exists: true }
        } 
      },
      {
        $project: {
          quote_type: 1,
          quote_amount: 1,
          final_price: '$comment_sheet.final_price',
          quote_difference: '$comment_sheet.quote_difference',
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
          _id: '$quote_type',
          totalQuotes: { $sum: 1 },
          avgQuoteAmount: { $avg: '$quote_amount' },
          avgFinalPrice: { $avg: '$final_price' },
          avgVariance: { $avg: '$variance' },
          avgVariancePercentage: { $avg: '$variancePercentage' },
          underBudgetCount: {
            $sum: { $cond: [{ $lt: ['$variance', 0] }, 1, 0] }
          },
          overBudgetCount: {
            $sum: { $cond: [{ $gt: ['$variance', 0] }, 1, 0] }
          },
          onBudgetCount: {
            $sum: { $cond: [{ $eq: ['$variance', 0] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          _id: 1,
          totalQuotes: 1,
          avgQuoteAmount: 1,
          avgFinalPrice: 1,
          avgVariance: 1,
          avgVariancePercentage: 1,
          underBudgetCount: 1,
          overBudgetCount: 1,
          onBudgetCount: 1,
          accuracyRate: {
            $multiply: [
              {
                $divide: [
                  { $add: ['$onBudgetCount', { $multiply: ['$underBudgetCount', 0.5] }] },
                  '$totalQuotes'
                ]
              },
              100
            ]
          }
        }
      }
    ]);

    // 2. Parts vs Labor Cost Breakdown
    const partsLaborBreakdown = await WorkshopQuote.aggregate([
      { 
        $match: { 
          ...baseMatch,
          'comment_sheet.work_entries': { $exists: true, $ne: [] }
        } 
      },
      { $unwind: '$comment_sheet.work_entries' },
      {
        $group: {
          _id: '$quote_type',
          totalWorkEntries: { $sum: 1 },
          totalPartsCost: { $sum: '$comment_sheet.work_entries.parts_cost' },
          totalLaborCost: { $sum: '$comment_sheet.work_entries.labor_cost' },
          totalGST: { $sum: '$comment_sheet.work_entries.gst' },
          avgPartsCost: { $avg: '$comment_sheet.work_entries.parts_cost' },
          avgLaborCost: { $avg: '$comment_sheet.work_entries.labor_cost' },
          avgGST: { $avg: '$comment_sheet.work_entries.gst' }
        }
      },
      {
        $project: {
          _id: 1,
          totalWorkEntries: 1,
          totalPartsCost: 1,
          totalLaborCost: 1,
          totalGST: 1,
          avgPartsCost: 1,
          avgLaborCost: 1,
          avgGST: 1,
          totalCost: { $add: ['$totalPartsCost', '$totalLaborCost', '$totalGST'] },
          partsPercentage: {
            $multiply: [
              {
                $divide: [
                  '$totalPartsCost',
                  { $add: ['$totalPartsCost', '$totalLaborCost', '$totalGST'] }
                ]
              },
              100
            ]
          },
          laborPercentage: {
            $multiply: [
              {
                $divide: [
                  '$totalLaborCost',
                  { $add: ['$totalPartsCost', '$totalLaborCost', '$totalGST'] }
                ]
              },
              100
            ]
          },
          gstPercentage: {
            $multiply: [
              {
                $divide: [
                  '$totalGST',
                  { $add: ['$totalPartsCost', '$totalLaborCost', '$totalGST'] }
                ]
              },
              100
            ]
          }
        }
      }
    ]);

    // 3. Cost Distribution by Range
    const costDistribution = await WorkshopQuote.aggregate([
      { $match: baseMatch },
      {
        $bucket: {
          groupBy: '$quote_amount',
          boundaries: [0, 500, 1000, 2500, 5000, 10000, 25000, 50000],
          default: 'Over 50000',
          output: {
            count: { $sum: 1 },
            avgQuoteAmount: { $avg: '$quote_amount' },
            avgFinalPrice: { $avg: '$comment_sheet.final_price' },
            quoteTypes: {
              $push: '$quote_type'
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          count: 1,
          avgQuoteAmount: 1,
          avgFinalPrice: 1,
          supplierQuotes: {
            $size: {
              $filter: {
                input: '$quoteTypes',
                as: 'qt',
                cond: { $eq: ['$$qt', 'supplier'] }
              }
            }
          },
          bayQuotes: {
            $size: {
              $filter: {
                input: '$quoteTypes',
                as: 'qt',
                cond: { $eq: ['$$qt', 'bay'] }
              }
            }
          },
          manualQuotes: {
            $size: {
              $filter: {
                input: '$quoteTypes',
                as: 'qt',
                cond: { $eq: ['$$qt', 'manual'] }
              }
            }
          }
        }
      }
    ]);

    // 4. Monthly Cost Trends
    const monthlyCostTrends = await WorkshopQuote.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: {
            year: { $year: '$created_at' },
            month: { $month: '$created_at' },
            quoteType: '$quote_type'
          },
          totalQuotes: { $sum: 1 },
          totalQuoteAmount: { $sum: '$quote_amount' },
          totalFinalPrice: { $sum: '$comment_sheet.final_price' },
          avgQuoteAmount: { $avg: '$quote_amount' },
          avgFinalPrice: { $avg: '$comment_sheet.final_price' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // 5. Cost Accuracy by Supplier
    const supplierCostAccuracy = await WorkshopQuote.aggregate([
      { 
        $match: { 
          ...baseMatch,
          quote_type: 'supplier',
          approved_supplier: { $exists: true },
          'comment_sheet.final_price': { $exists: true }
        } 
      },
      {
        $group: {
          _id: '$approved_supplier',
          totalJobs: { $sum: 1 },
          avgQuoteAmount: { $avg: '$quote_amount' },
          avgFinalPrice: { $avg: '$comment_sheet.final_price' },
          avgVariance: { 
            $avg: { 
              $subtract: ['$comment_sheet.final_price', '$quote_amount'] 
            } 
          },
          totalRevenue: { $sum: '$comment_sheet.final_price' }
        }
      },
      {
        $lookup: {
          from: 'suppliers',
          localField: '_id',
          foreignField: '_id',
          as: 'supplierInfo'
        }
      },
      { $unwind: { path: '$supplierInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          supplierId: '$_id',
          supplierName: '$supplierInfo.name',
          totalJobs: 1,
          avgQuoteAmount: 1,
          avgFinalPrice: 1,
          avgVariance: 1,
          totalRevenue: 1,
          accuracyScore: {
            $subtract: [
              100,
              {
                $multiply: [
                  {
                    $divide: [
                      { $abs: '$avgVariance' },
                      '$avgQuoteAmount'
                    ]
                  },
                  100
                ]
              }
            ]
          }
        }
      },
      {
        $sort: { accuracyScore: -1 }
      },
      {
        $limit: 20
      }
    ]);

    // 6. Overall Cost Summary
    const costSummary = await WorkshopQuote.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: null,
          totalQuotes: { $sum: 1 },
          totalQuoteValue: { $sum: '$quote_amount' },
          totalFinalValue: { $sum: '$comment_sheet.final_price' },
          avgQuoteAmount: { $avg: '$quote_amount' },
          avgFinalPrice: { $avg: '$comment_sheet.final_price' },
          minQuoteAmount: { $min: '$quote_amount' },
          maxQuoteAmount: { $max: '$quote_amount' },
          totalVariance: {
            $sum: {
              $subtract: ['$comment_sheet.final_price', '$quote_amount']
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalQuotes: 1,
          totalQuoteValue: 1,
          totalFinalValue: 1,
          avgQuoteAmount: 1,
          avgFinalPrice: 1,
          minQuoteAmount: 1,
          maxQuoteAmount: 1,
          totalVariance: 1,
          overallVariancePercentage: {
            $multiply: [
              {
                $divide: [
                  '$totalVariance',
                  '$totalQuoteValue'
                ]
              },
              100
            ]
          }
        }
      }
    ]);

    const response = formatReportResponse({
      costVariance,
      partsLaborBreakdown,
      costDistribution,
      monthlyCostTrends,
      supplierCostAccuracy,
      summary: costSummary[0] || {}
    }, {
      reportType: 'quote_cost_analysis',
      filters: { dealershipFilter, dateFilter }
    });

    res.json(response);
  } catch (error) {
    handleReportError(error, res, 'Quote Cost Analysis');
  }
};

/**
 * Get Quote Approval Rates
 * Analyzes approval success rates and patterns across quote types
 * 
 * @route GET /api/company/reports/workshop-quote/approval-rates
 * @access Private (company_super_admin, company_admin)
 */
const getQuoteApprovalRates = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    const baseMatch = {
      company_id,
      ...dealershipFilter,
      ...dateFilter
    };

    // 1. Overall Approval Rates by Quote Type
    const approvalRatesByType = await WorkshopQuote.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: '$quote_type',
          totalQuotes: { $sum: 1 },
          approvedQuotes: {
            $sum: { 
              $cond: [
                { $in: ['$status', ['quote_approved', 'work_in_progress', 'work_review', 'completed_jobs']] },
                1,
                0
              ]
            }
          },
          rejectedQuotes: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'booking_rejected'] },
                1,
                0
              ]
            }
          },
          pendingQuotes: {
            $sum: {
              $cond: [
                { $in: ['$status', ['quote_request', 'quote_sent', 'booking_request']] },
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
          totalQuotes: 1,
          approvedQuotes: 1,
          rejectedQuotes: 1,
          pendingQuotes: 1,
          approvalRate: {
            $multiply: [
              { $divide: ['$approvedQuotes', '$totalQuotes'] },
              100
            ]
          },
          rejectionRate: {
            $multiply: [
              { $divide: ['$rejectedQuotes', '$totalQuotes'] },
              100
            ]
          }
        }
      }
    ]);

    // 2. Approval Trends Over Time
    const approvalTrends = await WorkshopQuote.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: {
            year: { $year: '$created_at' },
            month: { $month: '$created_at' }
          },
          totalQuotes: { $sum: 1 },
          approvedQuotes: {
            $sum: {
              $cond: [
                { $in: ['$status', ['quote_approved', 'work_in_progress', 'completed_jobs']] },
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
          totalQuotes: 1,
          approvedQuotes: 1,
          approvalRate: {
            $multiply: [
              { $divide: ['$approvedQuotes', '$totalQuotes'] },
              100
            ]
          }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // 3. Approval Rates by Field Type
    const approvalByField = await WorkshopQuote.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: '$field_name',
          totalQuotes: { $sum: 1 },
          approvedQuotes: {
            $sum: {
              $cond: [
                { $in: ['$status', ['quote_approved', 'work_in_progress', 'completed_jobs']] },
                1,
                0
              ]
            }
          },
          avgQuoteAmount: { $avg: '$quote_amount' }
        }
      },
      {
        $project: {
          _id: 1,
          totalQuotes: 1,
          approvedQuotes: 1,
          avgQuoteAmount: 1,
          approvalRate: {
            $multiply: [
              { $divide: ['$approvedQuotes', '$totalQuotes'] },
              100
            ]
          }
        }
      },
      {
        $sort: { totalQuotes: -1 }
      },
      {
        $limit: 20
      }
    ]);

    const response = formatReportResponse({
      approvalRatesByType,
      approvalTrends,
      approvalByField
    }, {
      reportType: 'quote_approval_rates',
      filters: { dealershipFilter, dateFilter }
    });

    res.json(response);
  } catch (error) {
    handleReportError(error, res, 'Quote Approval Rates');
  }
};

/**
 * Get Quote Response Time Analysis
 * Analyzes supplier response time metrics and patterns
 * 
 * @route GET /api/company/reports/workshop-quote/response-time-analysis
 * @access Private (company_super_admin, company_admin)
 */
const getQuoteResponseTimeAnalysis = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    const baseMatch = {
      company_id,
      quote_type: 'supplier',
      ...dealershipFilter,
      ...dateFilter
    };

    // 1. Average Response Times by Supplier
    const supplierResponseTimes = await WorkshopQuote.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$supplier_responses', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          supplier_id: '$supplier_responses.supplier_id',
          responseTimeHours: {
            $divide: [
              { $subtract: ['$supplier_responses.responded_at', '$created_at'] },
              3600000
            ]
          }
        }
      },
      {
        $group: {
          _id: '$supplier_id',
          avgResponseTime: { $avg: '$responseTimeHours' },
          minResponseTime: { $min: '$responseTimeHours' },
          maxResponseTime: { $max: '$responseTimeHours' },
          totalResponses: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'suppliers',
          localField: '_id',
          foreignField: '_id',
          as: 'supplierInfo'
        }
      },
      { $unwind: { path: '$supplierInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          supplierId: '$_id',
          supplierName: '$supplierInfo.name',
          avgResponseTime: 1,
          minResponseTime: 1,
          maxResponseTime: 1,
          totalResponses: 1
        }
      },
      {
        $sort: { avgResponseTime: 1 }
      }
    ]);

    // 2. Response Time Distribution
    const responseTimeDistribution = await WorkshopQuote.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$supplier_responses', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          responseTimeHours: {
            $divide: [
              { $subtract: ['$supplier_responses.responded_at', '$created_at'] },
              3600000
            ]
          }
        }
      },
      {
        $bucket: {
          groupBy: '$responseTimeHours',
          boundaries: [0, 1, 2, 4, 8, 12, 24, 48, 72],
          default: 'Over 72 hours',
          output: {
            count: { $sum: 1 }
          }
        }
      }
    ]);

    const response = formatReportResponse({
      supplierResponseTimes,
      responseTimeDistribution
    }, {
      reportType: 'quote_response_time_analysis',
      filters: { dealershipFilter, dateFilter }
    });

    res.json(response);
  } catch (error) {
    handleReportError(error, res, 'Quote Response Time Analysis');
  }
};

/**
 * Get Quote Type Distribution
 * Analyzes distribution across supplier/bay/manual quote types
 * 
 * @route GET /api/company/reports/workshop-quote/type-distribution
 * @access Private (company_super_admin, company_admin)
 */
const getQuoteTypeDistribution = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    const baseMatch = {
      company_id,
      ...dealershipFilter,
      ...dateFilter
    };

    // 1. Overall Type Distribution
    const typeDistribution = await WorkshopQuote.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: '$quote_type',
          count: { $sum: 1 },
          avgQuoteAmount: { $avg: '$quote_amount' },
          totalQuoteValue: { $sum: '$quote_amount' },
          completedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'completed_jobs'] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          _id: 1,
          count: 1,
          avgQuoteAmount: 1,
          totalQuoteValue: 1,
          completedCount: 1,
          completionRate: {
            $multiply: [
              { $divide: ['$completedCount', '$count'] },
              100
            ]
          }
        }
      }
    ]);

    // 2. Type Distribution by Vehicle Type
    const typeByVehicle = await WorkshopQuote.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: {
            quoteType: '$quote_type',
            vehicleType: '$vehicle_type'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.quoteType',
          vehicleBreakdown: {
            $push: {
              vehicleType: '$_id.vehicleType',
              count: '$count'
            }
          },
          totalCount: { $sum: '$count' }
        }
      }
    ]);

    // 3. Monthly Type Trends
    const monthlyTypeTrends = await WorkshopQuote.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: {
            year: { $year: '$created_at' },
            month: { $month: '$created_at' },
            quoteType: '$quote_type'
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    const response = formatReportResponse({
      typeDistribution,
      typeByVehicle,
      monthlyTypeTrends
    }, {
      reportType: 'quote_type_distribution',
      filters: { dealershipFilter, dateFilter }
    });

    res.json(response);
  } catch (error) {
    handleReportError(error, res, 'Quote Type Distribution');
  }
};

/**
 * Get Quote Bay Booking Analysis
 * Analyzes service bay booking patterns and utilization
 * 
 * @route GET /api/company/reports/workshop-quote/bay-booking-analysis
 * @access Private (company_super_admin, company_admin)
 */
const getQuoteBayBookingAnalysis = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    const baseMatch = {
      company_id,
      quote_type: 'bay',
      ...dealershipFilter,
      ...dateFilter
    };

    // 1. Bay Utilization
    const bayUtilization = await WorkshopQuote.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: '$bay_id',
          totalBookings: { $sum: 1 },
          acceptedBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'booking_accepted'] }, 1, 0] }
          },
          rejectedBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'booking_rejected'] }, 1, 0] }
          },
          completedBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'completed_jobs'] }, 1, 0] }
          }
        }
      },
      {
        $lookup: {
          from: 'servicebays',
          localField: '_id',
          foreignField: '_id',
          as: 'bayInfo'
        }
      },
      { $unwind: { path: '$bayInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          bayId: '$_id',
          bayName: '$bayInfo.name',
          totalBookings: 1,
          acceptedBookings: 1,
          rejectedBookings: 1,
          completedBookings: 1,
          acceptanceRate: {
            $multiply: [
              { $divide: ['$acceptedBookings', '$totalBookings'] },
              100
            ]
          },
          completionRate: {
            $multiply: [
              { $divide: ['$completedBookings', '$totalBookings'] },
              100
            ]
          }
        }
      },
      {
        $sort: { totalBookings: -1 }
      }
    ]);

    // 2. Booking Time Patterns
    const bookingTimePatterns = await WorkshopQuote.aggregate([
      { 
        $match: { 
          ...baseMatch,
          booking_date: { $exists: true }
        } 
      },
      {
        $group: {
          _id: {
            dayOfWeek: { $dayOfWeek: '$booking_date' },
            hour: { $substr: ['$booking_start_time', 0, 2] }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.dayOfWeek': 1, '_id.hour': 1 }
      }
    ]);

    const response = formatReportResponse({
      bayUtilization,
      bookingTimePatterns
    }, {
      reportType: 'quote_bay_booking_analysis',
      filters: { dealershipFilter, dateFilter }
    });

    res.json(response);
  } catch (error) {
    handleReportError(error, res, 'Quote Bay Booking Analysis');
  }
};

/**
 * Get Quote Work Entry Analysis
 * Tracks work entry completion and profitability
 * 
 * @route GET /api/company/reports/workshop-quote/work-entry-analysis
 * @access Private (company_super_admin, company_admin)
 */
const getQuoteWorkEntryAnalysis = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    const baseMatch = {
      company_id,
      'comment_sheet.work_entries': { $exists: true, $ne: [] },
      ...dealershipFilter,
      ...dateFilter
    };

    // 1. Work Entry Completion Metrics
    const completionMetrics = await WorkshopQuote.aggregate([
      { $match: baseMatch },
      { $unwind: '$comment_sheet.work_entries' },
      {
        $group: {
          _id: '$quote_type',
          totalWorkEntries: { $sum: 1 },
          completedEntries: {
            $sum: { $cond: ['$comment_sheet.work_entries.completed', 1, 0] }
          },
          avgPartsCost: { $avg: '$comment_sheet.work_entries.parts_cost' },
          avgLaborCost: { $avg: '$comment_sheet.work_entries.labor_cost' },
          totalRevenue: {
            $sum: {
              $add: [
                '$comment_sheet.work_entries.parts_cost',
                '$comment_sheet.work_entries.labor_cost',
                '$comment_sheet.work_entries.gst'
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          totalWorkEntries: 1,
          completedEntries: 1,
          avgPartsCost: 1,
          avgLaborCost: 1,
          totalRevenue: 1,
          completionRate: {
            $multiply: [
              { $divide: ['$completedEntries', '$totalWorkEntries'] },
              100
            ]
          }
        }
      }
    ]);

    // 2. Work Entry Quality Metrics
    const qualityMetrics = await WorkshopQuote.aggregate([
      { $match: baseMatch },
      { $unwind: '$comment_sheet.work_entries' },
      {
        $group: {
          _id: null,
          totalEntries: { $sum: 1 },
          visualInspectionPass: {
            $sum: { $cond: ['$comment_sheet.work_entries.quality_check.visual_inspection', 1, 0] }
          },
          functionalTestPass: {
            $sum: { $cond: ['$comment_sheet.work_entries.quality_check.functional_test', 1, 0] }
          },
          roadTestPass: {
            $sum: { $cond: ['$comment_sheet.work_entries.quality_check.road_test', 1, 0] }
          },
          safetyCheckPass: {
            $sum: { $cond: ['$comment_sheet.work_entries.quality_check.safety_check', 1, 0] }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalEntries: 1,
          visualInspectionPassRate: {
            $multiply: [
              { $divide: ['$visualInspectionPass', '$totalEntries'] },
              100
            ]
          },
          functionalTestPassRate: {
            $multiply: [
              { $divide: ['$functionalTestPass', '$totalEntries'] },
              100
            ]
          },
          roadTestPassRate: {
            $multiply: [
              { $divide: ['$roadTestPass', '$totalEntries'] },
              100
            ]
          },
          safetyCheckPassRate: {
            $multiply: [
              { $divide: ['$safetyCheckPass', '$totalEntries'] },
              100
            ]
          }
        }
      }
    ]);

    const response = formatReportResponse({
      completionMetrics,
      qualityMetrics: qualityMetrics[0] || {}
    }, {
      reportType: 'quote_work_entry_analysis',
      filters: { dealershipFilter, dateFilter }
    });

    res.json(response);
  } catch (error) {
    handleReportError(error, res, 'Quote Work Entry Analysis');
  }
};

/**
 * Get Quote Invoice Accuracy
 * Analyzes invoice vs quote variance and accuracy
 * 
 * @route GET /api/company/reports/workshop-quote/invoice-accuracy
 * @access Private (company_super_admin, company_admin)
 */
const getQuoteInvoiceAccuracy = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    const baseMatch = {
      company_id,
      'comment_sheet.final_price': { $exists: true },
      ...dealershipFilter,
      ...dateFilter
    };

    // 1. Invoice Accuracy by Quote Type
    const accuracyByType = await WorkshopQuote.aggregate([
      { $match: baseMatch },
      {
        $project: {
          quote_type: 1,
          quote_amount: 1,
          final_price: '$comment_sheet.final_price',
          variance: {
            $abs: {
              $subtract: ['$comment_sheet.final_price', '$quote_amount']
            }
          },
          variancePercentage: {
            $abs: {
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
        }
      },
      {
        $group: {
          _id: '$quote_type',
          totalQuotes: { $sum: 1 },
          avgVariance: { $avg: '$variance' },
          avgVariancePercentage: { $avg: '$variancePercentage' },
          within5Percent: {
            $sum: { $cond: [{ $lte: ['$variancePercentage', 5] }, 1, 0] }
          },
          within10Percent: {
            $sum: { $cond: [{ $lte: ['$variancePercentage', 10] }, 1, 0] }
          },
          over10Percent: {
            $sum: { $cond: [{ $gt: ['$variancePercentage', 10] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          _id: 1,
          totalQuotes: 1,
          avgVariance: 1,
          avgVariancePercentage: 1,
          within5Percent: 1,
          within10Percent: 1,
          over10Percent: 1,
          accuracyScore: {
            $multiply: [
              {
                $divide: [
                  '$within5Percent',
                  '$totalQuotes'
                ]
              },
              100
            ]
          }
        }
      }
    ]);

    const response = formatReportResponse({
      accuracyByType
    }, {
      reportType: 'quote_invoice_accuracy',
      filters: { dealershipFilter, dateFilter }
    });

    res.json(response);
  } catch (error) {
    handleReportError(error, res, 'Quote Invoice Accuracy');
  }
};

/**
 * Get Quote Rework Patterns
 * Analyzes rework frequency and causes
 * 
 * @route GET /api/company/reports/workshop-quote/rework-patterns
 * @access Private (company_super_admin, company_admin)
 */
const getQuoteReworkPatterns = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    const baseMatch = {
      company_id,
      ...dealershipFilter,
      ...dateFilter
    };

    // 1. Rework Rate by Quote Type
    const reworkRates = await WorkshopQuote.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: '$quote_type',
          totalQuotes: { $sum: 1 },
          reworkCount: {
            $sum: { $cond: [{ $eq: ['$status', 'rework'] }, 1, 0] }
          },
          completedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'completed_jobs'] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          _id: 1,
          totalQuotes: 1,
          reworkCount: 1,
          completedCount: 1,
          reworkRate: {
            $multiply: [
              { $divide: ['$reworkCount', '$totalQuotes'] },
              100
            ]
          }
        }
      }
    ]);

    // 2. Rework by Supplier
    const reworkBySupplier = await WorkshopQuote.aggregate([
      { 
        $match: { 
          ...baseMatch,
          quote_type: 'supplier',
          approved_supplier: { $exists: true }
        } 
      },
      {
        $group: {
          _id: '$approved_supplier',
          totalJobs: { $sum: 1 },
          reworkCount: {
            $sum: { $cond: [{ $eq: ['$status', 'rework'] }, 1, 0] }
          }
        }
      },
      {
        $lookup: {
          from: 'suppliers',
          localField: '_id',
          foreignField: '_id',
          as: 'supplierInfo'
        }
      },
      { $unwind: { path: '$supplierInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          supplierId: '$_id',
          supplierName: '$supplierInfo.name',
          totalJobs: 1,
          reworkCount: 1,
          reworkRate: {
            $multiply: [
              { $divide: ['$reworkCount', '$totalJobs'] },
              100
            ]
          }
        }
      },
      {
        $sort: { reworkRate: -1 }
      }
    ]);

    const response = formatReportResponse({
      reworkRates,
      reworkBySupplier
    }, {
      reportType: 'quote_rework_patterns',
      filters: { dealershipFilter, dateFilter }
    });

    res.json(response);
  } catch (error) {
    handleReportError(error, res, 'Quote Rework Patterns');
  }
};

/**
 * Get Quote Conversation Metrics
 * Analyzes communication effectiveness between company and suppliers
 * 
 * @route GET /api/company/reports/workshop-quote/conversation-metrics
 * @access Private (company_super_admin, company_admin)
 */
const getQuoteConversationMetrics = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    const baseMatch = {
      company_id,
      messages: { $exists: true, $ne: [] },
      ...dealershipFilter,
      ...dateFilter
    };

    // 1. Message Volume Analysis
    const messageVolume = await WorkshopQuote.aggregate([
      { $match: baseMatch },
      {
        $project: {
          quote_type: 1,
          messageCount: { $size: '$messages' },
          companyMessages: {
            $size: {
              $filter: {
                input: '$messages',
                as: 'msg',
                cond: { $eq: ['$$msg.sender_type', 'company'] }
              }
            }
          },
          supplierMessages: {
            $size: {
              $filter: {
                input: '$messages',
                as: 'msg',
                cond: { $eq: ['$$msg.sender_type', 'supplier'] }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: '$quote_type',
          totalQuotes: { $sum: 1 },
          avgMessagesPerQuote: { $avg: '$messageCount' },
          avgCompanyMessages: { $avg: '$companyMessages' },
          avgSupplierMessages: { $avg: '$supplierMessages' },
          totalMessages: { $sum: '$messageCount' }
        }
      }
    ]);

    // 2. Response Time in Conversations
    const conversationResponseTimes = await WorkshopQuote.aggregate([
      { $match: baseMatch },
      { $unwind: '$messages' },
      {
        $sort: { '_id': 1, 'messages.sent_at': 1 }
      },
      {
        $group: {
          _id: '$_id',
          messages: { $push: '$messages' }
        }
      },
      {
        $project: {
          avgResponseTime: {
            $avg: {
              $map: {
                input: { $range: [1, { $size: '$messages' }] },
                as: 'idx',
                in: {
                  $divide: [
                    {
                      $subtract: [
                        { $arrayElemAt: ['$messages.sent_at', '$$idx'] },
                        { $arrayElemAt: ['$messages.sent_at', { $subtract: ['$$idx', 1] }] }
                      ]
                    },
                    3600000 // Convert to hours
                  ]
                }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          overallAvgResponseTime: { $avg: '$avgResponseTime' }
        }
      }
    ]);

    const response = formatReportResponse({
      messageVolume,
      conversationMetrics: conversationResponseTimes[0] || {}
    }, {
      reportType: 'quote_conversation_metrics',
      filters: { dealershipFilter, dateFilter }
    });

    res.json(response);
  } catch (error) {
    handleReportError(error, res, 'Quote Conversation Metrics');
  }
};



module.exports = {
  getQuoteOverviewByStatus,
  getQuoteLifecycleAnalysis,
  getQuoteSupplierPerformance,
  getQuoteCostAnalysis,
  getQuoteApprovalRates,
  getQuoteResponseTimeAnalysis,
  getQuoteTypeDistribution,
  getQuoteBayBookingAnalysis,
  getQuoteWorkEntryAnalysis,
  getQuoteInvoiceAccuracy,
  getQuoteReworkPatterns,
  getQuoteConversationMetrics
};
