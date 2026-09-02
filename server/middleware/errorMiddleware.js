const logger = require('../config/logger');

/**
 * Standardized Error Handling Middleware
 * Shapes all server errors into consistent format: { success: false, message, errors: [] }
 */
const errorHandler = (err, req, res, next) => {
  logger.error(`[Express Error]: ${err.message}`, {
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  if (err.statusCode) statusCode = err.statusCode;

  let message = err.message || 'Internal Server Error';
  let errors = err.errors || [message];

  // Handle Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue)[0];
    message = `Duplicate value entered for ${field}. Please use another value.`;
    errors = [message];
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errors = Object.values(err.errors).map((val) => val.message);
    message = 'Validation Error';
  }

  // Handle JWT error
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
    errors = ['Token verification failed'];
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token expired. Please sign in again.';
    errors = ['Token expired'];
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
};

/**
 * 404 Route Not Found Middleware
 */
const notFound = (req, res, next) => {
  const error = new Error(`Route Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

module.exports = {
  errorHandler,
  notFound,
};
