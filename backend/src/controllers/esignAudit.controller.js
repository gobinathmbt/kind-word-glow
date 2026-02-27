const auditService = require('../services/esign/audit.service');

/**
 * Query audit logs with filters
 * @route GET /api/company/esign/audit-logs
 */
const queryAuditLogs = async (req, res) => {
  try {
    const EsignAuditLog = req.getModel('EsignAuditLog');
    
    // Extract query parameters
    const {
      event_types,      // Comma-separated list of event types
      resource_type,    // Resource type filter
      resource_id,      // Resource ID filter
      actor_email,      // Actor email filter
      date_from,        // Start date (ISO string)
      date_to,          // End date (ISO string)
      page = 1,         // Page number (default: 1)
      limit = 50,       // Items per page (default: 50, max: 100)
    } = req.query;
    
    // Build query
    const query = {
      company_id: req.user.company_id,
    };
    
    // Filter by event types
    if (event_types) {
      const eventTypeArray = event_types.split(',').map(t => t.trim());
      query.event_type = { $in: eventTypeArray };
    }
    
    // Filter by resource type
    if (resource_type) {
      query['resource.type'] = resource_type;
    }
    
    // Filter by resource ID
    if (resource_id) {
      query['resource.id'] = resource_id;
    }
    
    // Filter by actor email
    if (actor_email) {
      query['actor.email'] = { $regex: actor_email, $options: 'i' };
    }
    
    // Filter by date range
    if (date_from || date_to) {
      query.timestamp = {};
      if (date_from) {
        query.timestamp.$gte = new Date(date_from);
      }
      if (date_to) {
        query.timestamp.$lte = new Date(date_to);
      }
    }
    
    // Pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;
    
    // Execute query
    const [logs, total] = await Promise.all([
      EsignAuditLog.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      EsignAuditLog.countDocuments(query),
    ]);
    
    res.json({
      success: true,
      data: logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Query audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to query audit logs',
      error: error.message,
    });
  }
};

/**
 * Export audit logs to CSV or JSON
 * @route POST /api/company/esign/audit-logs/export
 */
const exportAuditLogs = async (req, res) => {
  try {
    // Check if user has super admin role
    if (req.user.role !== 'company_super_admin' && req.user.role !== 'master_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can export audit logs',
      });
    }
    
    const EsignAuditLog = req.getModel('EsignAuditLog');
    
    // Extract request parameters
    const {
      format = 'csv',   // Export format: 'csv' or 'json'
      event_types,      // Comma-separated list of event types
      resource_type,    // Resource type filter
      resource_id,      // Resource ID filter
      actor_email,      // Actor email filter
      date_from,        // Start date (ISO string)
      date_to,          // End date (ISO string)
    } = req.body;
    
    // Validate format
    if (!['csv', 'json'].includes(format)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid format. Must be "csv" or "json"',
      });
    }
    
    // Build query (same as queryAuditLogs)
    const query = {
      company_id: req.user.company_id,
    };
    
    if (event_types) {
      const eventTypeArray = event_types.split(',').map(t => t.trim());
      query.event_type = { $in: eventTypeArray };
    }
    
    if (resource_type) {
      query['resource.type'] = resource_type;
    }
    
    if (resource_id) {
      query['resource.id'] = resource_id;
    }
    
    if (actor_email) {
      query['actor.email'] = { $regex: actor_email, $options: 'i' };
    }
    
    if (date_from || date_to) {
      query.timestamp = {};
      if (date_from) {
        query.timestamp.$gte = new Date(date_from);
      }
      if (date_to) {
        query.timestamp.$lte = new Date(date_to);
      }
    }
    
    // Set timeout for query (30 seconds)
    const startTime = Date.now();
    const TIMEOUT_MS = 30000;
    
    // Fetch logs (limit to 100,000 entries as per requirement)
    const logs = await EsignAuditLog.find(query)
      .sort({ timestamp: -1 })
      .limit(100000)
      .lean()
      .maxTimeMS(TIMEOUT_MS);
    
    const duration = Date.now() - startTime;
    
    // Log export request to audit log
    await auditService.logEvent(req, {
      event_type: 'audit_log.exported',
      actor: {
        type: 'user',
        id: req.user._id.toString(),
        email: req.user.email,
      },
      resource: {
        type: 'audit_log',
        id: 'export',
      },
      action: 'Audit logs exported',
      metadata: {
        format,
        count: logs.length,
        duration_ms: duration,
        filters: {
          event_types,
          resource_type,
          resource_id,
          actor_email,
          date_from,
          date_to,
        },
      },
    });
    
    // Generate export based on format
    if (format === 'csv') {
      // Generate CSV
      const csv = generateCSV(logs);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.csv"`);
      res.send(csv);
    } else {
      // Generate JSON
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.json"`);
      res.json({
        success: true,
        exported_at: new Date().toISOString(),
        count: logs.length,
        data: logs,
      });
    }
  } catch (error) {
    console.error('Export audit logs error:', error);
    
    // Check if it's a timeout error
    if (error.name === 'MongooseError' && error.message.includes('timeout')) {
      return res.status(504).json({
        success: false,
        message: 'Export timed out. Please narrow your date range or filters.',
        error: error.message,
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to export audit logs',
      error: error.message,
    });
  }
};

