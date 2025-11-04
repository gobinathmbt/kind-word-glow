/**
 * Report Helper Utilities
 * Provides common functions for report controllers including filtering, formatting, and error handling
 */

/**
 * Get dealership filter based on user role and permissions
 * @param {Object} user - User object from req.user
 * @returns {Object} MongoDB filter object for dealership filtering
 */
const getDealershipFilter = (user) => {
  // Primary admin sees all dealerships
  if (user.is_primary_admin) {
    return {};
  }
  
  // Non-primary company_super_admin sees only assigned dealerships
  if (user.role === 'company_super_admin' && user.dealership_ids && user.dealership_ids.length > 0) {
    return { dealership_id: { $in: user.dealership_ids } };
  }
  
  return {};
};

/**
 * Get date filter from query parameters
 * @param {Object} query - Request query parameters
 * @returns {Object} MongoDB date filter object
 */
const getDateFilter = (query) => {
  const { from, to } = query;
  
  if (!from || !to) {
    return {};
  }
  
  return {
    created_at: {
      $gte: new Date(from),
      $lte: new Date(to)
    }
  };
};

/**
 * Format response with metadata
 * @param {*} data - Report data to return
 * @param {Object} metadata - Additional metadata to include
 * @returns {Object} Formatted response object
 */
const formatReportResponse = (data, metadata = {}) => {
  return {
    success: true,
    data,
    metadata: {
      generatedAt: new Date(),
      totalRecords: Array.isArray(data) ? data.length : 1,
      ...metadata
    }
  };
};

/**
 * Handle report controller errors
 * @param {Error} error - Error object
 * @param {Object} res - Express response object
 * @param {string} reportName - Name of the report for logging
 * @returns {Object} Error response
 */
const handleReportError = (error, res, reportName = '') => {
  console.error(`Report Error [${reportName}]:`, error);
  
  return res.status(500).json({
    success: false,
    message: `Error generating ${reportName} report`,
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};

/**
 * Build aggregation pipeline with common stages
 * @param {Object} user - User object from req.user
 * @param {Object} query - Request query parameters
 * @returns {Array} MongoDB aggregation pipeline array
 */
const buildBasePipeline = (user, query) => {
  const pipeline = [];
  
  // Company filter
  pipeline.push({
    $match: { company_id: user.company_id }
  });
  
  // Dealership filter
  const dealershipFilter = getDealershipFilter(user);
  if (Object.keys(dealershipFilter).length > 0) {
    pipeline.push({ $match: dealershipFilter });
  }
  
  // Date filter
  const dateFilter = getDateFilter(query);
  if (Object.keys(dateFilter).length > 0) {
    pipeline.push({ $match: dateFilter });
  }
  
  return pipeline;
};

module.exports = {
  getDealershipFilter,
  getDateFilter,
  formatReportResponse,
  handleReportError,
  buildBasePipeline
};
