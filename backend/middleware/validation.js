// middleware/validation.js
const Validation = require('../utils/validation');
const Response = require('../utils/response');
const logger = require('../utils/logger');

class ValidationMiddleware {
  /**
   * Validate request body against schema
   */
  validateBody(schemaName) {
    return (req, res, next) => {
      try {
        const schema = Validation.schemas[schemaName];
        if (!schema) {
          throw new Error(`Validation schema '${schemaName}' not found`);
        }

        const validatedData = Validation.validate(req.body, schema);
        req.validatedBody = validatedData;
        
        logger.debug('Request body validated', { 
          schema: schemaName,
          fields: Object.keys(validatedData)
        });
        
        next();
      } catch (error) {
        logger.warn('Request body validation failed', {
          schema: schemaName,
          error: error.message,
          details: error.details
        });
        
        Response.sendError(
          res,
          error.message,
          'VALIDATION_ERROR',
          error.details,
          400
        );
      }
    };
  }

  /**
   * Validate request query parameters
   */
  validateQuery(schemaName) {
    return (req, res, next) => {
      try {
        const schema = Validation.schemas[schemaName];
        if (!schema) {
          throw new Error(`Validation schema '${schemaName}' not found`);
        }

        const validatedData = Validation.validate(req.query, schema);
        req.validatedQuery = validatedData;
        
        logger.debug('Query parameters validated', { 
          schema: schemaName,
          params: Object.keys(validatedData)
        });
        
        next();
      } catch (error) {
        logger.warn('Query parameters validation failed', {
          schema: schemaName,
          error: error.message,
          details: error.details
        });
        
        Response.sendError(
          res,
          error.message,
          'VALIDATION_ERROR',
          error.details,
          400
        );
      }
    };
  }

  /**
   * Validate request parameters (URL params)
   */
  validateParams(schemaName) {
    return (req, res, next) => {
      try {
        const schema = Validation.schemas[schemaName];
        if (!schema) {
          throw new Error(`Validation schema '${schemaName}' not found`);
        }

        const validatedData = Validation.validate(req.params, schema);
        req.validatedParams = validatedData;
        
        logger.debug('URL parameters validated', { 
          schema: schemaName,
          params: Object.keys(validatedData)
        });
        
        next();
      } catch (error) {
        logger.warn('URL parameters validation failed', {
          schema: schemaName,
          error: error.message,
          details: error.details
        });
        
        Response.sendError(
          res,
          error.message,
          'VALIDATION_ERROR',
          error.details,
          400
        );
      }
    };
  }

  /**
   * Validate file upload
   */
  validateFileUpload(options = {}) {
    return (req, res, next) => {
      try {
        if (!req.file && !req.files) {
          if (options.required) {
            throw new Error('File is required');
          }
          return next();
        }

        const files = req.files ? Object.values(req.files).flat() : [req.file];
        
        for (const file of files) {
          Validation.validateFile(file, options);
        }

        logger.debug('File upload validated', {
          fileCount: files.length,
          fileNames: files.map(f => f.originalname)
        });
        
        next();
      } catch (error) {
        logger.warn('File upload validation failed', {
          error: error.message
        });
        
        Response.sendError(
          res,
          error.message,
          'FILE_VALIDATION_ERROR',
          null,
          400
        );
      }
    };
  }

  /**
   * Validate MongoDB ObjectId in parameters
   */
  validateObjectId(paramName) {
    return (req, res, next) => {
      try {
        const id = req.params[paramName];
        Validation.validateObjectId(id);
        next();
      } catch (error) {
        logger.warn('ObjectId validation failed', {
          param: paramName,
          value: req.params[paramName],
          error: error.message
        });
        
        Response.sendError(
          res,
          error.message,
          'INVALID_ID',
          null,
          400
        );
      }
    };
  }

