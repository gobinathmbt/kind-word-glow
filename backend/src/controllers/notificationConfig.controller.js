const Company = require('../models/Company');
const User = require('../models/User');
const mongoose = require("mongoose");

/**
 * Manually populate User fields from main DB for NotificationConfiguration documents
 * @param {Array|Object} items - NotificationConfiguration document(s) to populate
 * @returns {Array|Object} Populated items
 */
async function populateNotificationUsers(items) {
  const isArray = Array.isArray(items);
  const itemsArray = isArray ? items : [items];
  
  if (itemsArray.length === 0) return items;

  // Collect all unique user IDs
  const userIds = new Set();
  itemsArray.forEach(item => {
    if (item.created_by) userIds.add(item.created_by.toString());
    if (item.updated_by) userIds.add(item.updated_by.toString());
    
    // Collect user_ids from target_users array
    if (item.target_users && Array.isArray(item.target_users)) {
      item.target_users.forEach(target => {
        if (target.user_ids && Array.isArray(target.user_ids)) {
          target.user_ids.forEach(id => userIds.add(id.toString()));
        }
      });
    }
  });

  if (userIds.size === 0) return items;

  // Fetch all users at once
  const users = await User.find(
    { _id: { $in: Array.from(userIds) } },
    'first_name last_name email role dealership_ids'
  ).lean();

  // Create user lookup map
  const userMap = {};
  users.forEach(user => {
    userMap[user._id.toString()] = user;
  });

  // Populate items
  itemsArray.forEach(item => {
    if (item.created_by) {
      item.created_by = userMap[item.created_by.toString()] || item.created_by;
    }
    if (item.updated_by) {
      item.updated_by = userMap[item.updated_by.toString()] || item.updated_by;
    }
    
    // Populate target_users.user_ids
    if (item.target_users && Array.isArray(item.target_users)) {
      item.target_users.forEach(target => {
        if (target.user_ids && Array.isArray(target.user_ids)) {
          target.user_ids = target.user_ids.map(id => 
            userMap[id.toString()] || id
          );
        }
      });
    }
  });

  return isArray ? itemsArray : itemsArray[0];
}

