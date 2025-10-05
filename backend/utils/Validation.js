// utils/validation.js
const Joi = require('joi');

class Validation {
  /**
   * Common validation schemas
   */
  static get schemas() {
    return {
      // User validation
      user: {
        register: Joi.object({
          name: Joi.string().min(2).max(50).required().trim(),
          email: Joi.string().email().required().trim().lowercase(),
          password: Joi.string().min(8).required(),
          examType: Joi.string().valid('NEET', 'JEE', 'UPSC', 'SAT', 'GRE', 'IELTS', 'TOEFL', 'CODING').required(),
          grade: Joi.string().max(20).optional(),
          country: Joi.string().max(50).optional()
        }),

        login: Joi.object({
          email: Joi.string().email().required().trim().lowercase(),
          password: Joi.string().required()
        }),

        update: Joi.object({
          name: Joi.string().min(2).max(50).trim(),
          examType: Joi.string().valid('NEET', 'JEE', 'UPSC', 'SAT', 'GRE', 'IELTS', 'TOEFL', 'CODING'),
          grade: Joi.string().max(20),
          country: Joi.string().max(50),
          preferences: Joi.object({
            notifications: Joi.boolean(),
            darkMode: Joi.boolean(),
            language: Joi.string().valid('en', 'hi', 'es', 'fr')
          })
        }).min(1)
      },

      // Question validation
      question: {
        create: Joi.object({
          question: Joi.string().min(10).max(1000).required(),
          type: Joi.string().valid('mcq', 'truefalse', 'short', 'descriptive', 'coding').required(),
          options: Joi.when('type', {
            is: 'mcq',
            then: Joi.array().items(Joi.string().min(1).max(500)).min(2).max(6).required(),
            otherwise: Joi.forbidden()
          }),
          correctAnswer: Joi.alternatives().try(
            Joi.string(),
            Joi.number(),
            Joi.boolean(),
            Joi.array().items(Joi.string())
          ).required(),
          explanation: Joi.string().max(2000).optional(),
          topic: Joi.string().max(100).required(),
          subject: Joi.string().max(50).required(),
          difficulty: Joi.string().valid('easy', 'medium', 'hard', 'expert').required(),
          examType: Joi.string().valid('NEET', 'JEE', 'UPSC', 'SAT', 'GRE', 'IELTS', 'TOEFL', 'CODING').required(),
          cognitiveLevel: Joi.string().valid('remember', 'understand', 'apply', 'analyze', 'evaluate', 'create').optional()
        }),

        update: Joi.object({
          question: Joi.string().min(10).max(1000),
          type: Joi.string().valid('mcq', 'truefalse', 'short', 'descriptive', 'coding'),
          options: Joi.array().items(Joi.string().min(1).max(500)).min(2).max(6),
          correctAnswer: Joi.alternatives().try(
            Joi.string(),
            Joi.number(),
            Joi.boolean(),
            Joi.array().items(Joi.string())
          ),
          explanation: Joi.string().max(2000),
          topic: Joi.string().max(100),
          subject: Joi.string().max(50),
          difficulty: Joi.string().valid('easy', 'medium', 'hard', 'expert'),
          cognitiveLevel: Joi.string().valid('remember', 'understand', 'apply', 'analyze', 'evaluate', 'create')
        }).min(1)
      },

      // Test validation
      test: {
        generate: Joi.object({
          examType: Joi.string().valid('NEET', 'JEE', 'UPSC', 'SAT', 'GRE', 'IELTS', 'TOEFL', 'CODING').required(),
          subjects: Joi.array().items(Joi.string().max(50)).min(1).required(),
          difficulty: Joi.string().valid('easy', 'medium', 'hard', 'mixed').default('medium'),
          numberOfQuestions: Joi.number().integer().min(5).max(100).default(20),
          questionTypes: Joi.array().items(Joi.string().valid('mcq', 'truefalse', 'short', 'descriptive')).default(['mcq']),
          timeLimit: Joi.number().integer().min(300).max(10800).optional() // 5min to 3hrs
        }),

        evaluate: Joi.object({
          testId: Joi.string().required(),
          userAnswers: Joi.object().pattern(
            Joi.string(), // questionId
            Joi.alternatives().try(Joi.string(), Joi.number(), Joi.boolean(), Joi.array())
          ).required(),
          timeSpent: Joi.number().integer().min(0).required()
        }),

        submit: Joi.object({
          answers: Joi.array().items(Joi.object({
            questionId: Joi.string().required(),
            selectedAnswer: Joi.alternatives().try(Joi.string(), Joi.number(), Joi.boolean(), Joi.array()).required(),
            timeSpent: Joi.number().integer().min(0).default(0)
          })).required(),
          timeSpent: Joi.number().integer().min(0).required()
        })
      },

      // Tutor validation
      tutor: {
        explanation: Joi.object({
          topic: Joi.string().min(2).max(200).required(),
          difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced').default('intermediate'),
          examType: Joi.string().valid('NEET', 'JEE', 'UPSC', 'SAT', 'GRE', 'IELTS', 'TOEFL', 'CODING').default('general'),
          language: Joi.string().valid('en', 'hi', 'es', 'fr').default('en')
        }),

        studyPlan: Joi.object({
          examType: Joi.string().valid('NEET', 'JEE', 'UPSC', 'SAT', 'GRE', 'IELTS', 'TOEFL', 'CODING').required(),
          timeframe: Joi.string().pattern(/^\d+\s*(days|weeks|months)$/).default('30 days'),
          dailyStudyHours: Joi.number().min(1).max(8).default(2),
          focusAreas: Joi.array().items(Joi.string()).optional()
        })
      },

      // Flashcard validation
      flashcard: {
        generate: Joi.object({
          topic: Joi.string().min(2).max(200).required(),
          count: Joi.number().integer().min(5).max(50).default(20),
          types: Joi.array().items(Joi.string().valid('concept', 'formula', 'definition', 'example', 'mnemonic')).default(['concept', 'definition']),
          difficulty: Joi.string().valid('easy', 'medium', 'hard').default('medium')
        }),

        review: Joi.object({
          flashcardId: Joi.string().required(),
          performance: Joi.number().min(0).max(1).required(), // 0-1 scale
          timeSpent: Joi.number().integer().min(0).default(0)
        })
      },

      // Common query parameters
      query: {
        pagination: Joi.object({
          page: Joi.number().integer().min(1).default(1),
          limit: Joi.number().integer().min(1).max(100).default(10),
          sort: Joi.string().pattern(/^[a-zA-Z_]+:(asc|desc)$/).default('createdAt:desc'),
          search: Joi.string().max(100).optional()
        }),

        filter: Joi.object({
          examType: Joi.string().valid('NEET', 'JEE', 'UPSC', 'SAT', 'GRE', 'IELTS', 'TOEFL', 'CODING'),
          subject: Joi.string().max(50),
          topic: Joi.string().max(100),
          difficulty: Joi.string().valid('easy', 'medium', 'hard', 'expert'),
          dateFrom: Joi.date().iso(),
          dateTo: Joi.date().iso().min(Joi.ref('dateFrom'))
        })
      }
    };
  }

