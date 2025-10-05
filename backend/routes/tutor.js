// routes/tutor.js
const express = require('express');
const router = express.Router();
const AdaptiveTutor = require('../services/adaptive-tutor');
const LLaMAService = require('../services/llama-service');
const AuthMiddleware = require('../middleware/auth');
const ValidationMiddleware = require('../middleware/validation');
const ErrorHandler = require('../middleware/errorHandler');
const Response = require('../utils/response');
const cache = require('../utils/cache');
const logger = require('../utils/logger');

/**
 * @route   GET /api/tutor/progress
 * @desc    Get student progress analysis
 * @access  Private
 */
router.get(
  '/progress',
  AuthMiddleware.authenticate,
  ErrorHandler.catchAsync(async (req, res) => {
    const { timeframe = '30 days' } = req.query;

    // Check cache for progress analysis
    const cacheKey = `progress:${req.user._id}:${timeframe}`;
    const cachedProgress = cache.progress.get(req.user._id);
    
    if (cachedProgress && cachedProgress.timeframe === timeframe) {
      return Response.sendSuccess(res, { analysis: cachedProgress }, 'Progress analysis retrieved successfully');
    }

    // Generate progress analysis
    const analysis = await AdaptiveTutor.analyzeStudentProgress(req.user._id, timeframe);

    // Cache progress analysis
    cache.progress.set(req.user._id, { ...analysis, timeframe });

    logger.debug('Progress analysis generated', {
      userId: req.user._id,
      timeframe
    });

    Response.sendSuccess(res, { analysis }, 'Progress analysis retrieved successfully');
  })
);

/**
 * @route   POST /api/tutor/study-plan
 * @desc    Create personalized study plan
 * @access  Private
 */
router.post(
  '/study-plan',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validateBody('tutor.studyPlan'),
  ErrorHandler.catchAsync(async (req, res) => {
    const { examType, timeframe, dailyStudyHours, focusAreas } = req.validatedBody;

    // Check for existing active study plan
    const existingPlan = await StudyPlan.findOne({
      studentId: req.user._id,
      active: true
    });

    if (existingPlan) {
      return Response.sendError(res, 'You already have an active study plan', 'ACTIVE_PLAN_EXISTS', {
        planId: existingPlan._id
      }, 409);
    }

    // Create personalized study plan
    const studyPlan = await AdaptiveTutor.createPersonalizedStudyPlan(
      req.user._id,
      examType,
      timeframe,
      dailyStudyHours
    );

    // Apply focus areas if provided
    if (focusAreas && focusAreas.length > 0) {
      studyPlan.focusAreas = focusAreas;
      await StudyPlan.findByIdAndUpdate(studyPlan._id, {
        $set: { focusAreas }
      });
    }

    logger.info('Study plan created', {
      planId: studyPlan.planId,
      examType,
      timeframe,
      userId: req.user._id
    });

    Response.sendCreated(res, { studyPlan }, 'Study plan created successfully');
  })
);

/**
 * @route   GET /api/tutor/study-plan/current
 * @desc    Get current active study plan
 * @access  Private
 */
router.get(
  '/study-plan/current',
  AuthMiddleware.authenticate,
  ErrorHandler.catchAsync(async (req, res) => {
    const studyPlan = await StudyPlan.findOne({
      studentId: req.user._id,
      active: true
    });

    if (!studyPlan) {
      return Response.sendError(res, 'No active study plan found', 'NO_ACTIVE_PLAN', null, 404);
    }

    // Calculate progress
    const progress = this._calculateStudyPlanProgress(studyPlan);

    logger.debug('Current study plan retrieved', {
      planId: studyPlan._id,
      userId: req.user._id
    });

    Response.sendSuccess(res, { studyPlan, progress }, 'Study plan retrieved successfully');
  })
);

/**
 * @route   PUT /api/tutor/study-plan/:planId
 * @desc    Update study plan
 * @access  Private
 */
