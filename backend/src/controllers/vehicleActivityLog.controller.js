const VehicleActivityLog = require('../models/VehicleActivityLog');
const User = require('../models/User');

/**
 * Log a vehicle activity
 * @param {Object} data Log data
 * @param {string} data.company_id Company ID
 * @param {number|string} data.vehicle_stock_id Vehicle Stock ID
 * @param {string} data.vehicle_type Vehicle Type
 * @param {string} data.module_name Module Name
 * @param {string} data.action Action (create/update)
 * @param {string} data.user_id User ID
 * @param {Array} data.changes Array of changes {field, old_value, new_value}
 * @param {Array} [data.attachments] Array of attachments
 * @param {Object} [data.metadata] metadata
 */
const logActivity = async (data) => {
    try {
        // Fetch user name if not provided
        let userName = data.user_name;
        if (!userName && data.user_id) {
            const user = await User.findById(data.user_id).select('first_name last_name');
            if (user) {
                userName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
            }
        }

        const newLog = new VehicleActivityLog({
            company_id: data.company_id,
            vehicle_stock_id: data.vehicle_stock_id,
            vehicle_type: data.vehicle_type,
            module_name: data.module_name,
            action: data.action,
            user_id: data.user_id,
            user_name: userName || 'System',
            changes: data.changes || [],
            attachments: data.attachments || [],
            metadata: data.metadata || {}
        });

        await newLog.save();
        return newLog;
    } catch (error) {
        console.error('Error logging vehicle activity:', error);
        // Don't throw error to prevent blocking the main flow
        return null;
    }
};

// @desc    Get activity logs for a vehicle
// @route   GET /api/vehicle-activity/:vehicleType/:stockId
// @access  Private
const getVehicleLogs = async (req, res) => {
    try {
        const { vehicleType, stockId } = req.params;
        const { company_id } = req.user;

        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100); // Max 100 per page
        const skip = (page - 1) * limit;

        // Filtering parameters
        const { field, user_id, action, date_from, date_to, module_name, status } = req.query;

        // Build filter query
        let filter = {
            company_id,
            vehicle_stock_id: parseInt(stockId),
            vehicle_type: vehicleType
        };

        // Add optional filters
        if (user_id) filter.user_id = user_id;
        if (action) filter.action = action;
        if (module_name) filter.module_name = { $regex: module_name, $options: 'i' };
        if (status) filter['metadata.status'] = status;

        // Date range filter
        if (date_from || date_to) {
            filter.timestamp = {};
            if (date_from) filter.timestamp.$gte = new Date(date_from);
            if (date_to) filter.timestamp.$lte = new Date(date_to);
        }

        // Field filter (search within changes array)
        if (field) {
            filter['changes.field'] = { $regex: field, $options: 'i' };
        }

        // Execute queries in parallel
        const [logs, total] = await Promise.all([
            VehicleActivityLog.find(filter)
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            VehicleActivityLog.countDocuments(filter)
        ]);

        res.status(200).json({
            success: true,
            data: logs,
            pagination: {
                current_page: page,
                total_pages: Math.ceil(total / limit),
                total_records: total,
                per_page: limit,
                has_next: page < Math.ceil(total / limit),
                has_prev: page > 1
            },
            filters: {
                field,
                user_id,
                action,
                date_from,
                date_to,
                module_name,
                status
            }
        });
    } catch (error) {
        console.error('Get vehicle logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving vehicle logs'
        });
    }
};

/**
 * Calculate changes between old and new data
 * @param {Object} oldData Old data object
 * @param {Object} newData New data object
 * @returns {Array} Array of changes {field, old_value, new_value}
 */
