// services/adaptive-tutor.js
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

class AdaptiveTutor {
  constructor() {
    this.learningRate = 0.15;
    this.masteryThreshold = 0.75;
    this.weaknessThreshold = 0.5;
  }

  async analyzeStudentProgress(studentId, timeframe = '30 days') {
    try {
      const startDate = this._calculateStartDate(timeframe);
      
      const [progress, tests, studySessions] = await Promise.all([
        mongoose.model('Progress').find({
          studentId,
          createdAt: { $gte: startDate }
        }),
        mongoose.model('Test').find({
          studentId,
          submittedAt: { $gte: startDate }
        }),
        mongoose.model('StudySession').find({
          studentId,
          date: { $gte: startDate }
        })
      ]);

      const analysis = {
        studentId,
        timeframe,
        overallPerformance: this._calculateOverallPerformance(progress, tests),
        topicMastery: this._calculateTopicMastery(progress),
        learningPattern: this._identifyLearningPattern(tests, studySessions),
        studyHabits: this._analyzeStudyHabits(studySessions),
        growthTrajectory: this._calculateGrowthTrajectory(tests),
        recommendedActions: [],
        confidenceScore: this._calculateConfidenceScore(progress, tests)
      };

      analysis.recommendedActions = this._generatePersonalizedRecommendations(analysis);
      analysis.learningPath = this._generateLearningPath(analysis);

      return analysis;
    } catch (error) {
      console.error('Progress Analysis Error:', error);
      throw new Error('Failed to analyze student progress');
    }
  }

  async createPersonalizedStudyPlan(studentId, examType, timeframe = '30 days', dailyStudyHours = 2) {
    const analysis = await this.analyzeStudentProgress(studentId, timeframe);
    const syllabus = this._getExamSyllabus(examType);
    const currentLevel = this._assessCurrentLevel(analysis.overallPerformance.accuracy);

    const studyPlan = {
      planId: uuidv4(),
      studentId,
      examType,
      timeframe,
      startDate: new Date(),
      endDate: new Date(Date.now() + (parseInt(timeframe) * 24 * 60 * 60 * 1000)),
      currentLevel,
      targetLevel: this._getTargetLevel(examType),
      dailyStudyHours,
      totalStudyHours: parseInt(timeframe) * dailyStudyHours,
      focusAreas: analysis.topicMastery.weakAreas.slice(0, 4),
      reinforcementAreas: analysis.topicMastery.strongAreas.slice(0, 2),
      dailyGoals: [],
      weeklyMilestones: [],
      practiceSchedule: {},
      resourceRecommendations: this._getResourceRecommendations(examType, currentLevel)
    };

    studyPlan.dailyGoals = this._generateDailyStudyGoals(studyPlan, syllabus, analysis);
    studyPlan.weeklyMilestones = this._generateWeeklyMilestones(studyPlan);
    studyPlan.practiceSchedule = this._createPracticeSchedule(studyPlan, analysis);

    // Save study plan
    await mongoose.model('StudyPlan').findOneAndUpdate(
      { studentId, examType, active: true },
      { ...studyPlan, active: true },
      { upsert: true, new: true }
    );

    return studyPlan;
  }

  async adjustTestDifficulty(studentId, baseDifficulty, topic, examType) {
    const recentProgress = await mongoose.model('Progress').find({
      studentId,
      topic,
      examType,
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    }).sort({ createdAt: -1 }).limit(10);

    if (recentProgress.length === 0) return baseDifficulty;

    const averagePerformance = recentProgress.reduce((sum, p) => {
      return sum + (p.correctAnswers / p.totalQuestions);
    }, 0) / recentProgress.length;

    return this._calculateAdjustedDifficulty(baseDifficulty, averagePerformance, topic);
  }

  async generatePersonalizedPracticeSet(studentId, topic, difficulty, questionCount = 10) {
    const analysis = await this.analyzeStudentProgress(studentId, '7 days');
    const weakSubtopics = this._identifyWeakSubtopics(analysis, topic);

    const practiceSet = {
      setId: uuidv4(),
      studentId,
      topic,
      baseDifficulty: difficulty,
      questions: [],
      learningObjectives: [],
      estimatedDuration: 0
    };

    // Mix of question types based on learning objectives
    const questionTypes = this._getOptimalQuestionTypes(topic, analysis.learningPattern);
    
    for (const subtopic of weakSubtopics.slice(0, 3)) {
      const subtopicQuestions = await this._generateSubtopicQuestions(
        topic, 
        subtopic, 
        difficulty, 
        Math.ceil(questionCount / weakSubtopics.length),
        questionTypes
      );
      practiceSet.questions.push(...subtopicQuestions);
    }

    practiceSet.learningObjectives = this._defineLearningObjectives(topic, weakSubtopics);
    practiceSet.estimatedDuration = this._calculatePracticeSetDuration(practiceSet.questions);

    return practiceSet;
  }

