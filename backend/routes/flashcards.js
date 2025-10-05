// routes/flashcards.js
const express = require('express');
const router = express.Router();
const FlashcardSet = require('../models/FlashcardSet');
const FlashcardProgress = require('../models/FlashcardProgress');
const FlashcardsGenerator = require('../services/flashcards-generator');
const AuthMiddleware = require('../middleware/auth');
const ValidationMiddleware = require('../middleware/validation');
const ErrorHandler = require('../middleware/errorHandler');
const Response = require('../utils/response');
const cache = require('../utils/cache');
const logger = require('../utils/logger');
const LLaMAService = require('../services/llama-service');
const mongoose = require('mongoose');

// Helper Methods
const _getDueFlashcards = (flashcardSet, progress, limit) => {
  const now = new Date();
  const dueCards = [];

  for (const card of flashcardSet.flashcards) {
    const cardProgress = progress.flashcards.find(p => p.flashcardId === card.id);
    
    if (!cardProgress || cardProgress.reviewHistory.length === 0) {
      // New card
      dueCards.push({
        ...card,
        isNew: true,
        priority: 1
      });
    } else {
      const lastReview = cardProgress.reviewHistory[cardProgress.reviewHistory.length - 1];
      const nextReviewDate = new Date(lastReview.nextReview);
      
      if (nextReviewDate <= now) {
        // Due card
        dueCards.push({
          ...card,
          isNew: false,
          priority: lastReview.performance < 0.6 ? 2 : 3
        });
      }
    }
  }

  return dueCards
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit);
};

const _getNewFlashcards = (flashcardSet, progress, limit) => {
  const reviewedCardIds = new Set(
    progress.flashcards.map(card => card.flashcardId)
  );

  return flashcardSet.flashcards
    .filter(card => !reviewedCardIds.has(card.id))
    .slice(0, limit);
};

const _calculateSessionStats = (progress) => {
  if (!progress) {
    return {
      totalReviews: 0,
      overallMastery: 0,
      cardsDue: 0,
      retentionRate: 0
    };
  }

  const recentReviews = progress.flashcards.flatMap(card =>
    card.reviewHistory.slice(-5)
  );

  const retentionRate = recentReviews.length > 0 
    ? recentReviews.filter(review => review.performance >= 0.7).length / recentReviews.length
    : 0;

  const cardsDue = progress.flashcards.filter(card => {
    const cardProgress = progress.flashcards.find(p => p.flashcardId === card.id);
    if (!cardProgress || cardProgress.reviewHistory.length === 0) return true;
    
    const lastReview = cardProgress.reviewHistory[cardProgress.reviewHistory.length - 1];
    return new Date(lastReview.nextReview) <= new Date();
  }).length;

  return {
    totalReviews: progress.totalReviews,
    overallMastery: Math.round(progress.overallMastery * 100) / 100,
    cardsDue,
    retentionRate: Math.round(retentionRate * 100),
    lastReviewed: progress.lastReviewed
  };
};