router.put(
  '/study-plan/:planId',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validateObjectId('planId'),
  ErrorHandler.catchAsync(async (req, res) => {
    const { planId } = req.params;
    const updates = req.body;

    const studyPlan = await StudyPlan.findOne({
      _id: planId,
      studentId: req.user._id
    });

    if (!studyPlan) {
      return Response.sendError(res, 'Study plan not found', 'STUDY_PLAN_NOT_FOUND', null, 404);
    }

    // Allowed updates
    const allowedUpdates = ['dailyGoals', 'focusAreas', 'reinforcementAreas', 'dailyStudyHours'];
    const updateData = {};
    
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    });

    if (Object.keys(updateData).length === 0) {
      return Response.sendError(res, 'No valid fields to update', 'NO_VALID_UPDATES', null, 400);
    }

    const updatedPlan = await StudyPlan.findByIdAndUpdate(
      planId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    logger.info('Study plan updated', {
      planId,
      updates: Object.keys(updateData),
      userId: req.user._id
    });

    Response.sendSuccess(res, { studyPlan: updatedPlan }, 'Study plan updated successfully');
  })
);

/**
 * @route   POST /api/tutor/study-plan/:planId/complete-day
 * @desc    Mark daily goals as completed
 * @access  Private
 */
router.post(
  '/study-plan/:planId/complete-day',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validateObjectId('planId'),
  ErrorHandler.catchAsync(async (req, res) => {
    const { planId } = req.params;
    const { day, completedTasks = [] } = req.body;

    const studyPlan = await StudyPlan.findOne({
      _id: planId,
      studentId: req.user._id
    });

    if (!studyPlan) {
      return Response.sendError(res, 'Study plan not found', 'STUDY_PLAN_NOT_FOUND', null, 404);
    }

    // Find the day in daily goals
    const dayIndex = studyPlan.dailyGoals.findIndex(goal => goal.day === parseInt(day));
    if (dayIndex === -1) {
      return Response.sendError(res, 'Invalid day', 'INVALID_DAY', null, 400);
    }

    // Mark tasks as completed
    studyPlan.dailyGoals[dayIndex].completed = true;
    studyPlan.dailyGoals[dayIndex].completedAt = new Date();
    studyPlan.dailyGoals[dayIndex].completedTasks = completedTasks;

    // Update overall progress
    studyPlan.completedDays = studyPlan.dailyGoals.filter(goal => goal.completed).length;
    studyPlan.progress = (studyPlan.completedDays / studyPlan.dailyGoals.length) * 100;

    await studyPlan.save();

    logger.info('Daily goals completed', {
      planId,
      day,
      completedTasks: completedTasks.length,
      userId: req.user._id
    });

    Response.sendSuccess(res, { studyPlan }, 'Daily goals marked as completed');
  })
);

/**
 * @route   POST /api/tutor/explain
 * @desc    Get AI explanation for a topic
 * @access  Private
 */
router.post(
  '/explain',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validateBody('tutor.explanation'),
  ErrorHandler.catchAsync(async (req, res) => {
    const { topic, difficulty, examType, language } = req.validatedBody;

    // Check cache for explanation
    const cacheKey = `explanation:${topic}:${difficulty}:${examType}:${language}`;
    const cachedExplanation = cache.get('explanation', cacheKey);
    
    if (cachedExplanation) {
      return Response.sendSuccess(res, { explanation: cachedExplanation }, 'Explanation retrieved successfully');
    }

    // Generate AI explanation
    const explanation = await LLaMAService.generateExplanation(
      topic,
      difficulty,
      examType,
      language
    );

    // Cache explanation
    cache.set('explanation', cacheKey, explanation, 3600); // 1 hour

    logger.debug('AI explanation generated', {
      topic,
      difficulty,
      examType,
      userId: req.user._id
    });

    Response.sendSuccess(res, { explanation }, 'Explanation generated successfully');
  })
);

/**
 * @route   POST /api/tutor/practice-set
 * @desc    Generate personalized practice set
 * @access  Private
 */
