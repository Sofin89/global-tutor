// models/Question.js
const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  text: {
    type: String,
    required: true,
    maxlength: 500
  },
  isCorrect: {
    type: Boolean,
    default: false
  },
  explanation: {
    type: String,
    maxlength: 1000
  }
});

const questionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: [true, 'Question text is required'],
    maxlength: 2000,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: {
      values: ['mcq', 'truefalse', 'short', 'descriptive', 'coding', 'numerical'],
      message: 'Please select a valid question type'
    }
  },
  options: [optionSchema],
  correctAnswer: {
    type: mongoose.Schema.Types.Mixed,
    required: function() {
      return this.type !== 'descriptive';
    }
  },
  correctAnswers: {
    type: [String],
    required: function() {
      return this.type === 'mcq' && this.options.filter(opt => opt.isCorrect).length > 1;
    }
  },
  explanation: {
    type: String,
    maxlength: 2000
  },
  solution: {
    steps: [{
      step: Number,
      description: String,
      formula: String,
      reasoning: String
    }],
    finalAnswer: String,
    tips: [String]
  },
  topic: {
    type: String,
    required: [true, 'Topic is required'],
    maxlength: 100
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    maxlength: 50
  },
  examType: {
    type: String,
    required: [true, 'Exam type is required'],
    enum: ['NEET', 'JEE', 'UPSC', 'SAT', 'GRE', 'IELTS', 'TOEFL', 'CODING']
  },
  difficulty: {
    type: String,
    required: true,
    enum: ['easy', 'medium', 'hard', 'expert'],
    default: 'medium'
  },
  cognitiveLevel: {
    type: String,
    enum: ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'],
    default: 'understand'
  },
  timeLimit: {
    type: Number, // in seconds
    default: 60
  },
  marks: {
    type: Number,
    default: 1
  },
  negativeMarks: {
    type: Number,
    default: 0
  },
  tags: [String],
  metadata: {
    source: {
      type: String,
      enum: ['ai_generated', 'manual', 'imported'],
      default: 'manual'
    },
    aiModel: String,
    confidence: {
      type: Number,
      min: 0,
      max: 1
    },
    language: {
      type: String,
      default: 'en'
    },
    imageUrl: String,
    diagramDescription: String,
    references: [String]
  },
  analytics: {
    timesAttempted: {
      type: Number,
      default: 0
    },
    timesCorrect: {
      type: Number,
      default: 0
    },
    averageTime: {
      type: Number,
      default: 0
    },
    difficultyRating: {
      type: Number,
      min: 1,
      max: 5
    },
    discriminationIndex: {
      type: Number,
      min: -1,
      max: 1
    }
  },
  status: {
    type: String,
    enum: ['active', 'draft', 'review', 'archived', 'deleted'],
    default: 'active'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  deletedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for efficient querying
questionSchema.index({ examType: 1, subject: 1, topic: 1 });
questionSchema.index({ difficulty: 1, cognitiveLevel: 1 });
questionSchema.index({ status: 1, createdAt: -1 });
questionSchema.index({ tags: 1 });
questionSchema.index({ 'analytics.timesAttempted': -1 });

// Text index for search functionality
questionSchema.index({
  question: 'text',
  explanation: 'text',
  topic: 'text',
  tags: 'text'
});

// Virtual for accuracy rate
questionSchema.virtual('accuracyRate').get(function() {
  if (this.analytics.timesAttempted === 0) return 0;
  return (this.analytics.timesCorrect / this.analytics.timesAttempted) * 100;
});

// Virtual for question complexity score
questionSchema.virtual('complexityScore').get(function() {
  const difficultyWeights = { easy: 1, medium: 2, hard: 3, expert: 4 };
  const cognitiveWeights = {
    remember: 1, understand: 2, apply: 3, analyze: 4, evaluate: 5, create: 6
  };
  
  return (difficultyWeights[this.difficulty] + cognitiveWeights[this.cognitiveLevel]) / 2;
});

// Pre-save middleware to update correctAnswers for multiple correct options
questionSchema.pre('save', function(next) {
  if (this.type === 'mcq' && this.options.length > 0) {
    const correctOptions = this.options.filter(opt => opt.isCorrect);
    if (correctOptions.length > 1) {
      this.correctAnswers = correctOptions.map(opt => opt.id);
    }
  }
  next();
});

// Instance method to validate answer
questionSchema.methods.validateAnswer = function(userAnswer) {
  if (this.type === 'mcq') {
    if (this.correctAnswers && this.correctAnswers.length > 1) {
      // Multiple correct answers
      const userAnswers = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
      return userAnswers.every(ans => this.correctAnswers.includes(ans)) &&
             userAnswers.length === this.correctAnswers.length;
    } else {
      // Single correct answer
      return userAnswer === this.correctAnswer;
    }
  } else if (this.type === 'truefalse') {
    return userAnswer === this.correctAnswer;
  } else if (this.type === 'numerical') {
    const tolerance = 0.01; // 1% tolerance for numerical answers
    const correctNum = parseFloat(this.correctAnswer);
    const userNum = parseFloat(userAnswer);
    return Math.abs(correctNum - userNum) <= Math.abs(correctNum * tolerance);
  }
  // For descriptive questions, manual evaluation needed
  return null;
};

// Instance method to update analytics
questionSchema.methods.updateAnalytics = function(isCorrect, timeSpent) {
  this.analytics.timesAttempted++;
  if (isCorrect) {
    this.analytics.timesCorrect++;
  }
  
  // Update average time using moving average
  this.analytics.averageTime = (
    (this.analytics.averageTime * (this.analytics.timesAttempted - 1)) + timeSpent
  ) / this.analytics.timesAttempted;
  
  // Auto-adjust difficulty based on performance
  const accuracy = this.analytics.timesCorrect / this.analytics.timesAttempted;
  if (this.analytics.timesAttempted >= 10) {
    if (accuracy > 0.8 && this.difficulty !== 'expert') {
      this.difficulty = this._promoteDifficulty(this.difficulty);
    } else if (accuracy < 0.4 && this.difficulty !== 'easy') {
      this.difficulty = this._demoteDifficulty(this.difficulty);
    }
  }
};

// Helper methods for difficulty adjustment
questionSchema.methods._promoteDifficulty = function(currentDifficulty) {
  const levels = ['easy', 'medium', 'hard', 'expert'];
  const currentIndex = levels.indexOf(currentDifficulty);
  return levels[Math.min(currentIndex + 1, levels.length - 1)];
};

questionSchema.methods._demoteDifficulty = function(currentDifficulty) {
  const levels = ['easy', 'medium', 'hard', 'expert'];
  const currentIndex = levels.indexOf(currentDifficulty);
  return levels[Math.max(currentIndex - 1, 0)];
};

// Static method to get questions by filters
questionSchema.statics.findByFilters = function(filters = {}) {
  const {
    examType,
    subject,
    topic,
    difficulty,
    type,
    cognitiveLevel,
    tags,
    limit = 10,
    skip = 0,
    sort = '-createdAt'
  } = filters;
  
  const query = { status: 'active' };
  
  if (examType) query.examType = examType;
  if (subject) query.subject = subject;
  if (topic) query.topic = new RegExp(topic, 'i');
  if (difficulty) query.difficulty = difficulty;
  if (type) query.type = type;
  if (cognitiveLevel) query.cognitiveLevel = cognitiveLevel;
  if (tags) query.tags = { $in: Array.isArray(tags) ? tags : [tags] };
  
  return this.find(query)
    .sort(sort)
    .limit(parseInt(limit))
    .skip(parseInt(skip))
    .select('-options.isCorrect -correctAnswer -correctAnswers');
};

// Static method to get random questions
questionSchema.statics.getRandomQuestions = function(filters = {}, count = 10) {
  const query = { status: 'active' };
  
  Object.keys(filters).forEach(key => {
    if (filters[key]) query[key] = filters[key];
  });
  
  return this.aggregate([
    { $match: query },
    { $sample: { size: parseInt(count) } },
    { $project: { 
        question: 1,
        type: 1,
        options: 1,
        topic: 1,
        subject: 1,
        examType: 1,
        difficulty: 1,
        timeLimit: 1,
        marks: 1,
        negativeMarks: 1
      }
    }
  ]);
};

// Static method to get question statistics
questionSchema.statics.getStatistics = function(examType = null) {
  const matchStage = { status: 'active' };
  if (examType) matchStage.examType = examType;
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalQuestions: { $sum: 1 },
        byExamType: { $push: '$examType' },
        bySubject: { $push: '$subject' },
        byDifficulty: { $push: '$difficulty' },
        byType: { $push: '$type' },
        totalAttempts: { $sum: '$analytics.timesAttempted' },
        totalCorrect: { $sum: '$analytics.timesCorrect' },
        averageAccuracy: { 
          $avg: { 
            $cond: [
              { $eq: ['$analytics.timesAttempted', 0] },
              0,
              { $divide: ['$analytics.timesCorrect', '$analytics.timesAttempted'] }
            ]
          }
        }
      }
    },
    {
      $project: {
        totalQuestions: 1,
        totalAttempts: 1,
        totalCorrect: 1,
        averageAccuracy: { $round: [{ $multiply: ['$averageAccuracy', 100] }, 2] },
        examTypes: {
          $arrayToObject: {
            $map: {
              input: { $setUnion: '$byExamType' },
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
              input: { $setUnion: '$bySubject' },
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
              input: { $setUnion: '$byDifficulty' },
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
        types: {
          $arrayToObject: {
            $map: {
              input: { $setUnion: '$byType' },
              as: 'type',
              in: {
                k: '$$type',
                v: {
                  $size: {
                    $filter: {
                      input: '$byType',
                      as: 't',
                      cond: { $eq: ['$$t', '$$type'] }
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
};

module.exports = mongoose.model('Question', questionSchema);