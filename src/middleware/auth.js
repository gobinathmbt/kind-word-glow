
const jwt = require('jsonwebtoken');
const MasterAdmin = require('../models/MasterAdmin');
const User = require('../models/User');
const Env_Configuration = require('../config/env');

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

    // Add user to request
    req.user = {
      id: user._id,
      email: user.email,
      role: user.role,
      company_id: user.company_id?._id || user.company_id
    };

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
