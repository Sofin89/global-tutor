// middleware/errorHandler.js
const Response = require('../utils/response');
const logger = require('../utils/logger');

// Simple function-based error handler (no class issues)
const handleError = (error, req, res, next) => {
  // Log the error first
  logError(error, req);

  // Handle specific error types
  if (error.name === 'ValidationError') {
    return handleValidationError(error, res);
  }

  if (error.name === 'MongoServerError') {
    return handleMongoError(error, res);
  }

  if (error.name === 'JsonWebTokenError') {
    return handleJWTError(error, res);
  }

  if (error.name === 'TokenExpiredError') {
    return handleJWTExpiredError(error, res);
  }

  if (error.code === 'LIMIT_FILE_SIZE') {
    return handleFileSizeError(error, res);
  }

  // Handle custom application errors
  if (error.statusCode) {
    return Response.sendError(
      res,
      error.message,
      error.code || 'CUSTOM_ERROR',
      error.details,
      error.statusCode
    );
  }

  // Default to internal server error
  handleGenericError(error, res);
};

const handleNotFound = (req, res, next) => {
  logger.warn('Route not found', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  Response.sendError(
    res,
    'Route not found',
    'ROUTE_NOT_FOUND',
    { path: req.originalUrl, method: req.method },
    404
  );
};

const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

const handleUnhandledRejection = () => {
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Promise Rejection', {
      reason: reason?.message || reason,
      stack: reason?.stack,
      promise: promise.toString()
    });
  });
};

const handleUncaughtException = () => {
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', {
      message: error.message,
      stack: error.stack
    });
  });
};

// Helper functions
const logError = (error, req) => {
  const logContext = {
    message: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.user?._id,
    userAgent: req.get('User-Agent')
  };

  if (error.statusCode && error.statusCode < 500) {
    logger.warn('Client error', logContext);
  } else {
    logger.error('Server error', logContext);
  }
};

const handleValidationError = (error, res) => {
  const details = error.details ? error.details.map(detail => ({
    field: detail.path?.join('.'),
    message: detail.message,
    type: detail.type
  })) : [];

  Response.sendError(
    res,
    'Validation failed',
    'VALIDATION_ERROR',
    details,
    400
  );
};

const handleMongoError = (error, res) => {
  // Duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue || {})[0];
    return Response.sendError(
      res,
      `${field || 'Resource'} already exists`,
      'DUPLICATE_ENTRY',
      { field, value: error.keyValue?.[field] },
      409
    );
  }

  // Cast error (invalid ObjectId)
  if (error.name === 'CastError') {
    return Response.sendError(
      res,
      'Invalid resource ID',
      'INVALID_ID',
      { path: error.path, value: error.value },
      400
    );
  }

  // Default MongoDB error
  return Response.sendError(
    res,
    'Database operation failed',
    'DATABASE_ERROR',
    null,
    500
  );
};

const handleJWTError = (error, res) => {
  Response.sendError(
    res,
    'Invalid authentication token',
    'INVALID_TOKEN',
    null,
    401
  );
};

const handleJWTExpiredError = (error, res) => {
  Response.sendError(
    res,
    'Authentication token expired',
    'TOKEN_EXPIRED',
    null,
    401
  );
};

const handleFileSizeError = (error, res) => {
  Response.sendError(
    res,
    'File size too large',
    'FILE_TOO_LARGE',
    { limit: error.limit },
    413
  );
};

const handleGenericError = (error, res) => {
  // Don't leak error details in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : error.message;

  const details = process.env.NODE_ENV === 'production' 
    ? null 
    : { stack: error.stack };

  Response.sendError(
    res,
    message,
    'INTERNAL_ERROR',
    details,
    500
  );
};

module.exports = {
  handleError,
  handleNotFound,
  catchAsync,
  handleUnhandledRejection,
  handleUncaughtException
};