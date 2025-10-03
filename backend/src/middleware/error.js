
const { logEvent } = require('../controllers/logs.controller');

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Log the error
  logEvent({
    event_type: 'system_error',
    event_action: 'error_occurred',
    event_description: err.message,
    user_id: req.user?.id,
    company_id: req.user?.company_id,
    user_role: req.user?.role,
    ip_address: req.ip,
    user_agent: req.get('User-Agent'),
    request_method: req.method,
    request_url: req.originalUrl,
    severity: 'error',
    status: 'failure',
    error_code: err.code || err.name,
    error_message: err.message,
    error_stack: err.stack,
    metadata: {
      error_type: err.constructor.name,
      status_code: err.statusCode || 500
    }
  });

  let error = { ...err };
  error.message = err.message;

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400 };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message, statusCode: 401 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
