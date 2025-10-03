const NotificationConfiguration = require('../models/NotificationConfiguration');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { getNotificationSocketIO } = require('../controllers/socket.controller');

// Global notification middleware
const notificationMiddleware = async (req, res, next) => {
  // Store original json method
  const originalJson = res.json;
  
  // Override res.json to capture response
  res.json = function(data) {
    originalJson.call(this, data);
    if (res.statusCode >= 200 && res.statusCode < 300 && data.success) {
      setImmediate(() => {
        processNotificationTriggers(req, res, data).catch(error => {
          console.error('Error processing notification triggers:', error);
        });
      });
    }
  };
  
  next();
};

// Process notification triggers based on request
const processNotificationTriggers = async (req, res, responseData) => {
  try {
    const method = req.method.toLowerCase();
    const path = req.baseUrl;
    
    // Determine trigger type and target schema
    let triggerType = null;
    let targetSchema = null;
    
    // Map HTTP methods to trigger types
    if (method === 'post') {
      triggerType = 'create';
    } else if (method === 'put' || method === 'patch') {
      triggerType = 'update';
    } else if (method === 'delete') {
      triggerType = 'delete';
    }
    // Extract target schema from path
    targetSchema = extractSchemaFromPath(path);
    
    if (!triggerType || !targetSchema || !req.user?.company_id) {
      return;
    }
    // Get active notification configurations for this trigger
    const configurations = await NotificationConfiguration.find({
      company_id: req.user.company_id,
      trigger_type: triggerType,
      target_schema: targetSchema,
      is_active: true
    }).populate('target_users.user_ids', 'first_name last_name email');
    if (configurations.length === 0) {
      return;
    }
    
    // Process each configuration
    for (const config of configurations) {
      await processNotificationConfiguration(config, req, responseData);
    }
    
  } catch (error) {
    console.error('Error in processNotificationTriggers:', error);
  }
};

// Extract schema name from API path
const extractSchemaFromPath = (path) => {
  const pathMappings = {
    '/users': 'User',
    '/vehicle': 'Vehicle',
    '/inspection': 'Inspection',
    '/workshop': 'Workshop',
    '/supplier': 'Supplier',
    '/dealership': 'Dealership',
    '/make': 'Make',
    '/model': 'Model',
    '/variant': 'Variant',
    '/body': 'Body',
    '/year': 'VariantYear',
    '/metadata': 'VehicleMetadata',
    '/tradein': 'TradeinConfig',
    '/dropdown': 'DropdownMaster',
    '/company': 'Company'
  };
  
  // Check for exact matches or partial matches
  for (const [pathPattern, schema] of Object.entries(pathMappings)) {
    if (path.includes(pathPattern)) {
      return schema;
    }
  }
  
  return null;
};

// Process individual notification configuration
const processNotificationConfiguration = async (config, req, responseData) => {
  try {
    // Evaluate conditions if any
    if (config.target_fields && config.target_fields.length > 0) {
      const conditionsMet = await evaluateNotificationConditions(config.target_fields, responseData.data, req);
      if (!conditionsMet) {
        return;
      }
    }
    
    // Get target users
    const targetUsers = await getTargetUsers(config, req.user.company_id);
    
    if (targetUsers.length === 0) {
      return;
    }
    
    // Create notifications for each target user
    for (const user of targetUsers) {
      await createNotificationForUser(config, user, req, responseData);
    }
    
  } catch (error) {
    console.error('Error processing notification configuration:', config._id, error);
  }
};

// Evaluate notification conditions
const evaluateNotificationConditions = async (targetFields, data, req) => {
  try {
    let overallResult = true;
    let currentCondition = 'and';
    
    for (const condition of targetFields) {
      const fieldValue = getNestedFieldValue(data, condition.field_name);
      const conditionResult = evaluateCondition(fieldValue, condition.operator, condition.value);
      
      if (currentCondition === 'and') {
        overallResult = overallResult && conditionResult;
      } else if (currentCondition === 'or') {
        overallResult = overallResult || conditionResult;
      }
      
      currentCondition = condition.condition || 'and';
    }
    
    return overallResult;
  } catch (error) {
    console.error('Error evaluating conditions:', error);
    return false;
  }
};

// Get nested field value from object
const getNestedFieldValue = (obj, fieldPath) => {
  return fieldPath.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
};

// Evaluate single condition
const evaluateCondition = (fieldValue, operator, expectedValue) => {
  switch (operator) {
    case 'equals':
      return fieldValue === expectedValue;
    case 'not_equals':
      return fieldValue !== expectedValue;
    case 'contains':
      return String(fieldValue).toLowerCase().includes(String(expectedValue).toLowerCase());
    case 'not_contains':
      return !String(fieldValue).toLowerCase().includes(String(expectedValue).toLowerCase());
    case 'greater_than':
      return Number(fieldValue) > Number(expectedValue);
    case 'less_than':
      return Number(fieldValue) < Number(expectedValue);
    case 'in':
      return Array.isArray(expectedValue) && expectedValue.includes(fieldValue);
    case 'not_in':
      return Array.isArray(expectedValue) && !expectedValue.includes(fieldValue);
    default:
      return true;
  }
};

