// routes/tests.js
const express = require('express');
const router = express.Router();
const Test = require('../models/Test');
const CerebrasService = require('../services/cerebras-service');
const AdaptiveTutor = require('../services/adaptive-tutor');
const AuthMiddleware = require('../middleware/auth');
const ValidationMiddleware = require('../middleware/validation');
const ErrorHandler = require('../middleware/errorHandler');
const Response = require('../utils/response');
const cache = require('../utils/cache');
const logger = require('../utils/logger');

/**
 * @route   POST /api/tests/generate
 * @desc    Generate a new mock test
 * @access  Private
 */
router.post(
  '/generate',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validateBody('test.generate'),
  ErrorHandler.catchAsync(async (req, res) => {
    const { examType, subjects, difficulty, numberOfQuestions, questionTypes, timeLimit } = req.validatedBody;

    // Check for existing active test
    const existingTest = await Test.findOne({
      studentId: req.user._id,
      status: 'in_progress'
    });

    if (existingTest) {
      return Response.sendError(res, 'You already have an active test', 'ACTIVE_TEST_EXISTS', {
        testId: existingTest._id
      }, 409);
    }

    // Adjust difficulty based on student performance
    const adjustedDifficulty = await AdaptiveTutor.adjustTestDifficulty(
      req.user._id,
      difficulty,
      subjects[0],
      examType
    );

    // Generate test using Cerebras API
    const testData = await CerebrasService.generateTest(
      examType,
      subjects,
      adjustedDifficulty,
      numberOfQuestions,
      questionTypes
    );

    // Create test record
    const test = await Test.create({
      testId: testData.testId,
      studentId: req.user._id,
      examType,
      subjects,
      difficulty: adjustedDifficulty,
      totalQuestions: testData.totalQuestions,
      duration: timeLimit || testData.duration,
      questions: testData.questions,
      status: 'in_progress',
      startedAt: new Date(),
      metadata: testData.metadata
    });

    // Cache the test for quick access during evaluation
    cache.test.set(testData.testId, testData);

    logger.info('Test generated', {
      testId: testData.testId,
      examType,
      subjects,
      difficulty: adjustedDifficulty,
      userId: req.user._id
    });

    Response.sendCreated(res, {
      test: {
        id: test._id,
        testId: testData.testId,
        examType,
        subjects,
        difficulty: adjustedDifficulty,
        totalQuestions: testData.totalQuestions,
        duration: testData.duration,
        questions: testData.questions,
        startedAt: test.startedAt
      }
    }, 'Test generated successfully');
  })
);

/**
 * @route   POST /api/tests/:testId/submit
 * @desc    Submit test answers
 * @access  Private
 */
