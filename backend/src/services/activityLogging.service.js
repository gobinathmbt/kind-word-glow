/**
 * Centralized Activity Logging Service
 * Unified wrapper for logging vehicle activity with automatic change detection
 */

const { logActivity } = require('../controllers/vehicleActivityLog.controller');
const ChangeDetectionService = require('./changeDetection.service');

class ActivityLoggingService {
  /**
   * Log vehicle update with automatic change detection
   * 
   * @param {Object} params - Logging parameters
   * @param {Object} params.oldData - Original vehicle data (before update)
   * @param {Object} params.newData - Updated vehicle data (after update)
   * @param {Object} params.req - Express request object (for user info)
   * @param {Object} params.vehicle - Updated vehicle document
   * @param {Object} params.options - Additional options
   * @param {Array} params.options.excludedFields - Fields to exclude from change detection
   * @param {Object} params.options.metadata - Additional metadata for logs
   * @returns {Promise<Object>} Result object with success status and logged groups
   */
  static async logVehicleUpdate({
    oldData,
    newData,
    req,
    vehicle,
    options = {}
  }) {
    try {
      // Extract module_section from request body
      const moduleSection = req.body?.module_section;
      // Priority: options.vehicleType (explicit) > vehicle.vehicle_type > 'master'
      // This ensures pricing vehicles are logged with correct vehicle_type
      const vehicleType = options.vehicleType || vehicle.vehicle_type || 'master';

      // Detect and group changes
      const groupLogs = ChangeDetectionService.detectAndGroupChanges(
        oldData,
        newData,
        {
          moduleSection,
          vehicleType,
          excludedFields: options.excludedFields || []
        }
      );

      // Log each group that has changes
      const logPromises = [];
      for (const [moduleName, changes] of Object.entries(groupLogs)) {
        if (changes.length > 0) {
          logPromises.push(
            logActivity({
              company_id: req.user.company_id,
              vehicle_stock_id: vehicle.vehicle_stock_id,
              vehicle_type: vehicleType,
              module_name: moduleName,
              action: 'update',
              user_id: req.user.id,
              changes: changes,
              metadata: {
                vehicle_stock_id: vehicle.vehicle_stock_id,
                ...options.metadata
              }
            })
          );
        }
      }

      // Execute all logs in parallel for better performance
      await Promise.all(logPromises);

      return {
        success: true,
        loggedGroups: Object.keys(groupLogs).filter(name => groupLogs[name].length > 0),
        totalChanges: Object.values(groupLogs).reduce((sum, changes) => sum + changes.length, 0)
      };
    } catch (error) {
      console.error('Activity logging error:', error);
      // Don't throw - logging failures shouldn't break the main flow
      return {
        success: false,
        error: error.message,
        loggedGroups: []
      };
    }
  }

  /**
   * Log vehicle creation
   * 
   * @param {Object} params - Logging parameters
   * @param {Object} params.vehicle - Created vehicle document
   * @param {Object} params.req - Express request object
   * @param {Object} params.options - Additional options
   */
  static async logVehicleCreate({ vehicle, req, options = {} }) {
    try {
      const vehicleType = vehicle.vehicle_type || options.vehicleType || 'master';
      const moduleSection = req.body?.module_section || 'Vehicle Overview';

      await logActivity({
        company_id: req.user.company_id,
        vehicle_stock_id: vehicle.vehicle_stock_id,
        vehicle_type: vehicleType,
        module_name: moduleSection,
        action: 'create',
        user_id: req.user.id,
        changes: ChangeDetectionService.detectAndGroupChanges(
          {},
          vehicle.toObject ? vehicle.toObject() : vehicle,
          { moduleSection, vehicleType }
        )[moduleSection] || [],
        metadata: {
          vehicle_stock_id: vehicle.vehicle_stock_id,
          ...options.metadata
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Activity logging error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Log vehicle deletion
   * 
   * @param {Object} params - Logging parameters
   * @param {Object} params.vehicle - Deleted vehicle document
   * @param {Object} params.req - Express request object
   * @param {Object} params.options - Additional options
   */
  static async logVehicleDelete({ vehicle, req, options = {} }) {
    try {
      const vehicleType = vehicle.vehicle_type || options.vehicleType || 'master';

      await logActivity({
        company_id: req.user.company_id,
        vehicle_stock_id: vehicle.vehicle_stock_id,
        vehicle_type: vehicleType,
        module_name: 'Vehicle Management',
        action: 'delete',
        user_id: req.user.id,
        changes: [],
        metadata: {
          vehicle_stock_id: vehicle.vehicle_stock_id,
          ...options.metadata
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Activity logging error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = ActivityLoggingService;

