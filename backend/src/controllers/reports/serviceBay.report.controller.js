/**
 * ServiceBay Report Controller
 * Handles all service bay analytics and reporting endpoints
 * Provides comprehensive bay utilization, booking patterns, user assignment, and holiday impact metrics
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
 * Manually populate User fields from main DB for ServiceBay documents
 * @param {Array|Object} items - ServiceBay document(s) to populate
 * @returns {Array|Object} Populated items
 */
async function populateServiceBayUsers(items) {
  const isArray = Array.isArray(items);
  const itemsArray = isArray ? items : [items];
  
  if (itemsArray.length === 0) return items;

  // Collect all unique user IDs
  const userIds = new Set();
  itemsArray.forEach(item => {
    if (item.bay_users && Array.isArray(item.bay_users)) {
      item.bay_users.forEach(id => userIds.add(id.toString()));
    }
    if (item.primary_admin) {
      userIds.add(item.primary_admin.toString());
    }
    if (item.bay_holidays && Array.isArray(item.bay_holidays)) {
      item.bay_holidays.forEach(holiday => {
        if (holiday.marked_by) {
          userIds.add(holiday.marked_by.toString());
        }
      });
    }
  });

  if (userIds.size === 0) return items;

  // Fetch all users at once
  const users = await User.find(
    { _id: { $in: Array.from(userIds) } },
    'name email role first_name last_name'
  ).lean();

  // Create user lookup map
  const userMap = {};
  users.forEach(user => {
    userMap[user._id.toString()] = user;
  });

  // Populate items
  itemsArray.forEach(item => {
    if (item.bay_users && Array.isArray(item.bay_users)) {
      item.bay_users = item.bay_users.map(id => userMap[id.toString()] || id);
    }
    if (item.primary_admin) {
      item.primary_admin = userMap[item.primary_admin.toString()] || item.primary_admin;
    }
    if (item.bay_holidays && Array.isArray(item.bay_holidays)) {
      item.bay_holidays.forEach(holiday => {
        if (holiday.marked_by) {
          holiday.marked_by = userMap[holiday.marked_by.toString()] || holiday.marked_by;
        }
      });
    }
  });

  return isArray ? itemsArray : itemsArray[0];
}

/**
 * Get Service Bay Utilization
 * Provides comprehensive bay usage and capacity analysis
 * Includes booking rates, capacity metrics, and utilization trends
 * 
 * @route GET /api/company/reports/service-bay/utilization
 * @access Private (company_super_admin, company_admin)
 */
