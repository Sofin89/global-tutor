// routes/questions.js
const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const LLaMAService = require('../services/llama-service');
const AuthMiddleware = require('../middleware/auth');
const ValidationMiddleware = require('../middleware/validation');
const ErrorHandler = require('../middleware/errorHandler');
const Response = require('../utils/response');
const cache = require('../utils/cache');
const logger = require('../utils/logger');

/**
 * @route   GET /api/questions
 * @desc    Get questions with filtering and pagination
 * @access  Private
 */
router.get(
  '/',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validateQuery('query.pagination'),
  ValidationMiddleware.validateQuery('query.filter'),
  ValidationMiddleware.validatePagination,
  ErrorHandler.catchAsync(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const filter = { status: 'active' };

    // Apply filters
    if (req.validatedQuery.examType) {
      filter.examType = req.validatedQuery.examType;
    }
    if (req.validatedQuery.subject) {
      filter.subject = req.validatedQuery.subject;
    }
    if (req.validatedQuery.topic) {
      filter.topic = new RegExp(req.validatedQuery.topic, 'i');
    }
    if (req.validatedQuery.difficulty) {
      filter.difficulty = req.validatedQuery.difficulty;
    }
    if (req.validatedQuery.search) {
      filter.$text = { $search: req.validatedQuery.search };
    }

    // Build sort object
    let sort = { createdAt: -1 };
    if (req.validatedQuery.sort) {
      const [field, order] = req.validatedQuery.sort.split(':');
      sort = { [field]: order === 'asc' ? 1 : -1 };
    }

    // Generate cache key
    const cacheKey = `questions:${JSON.stringify({ filter, sort, page, limit })}`;

    // Check cache
    const cached = cache.get('question', cacheKey);
    if (cached) {
      return Response.sendPagination(res, cached.questions, cached.pagination, 'Questions retrieved successfully');
    }

    // Execute queries
    const [questions, total] = await Promise.all([
      Question.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select('-__v')
        .lean(),
      Question.countDocuments(filter)
    ]);

    // Prepare response
    const pagination = {
      currentPage: page,
      pageSize: limit,
      totalItems: total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrevious: page > 1
    };

    const response = { questions, pagination };

    // Cache response
    cache.set('question', cacheKey, response, 300); // 5 minutes

    logger.debug('Questions retrieved', { 
      count: questions.length, 
      filter,
      userId: req.user._id 
    });

    Response.sendPagination(res, questions, pagination, 'Questions retrieved successfully');
  })
);

/**
 * @route   GET /api/questions/random
 * @desc    Get random questions for practice
 * @access  Private
 */
router.get(
  '/random',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validateQuery('query.filter'),
  ErrorHandler.catchAsync(async (req, res) => {
    const { count = 10, examType, subject, topic, difficulty } = req.validatedQuery;
    const filter = { status: 'active' };

    if (examType) filter.examType = examType;
    if (subject) filter.subject = subject;
    if (topic) filter.topic = new RegExp(topic, 'i');
    if (difficulty) filter.difficulty = difficulty;

    const questions = await Question.aggregate([
      { $match: filter },
      { $sample: { size: parseInt(count) } },
      { $project: { __v: 0 } }
    ]);

    logger.debug('Random questions retrieved', { 
      count: questions.length, 
      filter,
      userId: req.user._id 
    });

    Response.sendSuccess(res, { questions }, 'Random questions retrieved successfully');
  })
);

/**
 * @route   GET /api/questions/:id
 * @desc    Get single question by ID
 * @access  Private
 */
router.get(
  '/:id',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validateObjectId('id'),
  ErrorHandler.catchAsync(async (req, res) => {
    const question = await Question.findOne({
      _id: req.params.id,
      status: 'active'
    }).select('-__v');

    if (!question) {
      return Response.sendError(res, 'Question not found', 'QUESTION_NOT_FOUND', null, 404);
    }

    // Check cache first
    const cachedQuestion = cache.question.get(req.params.id);
    if (cachedQuestion) {
      return Response.sendSuccess(res, { question: cachedQuestion }, 'Question retrieved successfully');
    }

    // Cache the question
    cache.question.set(req.params.id, question);

    logger.debug('Question retrieved', { 
      questionId: req.params.id,
      userId: req.user._id 
    });

    Response.sendSuccess(res, { question }, 'Question retrieved successfully');
  })
);

/**
 * @route   POST /api/questions
 * @desc    Create a new question
 * @access  Private (Admin/Content Creator)
 */