router.post(
  '/:testId/submit',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validateObjectId('testId'),
  ValidationMiddleware.validateBody('test.submit'),
  ErrorHandler.catchAsync(async (req, res) => {
    const { testId } = req.params;
    const { answers, timeSpent } = req.validatedBody;

    // Find the test
    const test = await Test.findOne({
      _id: testId,
      studentId: req.user._id,
      status: 'in_progress'
    });

    if (!test) {
      return Response.sendError(res, 'Test not found or already submitted', 'TEST_NOT_FOUND', null, 404);
    }

    // Prepare user answers for evaluation
    const userAnswers = {};
    answers.forEach(answer => {
      userAnswers[answer.questionId] = answer.selectedAnswer;
    });

    // Evaluate test using Cerebras API
    const evaluation = await CerebrasService.evaluateTest(
      test.testId,
      userAnswers,
      timeSpent
    );

    // Update test record
    test.status = 'completed';
    test.completedAt = new Date();
    test.timeSpent = timeSpent;
    test.userAnswers = answers;
    test.score = evaluation.score;
    test.correctAnswers = evaluation.correctAnswers;
    test.analytics = evaluation.analytics;
    test.evaluation = evaluation.detailedResults;
    await test.save();

    // Update adaptive tutor with results
    await AdaptiveTutor.updateLearningModel(req.user._id, {
      topic: test.subjects.join(', '),
      examType: test.examType,
      totalQuestions: test.totalQuestions,
      correctAnswers: evaluation.correctAnswers,
      timeSpent: timeSpent,
      accuracy: evaluation.score,
      difficulty: test.difficulty,
      subtopicBreakdown: evaluation.analytics.topicPerformance
    });

    // Clear test cache
    cache.test.del(test.testId);

    // Send results email
    try {
      await Email.sendTestResultsEmail(req.user, {
        examType: test.examType,
        score: evaluation.score,
        totalQuestions: test.totalQuestions,
        correctAnswers: evaluation.correctAnswers,
        timeSpent: timeSpent,
        strongAreas: evaluation.analytics.strongAreas,
        weakAreas: evaluation.analytics.weakAreas,
        testId: test._id
      });
    } catch (emailError) {
      logger.error('Failed to send test results email', {
        userId: req.user._id,
        testId: test._id,
        error: emailError.message
      });
    }

    logger.info('Test submitted', {
      testId: test._id,
      score: evaluation.score,
      userId: req.user._id
    });

    Response.sendSuccess(res, {
      results: {
        testId: test._id,
        score: evaluation.score,
        totalQuestions: test.totalQuestions,
        correctAnswers: evaluation.correctAnswers,
        timeSpent: timeSpent,
        analytics: evaluation.analytics,
        recommendations: evaluation.recommendations,
        improvementPlan: evaluation.improvementPlan,
        submittedAt: test.completedAt
      }
    }, 'Test submitted successfully');
  })
);

/**
 * @route   GET /api/tests
 * @desc    Get user's test history
 * @access  Private
 */
router.get(
  '/',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validateQuery('query.pagination'),
  ValidationMiddleware.validatePagination,
  ErrorHandler.catchAsync(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const filter = { studentId: req.user._id };

    // Apply filters
    if (req.query.examType) {
      filter.examType = req.query.examType;
    }
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.dateFrom || req.query.dateTo) {
      filter.completedAt = {};
      if (req.query.dateFrom) filter.completedAt.$gte = new Date(req.query.dateFrom);
      if (req.query.dateTo) filter.completedAt.$lte = new Date(req.query.dateTo);
    }

    // Build sort
    let sort = { completedAt: -1 };
    if (req.query.sort) {
      const [field, order] = req.query.sort.split(':');
      sort = { [field]: order === 'asc' ? 1 : -1 };
    }

    const [tests, total] = await Promise.all([
      Test.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select('-questions -userAnswers -evaluation -analytics.recommendations')
        .lean(),
      Test.countDocuments(filter)
    ]);

    const pagination = {
      currentPage: page,
      pageSize: limit,
      totalItems: total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrevious: page > 1
    };

    logger.debug('Test history retrieved', {
      count: tests.length,
      userId: req.user._id
    });

    Response.sendPagination(res, { tests }, pagination, 'Test history retrieved successfully');
  })
);

/**
 * @route   GET /api/tests/:testId
 * @desc    Get detailed test results
 * @access  Private
 */
router.get(
  '/:testId',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validateObjectId('testId'),
  ErrorHandler.catchAsync(async (req, res) => {
    const test = await Test.findOne({
      _id: req.params.testId,
      studentId: req.user._id
    });

    if (!test) {
      return Response.sendError(res, 'Test not found', 'TEST_NOT_FOUND', null, 404);
    }

    logger.debug('Test details retrieved', {
      testId: test._id,
      userId: req.user._id
    });

    Response.sendSuccess(res, { test }, 'Test details retrieved successfully');
  })
);

/**
 * @route   GET /api/tests/:testId/analysis
 * @desc    Get detailed test analysis
 * @access  Private
 */