router.post(
  '/practice-set',
  AuthMiddleware.authenticate,
  ErrorHandler.catchAsync(async (req, res) => {
    const { topic, difficulty = 'medium', questionCount = 10 } = req.body;

    if (!topic) {
      return Response.sendError(res, 'Topic is required', 'TOPIC_REQUIRED', null, 400);
    }

    // Generate personalized practice set
    const practiceSet = await AdaptiveTutor.generatePersonalizedPracticeSet(
      req.user._id,
      topic,
      difficulty,
      questionCount
    );

    logger.debug('Personalized practice set generated', {
      topic,
      difficulty,
      questionCount,
      userId: req.user._id
    });

    Response.sendSuccess(res, { practiceSet }, 'Practice set generated successfully');
  })
);

/**
 * @route   GET /api/tutor/recommendations
 * @desc    Get personalized learning recommendations
 * @access  Private
 */
router.get(
  '/recommendations',
  AuthMiddleware.authenticate,
  ErrorHandler.catchAsync(async (req, res) => {
    // Get progress analysis first
    const analysis = await AdaptiveTutor.analyzeStudentProgress(req.user._id, '30 days');

    // Generate recommendations based on analysis
    const recommendations = this._generateLearningRecommendations(analysis);

    logger.debug('Learning recommendations generated', {
      recommendationCount: recommendations.length,
      userId: req.user._id
    });

    Response.sendSuccess(res, { recommendations }, 'Recommendations retrieved successfully');
  })
);

/**
 * @route   POST /api/tutor/weak-areas/focus
 * @desc    Create focused learning session for weak areas
 * @access  Private
 */
router.post(
  '/weak-areas/focus',
  AuthMiddleware.authenticate,
  ErrorHandler.catchAsync(async (req, res) => {
    const { maxAreas = 3, sessionDuration = 60 } = req.body; // duration in minutes

    // Get progress analysis to identify weak areas
    const analysis = await AdaptiveTutor.analyzeStudentProgress(req.user._id, '30 days');
    
    if (!analysis.topicMastery.weakAreas || analysis.topicMastery.weakAreas.length === 0) {
      return Response.sendError(res, 'No weak areas identified', 'NO_WEAK_AREAS', null, 400);
    }

    const weakAreas = analysis.topicMastery.weakAreas.slice(0, maxAreas);
    
    // Create focused learning session
    const focusSession = {
      sessionId: `focus_${Date.now()}`,
      weakAreas,
      sessionDuration,
      activities: [],
      resources: [],
      goals: this._generateFocusSessionGoals(weakAreas, sessionDuration)
    };

    // Generate activities for each weak area
    for (const area of weakAreas) {
      const activities = await this._generateActivitiesForTopic(area, sessionDuration / weakAreas.length);
      focusSession.activities.push(...activities);
    }

    // Get relevant resources
    focusSession.resources = await this._getLearningResources(weakAreas);

    logger.info('Focus session created', {
      sessionId: focusSession.sessionId,
      weakAreas,
      activityCount: focusSession.activities.length,
      userId: req.user._id
    });

    Response.sendSuccess(res, { focusSession }, 'Focus session created successfully');
  })
);

/**
 * @route   GET /api/tutor/learning-path
 * @desc    Get personalized learning path
 * @access  Private
 */
router.get(
  '/learning-path',
  AuthMiddleware.authenticate,
  ErrorHandler.catchAsync(async (req, res) => {
    const { examType } = req.query;

    if (!examType) {
      return Response.sendError(res, 'Exam type is required', 'EXAM_TYPE_REQUIRED', null, 400);
    }

    // Get progress analysis
    const analysis = await AdaptiveTutor.analyzeStudentProgress(req.user._id, '30 days');

    // Generate learning path
    const learningPath = AdaptiveTutor._generateLearningPath(analysis);

    // Enhance with exam-specific milestones
    learningPath.milestones = this._getExamMilestones(examType, analysis.overallPerformance.accuracy);

    logger.debug('Learning path generated', {
      examType,
      phaseCount: learningPath.phases.length,
      userId: req.user._id
    });

    Response.sendSuccess(res, { learningPath }, 'Learning path retrieved successfully');
  })
);