  async updateLearningModel(studentId, testResults) {
    try {
      const progressUpdate = {
        studentId,
        topic: testResults.topic,
        examType: testResults.examType,
        totalQuestions: testResults.totalQuestions,
        correctAnswers: testResults.correctAnswers,
        timeSpent: testResults.timeSpent,
        accuracy: testResults.accuracy,
        difficulty: testResults.difficulty,
        subtopicBreakdown: testResults.subtopicBreakdown || {}
      };

      await mongoose.model('Progress').create(progressUpdate);

      // Update student's learning profile
      await this._updateStudentProfile(studentId, testResults);

      return { success: true, message: 'Learning model updated successfully' };
    } catch (error) {
      console.error('Learning Model Update Error:', error);
      throw new Error('Failed to update learning model');
    }
  }

  _calculateOverallPerformance(progress, tests) {
    if (progress.length === 0 && tests.length === 0) {
      return {
        totalQuestions: 0,
        correctAnswers: 0,
        accuracy: 0,
        averageTimePerQuestion: 0,
        testsAttempted: 0,
        consistencyScore: 0
      };
    }

    const totalQuestions = progress.reduce((sum, p) => sum + p.totalQuestions, 0);
    const correctAnswers = progress.reduce((sum, p) => sum + p.correctAnswers, 0);
    const totalTime = progress.reduce((sum, p) => sum + (p.timeSpent || 0), 0);

    return {
      totalQuestions,
      correctAnswers,
      accuracy: totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0,
      averageTimePerQuestion: totalQuestions > 0 ? totalTime / totalQuestions : 0,
      testsAttempted: tests.length,
      consistencyScore: this._calculateConsistencyScore(progress),
      improvementRate: this._calculateImprovementRate(progress)
    };
  }

  _calculateTopicMastery(progress) {
    const topicStats = {};
    const subtopicStats = {};

    progress.forEach(p => {
      // Topic-level stats
      if (!topicStats[p.topic]) {
        topicStats[p.topic] = { total: 0, correct: 0, attempts: 0, totalTime: 0 };
      }
      topicStats[p.topic].total += p.totalQuestions;
      topicStats[p.topic].correct += p.correctAnswers;
      topicStats[p.topic].attempts++;
      topicStats[p.topic].totalTime += p.timeSpent || 0;

      // Subtopic-level stats
      if (p.subtopicBreakdown) {
        Object.entries(p.subtopicBreakdown).forEach(([subtopic, stats]) => {
          if (!subtopicStats[subtopic]) {
            subtopicStats[subtopic] = { total: 0, correct: 0, topic: p.topic };
          }
          subtopicStats[subtopic].total += stats.total || 0;
          subtopicStats[subtopic].correct += stats.correct || 0;
        });
      }
    });

    const topicMastery = {};
    Object.keys(topicStats).forEach(topic => {
      const stats = topicStats[topic];
      const accuracy = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
      
      topicMastery[topic] = {
        masteryLevel: accuracy,
        totalAttempts: stats.attempts,
        averageTime: stats.total / stats.attempts,
        efficiency: accuracy / (stats.totalTime / stats.total || 1),
        recommendation: this._getTopicRecommendation(accuracy),
        confidence: this._calculateTopicConfidence(stats.attempts, accuracy),
        lastPracticed: this._getLastPracticedDate(progress, topic)
      };
    });

    const weakSubtopics = Object.entries(subtopicStats)
      .filter(([_, stats]) => (stats.correct / stats.total) * 100 < 60)
      .map(([subtopic, stats]) => ({
        subtopic,
        topic: stats.topic,
        accuracy: (stats.correct / stats.total) * 100,
        priority: 'high'
      }));

    return {
      detailed: topicMastery,
      weakAreas: Object.keys(topicMastery).filter(t => topicMastery[t].masteryLevel < 60),
      strongAreas: Object.keys(topicMastery).filter(t => topicMastery[t].masteryLevel >= 75),
      weakSubtopics: weakSubtopics.slice(0, 10),
      overallMasteryScore: this._calculateOverallMasteryScore(topicMastery)
    };
  }