router.get(
  '/:testId/analysis',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validateObjectId('testId'),
  ErrorHandler.catchAsync(async (req, res) => {
    const test = await Test.findOne({
      _id: req.params.testId,
      studentId: req.user._id
    }).select('analytics evaluation score correctAnswers totalQuestions timeSpent');

    if (!test) {
      return Response.sendError(res, 'Test not found', 'TEST_NOT_FOUND', null, 404);
    }

    // Generate comparative analysis
    const comparativeAnalysis = await this._generateComparativeAnalysis(test, req.user._id);

    const analysis = {
      score: test.score,
      correctAnswers: test.correctAnswers,
      totalQuestions: test.totalQuestions,
      timeSpent: test.timeSpent,
      analytics: test.analytics,
      evaluation: test.evaluation,
      comparativeAnalysis,
      recommendations: test.analytics?.recommendations || []
    };

    logger.debug('Test analysis retrieved', {
      testId: test._id,
      userId: req.user._id
    });

    Response.sendSuccess(res, { analysis }, 'Test analysis retrieved successfully');
  })
);

/**
 * @route   POST /api/tests/:testId/retry-weak-areas
 * @desc    Generate practice test for weak areas
 * @access  Private
 */
router.post(
  '/:testId/retry-weak-areas',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validateObjectId('testId'),
  ErrorHandler.catchAsync(async (req, res) => {
    const test = await Test.findOne({
      _id: req.params.testId,
      studentId: req.user._id
    });

    if (!test) {
      return Response.sendError(res, 'Test not found', 'TEST_NOT_FOUND', null, 404);
    }

    if (!test.analytics?.weakAreas || test.analytics.weakAreas.length === 0) {
      return Response.sendError(res, 'No weak areas identified in this test', 'NO_WEAK_AREAS', null, 400);
    }

    // Generate practice test focusing on weak areas
    const weakAreas = test.analytics.weakAreas.slice(0, 3); // Focus on top 3 weak areas
    const practiceTest = await CerebrasService.generateTest(
      test.examType,
      weakAreas,
      test.difficulty, // Keep same difficulty for focused practice
      15, // Smaller practice test
      ['mcq'] // Focus on multiple choice for practice
    );

    // Create practice test record
    const practiceTestRecord = await Test.create({
      testId: practiceTest.testId,
      studentId: req.user._id,
      examType: test.examType,
      subjects: weakAreas,
      difficulty: test.difficulty,
      totalQuestions: practiceTest.totalQuestions,
      duration: practiceTest.duration,
      questions: practiceTest.questions,
      status: 'in_progress',
      isPractice: true,
      parentTest: test._id,
      startedAt: new Date(),
      metadata: {
        ...practiceTest.metadata,
        focus: 'weak_areas_practice'
      }
    });

    // Cache the practice test
    cache.test.set(practiceTest.testId, practiceTest);

    logger.info('Weak areas practice test generated', {
      testId: test._id,
      practiceTestId: practiceTestRecord._id,
      weakAreas,
      userId: req.user._id
    });

    Response.sendCreated(res, {
      practiceTest: {
        id: practiceTestRecord._id,
        testId: practiceTest.testId,
        subjects: weakAreas,
        totalQuestions: practiceTest.totalQuestions,
        duration: practiceTest.duration,
        questions: practiceTest.questions,
        startedAt: practiceTestRecord.startedAt
      }
    }, 'Practice test for weak areas generated successfully');
  })
);

/**
 * @route   GET /api/tests/performance/overview
 * @desc    Get overall test performance overview
 * @access  Private
 */