const _shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const _calculateReviewStreak = async (userId) => {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  let streak = 0;
  let currentDate = startOfToday;

  while (streak < 365) {
    const activity = await FlashcardProgress.findOne({
      studentId: userId,
      lastReviewed: {
        $gte: currentDate,
        $lt: new Date(currentDate.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    if (activity) {
      streak++;
      currentDate = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
    } else {
      break;
    }
  }

  return streak;
};

const _calculateDetailedProgress = (flashcardSet, progress) => {
  const cardProgress = flashcardSet.flashcards.map(card => {
    const cardProgressData = progress.flashcards.find(p => p.flashcardId === card.id);
    
    if (!cardProgressData) {
      return {
        cardId: card.id,
        front: card.front,
        type: card.type,
        mastery: 0,
        totalReviews: 0,
        lastReviewed: null,
        nextReview: null,
        status: 'new'
      };
    }

    const lastReview = cardProgressData.reviewHistory[cardProgressData.reviewHistory.length - 1];
    const mastery = FlashcardsGenerator.calculateMasteryScore(cardProgressData.reviewHistory);

    return {
      cardId: card.id,
      front: card.front,
      type: card.type,
      mastery: Math.round(mastery * 100) / 100,
      totalReviews: cardProgressData.totalReviews,
      lastReviewed: cardProgressData.lastReviewed,
      nextReview: lastReview?.nextReview || null,
      status: lastReview && new Date(lastReview.nextReview) <= new Date() ? 'due' : 'scheduled'
    };
  });

  const byType = {};
  cardProgress.forEach(card => {
    if (!byType[card.type]) {
      byType[card.type] = {
        total: 0,
        mastered: 0,
        averageMastery: 0
      };
    }
    
    byType[card.type].total++;
    if (card.mastery >= 80) {
      byType[card.type].mastered++;
    }
    byType[card.type].averageMastery += card.mastery;
  });

  Object.keys(byType).forEach(type => {
    byType[type].averageMastery = Math.round(
      (byType[type].averageMastery / byType[type].total) * 100
    ) / 100;
  });

  return {
    cards: cardProgress,
    summary: {
      totalCards: cardProgress.length,
      newCards: cardProgress.filter(card => card.status === 'new').length,
      dueCards: cardProgress.filter(card => card.status === 'due').length,
      masteredCards: cardProgress.filter(card => card.mastery >= 80).length,
      averageMastery: Math.round(
        cardProgress.reduce((sum, card) => sum + card.mastery, 0) / cardProgress.length * 100
      ) / 100
    },
    byType
  };
};

const _generateExamplesForCard = async (card) => {
  try {
    const examples = await LLaMAService.generatePracticeQuestions(
      card.front,
      'medium',
      2,
      'mcq'
    );
    return { examples };
  } catch (error) {
    return { examples: [], error: error.message };
  }
};

const _generateMnemonicForCard = async (card) => {
  try {
    const mnemonics = await FlashcardsGenerator._generateMnemonics(card.front, 1);
    return { mnemonic: mnemonics[0] };
  } catch (error) {
    return { mnemonic: null, error: error.message };
  }
};

const _generateDetailedExplanation = async (card) => {
  try {
    const explanation = await LLaMAService.generateExplanation(
      card.front,
      'medium',
      'general',
      'en'
    );
    return { explanation };
  } catch (error) {
    return { explanation: null, error: error.message };
  }
};

// Routes

/**
 * @route   POST /api/flashcards/generate
 * @desc    Generate AI-powered flashcards for a topic
 * @access  Private
 */
router.post(
  '/generate',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validateBody('flashcard.generate'),
  ErrorHandler.catchAsync(async (req, res) => {
    const { topic, count, types, difficulty } = req.validatedBody;

    // Check cache for existing generated flashcards
    const cacheKey = `flashcards:${topic}:${count}:${types.join(',')}:${difficulty}`;
    const cachedFlashcards = cache.flashcard.get(topic, types);
    
    if (cachedFlashcards) {
      logger.debug('Flashcards retrieved from cache', { topic, count, userId: req.user._id });
      return Response.sendSuccess(res, { flashcardSet: cachedFlashcards }, 'Flashcards generated successfully');
    }

    // Generate flashcards using AI
    const flashcardSet = await FlashcardsGenerator.generateFlashcards(
      topic,
      count,
      types,
      difficulty
    );

    // Save flashcard set to database
    const savedSet = await FlashcardSet.create({
      ...flashcardSet,
      studentId: req.user._id,
      isAIGenerated: true,
      metadata: {
        ...flashcardSet.metadata,
        generatedWith: 'AI',
        studentLevel: difficulty
      }
    });

    // Initialize progress tracking
    await FlashcardProgress.create({
      studentId: req.user._id,
      setId: savedSet._id,
      flashcards: flashcardSet.flashcards.map(card => ({
        flashcardId: card.id,
        reviewHistory: []
      })),
      overallMastery: 0,
      totalReviews: 0,
      lastReviewed: new Date()
    });

    // Cache the generated flashcards
    cache.flashcard.set(topic, types, flashcardSet, 7200);

    logger.info('Flashcards generated', {
      setId: savedSet._id,
      topic,
      cardCount: count,
      types,
      userId: req.user._id
    });

    Response.sendSuccess(res, { flashcardSet: savedSet }, 'Flashcards generated successfully');
  })
);

/**
 * @route   POST /api/flashcards/sets
 * @desc    Create a custom flashcard set
 * @access  Private
 */
router.post(
  '/sets',
  AuthMiddleware.authenticate,
  ErrorHandler.catchAsync(async (req, res) => {
    const { title, description, topic, flashcards, tags = [], isPublic = false } = req.body;

    if (!title || !topic || !flashcards || !Array.isArray(flashcards)) {
      return Response.sendError(res, 'Title, topic, and flashcards array are required', 'MISSING_FIELDS', null, 400);
    }

    // Validate flashcards structure
    const validatedFlashcards = flashcards.map((card, index) => {
      if (!card.front || !card.back) {
        throw new Error(`Flashcard at index ${index} must have front and back`);
      }
      return {
        id: card.id || `card_${Date.now()}_${index}`,
        front: card.front,
        back: card.back,
        type: card.type || 'concept',
        difficulty: card.difficulty || 'medium',
        tags: card.tags || [],
        metadata: card.metadata || {}
      };
    });

    const flashcardSet = await FlashcardSet.create({
      title,
      description,
      topic,
      flashcards: validatedFlashcards,
      tags,
      isPublic,
      studentId: req.user._id,
      totalCards: validatedFlashcards.length,
      estimatedStudyTime: FlashcardsGenerator._calculateStudyTime(validatedFlashcards.length),
      isAIGenerated: false,
      metadata: {
        createdManually: true,
        source: 'user_created'
      }
    });

    // Initialize progress tracking
    await FlashcardProgress.create({
      studentId: req.user._id,
      setId: flashcardSet._id,
      flashcards: validatedFlashcards.map(card => ({
        flashcardId: card.id,
        reviewHistory: []
      })),
      overallMastery: 0,
      totalReviews: 0,
      lastReviewed: new Date()
    });

    logger.info('Custom flashcard set created', {
      setId: flashcardSet._id,
      title,
      cardCount: validatedFlashcards.length,
      userId: req.user._id
    });

    Response.sendCreated(res, { flashcardSet }, 'Flashcard set created successfully');
  })
);

/**
 * @route   GET /api/flashcards/sets
 * @desc    Get user's flashcard sets with pagination
 * @access  Private
 */
router.get(
  '/sets',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validateQuery('query.pagination'),
  ValidationMiddleware.validatePagination,
  ErrorHandler.catchAsync(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const filter = { studentId: req.user._id };

    // Apply filters
    if (req.query.topic) {
      filter.topic = new RegExp(req.query.topic, 'i');
    }
    if (req.query.tags) {
      filter.tags = { $in: req.query.tags.split(',') };
    }
    if (req.query.isAIGenerated !== undefined) {
      filter.isAIGenerated = req.query.isAIGenerated === 'true';
    }

    // Build sort
    let sort = { createdAt: -1 };
    if (req.query.sort) {
      const [field, order] = req.query.sort.split(':');
      sort = { [field]: order === 'asc' ? 1 : -1 };
    }

    const [sets, total] = await Promise.all([
      FlashcardSet.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select('-flashcards')
        .lean(),
      FlashcardSet.countDocuments(filter)
    ]);

    // Get progress for each set
    const setsWithProgress = await Promise.all(
      sets.map(async (set) => {
        const progress = await FlashcardProgress.findOne({
          studentId: req.user._id,
          setId: set._id
        }).select('overallMastery totalReviews lastReviewed');

        return {
          ...set,
          progress: progress || {
            overallMastery: 0,
            totalReviews: 0,
            lastReviewed: null
          }
        };
      })
    );

    const pagination = {
      currentPage: page,
      pageSize: limit,
      totalItems: total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrevious: page > 1
    };

    logger.debug('Flashcard sets retrieved', {
      count: sets.length,
      userId: req.user._id
    });

    Response.sendPagination(res, { sets: setsWithProgress }, pagination, 'Flashcard sets retrieved successfully');
  })
);

/**
 * @route   GET /api/flashcards/sets/:setId
 * @desc    Get detailed flashcard set with cards
 * @access  Private
 */
router.get(
  '/sets/:setId',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validateObjectId('setId'),
  ErrorHandler.catchAsync(async (req, res) => {
    const { setId } = req.params;

    const flashcardSet = await FlashcardSet.findOne({
      _id: setId,
      $or: [
        { studentId: req.user._id },
        { isPublic: true }
      ]
    });

    if (!flashcardSet) {
      return Response.sendError(res, 'Flashcard set not found', 'SET_NOT_FOUND', null, 404);
    }

    // Get progress data
    const progress = await FlashcardProgress.findOne({
      studentId: req.user._id,
      setId: setId
    });

    // Calculate session statistics
    const sessionStats = _calculateSessionStats(progress);

    logger.debug('Flashcard set details retrieved', {
      setId,
      cardCount: flashcardSet.flashcards.length,
      userId: req.user._id
    });

    Response.sendSuccess(res, {
      flashcardSet: {
        ...flashcardSet.toObject(),
        progress: progress || {
          overallMastery: 0,
          totalReviews: 0,
          lastReviewed: null
        },
        sessionStats
      }
    }, 'Flashcard set retrieved successfully');
  })
);

/**
 * @route   PUT /api/flashcards/sets/:setId
 * @desc    Update flashcard set
 * @access  Private
 */
router.put(
  '/sets/:setId',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validateObjectId('setId'),
  ErrorHandler.catchAsync(async (req, res) => {
    const { setId } = req.params;
    const updates = req.body;

    const flashcardSet = await FlashcardSet.findOne({
      _id: setId,
      studentId: req.user._id
    });

    if (!flashcardSet) {
      return Response.sendError(res, 'Flashcard set not found', 'SET_NOT_FOUND', null, 404);
    }

    // Allowed updates for manual sets
    const allowedUpdates = ['title', 'description', 'tags', 'isPublic'];
    const updateData = {};
    
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    });

    // Handle flashcards updates for manual sets
    if (updates.flashcards && !flashcardSet.isAIGenerated) {
      updateData.flashcards = updates.flashcards.map((card, index) => ({
        id: card.id || `card_${Date.now()}_${index}`,
        front: card.front,
        back: card.back,
        type: card.type || 'concept',
        difficulty: card.difficulty || 'medium',
        tags: card.tags || [],
        metadata: card.metadata || {}
      }));
      updateData.totalCards = updateData.flashcards.length;
      updateData.estimatedStudyTime = FlashcardsGenerator._calculateStudyTime(updateData.flashcards.length);
    }

    if (Object.keys(updateData).length === 0) {
      return Response.sendError(res, 'No valid fields to update', 'NO_VALID_UPDATES', null, 400);
    }

    const updatedSet = await FlashcardSet.findByIdAndUpdate(
      setId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    logger.info('Flashcard set updated', {
      setId,
      updates: Object.keys(updateData),
      userId: req.user._id
    });

    Response.sendSuccess(res, { flashcardSet: updatedSet }, 'Flashcard set updated successfully');
  })
);

/**
 * @route   DELETE /api/flashcards/sets/:setId
 * @desc    Delete flashcard set
 * @access  Private
 */
router.delete(
  '/sets/:setId',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validateObjectId('setId'),
  ErrorHandler.catchAsync(async (req, res) => {
    const { setId } = req.params;

    const flashcardSet = await FlashcardSet.findOne({
      _id: setId,
      studentId: req.user._id
    });

    if (!flashcardSet) {
      return Response.sendError(res, 'Flashcard set not found', 'SET_NOT_FOUND', null, 404);
    }

    // Delete the set and its progress
    await Promise.all([
      FlashcardSet.findByIdAndDelete(setId),
      FlashcardProgress.deleteOne({ setId, studentId: req.user._id })
    ]);

    logger.info('Flashcard set deleted', {
      setId,
      title: flashcardSet.title,
      userId: req.user._id
    });

    Response.sendSuccess(res, null, 'Flashcard set deleted successfully');
  })
);

/**
 * @route   POST /api/flashcards/sets/:setId/review
 * @desc    Submit flashcard review session
 * @access  Private
 */
router.post(
  '/sets/:setId/review',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validateObjectId('setId'),
  ValidationMiddleware.validateBody('flashcard.review'),
  ErrorHandler.catchAsync(async (req, res) => {
    const { setId } = req.params;
    const { flashcardId, performance, timeSpent } = req.validatedBody;

    // Find flashcard set and progress
    const [flashcardSet, progress] = await Promise.all([
      FlashcardSet.findOne({ _id: setId }),
      FlashcardProgress.findOne({
        studentId: req.user._id,
        setId: setId
      })
    ]);

    if (!flashcardSet) {
      return Response.sendError(res, 'Flashcard set not found', 'SET_NOT_FOUND', null, 404);
    }

    if (!progress) {
      return Response.sendError(res, 'Progress record not found', 'PROGRESS_NOT_FOUND', null, 404);
    }

    // Find the specific flashcard in progress
    const flashcardProgress = progress.flashcards.find(
      card => card.flashcardId === flashcardId
    );

    if (!flashcardProgress) {
      return Response.sendError(res, 'Flashcard not found in set', 'FLASHCARD_NOT_FOUND', null, 404);
    }

    // Calculate next review using spaced repetition
    const nextReview = FlashcardsGenerator.calculateNextReview(
      flashcardProgress,
      performance
    );

    // Update flashcard progress
    flashcardProgress.reviewHistory.push(nextReview);
    flashcardProgress.lastReviewed = new Date();
    flashcardProgress.totalReviews = flashcardProgress.reviewHistory.length;

    // Update overall progress
    progress.totalReviews++;
    progress.lastReviewed = new Date();
    progress.overallMastery = FlashcardsGenerator.calculateMasteryScore(
      progress.flashcards.flatMap(card => card.reviewHistory)
    );

    await progress.save();

    logger.debug('Flashcard review submitted', {
      setId,
      flashcardId,
      performance,
      nextReview: nextReview.interval,
      userId: req.user._id
    });

    Response.sendSuccess(res, {
      review: nextReview,
      overallMastery: progress.overallMastery
    }, 'Review submitted successfully');
  })
);

/**
 * @route   GET /api/flashcards/sets/:setId/review-session
 * @desc    Get flashcards for review session (spaced repetition)
 * @access  Private
 */
router.get(
  '/sets/:setId/review-session',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validateObjectId('setId'),
  ErrorHandler.catchAsync(async (req, res) => {
    const { setId } = req.params;
    const { limit = 20, mode = 'spaced' } = req.query;

    const [flashcardSet, progress] = await Promise.all([
      FlashcardSet.findOne({ _id: setId }),
      FlashcardProgress.findOne({
        studentId: req.user._id,
        setId: setId
      })
    ]);

    if (!flashcardSet) {
      return Response.sendError(res, 'Flashcard set not found', 'SET_NOT_FOUND', null, 404);
    }

    let flashcardsToReview = [];

    if (mode === 'spaced' && progress) {
      // Spaced repetition: get cards due for review
      flashcardsToReview = _getDueFlashcards(flashcardSet, progress, parseInt(limit));
    } else {
      // Default: get all cards or random selection
      const allFlashcards = flashcardSet.flashcards;
      flashcardsToReview = _shuffleArray(allFlashcards)
        .slice(0, parseInt(limit))
        .map(card => ({
          ...card,
          isNew: !progress?.flashcards.some(p => p.flashcardId === card.id)
        }));
    }

    // If no cards due for review, suggest new cards
    if (flashcardsToReview.length === 0 && progress) {
      const newCards = _getNewFlashcards(flashcardSet, progress, parseInt(limit));
      flashcardsToReview = newCards.map(card => ({
        ...card,
        isNew: true
      }));
    }

    const sessionInfo = {
      sessionId: `session_${Date.now()}`,
      totalCards: flashcardsToReview.length,
      mode,
      estimatedDuration: FlashcardsGenerator._calculateStudyTime(flashcardsToReview.length),
      containsNewCards: flashcardsToReview.some(card => card.isNew)
    };

    logger.debug('Review session prepared', {
      setId,
      cardCount: flashcardsToReview.length,
      mode,
      userId: req.user._id
    });

    Response.sendSuccess(res, {
      session: sessionInfo,
      flashcards: flashcardsToReview
    }, 'Review session prepared successfully');
  })
);

/**
 * @route   POST /api/flashcards/sets/:setId/batch-review
 * @desc    Submit batch review session
 * @access  Private
 */
router.post(
  '/sets/:setId/batch-review',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validateObjectId('setId'),
  ErrorHandler.catchAsync(async (req, res) => {
    const { setId } = req.params;
    const { reviews, sessionDuration } = req.body;

    if (!Array.isArray(reviews)) {
      return Response.sendError(res, 'Reviews must be an array', 'INVALID_REVIEWS', null, 400);
    }

    const [flashcardSet, progress] = await Promise.all([
      FlashcardSet.findOne({ _id: setId }),
      FlashcardProgress.findOne({
        studentId: req.user._id,
        setId: setId
      })
    ]);

    if (!flashcardSet) {
      return Response.sendError(res, 'Flashcard set not found', 'SET_NOT_FOUND', null, 404);
    }

    if (!progress) {
      return Response.sendError(res, 'Progress record not found', 'PROGRESS_NOT_FOUND', null, 404);
    }

    // Process each review
    const reviewResults = [];
    let totalPerformance = 0;

    for (const review of reviews) {
      const { flashcardId, performance, timeSpent } = review;
      
      const flashcardProgress = progress.flashcards.find(
        card => card.flashcardId === flashcardId
      );

      if (flashcardProgress) {
        const nextReview = FlashcardsGenerator.calculateNextReview(
          flashcardProgress,
          performance
        );

        flashcardProgress.reviewHistory.push(nextReview);
        flashcardProgress.lastReviewed = new Date();
        flashcardProgress.totalReviews = flashcardProgress.reviewHistory.length;

        reviewResults.push({
          flashcardId,
          nextReview: nextReview.interval,
          performance
        });

        totalPerformance += performance;
      }
    }

    // Update overall progress
    progress.totalReviews += reviews.length;
    progress.lastReviewed = new Date();
    progress.overallMastery = FlashcardsGenerator.calculateMasteryScore(
      progress.flashcards.flatMap(card => card.reviewHistory)
    );

    await progress.save();

    const sessionStats = {
      totalCards: reviews.length,
      averagePerformance: totalPerformance / reviews.length,
      sessionDuration,
      masteryGain: progress.overallMastery - (progress.overallMastery - (totalPerformance / reviews.length) * 10)
    };

    logger.info('Batch review submitted', {
      setId,
      reviewCount: reviews.length,
      averagePerformance: sessionStats.averagePerformance,
      userId: req.user._id
    });

    Response.sendSuccess(res, {
      sessionStats,
      reviewResults,
      overallMastery: progress.overallMastery
    }, 'Batch review submitted successfully');
  })
);

/**
 * @route   GET /api/flashcards/progress/overview
 * @desc    Get overall flashcard progress overview
 * @access  Private
 */
router.get(
  '/progress/overview',
  AuthMiddleware.authenticate,
  ErrorHandler.catchAsync(async (req, res) => {
    const progressData = await FlashcardProgress.aggregate([
      { $match: { studentId: req.user._id } },
      {
        $lookup: {
          from: 'flashcardsets',
          localField: 'setId',
          foreignField: '_id',
          as: 'setInfo'
        }
      },
      { $unwind: '$setInfo' },
      {
        $group: {
          _id: null,
          totalSets: { $sum: 1 },
          totalReviews: { $sum: '$totalReviews' },
          averageMastery: { $avg: '$overallMastery' },
          totalFlashcards: { $sum: { $size: '$setInfo.flashcards' } },
          byTopic: {
            $push: {
              topic: '$setInfo.topic',
              mastery: '$overallMastery',
              reviews: '$totalReviews'
            }
          },
          recentActivity: {
            $push: {
              setId: '$setId',
              topic: '$setInfo.topic',
              lastReviewed: '$lastReviewed',
              mastery: '$overallMastery'
            }
          }
        }
      },
      {
        $project: {
          totalSets: 1,
          totalReviews: 1,
          averageMastery: { $round: ['$averageMastery', 2] },
          totalFlashcards: 1,
          topics: {
            $arrayToObject: {
              $map: {
                input: { $setUnion: '$byTopic.topic' },
                as: 'topic',
                in: {
                  k: '$$topic',
                  v: {
                    averageMastery: {
                      $round: [
                        {
                          $avg: {
                            $map: {
                              input: {
                                $filter: {
                                  input: '$byTopic',
                                  as: 't',
                                  cond: { $eq: ['$$t.topic', '$$topic'] }
                                }
                              },
                              as: 't',
                              in: '$$t.mastery'
                            }
                          }
                        },
                        2
                      ]
                    },
                    totalReviews: {
                      $sum: {
                        $map: {
                          input: {
                            $filter: {
                              input: '$byTopic',
                              as: 't',
                              cond: { $eq: ['$$t.topic', '$$topic'] }
                            }
                          },
                          as: 't',
                          in: '$$t.reviews'
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          recentActivity: { $slice: [{ $sortArray: { input: '$recentActivity', sortBy: { lastReviewed: -1 } } }, 5] }
        }
      }
    ]);

    const overview = progressData[0] || {
      totalSets: 0,
      totalReviews: 0,
      averageMastery: 0,
      totalFlashcards: 0,
      topics: {},
      recentActivity: []
    };

    // Calculate streak
    const streak = await _calculateReviewStreak(req.user._id);

    logger.debug('Flashcard progress overview retrieved', { userId: req.user._id });

    Response.sendSuccess(res, {
      overview: {
        ...overview,
        currentStreak: streak
      }
    }, 'Progress overview retrieved successfully');
  })
);

/**
 * @route   GET /api/flashcards/sets/:setId/progress
 * @desc    Get detailed progress for a specific set
 * @access  Private
 */
router.get(
  '/sets/:setId/progress',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validateObjectId('setId'),
  ErrorHandler.catchAsync(async (req, res) => {
    const { setId } = req.params;

    const [flashcardSet, progress] = await Promise.all([
      FlashcardSet.findOne({ _id: setId }),
      FlashcardProgress.findOne({
        studentId: req.user._id,
        setId: setId
      })
    ]);

    if (!flashcardSet) {
      return Response.sendError(res, 'Flashcard set not found', 'SET_NOT_FOUND', null, 404);
    }

    if (!progress) {
      return Response.sendError(res, 'Progress not found', 'PROGRESS_NOT_FOUND', null, 404);
    }

    // Calculate detailed statistics
    const detailedProgress = _calculateDetailedProgress(flashcardSet, progress);

    logger.debug('Detailed progress retrieved', {
      setId,
      userId: req.user._id
    });

    Response.sendSuccess(res, {
      progress: detailedProgress
    }, 'Detailed progress retrieved successfully');
  })
);

/**
 * @route   POST /api/flashcards/ai-enhance
 * @desc    Enhance existing flashcards with AI-generated content
 * @access  Private
 */
router.post(
  '/ai-enhance',
  AuthMiddleware.authenticate,
  ErrorHandler.catchAsync(async (req, res) => {
    const { setId, enhancementType = 'examples' } = req.body;

    if (!setId) {
      return Response.sendError(res, 'Set ID is required', 'SET_ID_REQUIRED', null, 400);
    }

    const flashcardSet = await FlashcardSet.findOne({
      _id: setId,
      studentId: req.user._id
    });

    if (!flashcardSet) {
      return Response.sendError(res, 'Flashcard set not found', 'SET_NOT_FOUND', null, 404);
    }

    const enhancedFlashcards = [];

    // Enhance each flashcard with AI
    for (const card of flashcardSet.flashcards) {
      let enhancedContent = {};

      switch (enhancementType) {
        case 'examples':
          enhancedContent = await _generateExamplesForCard(card);
          break;
        case 'mnemonics':
          enhancedContent = await _generateMnemonicForCard(card);
          break;
        case 'explanations':
          enhancedContent = await _generateDetailedExplanation(card);
          break;
        default:
          enhancedContent = { error: 'Unsupported enhancement type' };
      }

      enhancedFlashcards.push({
        originalCard: card,
        enhancedContent
      });
    }

    logger.info('Flashcards enhanced with AI', {
      setId,
      enhancementType,
      cardCount: enhancedFlashcards.length,
      userId: req.user._id
    });

    Response.sendSuccess(res, {
      enhancedFlashcards,
      enhancementType
    }, 'Flashcards enhanced successfully');
  })
);

module.exports = router;