/**
 * @route   POST /api/tutor/adaptive-quiz
 * @desc    Generate adaptive quiz based on performance
 * @access  Private
 */
router.post(
  '/adaptive-quiz',
  AuthMiddleware.authenticate,
  ErrorHandler.catchAsync(async (req, res) => {
    const { topic, questionCount = 10 } = req.body;

    if (!topic) {
      return Response.sendError(res, 'Topic is required', 'TOPIC_REQUIRED', null, 400);
    }

    // Get current performance for the topic
    const analysis = await AdaptiveTutor.analyzeStudentProgress(req.user._id, '7 days');
    const topicPerformance = analysis.topicMastery.detailed[topic];

    // Determine starting difficulty
    let startingDifficulty = 'medium';
    if (topicPerformance) {
      if (topicPerformance.masteryLevel >= 75) {
        startingDifficulty = 'hard';
      } else if (topicPerformance.masteryLevel < 50) {
        startingDifficulty = 'easy';
      }
    }

    // Generate adaptive quiz
    const adaptiveQuiz = await AdaptiveTutor.generatePersonalizedPracticeSet(
      req.user._id,
      topic,
      startingDifficulty,
      questionCount
    );

    // Add adaptive properties
    adaptiveQuiz.isAdaptive = true;
    adaptiveQuiz.startingDifficulty = startingDifficulty;
    adaptiveQuiz.performanceThresholds = {
      promote: 80, // Promote to harder questions if score > 80%
      demote: 50   // Demote to easier questions if score < 50%
    };

    logger.debug('Adaptive quiz generated', {
      topic,
      startingDifficulty,
      questionCount,
      userId: req.user._id
    });

    Response.sendSuccess(res, { quiz: adaptiveQuiz }, 'Adaptive quiz generated successfully');
  })
);

/**
 * @route   GET /api/tutor/performance-predictions
 * @desc    Get performance predictions based on current progress
 * @access  Private
 */
router.get(
  '/performance-predictions',
  AuthMiddleware.authenticate,
  ErrorHandler.catchAsync(async (req, res) => {
    const { examType, targetDate } = req.query;

    if (!examType || !targetDate) {
      return Response.sendError(res, 'Exam type and target date are required', 'MISSING_PARAMS', null, 400);
    }

    // Get current progress
    const analysis = await AdaptiveTutor.analyzeStudentProgress(req.user._id, '30 days');

    // Calculate predictions
    const predictions = this._calculatePerformancePredictions(analysis, examType, new Date(targetDate));

    logger.debug('Performance predictions generated', {
      examType,
      targetDate,
      userId: req.user._id
    });

    Response.sendSuccess(res, { predictions }, 'Performance predictions generated successfully');
  })
);

/**
 * Helper method to calculate study plan progress
 */
_calculateStudyPlanProgress = (studyPlan) => {
  const totalDays = studyPlan.dailyGoals.length;
  const completedDays = studyPlan.dailyGoals.filter(day => day.completed).length;
  const progressPercentage = (completedDays / totalDays) * 100;

  // Calculate streak
  let currentStreak = 0;
  const today = new Date().toDateString();
  
  for (let i = studyPlan.dailyGoals.length - 1; i >= 0; i--) {
    const goal = studyPlan.dailyGoals[i];
    if (goal.completed && goal.completedAt) {
      const completedDate = new Date(goal.completedAt).toDateString();
      if (completedDate === today || currentStreak > 0) {
        currentStreak++;
      }
    } else {
      break;
    }
  }

  return {
    progressPercentage: Math.round(progressPercentage),
    completedDays,
    totalDays,
    currentStreak,
    estimatedCompletion: studyPlan.endDate,
    isOnTrack: progressPercentage >= (studyPlan.dailyGoals.findIndex(g => !g.completed) / totalDays) * 100
  };
};