/**
 * Get audit log statistics
 * @route GET /api/company/esign/audit-logs/stats
 */
const getAuditStats = async (req, res) => {
  try {
    const EsignAuditLog = req.getModel('EsignAuditLog');
    
    // Extract query parameters
    const {
      date_from,
      date_to,
    } = req.query;
    
    // Build base query
    const query = {
      company_id: req.user.company_id,
    };
    
    // Filter by date range
    if (date_from || date_to) {
      query.timestamp = {};
      if (date_from) {
        query.timestamp.$gte = new Date(date_from);
      }
      if (date_to) {
        query.timestamp.$lte = new Date(date_to);
      }
    }
    
    // Aggregate statistics
    const [
      totalLogs,
      eventTypeCounts,
      resourceTypeCounts,
      actorTypeCounts,
    ] = await Promise.all([
      // Total log count
      EsignAuditLog.countDocuments(query),
      
      // Event type breakdown
      EsignAuditLog.aggregate([
        { $match: query },
        { $group: { _id: '$event_type', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]),
      
      // Resource type breakdown
      EsignAuditLog.aggregate([
        { $match: query },
        { $group: { _id: '$resource.type', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      
      // Actor type breakdown
      EsignAuditLog.aggregate([
        { $match: query },
        { $group: { _id: '$actor.type', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);
    
    res.json({
      success: true,
      data: {
        total_logs: totalLogs,
        event_types: eventTypeCounts.map(item => ({
          event_type: item._id,
          count: item.count,
        })),
        resource_types: resourceTypeCounts.map(item => ({
          resource_type: item._id,
          count: item.count,
        })),
        actor_types: actorTypeCounts.map(item => ({
          actor_type: item._id,
          count: item.count,
        })),
      },
    });
  } catch (error) {
    console.error('Get audit stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get audit statistics',
      error: error.message,
    });
  }
};

/**
 * Helper function to generate CSV from audit logs
 * @param {Array} logs - Array of audit log objects
 * @returns {string} CSV string
 */
const generateCSV = (logs) => {
  // Define CSV headers
  const headers = [
    'Timestamp',
    'Event Type',
    'Actor Type',
    'Actor ID',
    'Actor Email',
    'API Key Prefix',
    'Resource Type',
    'Resource ID',
    'Action',
    'IP Address',
    'User Agent',
    'Country',
    'Region',
    'City',
    'Metadata',
  ];
  
  // Generate CSV rows
  const rows = logs.map(log => {
    return [
      log.timestamp ? new Date(log.timestamp).toISOString() : '',
      log.event_type || '',
      log.actor?.type || '',
      log.actor?.id || '',
      log.actor?.email || '',
      log.actor?.api_key_prefix || '',
      log.resource?.type || '',
      log.resource?.id || '',
      log.action || '',
      log.ip_address || '',
      log.user_agent || '',
      log.geo_location?.country || '',
      log.geo_location?.region || '',
      log.geo_location?.city || '',
      log.metadata ? JSON.stringify(log.metadata) : '',
    ].map(field => {
      // Escape fields containing commas, quotes, or newlines
      const fieldStr = String(field);
      if (fieldStr.includes(',') || fieldStr.includes('"') || fieldStr.includes('\n')) {
        return `"${fieldStr.replace(/"/g, '""')}"`;
      }
      return fieldStr;
    }).join(',');
  });
  
  // Combine headers and rows
  return [headers.join(','), ...rows].join('\n');
};

module.exports = {
  queryAuditLogs,
  exportAuditLogs,
  getAuditStats,
};