router.get(
  '/performance/overview',
  AuthMiddleware.authenticate,
  ErrorHandler.catchAsync(async (req, res) => {
    const overview = await Test.aggregate([
      { $match: { studentId: req.user._id, status: 'completed' } },
      {
        $group: {
          _id: null,
          totalTests: { $sum: 1 },
          averageScore: { $avg: '$score' },
          bestScore: { $max: '$score' },
          totalQuestions: { $sum: '$totalQuestions' },
          totalCorrect: { $sum: '$correctAnswers' },
          totalTimeSpent: { $sum: '$timeSpent' },
          byExamType: {
            $push: {
              examType: '$examType',
              score: '$score',
              totalQuestions: '$totalQuestions',
              correctAnswers: '$correctAnswers'
            }
          },
          bySubject: {
            $push: {
              subjects: '$subjects',
              score: '$score'
            }
          },
          recentTests: {
            $push: {
              _id: '$_id',
              examType: '$examType',
              score: '$score',
              completedAt: '$completedAt'
            }
          }
        }
      },
      {
        $project: {
          totalTests: 1,
          averageScore: { $round: ['$averageScore', 2] },
          bestScore: 1,
          overallAccuracy: {
            $round: [
              { $multiply: [{ $divide: ['$totalCorrect', '$totalQuestions'] }, 100] },
              2
            ]
          },
          averageTimePerTest: {
            $round: [{ $divide: ['$totalTimeSpent', '$totalTests'] }]
          },
          examTypePerformance: {
            $arrayToObject: {
              $map: {
                input: { $setUnion: '$byExamType.examType' },
                as: 'type',
                in: {
                  k: '$$type',
                  v: {
                    tests: {
                      $size: {
                        $filter: {
                          input: '$byExamType',
                          as: 't',
                          cond: { $eq: ['$$t.examType', '$$type'] }
                        }
                      }
                    },
                    averageScore: {
                      $round: [
                        {
                          $avg: {
                            $map: {
                              input: {
                                $filter: {
                                  input: '$byExamType',
                                  as: 't',
                                  cond: { $eq: ['$$t.examType', '$$type'] }
                                }
                              },
                              as: 't',
                              in: '$$t.score'
                            }
                          }
                        },
                        2
                      ]
                    }
                  }
                }
              }
            }
          },
          recentTests: { $slice: ['$recentTests', 5] }
        }
      }
    ]);

    const performanceOverview = overview[0] || {
      totalTests: 0,
      averageScore: 0,
      bestScore: 0,
      overallAccuracy: 0,
      averageTimePerTest: 0,
      examTypePerformance: {},
      recentTests: []
    };

    logger.debug('Performance overview retrieved', { userId: req.user._id });

    Response.sendSuccess(res, { overview: performanceOverview }, 'Performance overview retrieved successfully');
  })
);

/**
 * @route   GET /api/tests/progress/timeline
 * @desc    Get test progress timeline
 * @access  Private
 */
router.get(
  '/progress/timeline',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validateDateRange('startDate', 'endDate'),
  ErrorHandler.catchAsync(async (req, res) => {
    const { startDate, endDate } = req.query;
    const dateFilter = {};

    if (startDate && endDate) {
      dateFilter.completedAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else {
      // Default to last 30 days
      dateFilter.completedAt = {
        $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      };
    }

    const timeline = await Test.aggregate([
      {
        $match: {
          studentId: req.user._id,
          status: 'completed',
          ...dateFilter
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$completedAt'
            }
          },
          testsTaken: { $sum: 1 },
          averageScore: { $avg: '$score' },
          totalQuestions: { $sum: '$totalQuestions' },
          totalCorrect: { $sum: '$correctAnswers' }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          date: '$_id',
          testsTaken: 1,
          averageScore: { $round: ['$averageScore', 2] },
          accuracy: {
            $round: [
              { $multiply: [{ $divide: ['$totalCorrect', '$totalQuestions'] }, 100] },
              2
            ]
          },
          _id: 0
        }
      }
    ]);

    logger.debug('Progress timeline retrieved', {
      dateRange: { startDate, endDate },
      userId: req.user._id
    });

    Response.sendSuccess(res, { timeline }, 'Progress timeline retrieved successfully');
  })
);

/**
 * @route   POST /api/tests/simulate/exam
 * @desc    Create a full-length exam simulation
 * @access  Private
 */