const getServiceBayUtilization = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    const ServiceBay = req.getModel('ServiceBay');
    const Dealership = req.getModel('Dealership'); // Ensure Dealership model is created
    const WorkshopQuote = req.getModel('WorkshopQuote');

    // 1. Get all service bays for the company
    const serviceBays = await ServiceBay.find({ 
      company_id,
      ...dealershipFilter 
    })
      .populate('dealership_id', 'dealership_name')
      .lean();

    // Manually populate User fields from main DB
    await populateServiceBayUsers(serviceBays);

    const bayIds = serviceBays.map(b => b._id);

    // 2. Get booking statistics for each bay
    const bookingStats = await WorkshopQuote.aggregate([
      {
        $match: {
          company_id,
          quote_type: 'bay',
          bay_id: { $in: bayIds },
          ...dateFilter
        }
      },
      {
        $group: {
          _id: '$bay_id',
          totalBookings: { $sum: 1 },
          completedBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'completed_jobs'] }, 1, 0] }
          },
          inProgressBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'work_in_progress'] }, 1, 0] }
          },
          pendingBookings: {
            $sum: { $cond: [{ $in: ['$status', ['pending', 'approved']] }, 1, 0] }
          },
          cancelledBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          },
          totalQuoteValue: { $sum: '$quote_amount' },
          avgQuoteAmount: { $avg: '$quote_amount' },
          earliestBooking: { $min: '$booking_date' },
          latestBooking: { $max: '$booking_date' }
        }
      }
    ]);

    // 3. Calculate working hours and capacity for each bay
    const bayUtilization = serviceBays.map(bay => {
      const bookingData = bookingStats.find(b => b._id?.toString() === bay._id.toString()) || {};

      // Calculate total working hours per week
      const workingHoursPerWeek = (bay.bay_timings || []).reduce((total, timing) => {
        if (timing.is_working_day && timing.start_time && timing.end_time) {
          const [startHour, startMin] = timing.start_time.split(':').map(Number);
          const [endHour, endMin] = timing.end_time.split(':').map(Number);
          const hours = (endHour + endMin / 60) - (startHour + startMin / 60);
          return total + hours;
        }
        return total;
      }, 0);

      // Calculate average hours per booking (assuming 2 hours per booking as default)
      const avgHoursPerBooking = 2;
      const totalBookingHours = (bookingData.totalBookings || 0) * avgHoursPerBooking;
      
      // Calculate utilization rate
      const dateRange = dateFilter.created_at;
      let weeksInRange = 4; // Default to 4 weeks
      if (dateRange && dateRange.$gte && dateRange.$lte) {
        const daysDiff = Math.ceil((dateRange.$lte - dateRange.$gte) / (1000 * 60 * 60 * 24));
        weeksInRange = Math.max(1, Math.ceil(daysDiff / 7));
      }
      
      const totalAvailableHours = workingHoursPerWeek * weeksInRange;
      const utilizationRate = totalAvailableHours > 0 
        ? Math.round((totalBookingHours / totalAvailableHours) * 100)
        : 0;

      // Calculate completion rate
      const completionRate = bookingData.totalBookings 
        ? Math.round((bookingData.completedBookings / bookingData.totalBookings) * 100)
        : 0;

      // Calculate capacity status
      let capacityStatus = 'Low';
      if (utilizationRate >= 80) capacityStatus = 'High';
      else if (utilizationRate >= 50) capacityStatus = 'Medium';

      return {
        bayId: bay._id,
        bayName: bay.bay_name,
        bayDescription: bay.bay_description,
        dealership: {
          id: bay.dealership_id?._id,
          name: bay.dealership_id?.dealership_name
        },
        isActive: bay.is_active,
        assignedUsers: (bay.bay_users || []).map(u => ({
          id: u._id,
          name: u.name,
          email: u.email
        })),
        primaryAdmin: bay.primary_admin ? {
          id: bay.primary_admin._id,
          name: bay.primary_admin.name,
          email: bay.primary_admin.email
        } : null,
        workingHours: {
          perWeek: Math.round(workingHoursPerWeek * 10) / 10,
          perDay: Math.round((workingHoursPerWeek / 7) * 10) / 10,
          workingDays: (bay.bay_timings || []).filter(t => t.is_working_day).length
        },
        bookingMetrics: {
          total: bookingData.totalBookings || 0,
          completed: bookingData.completedBookings || 0,
          inProgress: bookingData.inProgressBookings || 0,
          pending: bookingData.pendingBookings || 0,
          cancelled: bookingData.cancelledBookings || 0,
          completionRate,
          totalValue: bookingData.totalQuoteValue || 0,
          avgValue: Math.round(bookingData.avgQuoteAmount || 0)
        },
        utilizationMetrics: {
          utilizationRate,
          totalAvailableHours: Math.round(totalAvailableHours),
          totalBookingHours: Math.round(totalBookingHours),
          capacityStatus,
          bookingsPerWeek: Math.round((bookingData.totalBookings || 0) / weeksInRange * 10) / 10
        },
        holidayCount: (bay.bay_holidays || []).length,
        dateRange: {
          earliest: bookingData.earliestBooking,
          latest: bookingData.latestBooking
        }
      };
    });

    // Sort by utilization rate descending
    bayUtilization.sort((a, b) => b.utilizationMetrics.utilizationRate - a.utilizationMetrics.utilizationRate);

    // 4. Calculate summary statistics
    const summaryStats = {
      totalBays: serviceBays.length,
      activeBays: serviceBays.filter(b => b.is_active).length,
      inactiveBays: serviceBays.filter(b => !b.is_active).length,
      totalBookings: bayUtilization.reduce((sum, b) => sum + b.bookingMetrics.total, 0),
      totalCompletedBookings: bayUtilization.reduce((sum, b) => sum + b.bookingMetrics.completed, 0),
      avgUtilizationRate: Math.round(
        bayUtilization.reduce((sum, b) => sum + b.utilizationMetrics.utilizationRate, 0) / bayUtilization.length
      ) || 0,
      avgCompletionRate: Math.round(
        bayUtilization.reduce((sum, b) => sum + b.bookingMetrics.completionRate, 0) / bayUtilization.length
      ) || 0,
      totalRevenue: bayUtilization.reduce((sum, b) => sum + b.bookingMetrics.totalValue, 0),
      capacityDistribution: {
        high: bayUtilization.filter(b => b.utilizationMetrics.capacityStatus === 'High').length,
        medium: bayUtilization.filter(b => b.utilizationMetrics.capacityStatus === 'Medium').length,
        low: bayUtilization.filter(b => b.utilizationMetrics.capacityStatus === 'Low').length
      }
    };

    res.json(formatReportResponse({
      bays: bayUtilization,
      summary: summaryStats
    }, {
      reportType: 'service-bay-utilization',
      filters: {
        dealership: dealershipFilter,
        dateRange: dateFilter
      }
    }));

  } catch (error) {
    return handleReportError(error, res, 'Service Bay Utilization');
  }
};