const calculateChanges = (oldData, newData, prefix = '') => {
    let changes = [];
    if (!oldData && !newData) return [];

    // Helper to get plain object
    const getRaw = (val) => val && val.toObject ? val.toObject() : val;
    const oldObj = getRaw(oldData || {});
    const newObj = getRaw(newData || {});



    // Enhanced date detection function
    const isDate = (val) => {
        if (val instanceof Date) return true;
        if (typeof val === 'string') {
            // Check for various date formats
            const datePatterns = [
                /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, // ISO datetime
                /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
                /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
                /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY
                /^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
            ];
            return datePatterns.some(pattern => pattern.test(val)) && !isNaN(Date.parse(val));
        }
        return false;
    };

    // Enhanced value formatting function
    // Enhanced value formatting function
    const formatValue = (val, fieldName = '') => {
        if (val === null || val === undefined) return null;
        if (val === '') return '';

        // Handle boolean - Check this FIRST
        if (typeof val === 'boolean') {
            return val ? 'Yes' : 'No';
        }

        // Check if this is a date field or date value
        const dateFields = ['date', 'created_at', 'updated_at', 'timestamp', 'expiry', 'registered', 'purchase_date'];
        const isDateField = dateFields.some(field => fieldName.toLowerCase().includes(field));

        if (isDate(val) || isDateField) {
            try {
                const dateObj = new Date(val);
                if (!isNaN(dateObj.getTime())) {
                    return dateObj.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    });
                }
            } catch (e) {
                // If date parsing fails, return original value
            }
        }

        // Handle arrays
        if (Array.isArray(val)) {
            return `[${val.length} item(s)]`;
        }

        // Handle objects
        if (typeof val === 'object' && val !== null) {
            return '[Object]';
        }

        // Handle numbers
        if (typeof val === 'number') {
            // Check if it's a price/currency field
            const currencyFields = ['price', 'cost', 'expense', 'amount', 'fee'];
            if (currencyFields.some(field => fieldName.toLowerCase().includes(field))) {
                return new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2
                }).format(val);
            }

            // Format large numbers with commas
            if (val >= 1000) {
                return new Intl.NumberFormat('en-US').format(val);
            }

            return val.toString();
        }

        return val.toString();
    };

    // Helper to compare values
    const isEqual = (a, b) => {
        if (a === b) return true;
        if ((a === null || a === undefined) && (b === null || b === undefined)) return true;

        // Enhanced date comparison - handle mixed date types
        if (isDate(a) || isDate(b)) {
            try {
                // Convert both to Date objects for comparison
                const dateA = new Date(a);
                const dateB = new Date(b);



                // Check if both are valid dates
                if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
                    // Compare dates by milliseconds for exact comparison
                    return dateA.getTime() === dateB.getTime();
                }

                // If one is invalid date, they're not equal
                return false;
            } catch (e) {
                return false;
            }
        }

        // Deep comparison for objects/arrays handled by recursion, but here for safety in edge cases
        if (typeof a === 'object' && a !== null && typeof b === 'object' && b !== null) {
            return JSON.stringify(a) === JSON.stringify(b);
        }

        return false;
    };

    // Enhanced field name mapping for better readability
    const getReadableFieldName = (fieldPath) => {
        const fieldMappings = {
            'purchase_date': 'Purchase Date',
            'purchase_type': 'Purchase Type',
            'purchase_price': 'Purchase Price',
            'purchase_notes': 'Purchase Notes',
            'license_expiry_date': 'License Expiry Date',
            'wof_cof_expiry_date': 'WOF/COF Expiry Date',
            'first_registered_year': 'First Registered Year',
            'year_first_registered_local': 'Year First Registered Local',
            'vehicle_source.purchase_date': 'Purchase Date',
            'vehicle_source.purchase_type': 'Purchase Type',
            'vehicle_source.supplier': 'Supplier',
            'vehicle_source.purchase_notes': 'Purchase Notes',
            'vehicle_other_details.status': 'Status',
            'vehicle_other_details.purchase_price': 'Purchase Price',
            'vehicle_other_details.retail_price': 'Retail Price',
            'vehicle_other_details.sold_price': 'Sold Price',
            'vehicle_registration.license_expiry_date': 'License Expiry Date',
            'vehicle_registration.wof_cof_expiry_date': 'WOF/COF Expiry Date',
            'make': 'Make',
            'model': 'Model',
            'variant': 'Variant',
            'year': 'Year',
            'vin': 'VIN',
            'plate_no': 'Registration Number',
            'chassis_no': 'Chassis Number',
            'body_style': 'Body Style',
            'vehicle_type': 'Vehicle Type'
        };

        return fieldMappings[fieldPath] || fieldPath.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const keys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

    keys.forEach(key => {

        // Skip internal mongoose fields and ignored fields
        if (key.startsWith('_') || ['updatedAt', 'createdAt', '__v', 'id', 'created_at', 'updated_at', '_id'].includes(key)) return;

        const oldVal = oldObj[key];
        const newVal = newObj[key];
        const currentField = prefix ? `${prefix}.${key}` : key;
        const readableFieldName = getReadableFieldName(currentField);

        // Helper to check if value is empty
        const isEmpty = (val) => {
            if (val === null || val === undefined || val === '') return true;
            if (Array.isArray(val) && val.length === 0) return true;
            // Don't consider Date objects as empty
            if (val instanceof Date) return false;
            // Filter out empty system objects if that's what remains
            if (typeof val === 'object' && val !== null) {
                const objectKeys = Object.keys(val).filter(k => !['_id', 'id', '__v', 'createdAt', 'updatedAt', 'created_at', 'updated_at'].includes(k));
                return objectKeys.length === 0;
            }
            return false;
        };

        // Skip if both values are empty (empty to empty changes)
        if (isEmpty(oldVal) && isEmpty(newVal)) return;

        // Skip if transition is from empty to false (common for boolean defaults)
        if (isEmpty(oldVal) && newVal === false) return;



        // Skip if values are equal (primitive or simplistic object match)
        if (isEqual(oldVal, newVal)) return;

        const isObject = (val) => typeof val === 'object' && val !== null && !Array.isArray(val) && !(val instanceof Date);
        const isArray = (val) => Array.isArray(val);

        // Case 1: Both are Objects -> Recurse
        if (isObject(oldVal) && isObject(newVal)) {
            const nestedChanges = calculateChanges(oldVal, newVal, currentField);
            // Apply readable field names to nested changes but keep raw_field if exists
            const enhancedNestedChanges = nestedChanges.map(change => ({
                ...change,
                field: getReadableFieldName(change.field),
                raw_field: change.raw_field || change.field // Preserve or default
            }));
            changes = changes.concat(enhancedNestedChanges);
            return;
        }

        // Case 1.5: One is object, other is not (creation/deletion of nested data)
        if (isObject(oldVal) && !isObject(newVal)) {
            // Object was removed/simplified
            changes.push({
                field: readableFieldName,
                raw_field: currentField,
                old_value: '[Object Data]',
                new_value: formatValue(newVal, currentField),
                action_type: 'remove'
            });
            return;
        }

        if (!isObject(oldVal) && isObject(newVal)) {
            // Object was added/created - Check internally for meaningful changes
            const nestedChanges = calculateChanges({}, newVal, currentField);

            // Only add if there are actual changes (filters out empty/default objects)
            if (nestedChanges.length > 0) {
                const enhancedNestedChanges = nestedChanges.map(change => ({
                    ...change,
                    field: getReadableFieldName(change.field),
                    raw_field: change.raw_field || change.field, // Preserve or default
                    action_type: 'add'
                }));
                changes = changes.concat(enhancedNestedChanges);
            }
            return;
        }

        // Case 2: Both are Arrays -> Special Handling
        if (isArray(oldVal) && isArray(newVal)) {
            // Check for array length changes to detect add/remove operations
            if (oldVal.length !== newVal.length) {
                if (oldVal.length < newVal.length) {
                    // Items added - also show what was added if it's a single item
                    if (newVal.length - oldVal.length === 1 && newVal.length === 1 && isObject(newVal[0])) {
                        // Single item added, show its details with enhanced field names
                        const nestedChanges = calculateChanges({}, newVal[0], currentField);
                        const enhancedNestedChanges = nestedChanges.map(change => ({
                            ...change,
                            field: getReadableFieldName(change.field),
                            raw_field: change.raw_field || change.field,
                            action_type: 'add'
                        }));
                        changes = changes.concat(enhancedNestedChanges);
                    } else {
                        changes.push({
                            field: readableFieldName,
                            raw_field: currentField,
                            old_value: `${oldVal.length} item(s)`,
                            new_value: `${newVal.length} item(s) (${newVal.length - oldVal.length} added)`,
                            action_type: 'add'
                        });
                    }
                } else {
                    // Items removed
                    changes.push({
                        field: readableFieldName,
                        raw_field: currentField,
                        old_value: `${oldVal.length} item(s)`,
                        new_value: `${newVal.length} item(s) (${oldVal.length - newVal.length} removed)`,
                        action_type: 'remove'
                    });
                }
                return;
            }

            // Same length arrays - compare items
            if (oldVal.length === newVal.length) {
                // For single item arrays, compare the objects directly
                if (oldVal.length === 1 && newVal.length === 1 && isObject(oldVal[0]) && isObject(newVal[0])) {
                    const nestedChanges = calculateChanges(oldVal[0], newVal[0], currentField);
                    // Apply readable field names to nested changes
                    const enhancedNestedChanges = nestedChanges.map(change => ({
                        ...change,
                        field: getReadableFieldName(change.field),
                        raw_field: change.raw_field || change.field
                    }));
                    changes = changes.concat(enhancedNestedChanges);
                    return;
                }

                // For multiple items, compare each item by index
                for (let i = 0; i < oldVal.length; i++) {
                    if (isObject(oldVal[i]) && isObject(newVal[i])) {
                        changes = changes.concat(calculateChanges(oldVal[i], newVal[i], `${currentField}[${i}]`));
                    } else if (!isEqual(oldVal[i], newVal[i])) {
                        changes.push({
                            field: `${readableFieldName}[${i}]`,
                            raw_field: `${currentField}[${i}]`,
                            old_value: formatValue(oldVal[i], currentField),
                            new_value: formatValue(newVal[i], currentField)
                        });
                    }
                }
                return;
            }

            // If arrays of objects with different lengths or multiple items, standard JSON diff is fallback
            // unless we want to map by ID. For now, if arrays differ, just show the array change.
        }

        // Case 3: One is null/undefined and other is Object/Array -> Show as "created" or "deleted" for that field
        // But we want granular details if possible. 
        // If old is empty and new is object, we COULD show all fields as new. 
        // But simply showing "Field: [Object]" is acceptable if it's a net new addition.

        // Skip if this would be an empty-to-empty change at the field level
        if (isEmpty(oldVal) && isEmpty(newVal)) return;

        // Fallback: Add the change with enhanced formatting
        changes.push({
            field: readableFieldName,
            raw_field: currentField,
            old_value: formatValue(oldVal, currentField),
            new_value: formatValue(newVal, currentField)
        });
    });

    return changes;
};