router.post(
  '/',
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRoles(['admin', 'content_creator']),
  ValidationMiddleware.validateBody('question.create'),
  ErrorHandler.catchAsync(async (req, res) => {
    const questionData = {
      ...req.validatedBody,
      createdBy: req.user._id,
      status: 'active'
    };

    const question = await Question.create(questionData);

    // Clear relevant caches
    cache.del('question', `questions:${question.examType}`);
    cache.del('question', `questions:${question.examType}:${question.subject}`);

    logger.info('Question created', { 
      questionId: question._id,
      examType: question.examType,
      subject: question.subject,
      userId: req.user._id 
    });

    Response.sendCreated(res, { question }, 'Question created successfully');
  })
);

/**
 * @route   PUT /api/questions/:id
 * @desc    Update a question
 * @access  Private (Admin/Content Creator)
 */
router.put(
  '/:id',
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRoles(['admin', 'content_creator']),
  ValidationMiddleware.validateObjectId('id'),
  ValidationMiddleware.validateBody('question.update'),
  ErrorHandler.catchAsync(async (req, res) => {
    const question = await Question.findOne({
      _id: req.params.id,
      status: 'active'
    });

    if (!question) {
      return Response.sendError(res, 'Question not found', 'QUESTION_NOT_FOUND', null, 404);
    }

    // Update question
    Object.assign(question, req.validatedBody);
    question.updatedAt = new Date();
    question.updatedBy = req.user._id;
    await question.save();

    // Clear caches
    cache.question.del(req.params.id);
    cache.del('question', `questions:${question.examType}`);
    cache.del('question', `questions:${question.examType}:${question.subject}`);

    logger.info('Question updated', { 
      questionId: question._id,
      userId: req.user._id 
    });

    Response.sendSuccess(res, { question }, 'Question updated successfully');
  })
);

/**
 * @route   DELETE /api/questions/:id
 * @desc    Delete a question (soft delete)
 * @access  Private (Admin/Content Creator)
 */
router.delete(
  '/:id',
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRoles(['admin', 'content_creator']),
  ValidationMiddleware.validateObjectId('id'),
  ErrorHandler.catchAsync(async (req, res) => {
    const question = await Question.findOne({
      _id: req.params.id,
      status: 'active'
    });

    if (!question) {
      return Response.sendError(res, 'Question not found', 'QUESTION_NOT_FOUND', null, 404);
    }

    // Soft delete
    question.status = 'deleted';
    question.deletedAt = new Date();
    question.deletedBy = req.user._id;
    await question.save();

    // Clear caches
    cache.question.del(req.params.id);
    cache.del('question', `questions:${question.examType}`);
    cache.del('question', `questions:${question.examType}:${question.subject}`);

    logger.info('Question deleted', { 
      questionId: question._id,
      userId: req.user._id 
    });

    Response.sendSuccess(res, null, 'Question deleted successfully');
  })
);

/**
 * @route   POST /api/questions/:id/explanation
 * @desc    Get AI-generated explanation for a question
 * @access  Private
 */
router.post(
  '/:id/explanation',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validateObjectId('id'),
  ErrorHandler.catchAsync(async (req, res) => {
    const question = await Question.findOne({
      _id: req.params.id,
      status: 'active'
    });

    if (!question) {
      return Response.sendError(res, 'Question not found', 'QUESTION_NOT_FOUND', null, 404);
    }

    // Check cache for explanation
    const cacheKey = `explanation:${question._id}:${req.user._id}`;
    const cachedExplanation = cache.get('explanation', cacheKey);
    
    if (cachedExplanation) {
      return Response.sendSuccess(res, { explanation: cachedExplanation }, 'Explanation retrieved successfully');
    }

    // Generate AI explanation
    const explanation = await LLaMAService.generateExplanation(
      question.topic,
      question.difficulty,
      question.examType,
      'en'
    );

    // Cache explanation for 1 hour
    cache.set('explanation', cacheKey, explanation, 3600);

    logger.debug('AI explanation generated', { 
      questionId: question._id,
      topic: question.topic,
      userId: req.user._id 
    });

    Response.sendSuccess(res, { explanation }, 'Explanation generated successfully');
  })
);

/**
 * @route   POST /api/questions/:id/solution
 * @desc    Get AI-generated step-by-step solution
 * @access  Private
 */
router.post(
  '/:id/solution',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validateObjectId('id'),
  ErrorHandler.catchAsync(async (req, res) => {
    const question = await Question.findOne({
      _id: req.params.id,
      status: 'active'
    });

    if (!question) {
      return Response.sendError(res, 'Question not found', 'QUESTION_NOT_FOUND', null, 404);
    }

    // Generate AI solution
    const solution = await LLaMAService.generateStepByStepSolution(
      question.question,
      question.subject,
      question.examType
    );

    logger.debug('AI solution generated', { 
      questionId: question._id,
      subject: question.subject,
      userId: req.user._id 
    });

    Response.sendSuccess(res, { solution }, 'Solution generated successfully');
  })
);