/**
 * Get Service Bay Booking Patterns
 * Analyzes booking trends and patterns over time
 * Includes day-of-week analysis, time slot preferences, and seasonal trends
 * 
 * @route GET /api/company/reports/service-bay/booking-patterns
 * @access Private (company_super_admin, company_admin)
 */
const getServiceBayBookingPatterns = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    const ServiceBay = req.getModel('ServiceBay');
    const WorkshopQuote = req.getModel('WorkshopQuote');

    // 1. Get all service bays
    const serviceBays = await ServiceBay.find({ 
      company_id,
      ...dealershipFilter 
    })
      .select('_id bay_name dealership_id')
      .lean();

    const bayIds = serviceBays.map(b => b._id);

    // 2. Analyze bookings by day of week
    const bookingsByDayOfWeek = await WorkshopQuote.aggregate([
      {
        $match: {
          company_id,
          quote_type: 'bay',
          bay_id: { $in: bayIds },
          booking_date: { $exists: true, $ne: null },
          ...dateFilter
        }
      },
      {
        $project: {
          bay_id: 1,
          booking_date: 1,
          quote_amount: 1,
          status: 1,
          dayOfWeek: { $dayOfWeek: '$booking_date' }, // 1=Sunday, 7=Saturday
          month: { $month: '$booking_date' },
          year: { $year: '$booking_date' },
          booking_start_time: 1
        }
      },
      {
        $group: {
          _id: {
            dayOfWeek: '$dayOfWeek',
            bay_id: '$bay_id'
          },
          bookingCount: { $sum: 1 },
          totalValue: { $sum: '$quote_amount' },
          avgValue: { $avg: '$quote_amount' },
          completedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'completed_jobs'] }, 1, 0] }
          }
        }
      },
      {
        $group: {
          _id: '$_id.dayOfWeek',
          totalBookings: { $sum: '$bookingCount' },
          totalValue: { $sum: '$totalValue' },
          avgValue: { $avg: '$avgValue' },
          completedBookings: { $sum: '$completedCount' },
          bayCount: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Map day numbers to names
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeekAnalysis = bookingsByDayOfWeek.map(day => ({
      dayOfWeek: dayNames[day._id - 1],
      dayNumber: day._id,
      totalBookings: day.totalBookings,
      totalValue: day.totalValue,
      avgValue: Math.round(day.avgValue),
      completedBookings: day.completedBookings,
      completionRate: Math.round((day.completedBookings / day.totalBookings) * 100),
      avgBookingsPerBay: Math.round((day.totalBookings / day.bayCount) * 10) / 10
    }));

    // 3. Analyze bookings by time slot
    const bookingsByTimeSlot = await WorkshopQuote.aggregate([
      {
        $match: {
          company_id,
          quote_type: 'bay',
          bay_id: { $in: bayIds },
          booking_start_time: { $exists: true, $ne: null },
          ...dateFilter
        }
      },
      {
        $project: {
          bay_id: 1,
          quote_amount: 1,
          status: 1,
          hourSlot: {
            $substr: ['$booking_start_time', 0, 2]
          }
        }
      },
      {
        $group: {
          _id: '$hourSlot',
          bookingCount: { $sum: 1 },
          totalValue: { $sum: '$quote_amount' },
          avgValue: { $avg: '$quote_amount' },
          completedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'completed_jobs'] }, 1, 0] }
          }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    const timeSlotAnalysis = bookingsByTimeSlot.map(slot => ({
      timeSlot: `${slot._id}:00`,
      hour: parseInt(slot._id),
      bookingCount: slot.bookingCount,
      totalValue: slot.totalValue,
      avgValue: Math.round(slot.avgValue),
      completedCount: slot.completedCount,
      completionRate: Math.round((slot.completedCount / slot.bookingCount) * 100),
      timeOfDay: parseInt(slot._id) < 12 ? 'Morning' : parseInt(slot._id) < 17 ? 'Afternoon' : 'Evening'
    }));

    // 4. Analyze monthly booking trends
    const monthlyTrends = await WorkshopQuote.aggregate([
      {
        $match: {
          company_id,
          quote_type: 'bay',
          bay_id: { $in: bayIds },
          booking_date: { $exists: true, $ne: null },
          ...dateFilter
        }
      },
      {
        $project: {
          bay_id: 1,
          quote_amount: 1,
          status: 1,
          year: { $year: '$booking_date' },
          month: { $month: '$booking_date' }
        }
      },
      {
        $group: {
          _id: {
            year: '$year',
            month: '$month'
          },
          bookingCount: { $sum: 1 },
          totalValue: { $sum: '$quote_amount' },
          avgValue: { $avg: '$quote_amount' },
          completedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'completed_jobs'] }, 1, 0] }
          }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyTrendAnalysis = monthlyTrends.map(trend => ({
      year: trend._id.year,
      month: trend._id.month,
      monthName: monthNames[trend._id.month - 1],
      period: `${monthNames[trend._id.month - 1]} ${trend._id.year}`,
      bookingCount: trend.bookingCount,
      totalValue: trend.totalValue,
      avgValue: Math.round(trend.avgValue),
      completedCount: trend.completedCount,
      completionRate: Math.round((trend.completedCount / trend.bookingCount) * 100)
    }));

    // 5. Analyze booking patterns by bay
    const bayBookingPatterns = await WorkshopQuote.aggregate([
      {
        $match: {
          company_id,
          quote_type: 'bay',
          bay_id: { $in: bayIds },
          ...dateFilter
        }
      },
      {
        $group: {
          _id: '$bay_id',
          totalBookings: { $sum: 1 },
          avgQuoteAmount: { $avg: '$quote_amount' },
          completedBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'completed_jobs'] }, 1, 0] }
          },
          cancelledBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          },
          avgBookingsPerMonth: { $sum: 1 }
        }
      }
    ]);

    const bayPatterns = serviceBays.map(bay => {
      const patternData = bayBookingPatterns.find(p => p._id?.toString() === bay._id.toString()) || {};
      
      return {
        bayId: bay._id,
        bayName: bay.bay_name,
        totalBookings: patternData.totalBookings || 0,
        avgQuoteAmount: Math.round(patternData.avgQuoteAmount || 0),
        completedBookings: patternData.completedBookings || 0,
        cancelledBookings: patternData.cancelledBookings || 0,
        completionRate: patternData.totalBookings 
          ? Math.round((patternData.completedBookings / patternData.totalBookings) * 100)
          : 0,
        cancellationRate: patternData.totalBookings 
          ? Math.round((patternData.cancelledBookings / patternData.totalBookings) * 100)
          : 0
      };
    });

    // 6. Calculate peak booking times
    const peakDay = dayOfWeekAnalysis.reduce((max, day) => 
      day.totalBookings > (max?.totalBookings || 0) ? day : max, null);
    
    const peakTimeSlot = timeSlotAnalysis.reduce((max, slot) => 
      slot.bookingCount > (max?.bookingCount || 0) ? slot : max, null);

    // 7. Summary statistics
    const summaryStats = {
      totalBookings: dayOfWeekAnalysis.reduce((sum, d) => sum + d.totalBookings, 0),
      totalValue: dayOfWeekAnalysis.reduce((sum, d) => sum + d.totalValue, 0),
      avgBookingsPerDay: Math.round(
        (dayOfWeekAnalysis.reduce((sum, d) => sum + d.totalBookings, 0) / dayOfWeekAnalysis.length) * 10
      ) / 10,
      peakBookingDay: peakDay ? {
        day: peakDay.dayOfWeek,
        bookings: peakDay.totalBookings
      } : null,
      peakBookingTime: peakTimeSlot ? {
        time: peakTimeSlot.timeSlot,
        bookings: peakTimeSlot.bookingCount
      } : null,
      timeOfDayDistribution: {
        morning: timeSlotAnalysis.filter(s => s.timeOfDay === 'Morning').reduce((sum, s) => sum + s.bookingCount, 0),
        afternoon: timeSlotAnalysis.filter(s => s.timeOfDay === 'Afternoon').reduce((sum, s) => sum + s.bookingCount, 0),
        evening: timeSlotAnalysis.filter(s => s.timeOfDay === 'Evening').reduce((sum, s) => sum + s.bookingCount, 0)
      }
    };

    res.json(formatReportResponse({
      dayOfWeekAnalysis,
      timeSlotAnalysis,
      monthlyTrends: monthlyTrendAnalysis,
      bayPatterns,
      summary: summaryStats
    }, {
      reportType: 'service-bay-booking-patterns',
      filters: {
        dealership: dealershipFilter,
        dateRange: dateFilter
      }
    }));

  } catch (error) {
    return handleReportError(error, res, 'Service Bay Booking Patterns');
  }
};

