/**
 * Conversation Report Controller
 * Handles all conversation analytics and reporting endpoints
 * Provides comprehensive message volume, response times, and engagement metrics
 */

const { 
  getDealershipFilter, 
  getDateFilter, 
  formatReportResponse, 
  handleReportError,
  buildBasePipeline 
} = require('../../utils/reportHelpers');

/**
 * Get Conversation Volume Analysis
 * Provides comprehensive message volume trends and patterns
 * Includes daily/weekly/monthly trends, sender distribution, and message type analysis
 * 
 * @route GET /api/company/reports/conversation/volume-analysis
 * @access Private (company_super_admin, company_admin)
 */
const getConversationVolumeAnalysis = async (req, res) => {
  try {
    const Conversation = req.getModel('Conversation');
    const WorkshopQuote = req.getModel('WorkshopQuote');
    
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    // 1. Get all conversations with message counts
    const conversationVolume = await Conversation.aggregate([
      {
        $match: {
          company_id,
          ...dateFilter
        }
      },
      {
        $lookup: {
          from: 'workshopquotes',
          localField: 'quote_id',
          foreignField: '_id',
          as: 'quote_data'
        }
      },
      { $unwind: { path: '$quote_data', preserveNullAndEmptyArrays: true } },
      // Apply dealership filter through quote data
      ...(Object.keys(dealershipFilter).length > 0 ? [
        { $match: { 'quote_data.dealership_id': dealershipFilter.dealership_id } }
      ] : []),
      {
        $project: {
          _id: 1,
          quote_id: 1,
          supplier_id: 1,
          company_id: 1,
          messageCount: { $size: { $ifNull: ['$messages', []] } },
          companyMessages: {
            $size: {
              $filter: {
                input: { $ifNull: ['$messages', []] },
                as: 'msg',
                cond: { $eq: ['$$msg.sender_type', 'company'] }
              }
            }
          },
          supplierMessages: {
            $size: {
              $filter: {
                input: { $ifNull: ['$messages', []] },
                as: 'msg',
                cond: { $eq: ['$$msg.sender_type', 'supplier'] }
              }
            }
          },
          textMessages: {
            $size: {
              $filter: {
                input: { $ifNull: ['$messages', []] },
                as: 'msg',
                cond: { $eq: ['$$msg.message_type', 'text'] }
              }
            }
          },
          imageMessages: {
            $size: {
              $filter: {
                input: { $ifNull: ['$messages', []] },
                as: 'msg',
                cond: { $eq: ['$$msg.message_type', 'image'] }
              }
            }
          },
          fileMessages: {
            $size: {
              $filter: {
                input: { $ifNull: ['$messages', []] },
                as: 'msg',
                cond: { $eq: ['$$msg.message_type', 'file'] }
              }
            }
          },
          last_message_at: 1,
          created_at: 1,
          unread_count_company: 1,
          unread_count_supplier: 1,
          is_archived_company: 1,
          is_archived_supplier: 1
        }
      }
    ]);

    // 2. Analyze message volume by time period (daily)
    const dailyVolume = await Conversation.aggregate([
      {
        $match: {
          company_id,
          ...dateFilter
        }
      },
      {
        $lookup: {
          from: 'workshopquotes',
          localField: 'quote_id',
          foreignField: '_id',
          as: 'quote_data'
        }
      },
      { $unwind: { path: '$quote_data', preserveNullAndEmptyArrays: true } },
      ...(Object.keys(dealershipFilter).length > 0 ? [
        { $match: { 'quote_data.dealership_id': dealershipFilter.dealership_id } }
      ] : []),
      { $unwind: { path: '$messages', preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: {
            year: { $year: '$messages.created_at' },
            month: { $month: '$messages.created_at' },
            day: { $dayOfMonth: '$messages.created_at' }
          },
          messageCount: { $sum: 1 },
          companyMessages: {
            $sum: { $cond: [{ $eq: ['$messages.sender_type', 'company'] }, 1, 0] }
          },
          supplierMessages: {
            $sum: { $cond: [{ $eq: ['$messages.sender_type', 'supplier'] }, 1, 0] }
          },
          uniqueConversations: { $addToSet: '$_id' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    // Format daily volume data
    const dailyVolumeAnalysis = dailyVolume.map(day => ({
      date: new Date(day._id.year, day._id.month - 1, day._id.day),
      year: day._id.year,
      month: day._id.month,
      day: day._id.day,
      totalMessages: day.messageCount,
      companyMessages: day.companyMessages,
      supplierMessages: day.supplierMessages,
      uniqueConversations: day.uniqueConversations.length,
      avgMessagesPerConversation: Math.round((day.messageCount / day.uniqueConversations.length) * 10) / 10
    }));

    // 3. Analyze message volume by day of week
    const volumeByDayOfWeek = await Conversation.aggregate([
      {
        $match: {
          company_id,
          ...dateFilter
        }
      },
      {
        $lookup: {
          from: 'workshopquotes',
          localField: 'quote_id',
          foreignField: '_id',
          as: 'quote_data'
        }
      },
      { $unwind: { path: '$quote_data', preserveNullAndEmptyArrays: true } },
      ...(Object.keys(dealershipFilter).length > 0 ? [
        { $match: { 'quote_data.dealership_id': dealershipFilter.dealership_id } }
      ] : []),
      { $unwind: { path: '$messages', preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: { $dayOfWeek: '$messages.created_at' },
          messageCount: { $sum: 1 },
          companyMessages: {
            $sum: { $cond: [{ $eq: ['$messages.sender_type', 'company'] }, 1, 0] }
          },
          supplierMessages: {
            $sum: { $cond: [{ $eq: ['$messages.sender_type', 'supplier'] }, 1, 0] }
          }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeekAnalysis = volumeByDayOfWeek.map(day => ({
      dayOfWeek: dayNames[day._id - 1],
      dayNumber: day._id,
      totalMessages: day.messageCount,
      companyMessages: day.companyMessages,
      supplierMessages: day.supplierMessages,
      companyPercentage: Math.round((day.companyMessages / day.messageCount) * 100),
      supplierPercentage: Math.round((day.supplierMessages / day.messageCount) * 100)
    }));

    // 4. Analyze message volume by hour of day
    const volumeByHour = await Conversation.aggregate([
      {
        $match: {
          company_id,
          ...dateFilter
        }
      },
      {
        $lookup: {
          from: 'workshopquotes',
          localField: 'quote_id',
          foreignField: '_id',
          as: 'quote_data'
        }
      },
      { $unwind: { path: '$quote_data', preserveNullAndEmptyArrays: true } },
      ...(Object.keys(dealershipFilter).length > 0 ? [
        { $match: { 'quote_data.dealership_id': dealershipFilter.dealership_id } }
      ] : []),
      { $unwind: { path: '$messages', preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: { $hour: '$messages.created_at' },
          messageCount: { $sum: 1 },
          companyMessages: {
            $sum: { $cond: [{ $eq: ['$messages.sender_type', 'company'] }, 1, 0] }
          },
          supplierMessages: {
            $sum: { $cond: [{ $eq: ['$messages.sender_type', 'supplier'] }, 1, 0] }
          }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    const hourlyAnalysis = volumeByHour.map(hour => ({
      hour: hour._id,
      timeSlot: `${hour._id.toString().padStart(2, '0')}:00`,
      totalMessages: hour.messageCount,
      companyMessages: hour.companyMessages,
      supplierMessages: hour.supplierMessages,
      timeOfDay: hour._id < 12 ? 'Morning' : hour._id < 17 ? 'Afternoon' : 'Evening'
    }));

    // 5. Analyze message type distribution
    const messageTypeDistribution = conversationVolume.reduce((acc, conv) => {
      acc.text += conv.textMessages;
      acc.image += conv.imageMessages;
      acc.file += conv.fileMessages;
      acc.total += conv.messageCount;
      return acc;
    }, { text: 0, image: 0, file: 0, total: 0 });

    // 6. Analyze top active conversations
    const topActiveConversations = conversationVolume
      .sort((a, b) => b.messageCount - a.messageCount)
      .slice(0, 10)
      .map(conv => ({
        conversationId: conv._id,
        quoteId: conv.quote_id,
        supplierId: conv.supplier_id,
        totalMessages: conv.messageCount,
        companyMessages: conv.companyMessages,
        supplierMessages: conv.supplierMessages,
        lastMessageAt: conv.last_message_at,
        unreadCompany: conv.unread_count_company,
        unreadSupplier: conv.unread_count_supplier
      }));

    // 7. Calculate summary statistics
    const totalConversations = conversationVolume.length;
    const totalMessages = conversationVolume.reduce((sum, c) => sum + c.messageCount, 0);
    const totalCompanyMessages = conversationVolume.reduce((sum, c) => sum + c.companyMessages, 0);
    const totalSupplierMessages = conversationVolume.reduce((sum, c) => sum + c.supplierMessages, 0);
    const activeConversations = conversationVolume.filter(c => c.messageCount > 0).length;
    const archivedConversations = conversationVolume.filter(c => c.is_archived_company || c.is_archived_supplier).length;

    const peakDay = dayOfWeekAnalysis.reduce((max, day) => 
      day.totalMessages > (max?.totalMessages || 0) ? day : max, null);
    
    const peakHour = hourlyAnalysis.reduce((max, hour) => 
      hour.totalMessages > (max?.totalMessages || 0) ? hour : max, null);

    const summaryStats = {
      totalConversations,
      activeConversations,
      archivedConversations,
      totalMessages,
      totalCompanyMessages,
      totalSupplierMessages,
      avgMessagesPerConversation: totalConversations > 0 
        ? Math.round((totalMessages / totalConversations) * 10) / 10 
        : 0,
      companyMessagePercentage: totalMessages > 0 
        ? Math.round((totalCompanyMessages / totalMessages) * 100) 
        : 0,
      supplierMessagePercentage: totalMessages > 0 
        ? Math.round((totalSupplierMessages / totalMessages) * 100) 
        : 0,
      messageTypeDistribution: {
        text: messageTypeDistribution.text,
        image: messageTypeDistribution.image,
        file: messageTypeDistribution.file,
        textPercentage: messageTypeDistribution.total > 0 
          ? Math.round((messageTypeDistribution.text / messageTypeDistribution.total) * 100) 
          : 0,
        imagePercentage: messageTypeDistribution.total > 0 
          ? Math.round((messageTypeDistribution.image / messageTypeDistribution.total) * 100) 
          : 0,
        filePercentage: messageTypeDistribution.total > 0 
          ? Math.round((messageTypeDistribution.file / messageTypeDistribution.total) * 100) 
          : 0
      },
      peakActivity: {
        day: peakDay ? {
          dayOfWeek: peakDay.dayOfWeek,
          messages: peakDay.totalMessages
        } : null,
        hour: peakHour ? {
          timeSlot: peakHour.timeSlot,
          messages: peakHour.totalMessages
        } : null
      },
      timeOfDayDistribution: {
        morning: hourlyAnalysis.filter(h => h.timeOfDay === 'Morning').reduce((sum, h) => sum + h.totalMessages, 0),
        afternoon: hourlyAnalysis.filter(h => h.timeOfDay === 'Afternoon').reduce((sum, h) => sum + h.totalMessages, 0),
        evening: hourlyAnalysis.filter(h => h.timeOfDay === 'Evening').reduce((sum, h) => sum + h.totalMessages, 0)
      }
    };

    res.json(formatReportResponse({
      dailyVolume: dailyVolumeAnalysis,
      dayOfWeekAnalysis,
      hourlyAnalysis,
      topActiveConversations,
      summary: summaryStats
    }, {
      reportType: 'conversation-volume-analysis',
      filters: {
        dealership: dealershipFilter,
        dateRange: dateFilter
      }
    }));

  } catch (error) {
    return handleReportError(error, res, 'Conversation Volume Analysis');
  }
};

/**
 * Get Conversation Response Times
 * Analyzes response time metrics and patterns
 * Includes average response times, response time distribution, and supplier performance
 * 
 * @route GET /api/company/reports/conversation/response-times
 * @access Private (company_super_admin, company_admin)
 */
const getConversationResponseTimes = async (req, res) => {
  try {
    const Conversation = req.getModel('Conversation');
    const WorkshopQuote = req.getModel('WorkshopQuote');
    const Supplier = req.getModel('Supplier');
    
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    // 1. Get all conversations with messages for response time calculation
    const conversations = await Conversation.find({
      company_id,
      ...dateFilter
    })
      .populate('quote_id', 'dealership_id')
      .populate('supplier_id', 'supplier_name supplier_tags')
      .lean();

    // Filter by dealership if needed
    const filteredConversations = Object.keys(dealershipFilter).length > 0
      ? conversations.filter(conv => 
          conv.quote_id && 
          dealershipFilter.dealership_id.$in.some(id => 
            id.toString() === conv.quote_id.dealership_id?.toString()
          )
        )
      : conversations;

    // 2. Calculate response times for each conversation
    const conversationResponseTimes = filteredConversations.map(conv => {
      const messages = conv.messages || [];
      
      if (messages.length < 2) {
        return null; // Need at least 2 messages to calculate response time
      }

      const responseTimes = [];
      
      // Calculate response times between consecutive messages from different senders
      for (let i = 1; i < messages.length; i++) {
        const prevMsg = messages[i - 1];
        const currMsg = messages[i];
        
        // Only calculate if sender changed
        if (prevMsg.sender_type !== currMsg.sender_type) {
          const responseTime = new Date(currMsg.created_at) - new Date(prevMsg.created_at);
          const responseTimeMinutes = Math.round(responseTime / (1000 * 60));
          const responseTimeHours = Math.round((responseTime / (1000 * 60 * 60)) * 10) / 10;
          
          responseTimes.push({
            fromSender: prevMsg.sender_type,
            toSender: currMsg.sender_type,
            responseTimeMs: responseTime,
            responseTimeMinutes,
            responseTimeHours
          });
        }
      }

      if (responseTimes.length === 0) {
        return null;
      }

      // Calculate averages
      const companyResponses = responseTimes.filter(rt => rt.toSender === 'company');
      const supplierResponses = responseTimes.filter(rt => rt.toSender === 'supplier');

      const avgCompanyResponseTime = companyResponses.length > 0
        ? companyResponses.reduce((sum, rt) => sum + rt.responseTimeMinutes, 0) / companyResponses.length
        : 0;

      const avgSupplierResponseTime = supplierResponses.length > 0
        ? supplierResponses.reduce((sum, rt) => sum + rt.responseTimeMinutes, 0) / supplierResponses.length
        : 0;

      return {
        conversationId: conv._id,
        quoteId: conv.quote_id?._id,
        supplierId: conv.supplier_id?._id,
        supplierName: conv.supplier_id?.supplier_name,
        totalMessages: messages.length,
        totalResponses: responseTimes.length,
        companyResponses: companyResponses.length,
        supplierResponses: supplierResponses.length,
        avgCompanyResponseTimeMinutes: Math.round(avgCompanyResponseTime),
        avgSupplierResponseTimeMinutes: Math.round(avgSupplierResponseTime),
        avgCompanyResponseTimeHours: Math.round((avgCompanyResponseTime / 60) * 10) / 10,
        avgSupplierResponseTimeHours: Math.round((avgSupplierResponseTime / 60) * 10) / 10,
        fastestResponseMinutes: Math.min(...responseTimes.map(rt => rt.responseTimeMinutes)),
        slowestResponseMinutes: Math.max(...responseTimes.map(rt => rt.responseTimeMinutes)),
        responseTimes
      };
    }).filter(Boolean); // Remove null entries

    // 3. Calculate overall response time statistics
    const allCompanyResponseTimes = conversationResponseTimes
      .filter(c => c.avgCompanyResponseTimeMinutes > 0)
      .map(c => c.avgCompanyResponseTimeMinutes);
    
    const allSupplierResponseTimes = conversationResponseTimes
      .filter(c => c.avgSupplierResponseTimeMinutes > 0)
      .map(c => c.avgSupplierResponseTimeMinutes);

    const avgCompanyResponseTime = allCompanyResponseTimes.length > 0
      ? Math.round(allCompanyResponseTimes.reduce((sum, t) => sum + t, 0) / allCompanyResponseTimes.length)
      : 0;

    const avgSupplierResponseTime = allSupplierResponseTimes.length > 0
      ? Math.round(allSupplierResponseTimes.reduce((sum, t) => sum + t, 0) / allSupplierResponseTimes.length)
      : 0;

    // 4. Categorize response times
    const categorizeResponseTime = (minutes) => {
      if (minutes <= 15) return 'Immediate';
      if (minutes <= 60) return 'Fast';
      if (minutes <= 240) return 'Moderate';
      if (minutes <= 1440) return 'Slow';
      return 'Very Slow';
    };

    const companyResponseDistribution = {
      immediate: allCompanyResponseTimes.filter(t => t <= 15).length,
      fast: allCompanyResponseTimes.filter(t => t > 15 && t <= 60).length,
      moderate: allCompanyResponseTimes.filter(t => t > 60 && t <= 240).length,
      slow: allCompanyResponseTimes.filter(t => t > 240 && t <= 1440).length,
      verySlow: allCompanyResponseTimes.filter(t => t > 1440).length
    };

    const supplierResponseDistribution = {
      immediate: allSupplierResponseTimes.filter(t => t <= 15).length,
      fast: allSupplierResponseTimes.filter(t => t > 15 && t <= 60).length,
      moderate: allSupplierResponseTimes.filter(t => t > 60 && t <= 240).length,
      slow: allSupplierResponseTimes.filter(t => t > 240 && t <= 1440).length,
      verySlow: allSupplierResponseTimes.filter(t => t > 1440).length
    };

    // 5. Analyze supplier response time performance
    const supplierPerformance = {};
    
    conversationResponseTimes.forEach(conv => {
      if (conv.supplierId && conv.avgSupplierResponseTimeMinutes > 0) {
        const supplierId = conv.supplierId.toString();
        
        if (!supplierPerformance[supplierId]) {
          supplierPerformance[supplierId] = {
            supplierId: conv.supplierId,
            supplierName: conv.supplierName,
            conversationCount: 0,
            totalResponses: 0,
            responseTimes: []
          };
        }
        
        supplierPerformance[supplierId].conversationCount++;
        supplierPerformance[supplierId].totalResponses += conv.supplierResponses;
        supplierPerformance[supplierId].responseTimes.push(conv.avgSupplierResponseTimeMinutes);
      }
    });

    const supplierResponseAnalysis = Object.values(supplierPerformance).map(supplier => {
      const avgResponseTime = supplier.responseTimes.length > 0
        ? Math.round(supplier.responseTimes.reduce((sum, t) => sum + t, 0) / supplier.responseTimes.length)
        : 0;

      return {
        supplierId: supplier.supplierId,
        supplierName: supplier.supplierName,
        conversationCount: supplier.conversationCount,
        totalResponses: supplier.totalResponses,
        avgResponseTimeMinutes: avgResponseTime,
        avgResponseTimeHours: Math.round((avgResponseTime / 60) * 10) / 10,
        fastestResponseMinutes: Math.min(...supplier.responseTimes),
        slowestResponseMinutes: Math.max(...supplier.responseTimes),
        responseCategory: categorizeResponseTime(avgResponseTime),
        performanceScore: avgResponseTime <= 60 ? 'Excellent' : 
                         avgResponseTime <= 240 ? 'Good' : 
                         avgResponseTime <= 1440 ? 'Fair' : 'Poor'
      };
    }).sort((a, b) => a.avgResponseTimeMinutes - b.avgResponseTimeMinutes);

    // 6. Analyze response time trends over time
    const responseTimeTrends = conversationResponseTimes.reduce((acc, conv) => {
      conv.responseTimes.forEach(rt => {
        const date = new Date(rt.responseTimeMs);
        const dateKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
        
        if (!acc[dateKey]) {
          acc[dateKey] = {
            date: dateKey,
            companyResponses: [],
            supplierResponses: []
          };
        }
        
        if (rt.toSender === 'company') {
          acc[dateKey].companyResponses.push(rt.responseTimeMinutes);
        } else {
          acc[dateKey].supplierResponses.push(rt.responseTimeMinutes);
        }
      });
      
      return acc;
    }, {});

    const trendAnalysis = Object.values(responseTimeTrends).map(trend => ({
      date: trend.date,
      avgCompanyResponseTime: trend.companyResponses.length > 0
        ? Math.round(trend.companyResponses.reduce((sum, t) => sum + t, 0) / trend.companyResponses.length)
        : 0,
      avgSupplierResponseTime: trend.supplierResponses.length > 0
        ? Math.round(trend.supplierResponses.reduce((sum, t) => sum + t, 0) / trend.supplierResponses.length)
        : 0,
      companyResponseCount: trend.companyResponses.length,
      supplierResponseCount: trend.supplierResponses.length
    })).sort((a, b) => a.date.localeCompare(b.date));

    // 7. Summary statistics
    const summaryStats = {
      totalConversationsAnalyzed: conversationResponseTimes.length,
      totalResponses: conversationResponseTimes.reduce((sum, c) => sum + c.totalResponses, 0),
      companyMetrics: {
        avgResponseTimeMinutes: avgCompanyResponseTime,
        avgResponseTimeHours: Math.round((avgCompanyResponseTime / 60) * 10) / 10,
        totalResponses: conversationResponseTimes.reduce((sum, c) => sum + c.companyResponses, 0),
        fastestResponseMinutes: allCompanyResponseTimes.length > 0 ? Math.min(...allCompanyResponseTimes) : 0,
        slowestResponseMinutes: allCompanyResponseTimes.length > 0 ? Math.max(...allCompanyResponseTimes) : 0,
        distribution: companyResponseDistribution,
        performanceRating: avgCompanyResponseTime <= 60 ? 'Excellent' : 
                          avgCompanyResponseTime <= 240 ? 'Good' : 
                          avgCompanyResponseTime <= 1440 ? 'Fair' : 'Poor'
      },
      supplierMetrics: {
        avgResponseTimeMinutes: avgSupplierResponseTime,
        avgResponseTimeHours: Math.round((avgSupplierResponseTime / 60) * 10) / 10,
        totalResponses: conversationResponseTimes.reduce((sum, c) => sum + c.supplierResponses, 0),
        fastestResponseMinutes: allSupplierResponseTimes.length > 0 ? Math.min(...allSupplierResponseTimes) : 0,
        slowestResponseMinutes: allSupplierResponseTimes.length > 0 ? Math.max(...allSupplierResponseTimes) : 0,
        distribution: supplierResponseDistribution,
        performanceRating: avgSupplierResponseTime <= 60 ? 'Excellent' : 
                          avgSupplierResponseTime <= 240 ? 'Good' : 
                          avgSupplierResponseTime <= 1440 ? 'Fair' : 'Poor'
      },
      comparison: {
        fasterResponder: avgCompanyResponseTime < avgSupplierResponseTime ? 'Company' : 'Supplier',
        timeDifferenceMinutes: Math.abs(avgCompanyResponseTime - avgSupplierResponseTime),
        timeDifferenceHours: Math.round((Math.abs(avgCompanyResponseTime - avgSupplierResponseTime) / 60) * 10) / 10
      }
    };

    res.json(formatReportResponse({
      conversations: conversationResponseTimes.slice(0, 50), // Limit to top 50 for performance
      supplierPerformance: supplierResponseAnalysis,
      trends: trendAnalysis,
      summary: summaryStats
    }, {
      reportType: 'conversation-response-times',
      filters: {
        dealership: dealershipFilter,
        dateRange: dateFilter
      }
    }));

  } catch (error) {
    return handleReportError(error, res, 'Conversation Response Times');
  }
};

/**
 * Get Conversation Engagement Metrics
 * Analyzes engagement and resolution rates
 * Includes read rates, conversation completion, and engagement patterns
 * 
 * @route GET /api/company/reports/conversation/engagement-metrics
 * @access Private (company_super_admin, company_admin)
 */
const getConversationEngagementMetrics = async (req, res) => {
  try {
    const Conversation = req.getModel('Conversation');
    const WorkshopQuote = req.getModel('WorkshopQuote');
    const Supplier = req.getModel('Supplier');
    
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    // 1. Get all conversations with engagement data
    const conversations = await Conversation.find({
      company_id,
      ...dateFilter
    })
      .populate('quote_id', 'dealership_id status quote_type')
      .populate('supplier_id', 'supplier_name supplier_tags')
      .lean();

    // Filter by dealership if needed
    const filteredConversations = Object.keys(dealershipFilter).length > 0
      ? conversations.filter(conv => 
          conv.quote_id && 
          dealershipFilter.dealership_id.$in.some(id => 
            id.toString() === conv.quote_id.dealership_id?.toString()
          )
        )
      : conversations;

    // 2. Calculate engagement metrics for each conversation
    const conversationEngagement = filteredConversations.map(conv => {
      const messages = conv.messages || [];
      
      if (messages.length === 0) {
        return null;
      }

      // Calculate read rates
      const totalMessages = messages.length;
      const readMessages = messages.filter(m => m.is_read).length;
      const readRate = Math.round((readMessages / totalMessages) * 100);

      // Calculate message distribution
      const companyMessages = messages.filter(m => m.sender_type === 'company').length;
      const supplierMessages = messages.filter(m => m.sender_type === 'supplier').length;

      // Calculate engagement score based on multiple factors
      const messageExchangeBalance = Math.min(companyMessages, supplierMessages) / Math.max(companyMessages, supplierMessages, 1);
      const messageFrequency = totalMessages / Math.max(1, Math.ceil((new Date() - new Date(conv.created_at)) / (1000 * 60 * 60 * 24)));
      
      let engagementScore = 0;
      engagementScore += readRate * 0.3; // 30% weight on read rate
      engagementScore += messageExchangeBalance * 30; // 30% weight on balance
      engagementScore += Math.min(messageFrequency * 10, 40); // 40% weight on frequency (capped)
      engagementScore = Math.round(engagementScore);

      // Determine engagement level
      let engagementLevel = 'Low';
      if (engagementScore >= 70) engagementLevel = 'High';
      else if (engagementScore >= 40) engagementLevel = 'Medium';

      // Calculate conversation duration
      const firstMessage = messages[0];
      const lastMessage = messages[messages.length - 1];
      const durationMs = new Date(lastMessage.created_at) - new Date(firstMessage.created_at);
      const durationHours = Math.round((durationMs / (1000 * 60 * 60)) * 10) / 10;
      const durationDays = Math.round((durationMs / (1000 * 60 * 60 * 24)) * 10) / 10;

      // Determine if conversation is resolved (based on quote status)
      const isResolved = conv.quote_id?.status === 'completed_jobs' || 
                        conv.quote_id?.status === 'rejected' ||
                        conv.is_archived_company ||
                        conv.is_archived_supplier;

      // Calculate time to resolution
      const timeToResolution = isResolved && conv.last_message_at
        ? Math.round(((new Date(conv.last_message_at) - new Date(conv.created_at)) / (1000 * 60 * 60 * 24)) * 10) / 10
        : null;

      return {
        conversationId: conv._id,
        quoteId: conv.quote_id?._id,
        quoteStatus: conv.quote_id?.status,
        quoteType: conv.quote_id?.quote_type,
        supplierId: conv.supplier_id?._id,
        supplierName: conv.supplier_id?.supplier_name,
        totalMessages,
        companyMessages,
        supplierMessages,
        readMessages,
        unreadMessages: totalMessages - readMessages,
        readRate,
        unreadCountCompany: conv.unread_count_company,
        unreadCountSupplier: conv.unread_count_supplier,
        messageBalance: Math.round(messageExchangeBalance * 100),
        messageFrequencyPerDay: Math.round(messageFrequency * 10) / 10,
        engagementScore,
        engagementLevel,
        durationHours,
        durationDays,
        isResolved,
        timeToResolutionDays: timeToResolution,
        isArchived: conv.is_archived_company || conv.is_archived_supplier,
        createdAt: conv.created_at,
        lastMessageAt: conv.last_message_at
      };
    }).filter(Boolean);

    // 3. Calculate overall engagement statistics
    const totalConversations = conversationEngagement.length;
    const totalMessages = conversationEngagement.reduce((sum, c) => sum + c.totalMessages, 0);
    const totalReadMessages = conversationEngagement.reduce((sum, c) => sum + c.readMessages, 0);
    const overallReadRate = totalMessages > 0 
      ? Math.round((totalReadMessages / totalMessages) * 100) 
      : 0;

    const avgEngagementScore = totalConversations > 0
      ? Math.round(conversationEngagement.reduce((sum, c) => sum + c.engagementScore, 0) / totalConversations)
      : 0;

    // 4. Engagement level distribution
    const engagementDistribution = {
      high: conversationEngagement.filter(c => c.engagementLevel === 'High').length,
      medium: conversationEngagement.filter(c => c.engagementLevel === 'Medium').length,
      low: conversationEngagement.filter(c => c.engagementLevel === 'Low').length
    };

    // 5. Resolution metrics
    const resolvedConversations = conversationEngagement.filter(c => c.isResolved);
    const resolutionRate = totalConversations > 0
      ? Math.round((resolvedConversations.length / totalConversations) * 100)
      : 0;

    const avgTimeToResolution = resolvedConversations.length > 0
      ? Math.round(
          resolvedConversations
            .filter(c => c.timeToResolutionDays !== null)
            .reduce((sum, c) => sum + c.timeToResolutionDays, 0) / 
          resolvedConversations.filter(c => c.timeToResolutionDays !== null).length * 10
        ) / 10
      : 0;

    // 6. Analyze engagement by quote type
    const engagementByQuoteType = {};
    conversationEngagement.forEach(conv => {
      const quoteType = conv.quoteType || 'unknown';
      
      if (!engagementByQuoteType[quoteType]) {
        engagementByQuoteType[quoteType] = {
          quoteType,
          conversationCount: 0,
          totalMessages: 0,
          avgEngagementScore: 0,
          resolvedCount: 0,
          scores: []
        };
      }
      
      engagementByQuoteType[quoteType].conversationCount++;
      engagementByQuoteType[quoteType].totalMessages += conv.totalMessages;
      engagementByQuoteType[quoteType].scores.push(conv.engagementScore);
      if (conv.isResolved) {
        engagementByQuoteType[quoteType].resolvedCount++;
      }
    });

    const quoteTypeAnalysis = Object.values(engagementByQuoteType).map(qt => ({
      quoteType: qt.quoteType,
      conversationCount: qt.conversationCount,
      totalMessages: qt.totalMessages,
      avgMessagesPerConversation: Math.round((qt.totalMessages / qt.conversationCount) * 10) / 10,
      avgEngagementScore: Math.round(qt.scores.reduce((sum, s) => sum + s, 0) / qt.scores.length),
      resolutionRate: Math.round((qt.resolvedCount / qt.conversationCount) * 100)
    }));

    // 7. Analyze engagement by supplier
    const engagementBySupplier = {};
    conversationEngagement.forEach(conv => {
      if (conv.supplierId) {
        const supplierId = conv.supplierId.toString();
        
        if (!engagementBySupplier[supplierId]) {
          engagementBySupplier[supplierId] = {
            supplierId: conv.supplierId,
            supplierName: conv.supplierName,
            conversationCount: 0,
            totalMessages: 0,
            avgReadRate: 0,
            resolvedCount: 0,
            scores: [],
            readRates: []
          };
        }
        
        engagementBySupplier[supplierId].conversationCount++;
        engagementBySupplier[supplierId].totalMessages += conv.totalMessages;
        engagementBySupplier[supplierId].scores.push(conv.engagementScore);
        engagementBySupplier[supplierId].readRates.push(conv.readRate);
        if (conv.isResolved) {
          engagementBySupplier[supplierId].resolvedCount++;
        }
      }
    });

    const supplierEngagementAnalysis = Object.values(engagementBySupplier).map(supplier => {
      const avgEngagementScore = Math.round(
        supplier.scores.reduce((sum, s) => sum + s, 0) / supplier.scores.length
      );
      
      return {
        supplierId: supplier.supplierId,
        supplierName: supplier.supplierName,
        conversationCount: supplier.conversationCount,
        totalMessages: supplier.totalMessages,
        avgMessagesPerConversation: Math.round((supplier.totalMessages / supplier.conversationCount) * 10) / 10,
        avgEngagementScore,
        avgReadRate: Math.round(supplier.readRates.reduce((sum, r) => sum + r, 0) / supplier.readRates.length),
        resolutionRate: Math.round((supplier.resolvedCount / supplier.conversationCount) * 100),
        engagementLevel: avgEngagementScore >= 70 ? 'High' : avgEngagementScore >= 40 ? 'Medium' : 'Low'
      };
    }).sort((a, b) => b.avgEngagementScore - a.avgEngagementScore);

    // 8. Identify top and bottom performers
    const topEngagedConversations = conversationEngagement
      .sort((a, b) => b.engagementScore - a.engagementScore)
      .slice(0, 10)
      .map(c => ({
        conversationId: c.conversationId,
        quoteId: c.quoteId,
        supplierName: c.supplierName,
        engagementScore: c.engagementScore,
        engagementLevel: c.engagementLevel,
        totalMessages: c.totalMessages,
        readRate: c.readRate,
        isResolved: c.isResolved
      }));

    const lowEngagementConversations = conversationEngagement
      .filter(c => c.engagementLevel === 'Low' && !c.isResolved)
      .sort((a, b) => a.engagementScore - b.engagementScore)
      .slice(0, 10)
      .map(c => ({
        conversationId: c.conversationId,
        quoteId: c.quoteId,
        supplierName: c.supplierName,
        engagementScore: c.engagementScore,
        totalMessages: c.totalMessages,
        readRate: c.readRate,
        durationDays: c.durationDays,
        needsAttention: true
      }));

    // 9. Calculate engagement trends over time
    const engagementTrends = conversationEngagement.reduce((acc, conv) => {
      const date = new Date(conv.createdAt);
      const dateKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      
      if (!acc[dateKey]) {
        acc[dateKey] = {
          period: dateKey,
          conversationCount: 0,
          totalMessages: 0,
          resolvedCount: 0,
          scores: [],
          readRates: []
        };
      }
      
      acc[dateKey].conversationCount++;
      acc[dateKey].totalMessages += conv.totalMessages;
      acc[dateKey].scores.push(conv.engagementScore);
      acc[dateKey].readRates.push(conv.readRate);
      if (conv.isResolved) {
        acc[dateKey].resolvedCount++;
      }
      
      return acc;
    }, {});

    const trendAnalysis = Object.values(engagementTrends).map(trend => ({
      period: trend.period,
      conversationCount: trend.conversationCount,
      totalMessages: trend.totalMessages,
      avgMessagesPerConversation: Math.round((trend.totalMessages / trend.conversationCount) * 10) / 10,
      avgEngagementScore: Math.round(trend.scores.reduce((sum, s) => sum + s, 0) / trend.scores.length),
      avgReadRate: Math.round(trend.readRates.reduce((sum, r) => sum + r, 0) / trend.readRates.length),
      resolutionRate: Math.round((trend.resolvedCount / trend.conversationCount) * 100)
    })).sort((a, b) => a.period.localeCompare(b.period));

    // 10. Summary statistics
    const summaryStats = {
      totalConversations,
      activeConversations: conversationEngagement.filter(c => !c.isResolved).length,
      resolvedConversations: resolvedConversations.length,
      archivedConversations: conversationEngagement.filter(c => c.isArchived).length,
      totalMessages,
      avgMessagesPerConversation: totalConversations > 0 
        ? Math.round((totalMessages / totalConversations) * 10) / 10 
        : 0,
      readMetrics: {
        totalReadMessages,
        totalUnreadMessages: totalMessages - totalReadMessages,
        overallReadRate,
        avgUnreadPerConversation: totalConversations > 0
          ? Math.round(((totalMessages - totalReadMessages) / totalConversations) * 10) / 10
          : 0
      },
      engagementMetrics: {
        avgEngagementScore,
        distribution: engagementDistribution,
        highEngagementPercentage: totalConversations > 0
          ? Math.round((engagementDistribution.high / totalConversations) * 100)
          : 0
      },
      resolutionMetrics: {
        resolutionRate,
        avgTimeToResolutionDays: avgTimeToResolution,
        unresolvedConversations: totalConversations - resolvedConversations.length,
        avgDurationDays: totalConversations > 0
          ? Math.round(conversationEngagement.reduce((sum, c) => sum + c.durationDays, 0) / totalConversations * 10) / 10
          : 0
      },
      performanceIndicators: {
        needsAttention: lowEngagementConversations.length,
        highPerformers: topEngagedConversations.length,
        overallHealth: avgEngagementScore >= 60 ? 'Healthy' : 
                      avgEngagementScore >= 40 ? 'Moderate' : 'Needs Improvement'
      }
    };

    res.json(formatReportResponse({
      conversations: conversationEngagement.slice(0, 50), // Limit to top 50 for performance
      topEngaged: topEngagedConversations,
      lowEngagement: lowEngagementConversations,
      quoteTypeAnalysis,
      supplierEngagement: supplierEngagementAnalysis,
      trends: trendAnalysis,
      summary: summaryStats
    }, {
      reportType: 'conversation-engagement-metrics',
      filters: {
        dealership: dealershipFilter,
        dateRange: dateFilter
      }
    }));

  } catch (error) {
    return handleReportError(error, res, 'Conversation Engagement Metrics');
  }
};

module.exports = {
  getConversationVolumeAnalysis,
  getConversationResponseTimes,
  getConversationEngagementMetrics
};