/**
 * @route   POST /api/questions/generate-practice
 * @desc    Generate AI practice questions
 * @access  Private
 */
router.post(
  '/generate-practice',
  AuthMiddleware.authenticate,
  ErrorHandler.catchAsync(async (req, res) => {
    const { topic, difficulty = 'medium', count = 5, questionType = 'mcq' } = req.body;

    if (!topic) {
      return Response.sendError(res, 'Topic is required', 'TOPIC_REQUIRED', null, 400);
    }

    // Check cache for generated questions
    const cacheKey = `practice:${topic}:${difficulty}:${count}:${questionType}`;
    const cachedQuestions = cache.get('question', cacheKey);
    
    if (cachedQuestions) {
      return Response.sendSuccess(res, { questions: cachedQuestions }, 'Practice questions generated successfully');
    }

    // Generate AI practice questions
    const questions = await LLaMAService.generatePracticeQuestions(
      topic,
      difficulty,
      count,
      questionType
    );

    // Cache generated questions for 2 hours
    cache.set('question', cacheKey, questions, 7200);

    logger.debug('AI practice questions generated', { 
      topic,
      difficulty,
      count,
      questionType,
      userId: req.user._id 
    });

    Response.sendSuccess(res, { questions }, 'Practice questions generated successfully');
  })
);

/**
 * @route   GET /api/questions/stats/overview
 * @desc    Get question statistics overview
 * @access  Private (Admin/Content Creator)
 */
router.get(
  '/stats/overview',
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRoles(['admin', 'content_creator']),
  ErrorHandler.catchAsync(async (req, res) => {
    const stats = await Question.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: null,
          totalQuestions: { $sum: 1 },
          byExamType: { $push: '$examType' },
          bySubject: { $push: '$subject' },
          byDifficulty: { $push: '$difficulty' },
          byCognitiveLevel: { $push: '$cognitiveLevel' }
        }
      },
      {
        $project: {
          totalQuestions: 1,
          examTypes: {
            $arrayToObject: {
              $map: {
                input: { $setUnion: ['$byExamType'] },
                as: 'type',
                in: {
                  k: '$$type',
                  v: {
                    $size: {
                      $filter: {
                        input: '$byExamType',
                        as: 't',
                        cond: { $eq: ['$$t', '$$type'] }
                      }
                    }
                  }
                }
              }
            }
          },
          subjects: {
            $arrayToObject: {
              $map: {
                input: { $setUnion: ['$bySubject'] },
                as: 'subject',
                in: {
                  k: '$$subject',
                  v: {
                    $size: {
                      $filter: {
                        input: '$bySubject',
                        as: 's',
                        cond: { $eq: ['$$s', '$$subject'] }
                      }
                    }
                  }
                }
              }
            }
          },
          difficulties: {
            $arrayToObject: {
              $map: {
                input: { $setUnion: ['$byDifficulty'] },
                as: 'difficulty',
                in: {
                  k: '$$difficulty',
                  v: {
                    $size: {
                      $filter: {
                        input: '$byDifficulty',
                        as: 'd',
                        cond: { $eq: ['$$d', '$$difficulty'] }
                      }
                    }
                  }
                }
              }
            }
          },
          cognitiveLevels: {
            $arrayToObject: {
              $map: {
                input: { $setUnion: ['$byCognitiveLevel'] },
                as: 'level',
                in: {
                  k: '$$level',
                  v: {
                    $size: {
                      $filter: {
                        input: '$byCognitiveLevel',
                        as: 'l',
                        cond: { $eq: ['$$l', '$$level'] }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    ]);

    const overview = stats[0] || {
      totalQuestions: 0,
      examTypes: {},
      subjects: {},
      difficulties: {},
      cognitiveLevels: {}
    };

    logger.debug('Question statistics retrieved', { userId: req.user._id });

    Response.sendSuccess(res, { overview }, 'Statistics retrieved successfully');
  })
);

/**
 * @route   POST /api/questions/batch
 * @desc    Create multiple questions in batch
 * @access  Private (Admin/Content Creator)
 */
router.post(
  '/batch',
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRoles(['admin', 'content_creator']),
  ValidationMiddleware.validateBatch('question.create', 'questions'),
  ErrorHandler.catchAsync(async (req, res) => {
    const questionsData = req.validatedBatch.map(question => ({
      ...question,
      createdBy: req.user._id,
      status: 'active'
    }));

    const questions = await Question.insertMany(questionsData);

    // Clear all question caches
    cache.del('question', /^questions:/);

    logger.info('Batch questions created', { 
      count: questions.length,
      userId: req.user._id 
    });

    Response.sendCreated(res, { questions }, `${questions.length} questions created successfully`);
  })
);

module.exports = router;