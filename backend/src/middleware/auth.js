
const jwt = require('jsonwebtoken');
const MasterAdmin = require('../models/MasterAdmin');
const User = require('../models/User');
const Env_Configuration = require('../config/env');
const dbConnectionManager = require('../config/dbConnectionManager');
const ModelRegistry = require('../models/modelRegistry');

// Protect routes - authenticate user
const protect = async (req, res, next) => {
  try {
    let token;

    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided, access denied'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, Env_Configuration.JWT_SECRET);

    // Find user based on role
    let user;
    if (decoded.role === 'master_admin') {
      user = await MasterAdmin.findById(decoded.id);
    } else {
      user = await User.findById(decoded.id).populate('company_id');
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found, token invalid'
      });
    }

    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Manual cross-database populate for dealership_ids
    let populatedDealerships = [];
    if (user.dealership_ids && user.dealership_ids.length > 0 && user.company_id) {
      try {
        const companyId = user.company_id._id || user.company_id;
        const companyConnection = await dbConnectionManager.getCompanyConnection(companyId.toString());
        const Dealership = ModelRegistry.getModel('Dealership', companyConnection);
        
        populatedDealerships = await Dealership.find({
          _id: { $in: user.dealership_ids }
        }).lean();
        
        // Decrement active requests after fetching
        dbConnectionManager.decrementActiveRequests(companyId.toString());
      } catch (error) {
        console.error('Error populating dealership_ids:', error);
        // Continue with empty array if populate fails
        populatedDealerships = [];
      }
    }

    // Add user to request
    req.user = {
      id: user._id,
      email: user.email,
      role: user.role,
      is_primary_admin: user.is_primary_admin,
      company_id: user.company_id?._id || user.company_id,
      dealership_ids: populatedDealerships // Now populated with full dealership objects
    };

    // Extract company_db_name from token or construct from company_id
    if (decoded.company_db_name) {
      req.user.company_db_name = decoded.company_db_name;
    } else if (req.user.company_id && decoded.role !== 'master_admin') {
      // Fallback: construct company_db_name from company_id for backward compatibility
      req.user.company_db_name = `company_${req.user.company_id}`;
    } else {
      // Master admin or no company context
      req.user.company_db_name = null;
    }

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error in authentication'
    });
  }
};

// Authorize based on roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${roles.join(', ')}`
      });
    }
    next();
  };
};

// Company scope middleware - ensures users can only access their company data
const companyScopeCheck = (req, res, next) => {
  // Master admin can access all companies
  if (req.user.role === 'master_admin') {
    return next();
  }

  // For company users, ensure they can only access their company data
  const requestedCompanyId = req.params.companyId || req.body.company_id || req.query.company_id;
  
  if (requestedCompanyId && requestedCompanyId !== req.user.company_id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Cannot access other company data'
    });
  }

  next();
};

module.exports = {
  protect,
  authorize,
  companyScopeCheck
};
