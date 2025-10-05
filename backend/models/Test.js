// models/Test.js
const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionId: {
    type: String,
    required: true
  },
  selectedAnswer: {
    type: mongoose.Schema.Types.Mixed
  },
  timeSpent: {
    type: Number, // in seconds
    default: 0
  },
  isCorrect: {
    type: Boolean
  },
  confidence: {
    type: String,
    enum: ['low', 'medium', 'high']
  },
  reviewed: {
    type: Boolean,
    default: false
  }
});

const testSchema = new mongoose.Schema({
  testId: {
    type: String,
    required: true,
    unique: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    maxlength: 200
  },
  examType: {
    type: String,
    required: true,
    enum: ['NEET', 'JEE', 'UPSC', 'SAT', 'GRE', 'IELTS', 'TOEFL', 'CODING']
  },
  subjects: [{
    type: String,
    required: true
  }],
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard', 'mixed', 'adaptive'],
    default: 'medium'
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  duration: {
    type: Number, // in minutes
    required: true
  },
  questions: [{
    id: String,
    question: String,
    type: String,
    options: [{
      id: String,
      text: String
    }],
    topic: String,
    subject: String,
    difficulty: String,
    timeLimit: Number,
    marks: Number,
    negativeMarks: Number
  }],
  userAnswers: [answerSchema],
  score: {
    type: Number,
    min: 0,
    max: 100
  },
  correctAnswers: {
    type: Number,
    default: 0
  },
  timeSpent: {
    type: Number, // in seconds
    default: 0
  },
  analytics: {
    topicPerformance: mongoose.Schema.Types.Mixed,
    difficultyPerformance: mongoose.Schema.Types.Mixed,
    cognitiveLevelPerformance: mongoose.Schema.Types.Mixed,
    timeManagement: {
      tooFast: Number,
      optimal: Number,
      tooSlow: Number,
      averageTimePerQuestion: Number
    },
    weakAreas: [String],
    strongAreas: [String],
    recommendations: [{
      type: String,
      priority: String,
      action: String
    }]
  },
  evaluation: [{
    questionId: String,
    question: String,
    userAnswer: mongoose.Schema.Types.Mixed,
    correctAnswer: mongoose.Schema.Types.Mixed,
    isCorrect: Boolean,
    explanation: String,
    topic: String,
    difficulty: String,
    timeSpent: Number,
    confidence: String
  }],
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'paused', 'abandoned', 'expired'],
    default: 'in_progress'
  },
  isSimulation: {
    type: Boolean,
    default: false
  },
  isPractice: {
    type: Boolean,
    default: false
  },
  parentTest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Test'
  },
  timeRemaining: {
    type: Number // in seconds
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
  pausedAt: Date,
  expiresAt: Date,
  metadata: {
    source: {
      type: String,
      enum: ['ai_generated', 'manual', 'curated'],
      default: 'ai_generated'
    },
    aiModel: String,
    version: String,
    tags: [String],
    instructions: String,
    passingScore: {
      type: Number,
      default: 60
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient querying
testSchema.index({ studentId: 1, createdAt: -1 });
testSchema.index({ examType: 1, status: 1 });
testSchema.index({ testId: 1 });
testSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL for expired tests
testSchema.index({ 'metadata.tags': 1 });

// Virtual for test duration in human-readable format
testSchema.virtual('durationFormatted').get(function() {
  const hours = Math.floor(this.duration / 60);
  const minutes = this.duration % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
});

// Virtual for time spent in human-readable format
testSchema.virtual('timeSpentFormatted').get(function() {
  const hours = Math.floor(this.timeSpent / 3600);
  const minutes = Math.floor((this.timeSpent % 3600) / 60);
  const seconds = this.timeSpent % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
});

// Virtual for performance category
testSchema.virtual('performanceCategory').get(function() {
  if (this.score >= 90) return 'excellent';
  if (this.score >= 75) return 'good';
  if (this.score >= 60) return 'average';
  if (this.score >= 40) return 'needs_improvement';
  return 'poor';
});

// Virtual for check if test is passed
testSchema.virtual('isPassed').get(function() {
  return this.score >= this.metadata.passingScore;
});

// Pre-save middleware to calculate score and analytics
testSchema.pre('save', function(next) {
  if (this.status === 'completed' && this.userAnswers.length > 0) {
    this._calculateScoreAndAnalytics();
  }
  next();
});

// Instance method to calculate score and analytics
testSchema.methods._calculateScoreAndAnalytics = function() {
  let totalMarks = 0;
  let obtainedMarks = 0;
  let correctCount = 0;
  
  const topicPerformance = {};
  const difficultyPerformance = {};
  const cognitivePerformance = {};
  const timeManagement = { tooFast: 0, optimal: 0, tooSlow: 0, totalTime: 0 };
  
  this.userAnswers.forEach(answer => {
    const question = this.questions.find(q => q.id === answer.questionId);
    if (!question) return;
    
    totalMarks += question.marks || 1;
    
    if (answer.isCorrect) {
      obtainedMarks += question.marks || 1;
      correctCount++;
    } else if (question.negativeMarks) {
      obtainedMarks -= question.negativeMarks;
    }
    
    // Track topic performance
    if (!topicPerformance[question.topic]) {
      topicPerformance[question.topic] = { correct: 0, total: 0 };
    }
    topicPerformance[question.topic].total++;
    if (answer.isCorrect) topicPerformance[question.topic].correct++;
    
    // Track difficulty performance
    if (!difficultyPerformance[question.difficulty]) {
      difficultyPerformance[question.difficulty] = { correct: 0, total: 0 };
    }
    difficultyPerformance[question.difficulty].total++;
    if (answer.isCorrect) difficultyPerformance[question.difficulty].correct++;
    
    // Track time management
    timeManagement.totalTime += answer.timeSpent || 0;
    const optimalTime = question.timeLimit || 60;
    
    if (answer.timeSpent < optimalTime * 0.5) {
      timeManagement.tooFast++;
    } else if (answer.timeSpent > optimalTime * 1.5) {
      timeManagement.tooSlow++;
    } else {
      timeManagement.optimal++;
    }
  });
  
  // Calculate scores
  this.correctAnswers = correctCount;
  this.score = totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0;
  
  // Calculate analytics
  timeManagement.averageTimePerQuestion = timeManagement.totalTime / this.userAnswers.length;
  
  this.analytics = {
    topicPerformance,
    difficultyPerformance,
    timeManagement,
    weakAreas: this._identifyWeakAreas(topicPerformance),
    strongAreas: this._identifyStrongAreas(topicPerformance)
  };
};

// Helper method to identify weak areas
testSchema.methods._identifyWeakAreas = function(topicPerformance) {
  return Object.entries(topicPerformance)
    .filter(([_, perf]) => (perf.correct / perf.total) < 0.6)
    .map(([topic, _]) => topic)
    .slice(0, 5);
};

// Helper method to identify strong areas
testSchema.methods._identifyStrongAreas = function(topicPerformance) {
  return Object.entries(topicPerformance)
    .filter(([_, perf]) => (perf.correct / perf.total) >= 0.8)
    .map(([topic, _]) => topic)
    .slice(0, 3);
};

// Instance method to submit answer
testSchema.methods.submitAnswer = function(questionId, selectedAnswer, timeSpent) {
  const existingAnswer = this.userAnswers.find(ans => ans.questionId === questionId);
  
  if (existingAnswer) {
    existingAnswer.selectedAnswer = selectedAnswer;
    existingAnswer.timeSpent = timeSpent;
  } else {
    this.userAnswers.push({
      questionId,
      selectedAnswer,
      timeSpent,
      reviewed: false
    });
  }
  
  // Auto-evaluate if possible
  const question = this.questions.find(q => q.id === questionId);
  if (question && question.correctAnswer !== undefined) {
    const isCorrect = this._evaluateAnswer(question, selectedAnswer);
    const answer = this.userAnswers.find(ans => ans.questionId === questionId);
    answer.isCorrect = isCorrect;
  }
};

// Helper method to evaluate answer
testSchema.methods._evaluateAnswer = function(question, userAnswer) {
  // Simple evaluation logic - can be enhanced based on question type
  if (question.type === 'mcq') {
    return userAnswer === question.correctAnswer;
  } else if (question.type === 'truefalse') {
    return userAnswer === question.correctAnswer;
  } else if (question.type === 'numerical') {
    const tolerance = 0.01;
    const correctNum = parseFloat(question.correctAnswer);
    const userNum = parseFloat(userAnswer);
    return Math.abs(correctNum - userNum) <= Math.abs(correctNum * tolerance);
  }
  return null; // Manual evaluation needed
};

// Instance method to pause test
testSchema.methods.pauseTest = function() {
  if (this.status === 'in_progress') {
    this.status = 'paused';
    this.pausedAt = new Date();
    
    // Calculate time remaining
    const elapsed = Math.floor((this.pausedAt - this.startedAt) / 1000);
    this.timeRemaining = Math.max(0, (this.duration * 60) - elapsed);
  }
};

// Instance method to resume test
testSchema.methods.resumeTest = function() {
  if (this.status === 'paused') {
    this.status = 'in_progress';
    this.pausedAt = undefined;
  }
};

// Instance method to complete test
testSchema.methods.completeTest = function() {
  if (this.status === 'in_progress' || this.status === 'paused') {
    this.status = 'completed';
    this.completedAt = new Date();
    this.timeSpent = Math.floor((this.completedAt - this.startedAt) / 1000);
    
    // Calculate final score and analytics
    this._calculateScoreAndAnalytics();
  }
};

// Static method to get user's test history
testSchema.statics.getUserTests = function(userId, filters = {}) {
  const { examType, status, limit = 10, skip = 0 } = filters;
  
  const query = { studentId: userId };
  if (examType) query.examType = examType;
  if (status) query.status = status;
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip(parseInt(skip))
    .select('-questions -userAnswers -evaluation');
};

// Static method to get test statistics
testSchema.statics.getTestStatistics = function(userId, timeframe = '30 days') {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(timeframe));
  
  return this.aggregate([
    {
      $match: {
        studentId: mongoose.Types.ObjectId(userId),
        status: 'completed',
        completedAt: { $gte: startDate }
      }
    },
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
            score: '$score'
          }
        }
      }
    },
    {
      $project: {
        totalTests: 1,
        averageScore: { $round: ['$averageScore', 2] },
        bestScore: 1,
        accuracy: {
          $round: [
            { $multiply: [{ $divide: ['$totalCorrect', '$totalQuestions'] }, 100] },
            2
          ]
        },
        averageTimePerTest: {
          $round: [{ $divide: ['$totalTimeSpent', '$totalTests'] }]
        },
        examTypeBreakdown: {
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
        }
      }
    }
  ]);
};

module.exports = mongoose.model('Test', testSchema);