/**
 * Helper method to generate learning recommendations
 */
_generateLearningRecommendations = (analysis) => {
  const recommendations = [];

  // Performance-based recommendations
  if (analysis.overallPerformance.accuracy < 60) {
    recommendations.push({
      type: 'foundation_review',
      priority: 'high',
      title: 'Strengthen Foundation',
      description: 'Focus on understanding basic concepts before attempting advanced problems',
      actions: [
        'Review fundamental concepts for weak areas',
        'Practice with easier difficulty questions',
        'Watch concept explanation videos'
      ],
      estimatedTime: '2-3 hours daily'
    });
  }

  // Time management recommendations
  if (analysis.overallPerformance.averageTimePerQuestion > 120) {
    recommendations.push({
      type: 'speed_practice',
      priority: 'medium',
      title: 'Improve Solving Speed',
      description: 'Practice solving questions within time limits to improve speed',
      actions: [
        'Use timer during practice sessions',
        'Learn shortcut methods',
        'Practice mental calculations'
      ],
      estimatedTime: '1 hour daily'
    });
  }

  // Weak areas recommendations
  analysis.topicMastery.weakAreas.forEach((area, index) => {
    recommendations.push({
      type: 'focused_practice',
      priority: index < 2 ? 'high' : 'medium',
      title: `Practice ${area}`,
      description: `Targeted practice needed for ${area}`,
      actions: [
        `Complete ${area} practice sets`,
        `Review ${area} concepts with AI tutor`,
        `Take ${area} specific quizzes`
      ],
      estimatedTime: '45 minutes daily'
    });
  });

  // Study habits recommendations
  if (analysis.studyHabits.consistencyScore < 70) {
    recommendations.push({
      type: 'consistency_improvement',
      priority: 'medium',
      title: 'Establish Study Routine',
      description: 'Regular study schedule improves long-term retention',
      actions: [
        'Set fixed study times',
        'Use Pomodoro technique',
        'Track daily progress'
      ],
      estimatedTime: 'Build habit over 2 weeks'
    });
  }

  return recommendations.slice(0, 5); // Return top 5 recommendations
};

/**
 * Helper method to generate focus session goals
 */
_generateFocusSessionGoals = (weakAreas, duration) => {
  const timePerArea = duration / weakAreas.length;
  
  return weakAreas.map(area => ({
    topic: area,
    timeAllocated: timePerArea,
    goals: [
      `Understand key concepts in ${area}`,
      `Solve ${Math.ceil(timePerArea / 10)} practice questions`,
      `Review common mistakes in ${area}`
    ]
  }));
};

/**
 * Helper method to generate activities for a topic
 */
_generateActivitiesForTopic = async (topic, duration) => {
  const activities = [];

  // Concept explanation (25% of time)
  activities.push({
    type: 'concept_learning',
    topic,
    duration: duration * 0.25,
    description: `Learn fundamental concepts of ${topic}`,
    resources: await this._getConceptResources(topic)
  });

  // Practice questions (50% of time)
  activities.push({
    type: 'practice_questions',
    topic,
    duration: duration * 0.5,
    description: `Solve practice questions for ${topic}`,
    questionCount: Math.ceil((duration * 0.5) / 3) // 3 minutes per question
  });

  // Review and analysis (25% of time)
  activities.push({
    type: 'review_analysis',
    topic,
    duration: duration * 0.25,
    description: `Review solutions and analyze mistakes for ${topic}`
  });

  return activities;
};

/**
 * Helper method to get learning resources
 */
