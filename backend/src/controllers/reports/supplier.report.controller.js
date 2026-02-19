/**
 * Supplier Report Controller
 * Handles all supplier-related analytics and reporting endpoints
 * Provides comprehensive supplier performance, inventory, and relationship metrics
 */

const { 
  getDealershipFilter, 
  getDateFilter, 
  formatReportResponse, 
  handleReportError,
  buildBasePipeline 
} = require('../../utils/reportHelpers');

/**
 * Get Supplier Overview
 * Provides comprehensive supplier inventory and status analysis
 * Includes supplier activity, quote participation, and engagement metrics
 * 
 * @route GET /api/company/reports/supplier/overview
 * @access Private (company_super_admin, company_admin)
 */
const getSupplierOverview = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    const Supplier = req.getModel('Supplier');
    const WorkshopQuote = req.getModel('WorkshopQuote');
    const WorkshopReport = req.getModel('WorkshopReport');
    const Conversation = req.getModel('Conversation');

    // 1. Get all suppliers for the company
    const suppliers = await Supplier.find({ company_id })
      .select('_id name email supplier_shop_name tags is_active created_at')
      .lean();

    const supplierIds = suppliers.map(s => s._id);

    // 2. Get quote participation for each supplier
    const quoteParticipation = await WorkshopQuote.aggregate([
      {
        $match: {
          company_id,
          approved_supplier: { $in: supplierIds },
          ...dateFilter
        }
      },
      {
        $group: {
          _id: '$approved_supplier',
          totalQuotes: { $sum: 1 },
          approvedQuotes: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          },
          completedQuotes: {
            $sum: { $cond: [{ $eq: ['$status', 'completed_jobs'] }, 1, 0] }
          },
          inProgressQuotes: {
            $sum: { $cond: [{ $eq: ['$status', 'work_in_progress'] }, 1, 0] }
          },
          totalQuoteValue: { $sum: '$quote_amount' },
          avgQuoteAmount: { $avg: '$quote_amount' },
          lastQuoteDate: { $max: '$created_at' }
        }
      }
    ]);

    // 3. Get conversation activity for each supplier
    const conversationActivity = await Conversation.aggregate([
      {
        $match: {
          company_id,
          supplier_id: { $in: supplierIds },
          ...dateFilter
        }
      },
      {
        $group: {
          _id: '$supplier_id',
          totalConversations: { $sum: 1 },
          totalMessages: { $sum: { $size: '$messages' } },
          avgMessagesPerConversation: { $avg: { $size: '$messages' } },
          lastMessageDate: { $max: '$last_message_at' },
          unreadMessages: { $sum: '$unread_count_company' }
        }
      }
    ]);

    // 4. Get workshop report completion data
    const reportCompletion = await WorkshopReport.aggregate([
      {
        $lookup: {
          from: 'workshopquotes',
          localField: 'quote_id',
          foreignField: '_id',
          as: 'quoteData'
        }
      },
      { $unwind: { path: '$quoteData', preserveNullAndEmptyArrays: true } },
      {
        $match: {
          'quoteData.approved_supplier': { $in: supplierIds },
          ...dateFilter
        }
      },
      {
        $group: {
          _id: '$quoteData.approved_supplier',
          totalReports: { $sum: 1 },
          totalRevenue: { $sum: '$final_price' },
          avgRevenue: { $avg: '$final_price' },
          avgCompletionTime: {
            $avg: {
              $divide: [
                { $subtract: ['$updated_at', '$created_at'] },
                86400000 // Convert to days
              ]
            }
          }
        }
      }
    ]);

    // 5. Combine all data for comprehensive supplier overview
    const supplierOverview = suppliers.map(supplier => {
      const quoteData = quoteParticipation.find(q => q._id?.toString() === supplier._id.toString()) || {};
      const conversationData = conversationActivity.find(c => c._id?.toString() === supplier._id.toString()) || {};
      const reportData = reportCompletion.find(r => r._id?.toString() === supplier._id.toString()) || {};

      // Calculate engagement score (0-100)
      const quoteScore = Math.min((quoteData.totalQuotes || 0) * 5, 40);
      const conversationScore = Math.min((conversationData.totalConversations || 0) * 3, 30);
      const completionScore = Math.min((reportData.totalReports || 0) * 3, 30);
      const engagementScore = Math.round(quoteScore + conversationScore + completionScore);

      // Calculate approval rate
      const approvalRate = quoteData.totalQuotes 
        ? Math.round((quoteData.approvedQuotes / quoteData.totalQuotes) * 100)
        : 0;

      // Calculate completion rate
      const completionRate = quoteData.totalQuotes 
        ? Math.round((quoteData.completedQuotes / quoteData.totalQuotes) * 100)
        : 0;

      return {
        supplierId: supplier._id,
        name: supplier.name,
        email: supplier.email,
        shopName: supplier.supplier_shop_name,
        tags: supplier.tags || [],
        isActive: supplier.is_active,
        createdAt: supplier.created_at,
        quoteMetrics: {
          total: quoteData.totalQuotes || 0,
          approved: quoteData.approvedQuotes || 0,
          completed: quoteData.completedQuotes || 0,
          inProgress: quoteData.inProgressQuotes || 0,
          totalValue: quoteData.totalQuoteValue || 0,
          avgAmount: quoteData.avgQuoteAmount || 0,
          approvalRate,
          completionRate,
          lastQuoteDate: quoteData.lastQuoteDate
        },
        communicationMetrics: {
          totalConversations: conversationData.totalConversations || 0,
          totalMessages: conversationData.totalMessages || 0,
          avgMessagesPerConversation: Math.round(conversationData.avgMessagesPerConversation || 0),
          lastMessageDate: conversationData.lastMessageDate,
          unreadMessages: conversationData.unreadMessages || 0
        },
        performanceMetrics: {
          totalReports: reportData.totalReports || 0,
          totalRevenue: reportData.totalRevenue || 0,
          avgRevenue: reportData.avgRevenue || 0,
          avgCompletionTime: Math.round(reportData.avgCompletionTime || 0)
        },
        engagementScore,
        activityLevel: engagementScore >= 70 ? 'High' : engagementScore >= 40 ? 'Medium' : 'Low'
      };
    });

    // Sort by engagement score descending
    supplierOverview.sort((a, b) => b.engagementScore - a.engagementScore);

    // 6. Calculate summary statistics
    const summaryStats = {
      totalSuppliers: suppliers.length,
      activeSuppliers: suppliers.filter(s => s.is_active).length,
      inactiveSuppliers: suppliers.filter(s => !s.is_active).length,
      suppliersWithQuotes: quoteParticipation.length,
      suppliersWithConversations: conversationActivity.length,
      suppliersWithCompletedWork: reportCompletion.length,
      avgEngagementScore: Math.round(
        supplierOverview.reduce((sum, s) => sum + s.engagementScore, 0) / supplierOverview.length
      ) || 0
    };

    res.json(formatReportResponse({
      suppliers: supplierOverview,
      summary: summaryStats
    }, {
      reportType: 'supplier-overview',
      filters: {
        dealership: dealershipFilter,
        dateRange: dateFilter
      }
    }));

  } catch (error) {
    return handleReportError(error, res, 'Supplier Overview');
  }
};

