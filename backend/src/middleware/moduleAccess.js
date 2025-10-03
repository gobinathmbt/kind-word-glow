
const User = require('../models/User');

// Middleware to check if user has access to required module
const checkModuleAccess = (requiredModule) => {
  return async (req, res, next) => {
    try {
      // Skip module check for master_admin and company_super_admin
      if (req.user.role === 'master_admin' || req.user.role === 'company_super_admin') {
        return next();
      }

      // For company_admin users, check module access
      if (req.user.role === 'company_admin') {
        const user = await User.findById(req.user.id).select('module_access');
        
        if (!user) {
          return res.status(404).json({
            success: false,
            message: 'User not found'
          });
        }

        // Check if user has no module access at all
        if (!user.module_access || !Array.isArray(user.module_access) || user.module_access.length === 0) {
          return res.status(403).json({
            success: false,
            message: 'No module access granted. Please contact your administrator.',
            code: 'NO_MODULE_ACCESS'
          });
        }

        // Check if user has access to the required module
        if (requiredModule && !user.module_access.includes(requiredModule)) {
          return res.status(403).json({
            success: false,
            message: `Access denied. Required module: ${requiredModule}`,
            code: 'INSUFFICIENT_MODULE_ACCESS'
          });
        }
      }

      next();
    } catch (error) {
      console.error('Module access check error:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking module access'
      });
    }
  };
};

// Route-specific module access middleware
const routeModuleAccess = {
  vehicleDashboard: checkModuleAccess('vehicle_dashboard'),
  vehicleInspection: checkModuleAccess('vehicle_inspection'),
  vehicleTradein: checkModuleAccess('vehicle_tradein')
};

module.exports = { 
  checkModuleAccess, 
  routeModuleAccess 
};