  _identifyLearningPattern(tests, studySessions) {
    const patterns = {
      consistency: this._analyzeConsistency(studySessions),
      performanceTrend: this._analyzePerformanceTrend(tests),
      peakStudyTimes: this._identifyPeakStudyTimes(studySessions),
      retentionRate: this._calculateRetentionRate(tests),
      learningVelocity: this._calculateLearningVelocity(tests)
    };

    return {
      ...patterns,
      learningType: this._determineLearningType(patterns),
      optimalStudyDuration: this._calculateOptimalStudyDuration(studySessions)
    };
  }

  _generatePersonalizedRecommendations(analysis) {
    const recommendations = [];

    // Performance-based recommendations
    if (analysis.overallPerformance.accuracy < 50) {
      recommendations.push({
        type: 'foundation_building',
        priority: 'high',
        title: 'Strengthen Foundation',
        description: 'Focus on understanding basic concepts before moving to advanced topics',
        actions: [
          'Review fundamental concepts daily',
          'Practice basic problems with detailed explanations',
          'Use flashcards for key concepts'
        ],
        expectedImpact: 'high'
      });
    }

    // Time management recommendations
    if (analysis.overallPerformance.averageTimePerQuestion > 120) {
      recommendations.push({
        type: 'time_optimization',
        priority: 'medium',
        title: 'Improve Speed',
        description: 'Work on solving questions faster while maintaining accuracy',
        actions: [
          'Practice with timed quizzes',
          'Learn shortcut methods',
          'Focus on question recognition patterns'
        ],
        expectedImpact: 'medium'
      });
    }

    // Study habit recommendations
    if (analysis.studyHabits.consistencyScore < 60) {
      recommendations.push({
        type: 'study_consistency',
        priority: 'high',
        title: 'Establish Routine',
        description: 'Regular study schedule improves long-term retention',
        actions: [
          'Set fixed study times daily',
          'Use Pomodoro technique (25min study, 5min break)',
          'Track daily progress'
        ],
        expectedImpact: 'high'
      });
    }

    // Weak area recommendations
    analysis.topicMastery.weakAreas.forEach((area, index) => {
      recommendations.push({
        type: 'focused_practice',
        priority: index < 2 ? 'high' : 'medium',
        title: `Improve ${area}`,
        description: `Targeted practice needed for ${area}`,
        actions: [
          `Dedicate 30% of study time to ${area}`,
          `Practice ${area} questions daily`,
          `Review ${area} concepts with AI tutor`
        ],
        expectedImpact: 'high'
      });
    });

    return recommendations.slice(0, 6); // Top 6 recommendations
  }

  _generateLearningPath(analysis) {
    const path = {
      phases: [],
      estimatedCompletion: '',
      milestones: []
    };

    const currentLevel = analysis.overallPerformance.accuracy;
    
    if (currentLevel < 40) {
      path.phases = [
        {
          phase: 'Foundation',
          duration: '2-3 weeks',
          focus: 'Basic concepts and terminology',
          activities: ['Concept learning', 'Basic problems', 'Flashcards']
        },
        {
          phase: 'Practice',
          duration: '3-4 weeks', 
          focus: 'Application and problem solving',
          activities: ['Mixed practice', 'Timed quizzes', 'Error analysis']
        },
        {
          phase: 'Mastery',
          duration: '2-3 weeks',
          focus: 'Advanced topics and speed',
          activities: ['Advanced problems', 'Mock tests', 'Revision']
        }
      ];
    } else if (currentLevel < 70) {
      path.phases = [
        {
          phase: 'Practice',
          duration: '3-4 weeks',
          focus: 'Application and weak areas',
          activities: ['Focused practice', 'Concept reinforcement', 'Speed training']
        },
        {
          phase: 'Mastery', 
          duration: '3-4 weeks',
          focus: 'Advanced topics and test strategy',
          activities: ['Advanced problems', 'Full tests', 'Strategy development']
        }
      ];
    } else {
      path.phases = [
        {
          phase: 'Refinement',
          duration: '2-3 weeks',
          focus: 'Fine-tuning and speed',
          activities: ['Advanced problems', 'Speed drills', 'Test simulations']
        }
      ];
    }

    path.estimatedCompletion = path.phases.reduce((total, phase) => {
      const weeks = parseInt(phase.duration);
      return total + (isNaN(weeks) ? 3 : weeks);
    }, 0) + ' weeks';

    return path;
  }