router.post(
  '/simulate/exam',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validateBody('test.generate'),
  ErrorHandler.catchAsync(async (req, res) => {
    const { examType, subjects, difficulty } = req.validatedBody;

    // Get exam configuration
    const examConfig = this._getExamConfig(examType);
    if (!examConfig) {
      return Response.sendError(res, 'Invalid exam type', 'INVALID_EXAM_TYPE', null, 400);
    }

    // Generate full-length exam
    const examData = await CerebrasService.generateTest(
      examType,
      subjects || examConfig.subjects,
      difficulty || 'mixed',
      examConfig.totalQuestions,
      examConfig.questionTypes,
      examConfig.duration
    );

    // Create exam simulation record
    const exam = await Test.create({
      testId: examData.testId,
      studentId: req.user._id,
      examType,
      subjects: subjects || examConfig.subjects,
      difficulty: difficulty || 'mixed',
      totalQuestions: examData.totalQuestions,
      duration: examData.duration,
      questions: examData.questions,
      status: 'in_progress',
      isSimulation: true,
      startedAt: new Date(),
      metadata: {
        ...examData.metadata,
        type: 'full_exam_simulation'
      }
    });

    // Cache the exam
    cache.test.set(examData.testId, examData);

    logger.info('Exam simulation created', {
      examId: exam._id,
      examType,
      userId: req.user._id
    });

    Response.sendCreated(res, {
      exam: {
        id: exam._id,
        testId: examData.testId,
        examType,
        subjects: exam.subjects,
        totalQuestions: examData.totalQuestions,
        duration: examData.duration,
        questions: examData.questions,
        startedAt: exam.startedAt,
        isSimulation: true
      }
    }, 'Exam simulation created successfully');
  })
);

/**
 * Helper method to generate comparative analysis
 */
_generateComparativeAnalysis = async (test, userId) => {
  const previousTests = await Test.find({
    studentId: userId,
    examType: test.examType,
    status: 'completed',
    completedAt: { $lt: test.completedAt }
  })
    .sort({ completedAt: -1 })
    .limit(5)
    .select('score completedAt totalQuestions correctAnswers')
    .lean();

  if (previousTests.length === 0) {
    return null;
  }

  const previousAverage = previousTests.reduce((sum, t) => sum + t.score, 0) / previousTests.length;
  const scoreImprovement = test.score - previousAverage;

  return {
    previousTestsCount: previousTests.length,
    previousAverageScore: Math.round(previousAverage * 100) / 100,
    currentScore: test.score,
    scoreImprovement: Math.round(scoreImprovement * 100) / 100,
    trend: scoreImprovement > 0 ? 'improving' : scoreImprovement < 0 ? 'declining' : 'stable',
    percentile: await this._calculatePercentile(test.score, test.examType)
  };
};

/**
 * Helper method to calculate percentile
 */
_calculatePercentile = async (score, examType) => {
  const totalTests = await Test.countDocuments({
    examType,
    status: 'completed'
  });

  if (totalTests === 0) return 50; // Default percentile if no data

  const betterTests = await Test.countDocuments({
    examType,
    status: 'completed',
    score: { $lte: score }
  });

  return Math.round((betterTests / totalTests) * 100);
};

/**
 * Helper method to get exam configuration
 */
_getExamConfig = (examType) => {
  const configs = {
    NEET: {
      totalQuestions: 180,
      duration: 180, // 3 hours in minutes
      subjects: ['Physics', 'Chemistry', 'Biology'],
      questionTypes: ['mcq']
    },
    JEE: {
      totalQuestions: 90,
      duration: 180, // 3 hours in minutes
      subjects: ['Mathematics', 'Physics', 'Chemistry'],
      questionTypes: ['mcq', 'numerical']
    },
    UPSC: {
      totalQuestions: 100,
      duration: 120, // 2 hours in minutes
      subjects: ['General Studies', 'Current Affairs', 'Aptitude'],
      questionTypes: ['mcq']
    },
    SAT: {
      totalQuestions: 154,
      duration: 180, // 3 hours in minutes
      subjects: ['Math', 'Reading', 'Writing'],
      questionTypes: ['mcq']
    },
    GRE: {
      totalQuestions: 80,
      duration: 135, // 2 hours 15 minutes in minutes
      subjects: ['Verbal Reasoning', 'Quantitative Reasoning'],
      questionTypes: ['mcq']
    }
  };

  return configs[examType];
};

module.exports = router;