/**
 * Get Service Bay User Assignment
 * Analyzes user assignment and workload distribution across service bays
 * Includes user productivity, assignment patterns, and workload balance
 * 
 * @route GET /api/company/reports/service-bay/user-assignment
 * @access Private (company_super_admin, company_admin)
 */
const getServiceBayUserAssignment = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    const ServiceBay = req.getModel('ServiceBay');
    const Dealership = req.getModel('Dealership'); // Ensure Dealership model is created
    const WorkshopQuote = req.getModel('WorkshopQuote');

    // 1. Get all service bays with user assignments
    const serviceBays = await ServiceBay.find({ 
      company_id,
      ...dealershipFilter 
    })
      .populate('dealership_id', 'dealership_name')
      .lean();

    // Manually populate User fields from main DB
    await populateServiceBayUsers(serviceBays);

    const bayIds = serviceBays.map(b => b._id);

    // 2. Get all unique users assigned to bays
    const allAssignedUsers = new Map();
    serviceBays.forEach(bay => {
      (bay.bay_users || []).forEach(user => {
        if (!allAssignedUsers.has(user._id.toString())) {
          allAssignedUsers.set(user._id.toString(), {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            bays: []
          });
        }
        allAssignedUsers.get(user._id.toString()).bays.push({
          bayId: bay._id,
          bayName: bay.bay_name,
          dealership: bay.dealership_id?.dealership_name
        });
      });
    });

    const mongoose = require('mongoose');
    const userIds = Array.from(allAssignedUsers.keys()).map(id => new mongoose.Types.ObjectId(id));

    // 3. Get booking workload by user (through bay assignments)
    const userWorkload = await WorkshopQuote.aggregate([
      {
        $match: {
          company_id,
          quote_type: 'bay',
          bay_id: { $in: bayIds },
          ...dateFilter
        }
      },
      {
        $lookup: {
          from: 'servicebays',
          localField: 'bay_id',
          foreignField: '_id',
          as: 'bayData'
        }
      },
      { $unwind: { path: '$bayData', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$bayData.bay_users', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$bayData.bay_users',
          totalBookings: { $sum: 1 },
          completedBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'completed_jobs'] }, 1, 0] }
          },
          inProgressBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'work_in_progress'] }, 1, 0] }
          },
          pendingBookings: {
            $sum: { $cond: [{ $in: ['$status', ['pending', 'approved']] }, 1, 0] }
          },
          totalQuoteValue: { $sum: '$quote_amount' },
          avgQuoteAmount: { $avg: '$quote_amount' },
          uniqueBays: { $addToSet: '$bay_id' }
        }
      }
    ]);

    // 4. Combine user data with workload metrics
    const userAssignmentAnalysis = Array.from(allAssignedUsers.values()).map(user => {
      const workloadData = userWorkload.find(w => w._id?.toString() === user.id.toString()) || {};

      const completionRate = workloadData.totalBookings 
        ? Math.round((workloadData.completedBookings / workloadData.totalBookings) * 100)
        : 0;

      // Calculate workload level
      const totalBookings = workloadData.totalBookings || 0;
      let workloadLevel = 'Low';
      if (totalBookings >= 20) workloadLevel = 'High';
      else if (totalBookings >= 10) workloadLevel = 'Medium';

      return {
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        assignedBays: user.bays,
        bayCount: user.bays.length,
        workloadMetrics: {
          totalBookings: workloadData.totalBookings || 0,
          completedBookings: workloadData.completedBookings || 0,
          inProgressBookings: workloadData.inProgressBookings || 0,
          pendingBookings: workloadData.pendingBookings || 0,
          completionRate,
          totalValue: workloadData.totalQuoteValue || 0,
          avgValue: Math.round(workloadData.avgQuoteAmount || 0),
          bookingsPerBay: user.bays.length > 0 
            ? Math.round(((workloadData.totalBookings || 0) / user.bays.length) * 10) / 10
            : 0
        },
        workloadLevel,
        productivity: completionRate >= 80 ? 'High' : completionRate >= 60 ? 'Medium' : 'Low'
      };
    });

    // Sort by total bookings descending
    userAssignmentAnalysis.sort((a, b) => b.workloadMetrics.totalBookings - a.workloadMetrics.totalBookings);

    // 5. Analyze bay assignment distribution
    const bayAssignmentAnalysis = serviceBays.map(bay => {
      const userCount = (bay.bay_users || []).length;
      
      // Calculate total workload for this bay
      const bayWorkload = userWorkload
        .filter(w => (w.uniqueBays || []).some(bayId => bayId.toString() === bay._id.toString()))
        .reduce((sum, w) => sum + (w.totalBookings || 0), 0);

      return {
        bayId: bay._id,
        bayName: bay.bay_name,
        dealership: {
          id: bay.dealership_id?._id,
          name: bay.dealership_id?.dealership_name
        },
        assignedUserCount: userCount,
        assignedUsers: (bay.bay_users || []).map(u => ({
          id: u._id,
          name: u.name,
          email: u.email
        })),
        primaryAdmin: bay.primary_admin ? {
          id: bay.primary_admin._id,
          name: bay.primary_admin.name,
          email: bay.primary_admin.email
        } : null,
        totalWorkload: bayWorkload,
        workloadPerUser: userCount > 0 ? Math.round((bayWorkload / userCount) * 10) / 10 : 0,
        staffingLevel: userCount === 0 ? 'Unstaffed' : userCount === 1 ? 'Minimal' : userCount <= 3 ? 'Adequate' : 'Well-Staffed'
      };
    });

    // Sort by workload per user descending
    bayAssignmentAnalysis.sort((a, b) => b.workloadPerUser - a.workloadPerUser);

    // 6. Calculate workload balance metrics
    const workloads = userAssignmentAnalysis.map(u => u.workloadMetrics.totalBookings);
    const avgWorkload = workloads.length > 0 
      ? workloads.reduce((sum, w) => sum + w, 0) / workloads.length 
      : 0;
    
    const maxWorkload = Math.max(...workloads, 0);
    const minWorkload = Math.min(...workloads, 0);
    const workloadVariance = maxWorkload - minWorkload;
    
    const balanceScore = avgWorkload > 0 
      ? Math.max(0, 100 - ((workloadVariance / avgWorkload) * 100))
      : 100;

    // 7. Summary statistics
    const summaryStats = {
      totalUsers: userAssignmentAnalysis.length,
      totalBays: serviceBays.length,
      unstaffedBays: bayAssignmentAnalysis.filter(b => b.staffingLevel === 'Unstaffed').length,
      avgUsersPerBay: Math.round((userAssignmentAnalysis.reduce((sum, u) => sum + u.bayCount, 0) / serviceBays.length) * 10) / 10,
      avgBaysPerUser: Math.round((userAssignmentAnalysis.reduce((sum, u) => sum + u.bayCount, 0) / userAssignmentAnalysis.length) * 10) / 10,
      totalBookings: userAssignmentAnalysis.reduce((sum, u) => sum + u.workloadMetrics.totalBookings, 0),
      avgWorkloadPerUser: Math.round(avgWorkload * 10) / 10,
      workloadBalance: {
        score: Math.round(balanceScore),
        maxWorkload,
        minWorkload,
        variance: workloadVariance,
        status: balanceScore >= 70 ? 'Balanced' : balanceScore >= 40 ? 'Moderate' : 'Imbalanced'
      },
      workloadDistribution: {
        high: userAssignmentAnalysis.filter(u => u.workloadLevel === 'High').length,
        medium: userAssignmentAnalysis.filter(u => u.workloadLevel === 'Medium').length,
        low: userAssignmentAnalysis.filter(u => u.workloadLevel === 'Low').length
      },
      productivityDistribution: {
        high: userAssignmentAnalysis.filter(u => u.productivity === 'High').length,
        medium: userAssignmentAnalysis.filter(u => u.productivity === 'Medium').length,
        low: userAssignmentAnalysis.filter(u => u.productivity === 'Low').length
      }
    };

    res.json(formatReportResponse({
      users: userAssignmentAnalysis,
      bays: bayAssignmentAnalysis,
      summary: summaryStats
    }, {
      reportType: 'service-bay-user-assignment',
      filters: {
        dealership: dealershipFilter,
        dateRange: dateFilter
      }
    }));

  } catch (error) {
    return handleReportError(error, res, 'Service Bay User Assignment');
  }
};