  // Helper methods
  _calculateStartDate(timeframe) {
    const days = parseInt(timeframe);
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }

  _calculateConsistencyScore(progress) {
    if (progress.length < 2) return 0;
    
    const dates = progress.map(p => new Date(p.createdAt).toDateString());
    const uniqueDays = new Set(dates).size;
    const totalDays = Math.min(30, progress.length); // Cap at 30 days
    
    return (uniqueDays / totalDays) * 100;
  }

  _calculateImprovementRate(progress) {
    if (progress.length < 2) return 0;
    
    const sortedProgress = progress.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const firstAccuracy = sortedProgress[0].correctAnswers / sortedProgress[0].totalQuestions;
    const lastAccuracy = sortedProgress[sortedProgress.length - 1].correctAnswers / sortedProgress[sortedProgress.length - 1].totalQuestions;
    
    return ((lastAccuracy - firstAccuracy) / firstAccuracy) * 100;
  }

  _calculateTopicConfidence(attempts, accuracy) {
    const attemptWeight = Math.min(attempts / 10, 1); // Cap at 10 attempts
    const accuracyWeight = accuracy / 100;
    return (attemptWeight * 0.4 + accuracyWeight * 0.6) * 100;
  }

  _getExamSyllabus(examType) {
    const syllabi = {
      'NEET': [
        { subject: 'Biology', topics: ['Diversity in Living World', 'Structural Organization', 'Cell Structure', 'Plant Physiology', 'Human Physiology'] },
        { subject: 'Chemistry', topics: ['Basic Concepts', 'Structure of Atom', 'Classification', 'Chemical Bonding', 'Organic Chemistry'] },
        { subject: 'Physics', topics: ['Physical World', 'Units and Measurements', 'Motion', 'Work, Energy, Power', 'Gravitation'] }
      ],
      'JEE': [
        { subject: 'Mathematics', topics: ['Algebra', 'Calculus', 'Coordinate Geometry', 'Trigonometry', 'Vectors'] },
        { subject: 'Physics', topics: ['Mechanics', 'Thermodynamics', 'Electromagnetism', 'Optics', 'Modern Physics'] },
        { subject: 'Chemistry', topics: ['Physical Chemistry', 'Organic Chemistry', 'Inorganic Chemistry'] }
      ],
      // Add other exam syllabi...
    };

    return syllabi[examType] || [{ subject: 'General', topics: ['Fundamentals', 'Application', 'Analysis'] }];
  }

  _assessCurrentLevel(accuracy) {
    if (accuracy >= 80) return 'Advanced';
    if (accuracy >= 60) return 'Intermediate';
    if (accuracy >= 40) return 'Beginner';
    return 'Foundation';
  }

  _getTargetLevel(examType) {
    const targetLevels = {
      'NEET': 'Advanced',
      'JEE': 'Advanced', 
      'UPSC': 'Advanced',
      'SAT': 'Intermediate',
      'GRE': 'Advanced',
      'IELTS': 'Intermediate',
      'TOEFL': 'Intermediate',
      'CODING': 'Advanced'
    };
    return targetLevels[examType] || 'Intermediate';
  }

  // Additional helper methods would be implemented here...
  _calculateAdjustedDifficulty(baseDifficulty, performance, topic) {
    const levels = ['easy', 'medium', 'hard', 'expert'];
    const currentIndex = levels.indexOf(baseDifficulty);
    
    if (performance >= 0.8 && currentIndex < levels.length - 1) {
      return levels[currentIndex + 1];
    } else if (performance < 0.5 && currentIndex > 0) {
      return levels[currentIndex - 1];
    }
    
    return baseDifficulty;
  }

  _getOptimalQuestionTypes(topic, learningPattern) {
    // Determine best question types based on topic and learning pattern
    const baseTypes = ['mcq', 'truefalse', 'short'];
    
    if (learningPattern.learningType === 'visual') {
      return [...baseTypes, 'diagram'];
    } else if (learningPattern.learningType === 'analytical') {
      return [...baseTypes, 'descriptive', 'problem_solving'];
    }
    
    return baseTypes;
  }
}

module.exports = new AdaptiveTutor();