  /**
   * Validate data against schema
   */
  static validate(data, schema, options = {}) {
    const defaultOptions = {
      abortEarly: false,
      allowUnknown: true,
      stripUnknown: true
    };

    const validationOptions = { ...defaultOptions, ...options };
    const { error, value } = schema.validate(data, validationOptions);

    if (error) {
      const validationError = new Error('Validation failed');
      validationError.details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type
      }));
      validationError.statusCode = 400;
      throw validationError;
    }

    return value;
  }

  /**
   * Validate MongoDB ObjectId
   */
  static validateObjectId(id) {
    if (!id) {
      throw new Error('ID is required');
    }

    if (typeof id !== 'string') {
      throw new Error('ID must be a string');
    }

    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      throw new Error('Invalid ID format');
    }

    return true;
  }

  /**
   * Validate file upload
   */
  static validateFile(file, options = {}) {
    const {
      allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
      maxSize = 5 * 1024 * 1024, // 5MB
      required = true
    } = options;

    if (!file && required) {
      throw new Error('File is required');
    }

    if (!file) {
      return true;
    }

    // Check file type
    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }

    // Check file size
    if (file.size > maxSize) {
      throw new Error(`File size too large. Maximum size: ${maxSize / 1024 / 1024}MB`);
    }

    return true;
  }

  /**
   * Validate email verification token
   */
  static validateEmailToken(token) {
    if (!token || typeof token !== 'string') {
      throw new Error('Invalid verification token');
    }

    if (token.length !== 64) {
      throw new Error('Invalid token format');
    }

    return true;
  }

  /**
   * Validate password reset data
   */
  static validatePasswordReset(data) {
    const schema = Joi.object({
      token: Joi.string().length(64).required(),
      newPassword: Joi.string().min(8).required(),
      confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
        'any.only': 'Passwords do not match'
      })
    });

    return this.validate(data, schema);
  }

  /**
   * Validate exam type
   */
  static validateExamType(examType) {
    const validExamTypes = ['NEET', 'JEE', 'UPSC', 'SAT', 'GRE', 'IELTS', 'TOEFL', 'CODING'];
    
    if (!validExamTypes.includes(examType)) {
      throw new Error(`Invalid exam type. Must be one of: ${validExamTypes.join(', ')}`);
    }

    return true;
  }

  /**
   * Validate difficulty level
   */
  static validateDifficulty(difficulty) {
    const validDifficulties = ['easy', 'medium', 'hard', 'expert'];
    
    if (!validDifficulties.includes(difficulty)) {
      throw new Error(`Invalid difficulty. Must be one of: ${validDifficulties.join(', ')}`);
    }

    return true;
  }

  /**
   * Validate date range
   */
  static validateDateRange(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();

    if (isNaN(start.getTime())) {
      throw new Error('Invalid start date');
    }

    if (isNaN(end.getTime())) {
      throw new Error('Invalid end date');
    }

    if (start > end) {
      throw new Error('Start date cannot be after end date');
    }

    if (end > now) {
      throw new Error('End date cannot be in the future');
    }

    return true;
  }

  /**
   * Validate performance score (0-100)
   */
  static validateScore(score) {
    if (typeof score !== 'number' || isNaN(score)) {
      throw new Error('Score must be a number');
    }

    if (score < 0 || score > 100) {
      throw new Error('Score must be between 0 and 100');
    }

    return true;
  }

  /**
   * Sanitize and validate search query
   */
  static sanitizeSearchQuery(query, maxLength = 100) {
    if (!query || typeof query !== 'string') {
      return '';
    }

    // Remove potentially dangerous characters
    const sanitized = query
      .trim()
      .replace(/[<>{}[\]\\]/g, '')
      .substring(0, maxLength);

    return sanitized;
  }

  /**
   * Validate pagination parameters
   */
  static validatePagination(page, limit) {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;

    if (pageNum < 1) {
      throw new Error('Page must be at least 1');
    }

    if (limitNum < 1 || limitNum > 100) {
      throw new Error('Limit must be between 1 and 100');
    }

    return {
      page: pageNum,
      limit: limitNum
    };
  }

  /**
   * Create custom validator for specific fields
   */
  static createFieldValidator(fieldName, rules) {
    return function(value) {
      const schema = Joi.object({
        [fieldName]: rules
      });

      const { error } = schema.validate({ [fieldName]: value });
      
      if (error) {
        throw new Error(error.details[0].message);
      }

      return true;
    };
  }

  /**
   * Batch validate multiple items
   */
  static batchValidate(items, schema, options = {}) {
    if (!Array.isArray(items)) {
      throw new Error('Items must be an array');
    }

    const results = {
      valid: [],
      invalid: []
    };

    items.forEach((item, index) => {
      try {
        const validatedItem = this.validate(item, schema, options);
        results.valid.push(validatedItem);
      } catch (error) {
        results.invalid.push({
          index,
          item,
          error: error.message,
          details: error.details
        });
      }
    });

    return results;
  }
}

module.exports = Validation;