// Get all notification configurations for a company
const getNotificationConfigurations = async (req, res) => {

  try {
    const NotificationConfiguration = req.getModel('NotificationConfiguration');
    const { page = 1, limit = 10, search = '', status = 'all', priority = 'all' } = req.query;
    const companyId = req.user.company_id;

    // Build query
    const query = { company_id: companyId };
    
    // Handle search - search by name, schema, and trigger
    if (search && search.trim().length > 0) {
      const searchTerm = search.trim();
      const searchRegex = { $regex: searchTerm, $options: 'i' };
      query.$or = [
        { name: searchRegex },
        { target_schema: searchRegex },
        { trigger_type: searchRegex }
      ];
    }

    // Handle status filter (separate from search)
    if (status !== 'all') {
      query.is_active = status === 'active';
    }

    // Handle priority filter (separate from search)
    if (priority !== 'all') {
      query.priority = priority;
    }

    // Execute query with pagination
    const configurations = await NotificationConfiguration.find(query)
      .sort({ created_at: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    // Manually populate User fields from main DB
    await populateNotificationUsers(configurations);

    const total = await NotificationConfiguration.countDocuments(query);

    res.json({
      success: true,
      data: {
        configurations,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_records: total,
          has_next: page * limit < total,
          has_previous: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching notification configurations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notification configurations',
      error: error.message
    });
  }
};

// Get single notification configuration
const getNotificationConfiguration = async (req, res) => {
  try {
    const NotificationConfiguration = req.getModel('NotificationConfiguration');
    const { id } = req.params;
    const companyId = req.user.company_id;

    const configuration = await NotificationConfiguration.findOne({
      _id: id,
      company_id: companyId
    }).lean();

    if (!configuration) {
      return res.status(404).json({
        success: false,
        message: 'Notification configuration not found'
      });
    }

    // Manually populate User fields from main DB
    await populateNotificationUsers(configuration);

    res.json({
      success: true,
      data: configuration
    });
  } catch (error) {
    console.error('Error fetching notification configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notification configuration',
      error: error.message
    });
  }
};

// Create notification configuration
const createNotificationConfiguration = async (req, res) => {
  try {
    const NotificationConfiguration = req.getModel('NotificationConfiguration');
    const companyId = req.user.company_id;
    const userId = req.user.id;

    // Validate company super admin role
    if (req.user.role !== 'company_super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only company super admin can create notification configurations'
      });
    }

    const configurationData = {
      ...req.body,
      company_id: companyId,
      created_by: userId
    };

    // Validate type field
    const validTypes = ['info', 'success', 'warning', 'error'];
    if (configurationData.type && !validTypes.includes(configurationData.type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification type. Must be one of: info, success, warning, error'
      });
    }

    // Validate target users if specific users are selected
    if (configurationData.target_users?.type === 'specific_users' && configurationData.target_users?.user_ids?.length > 0) {
      const validUsers = await User.find({
        _id: { $in: configurationData.target_users.user_ids },
        company_id: companyId,
        is_active: true
      });

      if (validUsers.length !== configurationData.target_users.user_ids.length) {
        return res.status(400).json({
          success: false,
          message: 'Some selected users are invalid or inactive'
        });
      }
    }

    const configuration = await NotificationConfiguration.create(configurationData);
    
    // Add to company's notification configurations
    await Company.findByIdAndUpdate(
      companyId,
      { $push: { notification_configurations: configuration._id } }
    );

    // Convert to plain object and manually populate
    const configurationObj = configuration.toObject();
    await populateNotificationUsers(configurationObj);

    res.status(201).json({
      success: true,
      data: configurationObj,
      message: 'Notification configuration created successfully'
    });
  } catch (error) {
    console.error('Error creating notification configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating notification configuration',
      error: error.message
    });
  }
};

// Update notification configuration
const updateNotificationConfiguration = async (req, res) => {
  try {
    const NotificationConfiguration = req.getModel('NotificationConfiguration');
    const { id } = req.params;
    const companyId = req.user.company_id;
    const userId = req.user.id;

    // Validate company super admin role
    if (req.user.role !== 'company_super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only company super admin can update notification configurations'
      });
    }

    const updateData = {
      ...req.body,
      updated_by: userId
    };

    // Validate type field
    const validTypes = ['info', 'success', 'warning', 'error'];
    if (updateData.type && !validTypes.includes(updateData.type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification type. Must be one of: info, success, warning, error'
      });
    }

    // Validate target users if specific users are selected
    if (updateData.target_users?.type === 'specific_users' && updateData.target_users?.user_ids?.length > 0) {
      const validUsers = await User.find({
        _id: { $in: updateData.target_users.user_ids },
        company_id: companyId,
        is_active: true
      });

      if (validUsers.length !== updateData.target_users.user_ids.length) {
        return res.status(400).json({
          success: false,
          message: 'Some selected users are invalid or inactive'
        });
      }
    }

    const configuration = await NotificationConfiguration.findOneAndUpdate(
      { _id: id, company_id: companyId },
      updateData,
      { new: true }
    ).lean();

    if (!configuration) {
      return res.status(404).json({
        success: false,
        message: 'Notification configuration not found'
      });
    }

    // Manually populate User fields from main DB
    await populateNotificationUsers(configuration);

    res.json({
      success: true,
      data: configuration,
      message: 'Notification configuration updated successfully'
    });
  } catch (error) {
    console.error('Error updating notification configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating notification configuration',
      error: error.message
    });
  }
};

