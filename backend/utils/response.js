// utils/response.js
class Response {
  /**
   * Success response template
   */
  static success(data = null, message = 'Success', meta = {}) {
    return {
      success: true,
      message,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta
      }
    };
  }

  /**
   * Error response template
   */
  static error(message = 'Error', code = 'INTERNAL_ERROR', details = null, statusCode = 500) {
    const error = {
      success: false,
      error: {
        code,
        message,
        details,
        timestamp: new Date().toISOString()
      }
    };

    return { error, statusCode };
  }

  /**
   * Pagination response
   */
  static pagination(data, pagination, message = 'Data retrieved successfully') {
    return this.success(data, message, { pagination });
  }

  /**
   * Created response (201)
   */
  static created(data = null, message = 'Resource created successfully') {
    return {
      success: true,
      message,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        statusCode: 201
      }
    };
  }

  /**
   * No content response (204)
   */
  static noContent(message = 'No content') {
    return {
      success: true,
      message,
      data: null,
      meta: {
        timestamp: new Date().toISOString(),
        statusCode: 204
      }
    };
  }

  /**
   * Validation error response
   */
  static validationError(errors, message = 'Validation failed') {
    return this.error(message, 'VALIDATION_ERROR', errors, 400);
  }

  /**
   * Not found response
   */
  static notFound(resource = 'Resource', message = null) {
    const errorMessage = message || `${resource} not found`;
    return this.error(errorMessage, 'NOT_FOUND', null, 404);
  }

  /**
   * Unauthorized response
   */
  static unauthorized(message = 'Unauthorized access') {
    return this.error(message, 'UNAUTHORIZED', null, 401);
  }

  /**
   * Forbidden response
   */
  static forbidden(message = 'Access forbidden') {
    return this.error(message, 'FORBIDDEN', null, 403);
  }

  /**
   * Conflict response
   */
  static conflict(message = 'Resource conflict', details = null) {
    return this.error(message, 'CONFLICT', details, 409);
  }

  /**
   * Too many requests response
   */
  static tooManyRequests(message = 'Too many requests', details = null) {
    return this.error(message, 'RATE_LIMIT_EXCEEDED', details, 429);
  }

  /**
   * Service unavailable response
   */
  static serviceUnavailable(message = 'Service temporarily unavailable', details = null) {
    return this.error(message, 'SERVICE_UNAVAILABLE', details, 503);
  }

  /**
   * Send success response
   */
  static sendSuccess(res, data = null, message = 'Success', meta = {}, statusCode = 200) {
    return res.status(statusCode).json(this.success(data, message, meta));
  }

  /**
   * Send error response
   */
  static sendError(res, message = 'Error', code = 'INTERNAL_ERROR', details = null, statusCode = 500) {
    const { error, statusCode: errorStatusCode } = this.error(message, code, details, statusCode);
    return res.status(errorStatusCode).json(error);
  }

  /**
   * Send pagination response
   */
  static sendPagination(res, data, pagination, message = 'Data retrieved successfully') {
    return res.status(200).json(this.pagination(data, pagination, message));
  }

  /**
   * Send created response
   */
  static sendCreated(res, data = null, message = 'Resource created successfully') {
    return res.status(201).json(this.created(data, message));
  }

  /**
   * Send no content response
   */
  static sendNoContent(res, message = 'No content') {
    return res.status(204).json(this.noContent(message));
  }

  /**
   * Standardized API response handler
   */
  static handle(res, promise, successMessage = 'Operation completed successfully') {
    return promise
      .then(data => {
        this.sendSuccess(res, data, successMessage);
      })
      .catch(error => {
        this.handleError(res, error);
      });
  }

  /**
   * Handle errors consistently
   */
  static handleError(res, error) {
    console.error('Error handled:', error);

    // Mongoose validation error
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      return this.sendError(res, 'Validation failed', 'VALIDATION_ERROR', errors, 400);
    }

    // Mongoose duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return this.sendError(res, `${field} already exists`, 'DUPLICATE_ENTRY', null, 409);
    }

    // JWT errors
    if (error.name === 'JsonWebTokenError') {
      return this.sendError(res, 'Invalid token', 'INVALID_TOKEN', null, 401);
    }

    if (error.name === 'TokenExpiredError') {
      return this.sendError(res, 'Token expired', 'TOKEN_EXPIRED', null, 401);
    }

    // Custom validation error (from our Validation utility)
    if (error.statusCode === 400 && error.details) {
      return this.sendError(res, error.message, 'VALIDATION_ERROR', error.details, 400);
    }

    // Custom error with status code
    if (error.statusCode) {
      return this.sendError(res, error.message, error.code || 'CUSTOM_ERROR', error.details, error.statusCode);
    }

    // Default server error
    return this.sendError(res, 'Internal server error', 'INTERNAL_ERROR', null, 500);
  }

  /**
   * Generate download response
   */
  static download(res, data, filename, contentType = 'application/json') {
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    if (contentType === 'application/json') {
      return res.send(JSON.stringify(data, null, 2));
    }
    
    return res.send(data);
  }

  /**
   * Generate CSV response
   */
  static csv(res, data, filename) {
    const { Parser } = require('json2csv');
    
    try {
      const parser = new Parser();
      const csv = parser.parse(data);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(csv);
    } catch (error) {
      return this.sendError(res, 'Failed to generate CSV', 'CSV_GENERATION_ERROR', error.message, 500);
    }
  }
}

module.exports = Response;