/**
 * Get Service Bay Holiday Impact
 * Analyzes the impact of holidays and downtime on service bay operations
 * Includes holiday frequency, booking impact, and capacity loss analysis
 * 
 * @route GET /api/company/reports/service-bay/holiday-impact
 * @access Private (company_super_admin, company_admin)
 */
const getServiceBayHolidayImpact = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    const ServiceBay = req.getModel('ServiceBay');
    const Dealership = req.getModel('Dealership'); // Ensure Dealership model is created

    // 1. Get all service bays with holiday data
    const serviceBays = await ServiceBay.find({ 
      company_id,
      ...dealershipFilter 
    })
      .populate('dealership_id', 'dealership_name')
      .lean();

    // Manually populate User fields from main DB (including bay_holidays.marked_by)
    await populateServiceBayUsers(serviceBays);

    const bayIds = serviceBays.map(b => b._id);

    // 2. Filter holidays within date range if specified
    const filterHolidaysByDate = (holidays) => {
      if (!dateFilter.created_at) return holidays;
      
      const { $gte, $lte } = dateFilter.created_at;
      return holidays.filter(h => {
        const holidayDate = new Date(h.date);
        return holidayDate >= $gte && holidayDate <= $lte;
      });
    };

    // 3. Analyze holiday impact for each bay
    const bayHolidayAnalysis = serviceBays.map(bay => {
      const holidays = filterHolidaysByDate(bay.bay_holidays || []);
      
      // Calculate total holiday hours
      const totalHolidayHours = holidays.reduce((total, holiday) => {
        if (holiday.start_time && holiday.end_time) {
          const [startHour, startMin] = holiday.start_time.split(':').map(Number);
          const [endHour, endMin] = holiday.end_time.split(':').map(Number);
          const hours = (endHour + endMin / 60) - (startHour + startMin / 60);
          return total + hours;
        }
        return total + 8; // Default to 8 hours if times not specified
      }, 0);

      // Calculate working hours per week
      const workingHoursPerWeek = (bay.bay_timings || []).reduce((total, timing) => {
        if (timing.is_working_day && timing.start_time && timing.end_time) {
          const [startHour, startMin] = timing.start_time.split(':').map(Number);
          const [endHour, endMin] = timing.end_time.split(':').map(Number);
          const hours = (endHour + endMin / 60) - (startHour + startMin / 60);
          return total + hours;
        }
        return total;
      }, 0);

      // Calculate capacity loss percentage
      const dateRange = dateFilter.created_at;
      let weeksInRange = 4; // Default to 4 weeks
      if (dateRange && dateRange.$gte && dateRange.$lte) {
        const daysDiff = Math.ceil((dateRange.$lte - dateRange.$gte) / (1000 * 60 * 60 * 24));
        weeksInRange = Math.max(1, Math.ceil(daysDiff / 7));
      }
      
      const totalAvailableHours = workingHoursPerWeek * weeksInRange;
      const capacityLossPercentage = totalAvailableHours > 0 
        ? Math.round((totalHolidayHours / totalAvailableHours) * 100 * 10) / 10
        : 0;

      // Group holidays by reason
      const holidaysByReason = holidays.reduce((acc, holiday) => {
        const reason = holiday.reason || 'Unspecified';
        if (!acc[reason]) {
          acc[reason] = {
            count: 0,
            totalHours: 0,
            dates: []
          };
        }
        acc[reason].count++;
        
        // Calculate hours for this holiday
        let hours = 8; // Default
        if (holiday.start_time && holiday.end_time) {
          const [startHour, startMin] = holiday.start_time.split(':').map(Number);
          const [endHour, endMin] = holiday.end_time.split(':').map(Number);
          hours = (endHour + endMin / 60) - (startHour + startMin / 60);
        }
        acc[reason].totalHours += hours;
        acc[reason].dates.push(holiday.date);
        
        return acc;
      }, {});

      // Find upcoming holidays (future dates)
      const now = new Date();
      const upcomingHolidays = holidays
        .filter(h => new Date(h.date) > now)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 5)
        .map(h => ({
          date: h.date,
          startTime: h.start_time,
          endTime: h.end_time,
          reason: h.reason,
          markedBy: h.marked_by ? {
            id: h.marked_by._id,
            name: h.marked_by.name
          } : null
        }));

      // Find most recent holidays
      const recentHolidays = holidays
        .filter(h => new Date(h.date) <= now)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5)
        .map(h => ({
          date: h.date,
          startTime: h.start_time,
          endTime: h.end_time,
          reason: h.reason,
          markedBy: h.marked_by ? {
            id: h.marked_by._id,
            name: h.marked_by.name
          } : null
        }));

      return {
        bayId: bay._id,
        bayName: bay.bay_name,
        dealership: {
          id: bay.dealership_id?._id,
          name: bay.dealership_id?.dealership_name
        },
        holidayMetrics: {
          totalHolidays: holidays.length,
          totalHolidayHours: Math.round(totalHolidayHours * 10) / 10,
          avgHoursPerHoliday: holidays.length > 0 
            ? Math.round((totalHolidayHours / holidays.length) * 10) / 10
            : 0,
          capacityLossPercentage,
          holidaysPerMonth: Math.round((holidays.length / weeksInRange * 4.33) * 10) / 10
        },
        holidaysByReason: Object.entries(holidaysByReason).map(([reason, data]) => ({
          reason,
          count: data.count,
          totalHours: Math.round(data.totalHours * 10) / 10,
          percentage: Math.round((data.count / holidays.length) * 100)
        })).sort((a, b) => b.count - a.count),
        upcomingHolidays,
        recentHolidays,
        impactLevel: capacityLossPercentage >= 20 ? 'High' : 
                     capacityLossPercentage >= 10 ? 'Medium' : 'Low'
      };
    });

    // Sort by capacity loss percentage descending
    bayHolidayAnalysis.sort((a, b) => b.holidayMetrics.capacityLossPercentage - a.holidayMetrics.capacityLossPercentage);

    // 4. Get booking data to analyze impact on operations
    const bookingImpact = await WorkshopQuote.aggregate([
      {
        $match: {
          company_id,
          quote_type: 'bay',
          bay_id: { $in: bayIds },
          ...dateFilter
        }
      },
      {
        $group: {
          _id: '$bay_id',
          totalBookings: { $sum: 1 },
          totalValue: { $sum: '$quote_amount' }
        }
      }
    ]);

    // 5. Calculate estimated revenue loss due to holidays
    const bayImpactWithRevenue = bayHolidayAnalysis.map(bay => {
      const bookingData = bookingImpact.find(b => b._id?.toString() === bay.bayId.toString()) || {};
      
      const totalBookings = bookingData.totalBookings || 0;
      const totalValue = bookingData.totalValue || 0;
      
      // Estimate revenue loss based on capacity loss
      const estimatedRevenueLoss = totalValue > 0 
        ? Math.round((totalValue * (bay.holidayMetrics.capacityLossPercentage / 100)))
        : 0;

      // Estimate missed bookings
      const estimatedMissedBookings = totalBookings > 0 
        ? Math.round(totalBookings * (bay.holidayMetrics.capacityLossPercentage / 100))
        : 0;

      return {
        ...bay,
        operationalImpact: {
          totalBookings,
          totalRevenue: totalValue,
          estimatedRevenueLoss,
          estimatedMissedBookings,
          revenueImpactPercentage: bay.holidayMetrics.capacityLossPercentage
        }
      };
    });

    // 6. Aggregate holiday reasons across all bays
    const allHolidayReasons = {};
    bayHolidayAnalysis.forEach(bay => {
      bay.holidaysByReason.forEach(reason => {
        if (!allHolidayReasons[reason.reason]) {
          allHolidayReasons[reason.reason] = {
            count: 0,
            totalHours: 0,
            baysAffected: 0
          };
        }
        allHolidayReasons[reason.reason].count += reason.count;
        allHolidayReasons[reason.reason].totalHours += reason.totalHours;
        allHolidayReasons[reason.reason].baysAffected++;
      });
    });

    const topHolidayReasons = Object.entries(allHolidayReasons)
      .map(([reason, data]) => ({
        reason,
        count: data.count,
        totalHours: Math.round(data.totalHours * 10) / 10,
        baysAffected: data.baysAffected,
        avgHoursPerOccurrence: Math.round((data.totalHours / data.count) * 10) / 10
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 7. Summary statistics
    const summaryStats = {
      totalBays: serviceBays.length,
      baysWithHolidays: bayHolidayAnalysis.filter(b => b.holidayMetrics.totalHolidays > 0).length,
      totalHolidays: bayHolidayAnalysis.reduce((sum, b) => sum + b.holidayMetrics.totalHolidays, 0),
      totalHolidayHours: Math.round(bayHolidayAnalysis.reduce((sum, b) => sum + b.holidayMetrics.totalHolidayHours, 0) * 10) / 10,
      avgHolidaysPerBay: Math.round((bayHolidayAnalysis.reduce((sum, b) => sum + b.holidayMetrics.totalHolidays, 0) / serviceBays.length) * 10) / 10,
      avgCapacityLoss: Math.round((bayHolidayAnalysis.reduce((sum, b) => sum + b.holidayMetrics.capacityLossPercentage, 0) / serviceBays.length) * 10) / 10,
      totalEstimatedRevenueLoss: bayImpactWithRevenue.reduce((sum, b) => sum + (b.operationalImpact?.estimatedRevenueLoss || 0), 0),
      totalEstimatedMissedBookings: bayImpactWithRevenue.reduce((sum, b) => sum + (b.operationalImpact?.estimatedMissedBookings || 0), 0),
      impactDistribution: {
        high: bayHolidayAnalysis.filter(b => b.impactLevel === 'High').length,
        medium: bayHolidayAnalysis.filter(b => b.impactLevel === 'Medium').length,
        low: bayHolidayAnalysis.filter(b => b.impactLevel === 'Low').length
      },
      topReasons: topHolidayReasons
    };

    res.json(formatReportResponse({
      bays: bayImpactWithRevenue,
      summary: summaryStats
    }, {
      reportType: 'service-bay-holiday-impact',
      filters: {
        dealership: dealershipFilter,
        dateRange: dateFilter
      }
    }));

  } catch (error) {
    return handleReportError(error, res, 'Service Bay Holiday Impact');
  }
};

module.exports = {
  getServiceBayUtilization,
  getServiceBayBookingPatterns,
  getServiceBayUserAssignment,
  getServiceBayHolidayImpact
};