  /**
   * Sanitize input data
   */
  sanitizeInput(fields = []) {
    return (req, res, next) => {
      try {
        const sanitize = (obj) => {
          if (typeof obj !== 'object' || obj === null) return obj;
          
          Object.keys(obj).forEach(key => {
            if (fields.length === 0 || fields.includes(key)) {
              if (typeof obj[key] === 'string') {
                obj[key] = obj[key]
                  .trim()
                  .replace(/[<>&"']/g, '')
                  .substring(0, 1000);
              } else if (typeof obj[key] === 'object') {
                sanitize(obj[key]);
              }
            }
          });
        };

        if (req.body) sanitize(req.body);
        if (req.query) sanitize(req.query);
        
        next();
      } catch (error) {
        logger.error('Input sanitization failed', { error: error.message });
        next(); // Continue even if sanitization fails
      }
    };
  }

  /**
   * Validate pagination parameters
   */
  validatePagination(req, res, next) {
    try {
      const { page = '1', limit = '10' } = req.query;
      const pagination = Validation.validatePagination(page, limit);
      
      req.pagination = pagination;
      next();
    } catch (error) {
      Response.sendError(
        res,
        error.message,
        'INVALID_PAGINATION',
        null,
        400
      );
    }
  }

  /**
   * Validate exam type
   */
  validateExamType(paramName = 'examType') {
    return (req, res, next) => {
      try {
        const examType = req.params[paramName] || req.body[paramName] || req.query[paramName];
        Validation.validateExamType(examType);
        next();
      } catch (error) {
        Response.sendError(
          res,
          error.message,
          'INVALID_EXAM_TYPE',
          null,
          400
        );
      }
    };
  }

  /**
   * Validate difficulty level
   */
  validateDifficulty(paramName = 'difficulty') {
    return (req, res, next) => {
      try {
        const difficulty = req.params[paramName] || req.body[paramName] || req.query[paramName];
        if (difficulty) {
          Validation.validateDifficulty(difficulty);
        }
        next();
      } catch (error) {
        Response.sendError(
          res,
          error.message,
          'INVALID_DIFFICULTY',
          null,
          400
        );
      }
    };
  }

  /**
   * Validate date range
   */
  validateDateRange(startParam = 'startDate', endParam = 'endDate') {
    return (req, res, next) => {
      try {
        const startDate = req.query[startParam];
        const endDate = req.query[endParam];
        
        if (startDate && endDate) {
          Validation.validateDateRange(startDate, endDate);
        }
        
        next();
      } catch (error) {
        Response.sendError(
          res,
          error.message,
          'INVALID_DATE_RANGE',
          null,
          400
        );
      }
    };
  }

  /**
   * Validate performance score
   */
  validateScore(paramName = 'score') {
    return (req, res, next) => {
      try {
        const score = req.body[paramName];
        if (score !== undefined) {
          Validation.validateScore(score);
        }
        next();
      } catch (error) {
        Response.sendError(
          res,
          error.message,
          'INVALID_SCORE',
          null,
          400
        );
      }
    };
  }

  /**
   * Batch validation for array data
   */
  validateBatch(schemaName, dataField = 'items') {
    return (req, res, next) => {
      try {
        const schema = Validation.schemas[schemaName];
        if (!schema) {
          throw new Error(`Validation schema '${schemaName}' not found`);
        }

        const items = req.body[dataField];
        if (!Array.isArray(items)) {
          throw new Error(`${dataField} must be an array`);
        }

        const results = Validation.batchValidate(items, schema);
        
        if (results.invalid.length > 0) {
          throw new Error(`Batch validation failed for ${results.invalid.length} items`);
        }

        req.validatedBatch = results.valid;
        next();
      } catch (error) {
        Response.sendError(
          res,
          error.message,
          'BATCH_VALIDATION_ERROR',
          error.details,
          400
        );
      }
    };
  }

  /**
   * Custom validator middleware
   */
  customValidator(validatorFn, fieldName) {
    return (req, res, next) => {
      try {
        const value = req.body[fieldName] || req.query[fieldName] || req.params[fieldName];
        validatorFn(value);
        next();
      } catch (error) {
        Response.sendError(
          res,
          error.message,
          'VALIDATION_ERROR',
          { field: fieldName },
          400
        );
      }
    };
  }
}

module.exports = new ValidationMiddleware();