/**
 * Log a successful vehicle activity
 * @param {Object} data Log data (same as logActivity)
 * @param {string} successMessage Success message
 */
const logSuccess = async (data, successMessage = 'Operation completed successfully') => {
    return await logActivity({
        ...data,
        metadata: {
            ...(data.metadata || {}),
            status: 'success',
            message: successMessage,
            timestamp: new Date().toISOString()
        }
    });
};

/**
 * Log a failed vehicle activity
 * @param {Object} data Log data (same as logActivity)
 * @param {string} failureMessage Failure message
 * @param {Object|Error} error Error object or details
 */
const logFailure = async (data, failureMessage = 'Operation failed', error = null) => {
    const errorDetails = error ? {
        message: error.message || error,
        stack: error.stack || null,
        code: error.code || null,
        name: error.name || null
    } : null;

    return await logActivity({
        ...data,
        metadata: {
            ...(data.metadata || {}),
            status: 'failure',
            message: failureMessage,
            error_details: errorDetails,
            timestamp: new Date().toISOString()
        }
    });
};

/**
 * Wrapper function to execute operation and log success/failure
 * @param {Object} logData Base log data
 * @param {Function} operation Async operation to execute
 * @param {string} successMessage Success message
 * @param {string} failureMessage Failure message
 */