/**
 * Get Supplier Performance Ranking
 * Ranks suppliers based on multiple performance metrics
 * Includes response time, cost efficiency, quality, and reliability scores
 * 
 * @route GET /api/company/reports/supplier/performance-ranking
 * @access Private (company_super_admin, company_admin)
 */
const getSupplierPerformanceRanking = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    const Supplier = req.getModel('Supplier');
    const WorkshopQuote = req.getModel('WorkshopQuote');
    const WorkshopReport = req.getModel('WorkshopReport');
    const Conversation = req.getModel('Conversation');

    // 1. Get all suppliers
    const suppliers = await Supplier.find({ company_id, is_active: true })
      .select('_id name email supplier_shop_name tags')
      .lean();

    const supplierIds = suppliers.map(s => s._id);

    // 2. Calculate response time metrics from conversations
    const responseTimeMetrics = await Conversation.aggregate([
      {
        $match: {
          company_id,
          supplier_id: { $in: supplierIds },
          ...dateFilter
        }
      },
      { $unwind: '$messages' },
      {
        $sort: { 'messages.created_at': 1 }
      },
      {
        $group: {
          _id: {
            supplier_id: '$supplier_id',
            quote_id: '$quote_id'
          },
          messages: { $push: '$messages' }
        }
      },
      {
        $project: {
          supplier_id: '$_id.supplier_id',
          responseTimes: {
            $map: {
              input: { $range: [1, { $size: '$messages' }] },
              as: 'idx',
              in: {
                $cond: [
                  {
                    $and: [
                      { $eq: [{ $arrayElemAt: ['$messages.sender_type', { $subtract: ['$$idx', 1] }] }, 'company'] },
                      { $eq: [{ $arrayElemAt: ['$messages.sender_type', '$$idx'] }, 'supplier'] }
                    ]
                  },
                  {
                    $divide: [
                      {
                        $subtract: [
                          { $arrayElemAt: ['$messages.created_at', '$$idx'] },
                          { $arrayElemAt: ['$messages.created_at', { $subtract: ['$$idx', 1] }] }
                        ]
                      },
                      3600000 // Convert to hours
                    ]
                  },
                  null
                ]
              }
            }
          }
        }
      },
      {
        $unwind: '$responseTimes'
      },
      {
        $match: {
          responseTimes: { $ne: null, $lt: 168 } // Filter out nulls and responses > 1 week
        }
      },
      {
        $group: {
          _id: '$supplier_id',
          avgResponseTime: { $avg: '$responseTimes' },
          minResponseTime: { $min: '$responseTimes' },
          maxResponseTime: { $max: '$responseTimes' },
          totalResponses: { $sum: 1 }
        }
      }
    ]);

    // 3. Calculate cost efficiency and quote accuracy
    const costEfficiency = await WorkshopQuote.aggregate([
      {
        $match: {
          company_id,
          approved_supplier: { $in: supplierIds },
          status: 'completed_jobs',
          ...dateFilter
        }
      },
      {
        $lookup: {
          from: 'workshopreports',
          localField: '_id',
          foreignField: 'quote_id',
          as: 'reportData'
        }
      },
      { $unwind: { path: '$reportData', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$approved_supplier',
          totalQuotes: { $sum: 1 },
          avgQuoteAmount: { $avg: '$quote_amount' },
          avgFinalPrice: { $avg: '$reportData.final_price' },
          totalQuoteValue: { $sum: '$quote_amount' },
          totalFinalValue: { $sum: '$reportData.final_price' },
          quotesWithReports: {
            $sum: { $cond: [{ $ne: ['$reportData', null] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          _id: 1,
          totalQuotes: 1,
          avgQuoteAmount: 1,
          avgFinalPrice: 1,
          totalQuoteValue: 1,
          totalFinalValue: 1,
          quotesWithReports: 1,
          costVariance: {
            $cond: [
              { $and: [{ $ne: ['$avgQuoteAmount', null] }, { $ne: ['$avgFinalPrice', null] }] },
              {
                $multiply: [
                  {
                    $divide: [
                      { $subtract: ['$avgFinalPrice', '$avgQuoteAmount'] },
                      '$avgQuoteAmount'
                    ]
                  },
                  100
                ]
              },
              0
            ]
          },
          quoteAccuracy: {
            $cond: [
              { $gt: ['$totalQuotes', 0] },
              {
                $multiply: [
                  { $divide: ['$quotesWithReports', '$totalQuotes'] },
                  100
                ]
              },
              0
            ]
          }
        }
      }
    ]);

    // 4. Calculate approval and completion rates
    const approvalMetrics = await WorkshopQuote.aggregate([
      {
        $match: {
          company_id,
          approved_supplier: { $in: supplierIds },
          ...dateFilter
        }
      },
      {
        $group: {
          _id: '$approved_supplier',
          totalQuotes: { $sum: 1 },
          approvedQuotes: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          },
          completedQuotes: {
            $sum: { $cond: [{ $eq: ['$status', 'completed_jobs'] }, 1, 0] }
          },
          rejectedQuotes: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          },
          avgQuoteAmount: { $avg: '$quote_amount' }
        }
      },
      {
        $project: {
          _id: 1,
          totalQuotes: 1,
          approvedQuotes: 1,
          completedQuotes: 1,
          rejectedQuotes: 1,
          avgQuoteAmount: 1,
          approvalRate: {
            $multiply: [
              { $divide: ['$approvedQuotes', '$totalQuotes'] },
              100
            ]
          },
          completionRate: {
            $multiply: [
              { $divide: ['$completedQuotes', '$totalQuotes'] },
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

    // 5. Calculate quality metrics from workshop reports
    const qualityMetrics = await WorkshopReport.aggregate([
      {
        $lookup: {
          from: 'workshopquotes',
          localField: 'quote_id',
          foreignField: '_id',
          as: 'quoteData'
        }
      },
      { $unwind: { path: '$quoteData', preserveNullAndEmptyArrays: true } },
      {
        $match: {
          'quoteData.approved_supplier': { $in: supplierIds },
          ...dateFilter
        }
      },
      {
        $group: {
          _id: '$quoteData.approved_supplier',
          totalReports: { $sum: 1 },
          avgVisualCheckScore: { $avg: '$visual_check.score' },
          avgFunctionalCheckScore: { $avg: '$functional_check.score' },
          avgRoadTestScore: { $avg: '$road_test.score' },
          avgSafetyCheckScore: { $avg: '$safety_check.score' },
          totalRevenue: { $sum: '$final_price' },
          avgRevenue: { $avg: '$final_price' }
        }
      },
      {
        $project: {
          _id: 1,
          totalReports: 1,
          avgVisualCheckScore: { $round: ['$avgVisualCheckScore', 1] },
          avgFunctionalCheckScore: { $round: ['$avgFunctionalCheckScore', 1] },
          avgRoadTestScore: { $round: ['$avgRoadTestScore', 1] },
          avgSafetyCheckScore: { $round: ['$avgSafetyCheckScore', 1] },
          totalRevenue: 1,
          avgRevenue: 1,
          overallQualityScore: {
            $round: [
              {
                $avg: [
                  '$avgVisualCheckScore',
                  '$avgFunctionalCheckScore',
                  '$avgRoadTestScore',
                  '$avgSafetyCheckScore'
                ]
              },
              1
            ]
          }
        }
      }
    ]);

    // 6. Combine all metrics and calculate performance scores
    const performanceRanking = suppliers.map(supplier => {
      const responseData = responseTimeMetrics.find(r => r._id?.toString() === supplier._id.toString()) || {};
      const costData = costEfficiency.find(c => c._id?.toString() === supplier._id.toString()) || {};
      const approvalData = approvalMetrics.find(a => a._id?.toString() === supplier._id.toString()) || {};
      const qualityData = qualityMetrics.find(q => q._id?.toString() === supplier._id.toString()) || {};

      // Calculate individual performance scores (0-100)
      const responseScore = responseData.avgResponseTime 
        ? Math.max(0, 100 - (responseData.avgResponseTime * 2)) // Lower response time = higher score
        : 0;
      
      const costScore = costData.costVariance !== undefined
        ? Math.max(0, 100 - Math.abs(costData.costVariance)) // Lower variance = higher score
        : 0;
      
      const approvalScore = approvalData.approvalRate || 0;
      const completionScore = approvalData.completionRate || 0;
      const qualityScore = qualityData.overallQualityScore || 0;

      // Calculate overall performance score (weighted average)
      const overallScore = Math.round(
        (responseScore * 0.15) +
        (costScore * 0.20) +
        (approvalScore * 0.25) +
        (completionScore * 0.25) +
        (qualityScore * 0.15)
      );

      return {
        supplierId: supplier._id,
        name: supplier.name,
        email: supplier.email,
        shopName: supplier.supplier_shop_name,
        tags: supplier.tags || [],
        performanceScores: {
          overall: overallScore,
          responseTime: Math.round(responseScore),
          costEfficiency: Math.round(costScore),
          approvalRate: Math.round(approvalScore),
          completionRate: Math.round(completionScore),
          quality: Math.round(qualityScore)
        },
        metrics: {
          avgResponseTime: Math.round((responseData.avgResponseTime || 0) * 10) / 10,
          totalResponses: responseData.totalResponses || 0,
          totalQuotes: approvalData.totalQuotes || 0,
          approvedQuotes: approvalData.approvedQuotes || 0,
          completedQuotes: approvalData.completedQuotes || 0,
          rejectedQuotes: approvalData.rejectedQuotes || 0,
          avgQuoteAmount: Math.round(approvalData.avgQuoteAmount || 0),
          costVariance: Math.round((costData.costVariance || 0) * 10) / 10,
          totalRevenue: qualityData.totalRevenue || 0,
          avgRevenue: Math.round(qualityData.avgRevenue || 0),
          totalReports: qualityData.totalReports || 0
        },
        qualityBreakdown: {
          visual: qualityData.avgVisualCheckScore || 0,
          functional: qualityData.avgFunctionalCheckScore || 0,
          roadTest: qualityData.avgRoadTestScore || 0,
          safety: qualityData.avgSafetyCheckScore || 0,
          overall: qualityData.overallQualityScore || 0
        },
        performanceLevel: overallScore >= 80 ? 'Excellent' : 
                         overallScore >= 60 ? 'Good' : 
                         overallScore >= 40 ? 'Average' : 'Needs Improvement'
      };
    });

    // Sort by overall performance score descending
    performanceRanking.sort((a, b) => b.performanceScores.overall - a.performanceScores.overall);

    // Add ranking position
    performanceRanking.forEach((supplier, index) => {
      supplier.rank = index + 1;
    });

    res.json(formatReportResponse({
      rankings: performanceRanking,
      summary: {
        totalSuppliers: performanceRanking.length,
        avgOverallScore: Math.round(
          performanceRanking.reduce((sum, s) => sum + s.performanceScores.overall, 0) / performanceRanking.length
        ) || 0,
        excellentPerformers: performanceRanking.filter(s => s.performanceLevel === 'Excellent').length,
        goodPerformers: performanceRanking.filter(s => s.performanceLevel === 'Good').length,
        averagePerformers: performanceRanking.filter(s => s.performanceLevel === 'Average').length,
        needsImprovement: performanceRanking.filter(s => s.performanceLevel === 'Needs Improvement').length
      }
    }, {
      reportType: 'supplier-performance-ranking',
      filters: {
        dealership: dealershipFilter,
        dateRange: dateFilter
      }
    }));

  } catch (error) {
    return handleReportError(error, res, 'Supplier Performance Ranking');
  }
};

/**
 * Get Supplier Tag Analysis
 * Analyzes supplier categorization and tag-based grouping
 * Provides insights into supplier specializations and service areas
 * 
 * @route GET /api/company/reports/supplier/tag-analysis
 * @access Private (company_super_admin, company_admin)
 */
const getSupplierTagAnalysis = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    const Supplier = req.getModel('Supplier');

    // 1. Get all suppliers with their tags
    const suppliers = await Supplier.find({ company_id })
      .select('_id name email supplier_shop_name tags is_active')
      .lean();

    const supplierIds = suppliers.map(s => s._id);

    // 2. Tag distribution analysis
    const tagDistribution = await Supplier.aggregate([
      { $match: { company_id } },
      { $unwind: { path: '$tags', preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: '$tags',
          supplierCount: { $sum: 1 },
          activeSuppliers: {
            $sum: { $cond: [{ $eq: ['$is_active', true] }, 1, 0] }
          },
          suppliers: {
            $push: {
              id: '$_id',
              name: '$name',
              shopName: '$supplier_shop_name',
              isActive: '$is_active'
            }
          }
        }
      },
      {
        $sort: { supplierCount: -1 }
      }
    ]);

    // 3. Get quote performance by tag
    const quotePerformanceByTag = await Supplier.aggregate([
      { $match: { company_id } },
      { $unwind: { path: '$tags', preserveNullAndEmptyArrays: false } },
      {
        $lookup: {
          from: 'workshopquotes',
          let: { supplierId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$approved_supplier', '$$supplierId'] },
                ...dateFilter
              }
            }
          ],
          as: 'quotes'
        }
      },
      {
        $unwind: { path: '$quotes', preserveNullAndEmptyArrays: false }
      },
      {
        $group: {
          _id: '$tags',
          totalQuotes: { $sum: 1 },
          approvedQuotes: {
            $sum: { $cond: [{ $eq: ['$quotes.status', 'approved'] }, 1, 0] }
          },
          completedQuotes: {
            $sum: { $cond: [{ $eq: ['$quotes.status', 'completed_jobs'] }, 1, 0] }
          },
          totalQuoteValue: { $sum: '$quotes.quote_amount' },
          avgQuoteAmount: { $avg: '$quotes.quote_amount' }
        }
      },
      {
        $project: {
          _id: 1,
          totalQuotes: 1,
          approvedQuotes: 1,
          completedQuotes: 1,
          totalQuoteValue: 1,
          avgQuoteAmount: 1,
          approvalRate: {
            $round: [
              { $multiply: [{ $divide: ['$approvedQuotes', '$totalQuotes'] }, 100] },
              1
            ]
          },
          completionRate: {
            $round: [
              { $multiply: [{ $divide: ['$completedQuotes', '$totalQuotes'] }, 100] },
              1
            ]
          }
        }
      },
      {
        $sort: { totalQuotes: -1 }
      }
    ]);

    // 4. Get revenue by tag from workshop reports
    const revenueByTag = await Supplier.aggregate([
      { $match: { company_id } },
      { $unwind: { path: '$tags', preserveNullAndEmptyArrays: false } },
      {
        $lookup: {
          from: 'workshopquotes',
          localField: '_id',
          foreignField: 'approved_supplier',
          as: 'quotes'
        }
      },
      { $unwind: { path: '$quotes', preserveNullAndEmptyArrays: false } },
      {
        $lookup: {
          from: 'workshopreports',
          localField: 'quotes._id',
          foreignField: 'quote_id',
          as: 'reports'
        }
      },
      { $unwind: { path: '$reports', preserveNullAndEmptyArrays: false } },
      {
        $match: dateFilter
      },
      {
        $group: {
          _id: '$tags',
          totalReports: { $sum: 1 },
          totalRevenue: { $sum: '$reports.final_price' },
          avgRevenue: { $avg: '$reports.final_price' },
          totalPartsCost: { $sum: '$reports.parts_cost' },
          totalLabourCost: { $sum: '$reports.labour_cost' }
        }
      },
      {
        $project: {
          _id: 1,
          totalReports: 1,
          totalRevenue: 1,
          avgRevenue: 1,
          totalPartsCost: 1,
          totalLabourCost: 1,
          profitMargin: {
            $round: [
              {
                $multiply: [
                  {
                    $divide: [
                      { $subtract: ['$totalRevenue', { $add: ['$totalPartsCost', '$totalLabourCost'] }] },
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
      },
      {
        $sort: { totalRevenue: -1 }
      }
    ]);

    // 5. Supplier tag combinations analysis
    const tagCombinations = await Supplier.aggregate([
      { $match: { company_id } },
      {
        $project: {
          name: 1,
          tags: 1,
          tagCount: { $size: { $ifNull: ['$tags', []] } },
          is_active: 1
        }
      },
      {
        $bucket: {
          groupBy: '$tagCount',
          boundaries: [0, 1, 2, 3, 5, 100],
          default: '5+',
          output: {
            count: { $sum: 1 },
            activeCount: {
              $sum: { $cond: [{ $eq: ['$is_active', true] }, 1, 0] }
            },
            suppliers: {
              $push: {
                name: '$name',
                tags: '$tags',
                tagCount: '$tagCount'
              }
            }
          }
        }
      }
    ]);

    // 6. Most common tag combinations
    const commonTagPairs = await Supplier.aggregate([
      { $match: { company_id, tags: { $exists: true, $ne: [] } } },
      {
        $project: {
          name: 1,
          tagPairs: {
            $reduce: {
              input: { $range: [0, { $subtract: [{ $size: '$tags' }, 1] }] },
              initialValue: [],
              in: {
                $concatArrays: [
                  '$$value',
                  {
                    $map: {
                      input: { $range: [{ $add: ['$$this', 1] }, { $size: '$tags' }] },
                      as: 'j',
                      in: {
                        $concat: [
                          { $arrayElemAt: ['$tags', '$$this'] },
                          ' + ',
                          { $arrayElemAt: ['$tags', '$$j'] }
                        ]
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      },
      { $unwind: '$tagPairs' },
      {
        $group: {
          _id: '$tagPairs',
          count: { $sum: 1 },
          suppliers: { $push: '$name' }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // 7. Suppliers without tags
    const suppliersWithoutTags = suppliers.filter(s => !s.tags || s.tags.length === 0);

    // 8. Tag coverage statistics
    const tagStats = {
      totalSuppliers: suppliers.length,
      suppliersWithTags: suppliers.filter(s => s.tags && s.tags.length > 0).length,
      suppliersWithoutTags: suppliersWithoutTags.length,
      uniqueTags: tagDistribution.length,
      avgTagsPerSupplier: Math.round(
        (suppliers.reduce((sum, s) => sum + (s.tags?.length || 0), 0) / suppliers.length) * 10
      ) / 10,
      tagCoverageRate: Math.round(
        ((suppliers.filter(s => s.tags && s.tags.length > 0).length / suppliers.length) * 100) * 10
      ) / 10
    };

    res.json(formatReportResponse({
      tagDistribution,
      quotePerformanceByTag,
      revenueByTag,
      tagCombinations,
      commonTagPairs,
      suppliersWithoutTags: suppliersWithoutTags.map(s => ({
        id: s._id,
        name: s.name,
        email: s.email,
        shopName: s.supplier_shop_name,
        isActive: s.is_active
      })),
      tagStats
    }, {
      reportType: 'supplier-tag-analysis',
      filters: {
        dealership: dealershipFilter,
        dateRange: dateFilter
      }
    }));

  } catch (error) {
    return handleReportError(error, res, 'Supplier Tag Analysis');
  }
};

/**
 * Get Supplier Relationship Metrics
 * Analyzes supplier engagement and communication patterns
 * Provides insights into supplier relationships and collaboration effectiveness
 * 
 * @route GET /api/company/reports/supplier/relationship-metrics
 * @access Private (company_super_admin, company_admin)
 */
const getSupplierRelationshipMetrics = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    // 1. Get all suppliers
    const suppliers = await Supplier.find({ company_id })
      .select('_id name email supplier_shop_name is_active created_at')
      .lean();

    const supplierIds = suppliers.map(s => s._id);

    // 2. Communication frequency and patterns
    const communicationMetrics = await Conversation.aggregate([
      {
        $match: {
          company_id,
          supplier_id: { $in: supplierIds },
          ...dateFilter
        }
      },
      {
        $project: {
          supplier_id: 1,
          messageCount: { $size: '$messages' },
          lastMessageAt: '$last_message_at',
          unreadCompany: '$unread_count_company',
          unreadSupplier: '$unread_count_supplier',
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
          },
          daysSinceLastMessage: {
            $divide: [
              { $subtract: [new Date(), '$last_message_at'] },
              86400000
            ]
          }
        }
      },
      {
        $group: {
          _id: '$supplier_id',
          totalConversations: { $sum: 1 },
          totalMessages: { $sum: '$messageCount' },
          avgMessagesPerConversation: { $avg: '$messageCount' },
          totalCompanyMessages: { $sum: '$companyMessages' },
          totalSupplierMessages: { $sum: '$supplierMessages' },
          lastCommunication: { $max: '$lastMessageAt' },
          avgDaysSinceLastMessage: { $avg: '$daysSinceLastMessage' },
          totalUnreadCompany: { $sum: '$unreadCompany' },
          totalUnreadSupplier: { $sum: '$unreadSupplier' }
        }
      },
      {
        $project: {
          _id: 1,
          totalConversations: 1,
          totalMessages: 1,
          avgMessagesPerConversation: { $round: ['$avgMessagesPerConversation', 1] },
          totalCompanyMessages: 1,
          totalSupplierMessages: 1,
          lastCommunication: 1,
          avgDaysSinceLastMessage: { $round: ['$avgDaysSinceLastMessage', 1] },
          totalUnreadCompany: 1,
          totalUnreadSupplier: 1,
          responseRatio: {
            $round: [
              {
                $cond: [
                  { $gt: ['$totalCompanyMessages', 0] },
                  { $divide: ['$totalSupplierMessages', '$totalCompanyMessages'] },
                  0
                ]
              },
              2
            ]
          }
        }
      }
    ]);

    // 3. Quote engagement timeline
    const quoteEngagement = await WorkshopQuote.aggregate([
      {
        $match: {
          company_id,
          approved_supplier: { $in: supplierIds },
          ...dateFilter
        }
      },
      {
        $group: {
          _id: '$approved_supplier',
          totalQuotes: { $sum: 1 },
          firstQuote: { $min: '$created_at' },
          lastQuote: { $max: '$created_at' },
          avgQuoteAmount: { $avg: '$quote_amount' },
          totalQuoteValue: { $sum: '$quote_amount' }
        }
      },
      {
        $project: {
          _id: 1,
          totalQuotes: 1,
          firstQuote: 1,
          lastQuote: 1,
          avgQuoteAmount: 1,
          totalQuoteValue: 1,
          daysSinceFirstQuote: {
            $round: [
              {
                $divide: [
                  { $subtract: [new Date(), '$firstQuote'] },
                  86400000
                ]
              },
              0
            ]
          },
          daysSinceLastQuote: {
            $round: [
              {
                $divide: [
                  { $subtract: [new Date(), '$lastQuote'] },
                  86400000
                ]
              },
              0
            ]
          },
          quotesPerMonth: {
            $round: [
              {
                $cond: [
                  { $gt: [{ $subtract: [new Date(), '$firstQuote'] }, 0] },
                  {
                    $divide: [
                      '$totalQuotes',
                      {
                        $divide: [
                          { $subtract: [new Date(), '$firstQuote'] },
                          2592000000 // 30 days in milliseconds
                        ]
                      }
                    ]
                  },
                  0
                ]
              },
              2
            ]
          }
        }
      }
    ]);

    // 4. Collaboration success metrics
    const collaborationSuccess = await WorkshopQuote.aggregate([
      {
        $match: {
          company_id,
          approved_supplier: { $in: supplierIds },
          ...dateFilter
        }
      },
      {
        $group: {
          _id: '$approved_supplier',
          totalQuotes: { $sum: 1 },
          approvedQuotes: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          },
          completedQuotes: {
            $sum: { $cond: [{ $eq: ['$status', 'completed_jobs'] }, 1, 0] }
          },
          rejectedQuotes: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          },
          inProgressQuotes: {
            $sum: { $cond: [{ $eq: ['$status', 'work_in_progress'] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          _id: 1,
          totalQuotes: 1,
          approvedQuotes: 1,
          completedQuotes: 1,
          rejectedQuotes: 1,
          inProgressQuotes: 1,
          successRate: {
            $round: [
              {
                $multiply: [
                  { $divide: ['$completedQuotes', '$totalQuotes'] },
                  100
                ]
              },
              1
            ]
          },
          approvalRate: {
            $round: [
              {
                $multiply: [
                  { $divide: ['$approvedQuotes', '$totalQuotes'] },
                  100
                ]
              },
              1
            ]
          },
          rejectionRate: {
            $round: [
              {
                $multiply: [
                  { $divide: ['$rejectedQuotes', '$totalQuotes'] },
                  100
                ]
              },
              1
            ]
          }
        }
      }
    ]);

    // 5. Long-term relationship value
    const relationshipValue = await WorkshopReport.aggregate([
      {
        $lookup: {
          from: 'workshopquotes',
          localField: 'quote_id',
          foreignField: '_id',
          as: 'quoteData'
        }
      },
      { $unwind: { path: '$quoteData', preserveNullAndEmptyArrays: true } },
      {
        $match: {
          'quoteData.approved_supplier': { $in: supplierIds },
          ...dateFilter
        }
      },
      {
        $group: {
          _id: '$quoteData.approved_supplier',
          totalReports: { $sum: 1 },
          totalRevenue: { $sum: '$final_price' },
          avgRevenue: { $avg: '$final_price' },
          totalPartsCost: { $sum: '$parts_cost' },
          totalLabourCost: { $sum: '$labour_cost' },
          avgCompletionTime: {
            $avg: {
              $divide: [
                { $subtract: ['$updated_at', '$created_at'] },
                86400000
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          totalReports: 1,
          totalRevenue: 1,
          avgRevenue: 1,
          totalPartsCost: 1,
          totalLabourCost: 1,
          avgCompletionTime: { $round: ['$avgCompletionTime', 1] },
          lifetimeValue: '$totalRevenue',
          avgRevenuePerReport: { $round: ['$avgRevenue', 0] }
        }
      }
    ]);

    // 6. Combine all relationship metrics
    const relationshipMetrics = suppliers.map(supplier => {
      const commData = communicationMetrics.find(c => c._id?.toString() === supplier._id.toString()) || {};
      const quoteData = quoteEngagement.find(q => q._id?.toString() === supplier._id.toString()) || {};
      const collabData = collaborationSuccess.find(c => c._id?.toString() === supplier._id.toString()) || {};
      const valueData = relationshipValue.find(v => v._id?.toString() === supplier._id.toString()) || {};

      // Calculate relationship strength score (0-100)
      const communicationScore = Math.min((commData.totalConversations || 0) * 5, 25);
      const engagementScore = Math.min((quoteData.totalQuotes || 0) * 3, 25);
      const successScore = (collabData.successRate || 0) * 0.25;
      const valueScore = Math.min((valueData.totalRevenue || 0) / 10000, 25);
      const relationshipStrength = Math.round(communicationScore + engagementScore + successScore + valueScore);

      // Calculate days since account creation
      const daysSinceCreation = Math.floor((new Date() - new Date(supplier.created_at)) / (1000 * 60 * 60 * 24));

      return {
        supplierId: supplier._id,
        name: supplier.name,
        email: supplier.email,
        shopName: supplier.supplier_shop_name,
        isActive: supplier.is_active,
        accountAge: {
          days: daysSinceCreation,
          months: Math.floor(daysSinceCreation / 30)
        },
        communicationMetrics: {
          totalConversations: commData.totalConversations || 0,
          totalMessages: commData.totalMessages || 0,
          avgMessagesPerConversation: commData.avgMessagesPerConversation || 0,
          companyMessages: commData.totalCompanyMessages || 0,
          supplierMessages: commData.totalSupplierMessages || 0,
          responseRatio: commData.responseRatio || 0,
          lastCommunication: commData.lastCommunication,
          daysSinceLastMessage: commData.avgDaysSinceLastMessage || null,
          unreadMessages: {
            company: commData.totalUnreadCompany || 0,
            supplier: commData.totalUnreadSupplier || 0
          }
        },
        engagementMetrics: {
          totalQuotes: quoteData.totalQuotes || 0,
          firstQuote: quoteData.firstQuote,
          lastQuote: quoteData.lastQuote,
          daysSinceFirstQuote: quoteData.daysSinceFirstQuote || null,
          daysSinceLastQuote: quoteData.daysSinceLastQuote || null,
          quotesPerMonth: quoteData.quotesPerMonth || 0,
          avgQuoteAmount: Math.round(quoteData.avgQuoteAmount || 0),
          totalQuoteValue: quoteData.totalQuoteValue || 0
        },
        collaborationMetrics: {
          totalQuotes: collabData.totalQuotes || 0,
          approvedQuotes: collabData.approvedQuotes || 0,
          completedQuotes: collabData.completedQuotes || 0,
          rejectedQuotes: collabData.rejectedQuotes || 0,
          inProgressQuotes: collabData.inProgressQuotes || 0,
          successRate: collabData.successRate || 0,
          approvalRate: collabData.approvalRate || 0,
          rejectionRate: collabData.rejectionRate || 0
        },
        valueMetrics: {
          totalReports: valueData.totalReports || 0,
          lifetimeValue: valueData.lifetimeValue || 0,
          avgRevenuePerReport: valueData.avgRevenuePerReport || 0,
          totalPartsCost: valueData.totalPartsCost || 0,
          totalLabourCost: valueData.totalLabourCost || 0,
          avgCompletionTime: valueData.avgCompletionTime || 0
        },
        relationshipStrength,
        relationshipLevel: relationshipStrength >= 75 ? 'Strong' :
                          relationshipStrength >= 50 ? 'Moderate' :
                          relationshipStrength >= 25 ? 'Developing' : 'Weak',
        engagementStatus: quoteData.daysSinceLastQuote !== undefined
          ? (quoteData.daysSinceLastQuote <= 30 ? 'Active' :
             quoteData.daysSinceLastQuote <= 90 ? 'Moderate' : 'Inactive')
          : 'No Activity'
      };
    });

    // Sort by relationship strength descending
    relationshipMetrics.sort((a, b) => b.relationshipStrength - a.relationshipStrength);

    // 7. Summary statistics
    const summaryStats = {
      totalSuppliers: suppliers.length,
      activeSuppliers: suppliers.filter(s => s.is_active).length,
      suppliersWithCommunication: communicationMetrics.length,
      suppliersWithQuotes: quoteEngagement.length,
      suppliersWithCompletedWork: relationshipValue.length,
      avgRelationshipStrength: Math.round(
        relationshipMetrics.reduce((sum, s) => sum + s.relationshipStrength, 0) / relationshipMetrics.length
      ) || 0,
      relationshipDistribution: {
        strong: relationshipMetrics.filter(s => s.relationshipLevel === 'Strong').length,
        moderate: relationshipMetrics.filter(s => s.relationshipLevel === 'Moderate').length,
        developing: relationshipMetrics.filter(s => s.relationshipLevel === 'Developing').length,
        weak: relationshipMetrics.filter(s => s.relationshipLevel === 'Weak').length
      },
      engagementDistribution: {
        active: relationshipMetrics.filter(s => s.engagementStatus === 'Active').length,
        moderate: relationshipMetrics.filter(s => s.engagementStatus === 'Moderate').length,
        inactive: relationshipMetrics.filter(s => s.engagementStatus === 'Inactive').length,
        noActivity: relationshipMetrics.filter(s => s.engagementStatus === 'No Activity').length
      }
    };

    res.json(formatReportResponse({
      relationships: relationshipMetrics,
      summary: summaryStats
    }, {
      reportType: 'supplier-relationship-metrics',
      filters: {
        dealership: dealershipFilter,
        dateRange: dateFilter
      }
    }));

  } catch (error) {
    return handleReportError(error, res, 'Supplier Relationship Metrics');
  }
};

module.exports = {
  getSupplierOverview,
  getSupplierPerformanceRanking,
  getSupplierTagAnalysis,
  getSupplierRelationshipMetrics
};