_getLearningResources = async (topics) => {
  // This would typically query a resources database
  // For now, return mock data
  return topics.map(topic => ({
    topic,
    resources: [
      {
        type: 'video',
        title: `${topic} Concept Explanation`,
        url: `https://example.com/videos/${topic.toLowerCase()}`,
        duration: '15 min'
      },
      {
        type: 'article',
        title: `${topic} Study Guide`,
        url: `https://example.com/articles/${topic.toLowerCase()}`,
        readingTime: '10 min'
      },
      {
        type: 'practice',
        title: `${topic} Practice Set`,
        questionCount: 20,
        difficulty: 'mixed'
      }
    ]
  }));
};

/**
 * Helper method to get concept resources
 */
_getConceptResources = async (topic) => {
  // Mock implementation - would query resources database
  return [
    {
      type: 'explanation',
      source: 'AI Tutor',
      content: `Detailed explanation of ${topic} concepts`
    },
    {
      type: 'examples',
      source: 'AI Tutor',
      content: `Practical examples for ${topic}`
    }
  ];
};

/**
 * Helper method to get exam milestones
 */
_getExamMilestones = (examType, currentAccuracy) => {
  const baseMilestones = {
    NEET: [50, 65, 80, 90],
    JEE: [45, 60, 75, 85],
    UPSC: [55, 70, 80, 90],
    SAT: [60, 75, 85, 95],
    GRE: [55, 70, 80, 90]
  };

  const milestones = baseMilestones[examType] || [50, 65, 80, 90];
  
  return milestones.map((score, index) => ({
    stage: index + 1,
    targetScore: score,
    description: this._getMilestoneDescription(examType, index + 1),
    isAchieved: currentAccuracy >= score,
    isCurrent: currentAccuracy < score && (index === 0 || currentAccuracy >= milestones[index - 1])
  }));
};

/**
 * Helper method to get milestone description
 */
_getMilestoneDescription = (examType, stage) => {
  const descriptions = {
    1: 'Basic proficiency - Understands fundamental concepts',
    2: 'Intermediate level - Can solve standard problems',
    3: 'Advanced level - Handles complex scenarios',
    4: 'Mastery - Exam ready performance'
  };
  return descriptions[stage] || 'Learning milestone';
};

/**
 * Helper method to calculate performance predictions
 */
_calculatePerformancePredictions = (analysis, examType, targetDate) => {
  const today = new Date();
  const daysUntilTarget = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
  
  const currentAccuracy = analysis.overallPerformance.accuracy;
  const improvementRate = analysis.growthTrajectory?.improvementRate || 0.5; // % per day
  const consistency = analysis.studyHabits.consistencyScore / 100;

  // Calculate predicted accuracy
  const predictedAccuracy = Math.min(
    95, // Cap at 95%
    currentAccuracy + (improvementRate * daysUntilTarget * consistency)
  );

  // Calculate confidence score
  const confidence = Math.min(100, 
    (consistency * 40) + 
    (analysis.overallPerformance.testsAttempted * 2) + 
    (daysUntilTarget > 30 ? 30 : (daysUntilTarget / 30) * 30)
  );

  return {
    currentAccuracy: Math.round(currentAccuracy * 100) / 100,
    predictedAccuracy: Math.round(predictedAccuracy * 100) / 100,
    confidence: Math.round(confidence),
    daysUntilTarget,
    requiredDailyImprovement: Math.round(((predictedAccuracy - currentAccuracy) / daysUntilTarget) * 100) / 100,
    riskFactors: this._identifyRiskFactors(analysis, daysUntilTarget)
  };
};

/**
 * Helper method to identify risk factors
 */
_identifyRiskFactors = (analysis, daysUntilTarget) => {
  const risks = [];

  if (analysis.studyHabits.consistencyScore < 60) {
    risks.push('Low study consistency');
  }

  if (analysis.overallPerformance.testsAttempted < 5) {
    risks.push('Limited practice test experience');
  }

  if (daysUntilTarget < 14) {
    risks.push('Short preparation time');
  }

  if (analysis.topicMastery.weakAreas.length > 3) {
    risks.push('Multiple weak areas identified');
  }

  return risks;
};

module.exports = router;