const executeWithLogging = async (logData, operation, successMessage, failureMessage) => {
    const startTime = Date.now();

    try {
        const result = await operation();
        const duration = Date.now() - startTime;

        await logSuccess({
            ...logData,
            metadata: {
                ...(logData.metadata || {}),
                operation_duration: duration
            }
        }, successMessage);

        return { success: true, data: result };
    } catch (error) {
        const duration = Date.now() - startTime;

        await logFailure({
            ...logData,
            metadata: {
                ...(logData.metadata || {}),
                operation_duration: duration
            }
        }, failureMessage, error);

        return { success: false, error: error };
    }
};

// @desc    Get field history for a specific vehicle field
// @route   GET /api/vehicle-activity/field-history
// @access  Private
const getFieldHistory = async (req, res) => {
    try {
        const { vehicle_stock_id, company_id, vehicle_type, module_name, field } = req.query;

        // Validate required parameters (module_name is optional - we search across all sections)
        if (!vehicle_stock_id || !company_id || !vehicle_type || !field) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameters: vehicle_stock_id, company_id, vehicle_type, field'
            });
        }

        // Create exact field search patterns only
        const fieldPatterns = [
            field, // exact match
            field.replace(/_/g, ' '), // underscore to space: purchase_date -> purchase date
            field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), // title case: purchase_date -> Purchase Date
            field.replace(/([A-Z])/g, ' $1').trim(), // camelCase to space: purchaseDate -> purchase Date
            field.replace(/([A-Z])/g, ' $1').trim().replace(/\b\w/g, l => l.toUpperCase()) // camelCase to title: purchaseDate -> Purchase Date
        ];

        // Build filter query - removed module_name filter to show history across all sections
        const filter = {
            company_id: company_id,
            vehicle_stock_id: parseInt(vehicle_stock_id),
            vehicle_type,
            // Removed module_name from filter to show history from all sections
            $or: fieldPatterns.map(pattern => ({
                'changes.field': { $regex: `^${pattern}$`, $options: 'i' }
            }))
        };

        // Get all logs that contain changes for the specified field across all modules/sections
        let logs = await VehicleActivityLog.find(filter)
            .sort({ timestamp: -1 })
            .lean();

        // Extract and format field history
        const fieldHistory = [];

        logs.forEach(log => {
            // Find changes that match the specified field with exact matching only
            const matchingChanges = log.changes.filter(change => {
                if (!change.field) return false;

                const changeFieldLower = change.field.toLowerCase();
                const searchFieldLower = field.toLowerCase();

                // Try exact matching patterns only
                const exactPatterns = [
                    searchFieldLower,
                    searchFieldLower.replace(/_/g, ' '),
                    searchFieldLower.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                    searchFieldLower.replace(/([A-Z])/g, ' $1').trim().toLowerCase(),
                ];

                return exactPatterns.some(pattern => changeFieldLower === pattern);
            });



            matchingChanges.forEach(change => {
                fieldHistory.push({
                    timestamp: log.timestamp,
                    action: log.action,
                    user_name: log.user_name,
                    user_id: log.user_id,
                    field_name: change.field,
                    raw_field_name: change.field, // Use field as raw_field_name since raw_field doesn't exist in model
                    old_value: change.old_value,
                    new_value: change.new_value,
                    action_type: change.action_type || 'update',
                    module_name: log.module_name,
                    metadata: log.metadata
                });
            });
        });

        // Sort by timestamp (most recent first)
        fieldHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        res.status(200).json({
            success: true,
            data: {
                field_name: field,
                vehicle_stock_id: parseInt(vehicle_stock_id),
                vehicle_type,
                module_name: module_name || 'All Sections', // Show requested module or 'All Sections' since we search across all
                total_changes: fieldHistory.length,
                history: fieldHistory
            },
            message: fieldHistory.length > 0
                ? `Found ${fieldHistory.length} changes for field '${field}' across all sections`
                : `No changes found for field '${field}'`
        });

    } catch (error) {
        console.error('Get field history error:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving field history',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Log multiple activities as a batch with optional grouping
 * @param {Array} activities Array of activity data objects
 * @param {Object} options Batching options
 * @param {boolean} options.groupByTime Group activities within time window (default: true)
 * @param {number} options.timeWindowMs Time window in milliseconds for grouping (default: 5000)
 * @param {boolean} options.combineChanges Combine all changes into single entry (default: false)
 */
const logBatchActivity = async (activities, options = {}) => {
    try {
        const {
            groupByTime = true,
            timeWindowMs = 5000,
            combineChanges = false
        } = options;

        if (!activities || activities.length === 0) {
            return [];
        }

        // If combining changes, merge all into single log entry
        if (combineChanges) {
            const firstActivity = activities[0];
            const allChanges = activities.reduce((acc, activity) => {
                return acc.concat(activity.changes || []);
            }, []);
            
            const moduleNames = [...new Set(activities.map(a => a.module_name))];
            
            return await logActivity({
                ...firstActivity,
                module_name: moduleNames.length === 1 ? moduleNames[0] : 'Vehicle General Info',
                changes: allChanges,
                metadata: {
                    ...firstActivity.metadata,
                    modules_updated: moduleNames,
                    batch_size: activities.length
                }
            });
        }

        // Group by time window if enabled
        if (groupByTime) {
            const now = new Date();
            const recentLogs = await VehicleActivityLog.find({
                company_id: activities[0].company_id,
                vehicle_stock_id: activities[0].vehicle_stock_id,
                vehicle_type: activities[0].vehicle_type,
                user_id: activities[0].user_id,
                timestamp: {
                    $gte: new Date(now.getTime() - timeWindowMs)
                }
            }).sort({ timestamp: -1 }).limit(1);

            // If there's a recent log from same user, append to it
            if (recentLogs.length > 0) {
                const recentLog = recentLogs[0];
                const allNewChanges = activities.reduce((acc, activity) => {
                    return acc.concat(activity.changes || []);
                }, []);

                recentLog.changes.push(...allNewChanges);
                recentLog.metadata = {
                    ...recentLog.metadata,
                    batch_updated: true,
                    last_batch_time: now
                };

                await recentLog.save();
                return recentLog;
            }
        }

        // Default: log each activity separately
        const results = [];
        for (const activity of activities) {
            const result = await logActivity(activity);
            if (result) results.push(result);
        }
        return results;

    } catch (error) {
        console.error('Error logging batch activity:', error);
        return null;
    }
};

module.exports = {
    logActivity,
    logBatchActivity,
    logSuccess,
    logFailure,
    executeWithLogging,
    getVehicleLogs,
    getFieldHistory,
    calculateChanges
};