// Delete notification configuration
const deleteNotificationConfiguration = async (req, res) => {
  try {
    const NotificationConfiguration = req.getModel('NotificationConfiguration');
    const { id } = req.params;
    const companyId = req.user.company_id;

    // Validate company super admin role
    if (req.user.role !== 'company_super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only company super admin can delete notification configurations'
      });
    }

    const configuration = await NotificationConfiguration.findOneAndDelete({
      _id: id,
      company_id: companyId
    });

    if (!configuration) {
      return res.status(404).json({
        success: false,
        message: 'Notification configuration not found'
      });
    }

    // Remove from company's notification configurations
    await Company.findByIdAndUpdate(
      companyId,
      { $pull: { notification_configurations: id } }
    );

    res.json({
      success: true,
      message: 'Notification configuration deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting notification configuration',
      error: error.message
    });
  }
};

// Toggle notification configuration status
const toggleNotificationConfigurationStatus = async (req, res) => {
  try {
    const NotificationConfiguration = req.getModel('NotificationConfiguration');
    const { id } = req.params;
    const { is_active } = req.body;
    const companyId = req.user.company_id;

    // Validate company super admin role
    if (req.user.role !== 'company_super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only company super admin can toggle notification configuration status'
      });
    }

    const configuration = await NotificationConfiguration.findOneAndUpdate(
      { _id: id, company_id: companyId },
      { is_active, updated_by: req.user.id },
      { new: true }
    );

    if (!configuration) {
      return res.status(404).json({
        success: false,
        message: 'Notification configuration not found'
      });
    }

    res.json({
      success: true,
      data: configuration,
      message: `Notification configuration ${is_active ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Error toggling notification configuration status:', error);
    res.status(500).json({
      success: false,
      message: 'Error toggling notification configuration status',
      error: error.message
    });
  }
};


const getAvailableSchemas = async (req, res) => {
  try {
    // Define the specific models to include in the dropdown
    const allowedModels = [
      'AdvertiseVehicle',
      'Conversation',
      'CostConfiguration',
      'Dealership',
      'DropdownMaster',
      'GroupPermission',
      'InspectionConfig',
      'Integration',
      'MasterVehicle',
      'NotificationConfiguration',
      'ServiceBay',
      'Supplier',
      'TradeinConfig',
      'User',
      'Vehicle',
      'Workflow',
      'WorkshopQuote',
      'WorkshopReport'
    ];

    const schemas = {};
    
    // Helper function to extract nested fields from array schemas
    const extractNestedFields = (schemaObj, parentPath = '') => {
      const nestedFields = [];
      
      if (schemaObj && schemaObj.schema) {
        schemaObj.schema.eachPath((path, schemaType) => {
          if (path === '_id') return; // Skip _id in nested schemas
          
          const fullPath = parentPath ? `${parentPath}.${path}` : path;
          
          // Check if it's a relationship
          if (
            schemaType.instance === "ObjectId" &&
            schemaType.options &&
            schemaType.options.ref
          ) {
            nestedFields.push({
              field: fullPath,
              type: 'ObjectId',
              ref: schemaType.options.ref,
              isNested: true,
              parentArray: parentPath
            });
          } 
          // Check if it's a nested array within an array
          else if (schemaType.instance === "Array") {
            const arrayFieldInfo = {
              field: fullPath,
              type: "Array",
              isArray: true,
              isNested: true,
              parentArray: parentPath
            };
            nestedFields.push(arrayFieldInfo);
            
            // Recursively extract fields from nested array
            const deepNestedFields = extractNestedFields(schemaType.caster, fullPath);
            nestedFields.push(...deepNestedFields);
          }
          else {
            const fieldInfo = {
              field: fullPath,
              type: schemaType.instance,
              isNested: true,
              parentArray: parentPath
            };

            // If enum is defined, add it
            if (schemaType.enumValues && schemaType.enumValues.length > 0) {
              fieldInfo.enums = schemaType.enumValues;
            }

            nestedFields.push(fieldInfo);
          }
        });
      }
      
      return nestedFields;
    };
    
    // Only process allowed models
    allowedModels.forEach((modelName) => {
      // Check if the model exists in mongoose.models
      if (mongoose.models[modelName]) {
        const model = mongoose.models[modelName];
        const schema = model.schema;

        const fields = [];
        const relationships = [];

        schema.eachPath((path, schemaType) => {
          // Skip internal paths like __v
          if (path.startsWith("__")) return;

          // Check if it's an Array type
          if (schemaType.instance === "Array") {
            // Add the array field itself
            const arrayFieldInfo = {
              field: path,
              type: "Array",
              isArray: true
            };
            fields.push(arrayFieldInfo);

            // Extract nested fields from the array schema
            const nestedFields = extractNestedFields(schemaType.caster, path);
            fields.push(...nestedFields);
          }
          // Relationship (ObjectId with ref)
          else if (
            schemaType.instance === "ObjectId" &&
            schemaType.options &&
            schemaType.options.ref
          ) {
            relationships.push({
              field: path,
              ref: schemaType.options.ref,
            });
          } else {
            // Normal field
            const fieldInfo = {
              field: path,
              type: schemaType.instance,
            };

            // If enum is defined, add it
            if (schemaType.enumValues && schemaType.enumValues.length > 0) {
              fieldInfo.enums = schemaType.enumValues;
            }

            fields.push(fieldInfo);
          }
        });

        schemas[modelName] = {
          fields,
          relationships,
        };
      }
    });

    res.json({
      success: true,
      data: schemas,
    });
  } catch (error) {
    console.error("Error fetching available schemas:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching available schemas",
      error: error.message,
    });
  }
};

// Get users for target selection
const getCompanyUsers = async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const Dealership = req.getModel('Dealership');
    
    const users = await User.find({
      company_id: companyId,
      is_active: true
    })
      .select('first_name last_name email role dealership_ids')
      .sort({ first_name: 1 })
      .lean();

    // Manually populate dealership_ids from company DB
    if (users.length > 0) {
      // Collect all dealership IDs
      const dealershipIds = new Set();
      users.forEach(user => {
        if (user.dealership_ids && Array.isArray(user.dealership_ids)) {
          user.dealership_ids.forEach(id => dealershipIds.add(id.toString()));
        }
      });

      if (dealershipIds.size > 0) {
        // Fetch dealerships from company DB
        const dealerships = await Dealership.find(
          { _id: { $in: Array.from(dealershipIds) } },
          'dealership_name dealership_address'
        ).lean();

        // Create dealership lookup map
        const dealershipMap = {};
        dealerships.forEach(d => {
          dealershipMap[d._id.toString()] = {
            _id: d._id,
            name: d.dealership_name,
            location: d.dealership_address
          };
        });

        // Populate users with dealership data
        users.forEach(user => {
          if (user.dealership_ids && Array.isArray(user.dealership_ids)) {
            user.dealership_ids = user.dealership_ids.map(id => 
              dealershipMap[id.toString()] || id
            );
          }
        });
      }
    }

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Error fetching company users:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching company users',
      error: error.message
    });
  }
};

// Get dealerships for target selection
const getCompanyDealerships = async (req, res) => {
  try {
    const Dealership = req.getModel('Dealership');
    const companyId = req.user.company_id;
    
    const dealerships = await Dealership.find({
      company_id: companyId,
      is_active: true
    })
      .select('name location contact_info')
      .sort({ name: 1 });

    res.json({
      success: true,
      data: dealerships
    });
  } catch (error) {
    console.error('Error fetching company dealerships:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching company dealerships',
      error: error.message
    });
  }
};

module.exports = {
  getNotificationConfigurations,
  getNotificationConfiguration,
  createNotificationConfiguration,
  updateNotificationConfiguration,
  deleteNotificationConfiguration,
  toggleNotificationConfigurationStatus,
  getAvailableSchemas,
  getCompanyUsers,
  getCompanyDealerships
};