// Get target users based on configuration
const getTargetUsers = async (config, companyId) => {
  try {
    let query = { company_id: companyId, is_active: true };
    
    switch (config.target_users.type) {
      case 'all':
        // Get all active users in company
        break;
      case 'specific_users':
        if (config.target_users.user_ids && config.target_users.user_ids.length > 0) {
          query._id = { $in: config.target_users.user_ids };
        } else {
          return [];
        }
        break;
      case 'role_based':
        if (config.target_users.roles && config.target_users.roles.length > 0) {
          query.role = { $in: config.target_users.roles };
        } else {
          return [];
        }
        break;
      case 'department_based':
        // Implement department-based filtering if departments are added to User schema
        if (config.target_users.departments && config.target_users.departments.length > 0) {
          query.department = { $in: config.target_users.departments };
        }
        break;
      default:
        return [];
    }
    
    // Exclude specific users if specified
    if (config.target_users.exclude_user_ids && config.target_users.exclude_user_ids.length > 0) {
      query._id = query._id || {};
      if (query._id.$in) {
        query._id.$in = query._id.$in.filter(id => !config.target_users.exclude_user_ids.includes(id));
      } else {
        query._id.$nin = config.target_users.exclude_user_ids;
      }
    }
    
    const users = await User.find(query).select('_id first_name last_name email');
    return users;
  } catch (error) {
    console.error('Error getting target users:', error);
    return [];
  }
};

// Create notification for a specific user
const createNotificationForUser = async (config, user, req, responseData) => {
  try {
    // Build notification message with variables
    const title = replaceMessageVariables(config.message_template.title, responseData.data, user, req);
    const message = replaceMessageVariables(config.message_template.body, responseData.data, user, req);
    
    // Create notification
    const notification = await Notification.create({
      company_id: req.user.company_id,
      configuration_id: config._id,
      recipient_id: user._id,
      title,
      message,
      type: config.type,
      priority: config.priority,
      category: 'system',
      source_entity: {
        entity_type: config.target_schema,
        entity_id: responseData.data._id || responseData.data.id,
        entity_data: responseData.data
      },
      action_url: config.message_template.action_url,
      status: 'sent',
      channels: {
        in_app: {
          sent: true,
          sent_at: new Date()
        }
      },
      metadata: {
        trigger_type: config.trigger_type,
        trigger_timestamp: new Date(),
        user_agent: req.get('User-Agent'),
        ip_address: req.ip
      }
    });
    
    // Send real-time notification via socket
    await sendRealTimeNotification(notification, user._id);

    
  } catch (error) {
    console.error('Error creating notification for user:', user._id, error);
  }
};

// Replace variables in message templates
const replaceMessageVariables = (template, data, user, req) => {
  let message = template;
  
  // Replace common variables
  message = message.replace(/\{user\.first_name\}/g, user.first_name || '');
  message = message.replace(/\{user\.last_name\}/g, user.last_name || '');
  message = message.replace(/\{user\.email\}/g, user.email || '');
  
  // Replace data variables
  if (data) {
    // Simple field replacements (including dealership_id with special handling)
    Object.keys(data).forEach(key => {
      if (typeof data[key] === 'string' || typeof data[key] === 'number') {
        // Special handling for dealership_id
        if (key === 'dealership_id') {
          let dealershipName = 'Primary User';
          if (!req.user.is_primary_admin && data.dealership_id) {
            const dealership = req.user.dealership_ids?.find(
              d => d._id.toString() === data.dealership_id.toString()
            );
            dealershipName = dealership?.dealership_name || dealershipName;
          }
          const regex = new RegExp(`\\{data\\.${key}\\}`, 'g');
          message = message.replace(regex, dealershipName);
        } else {
          // Regular field replacement
          const regex = new RegExp(`\\{data\\.${key}\\}`, 'g');
          message = message.replace(regex, data[key]);
        }
      }
    });
    
    const nestedMatches = message.match(/\{data\.[\w.]+\}/g);
    if (nestedMatches) {
      nestedMatches.forEach(match => {
        const fieldPath = match.replace(/\{data\./, '').replace(/\}/, '');
        
        // Special handling for dealership_id in nested paths
        if (fieldPath === 'dealership_id') {
          let dealershipName = 'Primary User';
          if (!req.user.is_primary_admin && data.dealership_id) {
            const dealership = req.user.dealership_ids?.find(
              d => d._id.toString() === data.dealership_id.toString()
            );
            dealershipName = dealership?.dealership_name || dealershipName;
          }
          message = message.replace(match, dealershipName);
        } else {
          // Regular nested field replacement
          const value = getNestedFieldValue(data, fieldPath);
          if (value !== undefined) {
            message = message.replace(match, value);
          }
        }
      });
    }
  }
  
  // Replace timestamp
  message = message.replace(/\{timestamp\}/g, new Date().toLocaleString());
  
  return message;
};

// Send real-time notification via socket
const sendRealTimeNotification = async (notification, userId) => {
  try {
    const notificationIO = getNotificationSocketIO();
    if (notificationIO) {
      // Send to specific user
      notificationIO.to(`user_${userId}`).emit('new_notification', {
        notification: {
          _id: notification._id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          priority: notification.priority,
          created_at: notification.created_at,
          action_url: notification.action_url,
          source_entity: notification.source_entity
        },
        unread_count: await Notification.getUnreadCount(userId)
      });
    }
  } catch (error) {
    console.error('Error sending real-time notification:', error);
  }
};


module.exports = notificationMiddleware;