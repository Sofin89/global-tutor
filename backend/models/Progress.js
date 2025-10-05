// models/Progress.js
const mongoose = require('mongoose');

const subtopicBreakdownSchema = new mongoose.Schema({
  subtopic: {
    type: String,
    required: true
  },
  totalQuestions: {
    type: Number,
    default: 0
  },
  correctAnswers: {
    type: Number,
    default: 0
  },
  timeSpent: {
    type: Number,
    default: 0
  }
});

const progressSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  topic: {
    type: String,
    required: true
  },
  examType: {
    type: String,
    required: true,
    enum: ['NEET', 'JEE', 'UPSC', 'SAT', 'GRE', 'IELTS', 'TOEFL', 'CODING']
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  correctAnswers: {
    type: Number,
    required: true
  },
  timeSpent: {
    type: Number, // in seconds
    default: 0
  },
  accuracy: {
    type: Number,
    min: 0,
    max: 100
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard', 'expert'],
    default: 'medium'
  },
  subtopicBreakdown: [subtopicBreakdownSchema],
  lastAttempted: {
    type: Date,
    default: Date.now
  },
  streak: {
    current: {
      type: Number,
      default: 0
    },
    best: {
      type: Number,
      default: 0
    },
    lastUpdated: Date
  },
  confidence: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },
  improvementRate: {
    type: Number,
    default: 0
  },
  metadata: {
    source: {
      type: String,
      enum: ['test', 'practice', 'quiz', 'flashcards'],
      default: 'test'
    },
    testId: mongoose.Schema.Types.ObjectId,
    sessionId: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound index for efficient querying
progressSchema.index({ studentId: 1, topic: 1, examType: 1 }, { unique: true });
progressSchema.index({ studentId: 1, lastAttempted: -1 });
progressSchema.index({ examType: 1, accuracy: -1 });
progressSchema.index({ 'metadata.source': 1 });

// Virtual for mastery level
progressSchema.virtual('masteryLevel').get(function() {
  if (this.accuracy >= 90) return 'mastered';
  if (this.accuracy >= 75) return 'proficient';
  if (this.accuracy >= 60) return 'competent';
  if (this.accuracy >= 40) return 'learning';
  return 'beginner';
});

// Virtual for efficiency (accuracy per unit time)
progressSchema.virtual('efficiency').get(function() {
  if (this.timeSpent === 0) return 0;
  return (this.accuracy / (this.timeSpent / this.totalQuestions)) * 100;
});

// Pre-save middleware to calculate accuracy and update streak
progressSchema.pre('save', function(next) {
  // Calculate accuracy
  this.accuracy = (this.correctAnswers / this.totalQuestions) * 100;
  
  // Update streak
  this._updateStreak();
  
  next();
});

// Instance method to update streak
progressSchema.methods._updateStreak = function() {
  const today = new Date().toDateString();
  const lastUpdated = this.streak.lastUpdated?.toDateString();
  
  if (lastUpdated === today) {
    return; // Already updated today
  }
  
  if (this.accuracy >= 70) {
    this.streak.current++;
    if (this.streak.current > this.streak.best) {
      this.streak.best = this.streak.current;
    }
  } else {
    this.streak.current = 0;
  }
  
  this.streak.lastUpdated = new Date();
};

// Instance method to update progress with new attempt
progressSchema.methods.updateWithAttempt = function(correct, timeSpent, subtopic = null) {
  this.totalQuestions++;
  if (correct) this.correctAnswers++;
  this.timeSpent += timeSpent;
  this.lastAttempted = new Date();
  
  // Update subtopic breakdown
  if (subtopic) {
    let subtopicData = this.subtopicBreakdown.find(s => s.subtopic === subtopic);
    if (!subtopicData) {
      subtopicData = { subtopic, totalQuestions: 0, correctAnswers: 0, timeSpent: 0 };
      this.subtopicBreakdown.push(subtopicData);
    }
    
    subtopicData.totalQuestions++;
    if (correct) subtopicData.correctAnswers++;
    subtopicData.timeSpent += timeSpent;
  }
  
  // Recalculate confidence based on recent performance
  this._updateConfidence();
};

// Instance method to update confidence
progressSchema.methods._updateConfidence = function() {
  // Simple confidence calculation based on accuracy and consistency
  const baseConfidence = this.accuracy;
  const consistencyBonus = this.streak.current * 2; // 2% bonus per streak day
  this.confidence = Math.min(100, baseConfidence + consistencyBonus);
};

// Instance method to get weak subtopics
progressSchema.methods.getWeakSubtopics = function(threshold = 60) {
  return this.subtopicBreakdown
    .filter(subtopic => {
      const accuracy = (subtopic.correctAnswers / subtopic.totalQuestions) * 100;
      return accuracy < threshold;
    })
    .map(subtopic => ({
      subtopic: subtopic.subtopic,
      accuracy: (subtopic.correctAnswers / subtopic.totalQuestions) * 100,
      totalQuestions: subtopic.totalQuestions
    }))
    .sort((a, b) => a.accuracy - b.accuracy);
};

// Instance method to get strong subtopics
progressSchema.methods.getStrongSubtopics = function(threshold = 80) {
  return this.subtopicBreakdown
    .filter(subtopic => {
      const accuracy = (subtopic.correctAnswers / subtopic.totalQuestions) * 100;
      return accuracy >= threshold;
    })
    .map(subtopic => ({
      subtopic: subtopic.subtopic,
      accuracy: (subtopic.correctAnswers / subtopic.totalQuestions) * 100,
      totalQuestions: subtopic.totalQuestions
    }))
    .sort((a, b) => b.accuracy - a.accuracy);
};

// Static method to get overall progress for a student
progressSchema.statics.getOverallProgress = function(studentId, examType = null) {
  const matchStage = { studentId: mongoose.Types.ObjectId(studentId) };
  if (examType) matchStage.examType = examType;
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalTopics: { $sum: 1 },
        totalQuestions: { $sum: '$totalQuestions' },
        totalCorrect: { $sum: '$correctAnswers' },
        totalTimeSpent: { $sum: '$timeSpent' },
        averageAccuracy: { $avg: '$accuracy' },
        masteredTopics: {
          $sum: {
            $cond: [{ $gte: ['$accuracy', 80] }, 1, 0]
          }
        },
        learningTopics: {
          $sum: {
            $cond: [
              { $and: [{ $gte: ['$accuracy', 40] }, { $lt: ['$accuracy', 80] }] },
              1, 0
            ]
          }
        },
        beginnerTopics: {
          $sum: {
            $cond: [{ $lt: ['$accuracy', 40] }, 1, 0]
          }
        },
        byExamType: {
          $push: {
            examType: '$examType',
            accuracy: '$accuracy',
            totalQuestions: '$totalQuestions'
          }
        }
      }
    },
    {
      $project: {
        totalTopics: 1,
        totalQuestions: 1,
        totalCorrect: 1,
        totalTimeSpent: 1,
        averageAccuracy: { $round: ['$averageAccuracy', 2] },
        masteryDistribution: {
          mastered: '$masteredTopics',
          learning: '$learningTopics',
          beginner: '$beginnerTopics'
        },
        overallAccuracy: {
          $round: [
            { $multiply: [{ $divide: ['$totalCorrect', '$totalQuestions'] }, 100] },
            2
          ]
        },
        examTypeBreakdown: {
          $arrayToObject: {
            $map: {
              input: { $setUnion: '$byExamType.examType' },
              as: 'type',
              in: {
                k: '$$type',
                v: {
                  topics: {
                    $size: {
                      $filter: {
                        input: '$byExamType',
                        as: 't',
                        cond: { $eq: ['$$t.examType', '$$type'] }
                      }
                    }
                  },
                  averageAccuracy: {
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
                            in: '$$t.accuracy'
                          }
                        }
                      },
                      2
                    ]
                  },
                  totalQuestions: {
                    $sum: {
                      $map: {
                        input: {
                          $filter: {
                            input: '$byExamType',
                            as: 't',
                            cond: { $eq: ['$$t.examType', '$$type'] }
                          }
                        },
                        as: 't',
                        in: '$$t.totalQuestions'
                      }
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

// Static method to get progress timeline
progressSchema.statics.getProgressTimeline = function(studentId, topic, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        studentId: mongoose.Types.ObjectId(studentId),
        topic: topic,
        updatedAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$updatedAt'
          }
        },
        accuracy: { $avg: '$accuracy' },
        attempts: { $sum: 1 },
        questionsAttempted: { $sum: '$totalQuestions' },
        correctAnswers: { $sum: '$correctAnswers' }
      }
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        date: '$_id',
        accuracy: { $round: ['$accuracy', 2] },
        attempts: 1,
        questionsAttempted: 1,
        correctAnswers: 1,
        _id: 0
      }
    }
  ]);
};

// Static method to get recommended topics for practice
progressSchema.statics.getRecommendedTopics = function(studentId, examType, limit = 5) {
  return this.aggregate([
    {
      $match: {
        studentId: mongoose.Types.ObjectId(studentId),
        examType: examType,
        totalQuestions: { $gte: 5 } // Only consider topics with sufficient data
      }
    },
    {
      $project: {
        topic: 1,
        accuracy: 1,
        totalQuestions: 1,
        lastAttempted: 1,
        confidence: 1,
        priority: {
          $add: [
            { $multiply: [{ $subtract: [100, '$accuracy'] }, 0.6] }, // Lower accuracy = higher priority
            { $multiply: [{ $subtract: [100, '$confidence'] }, 0.3] }, // Lower confidence = higher priority
            {
              $multiply: [
                {
                  $divide: [
                    1,
                    { $add: [1, { $divide: [{ $subtract: [new Date(), '$lastAttempted'] }, 86400000] }] }
                  ]
                },
                0.1
              ]
            } // More recent = slightly higher priority
          ]
        }
      }
    },
    { $sort: { priority: -1 } },
    { $limit: limit },
    {
      $project: {
        topic: 1,
        accuracy: 1,
        confidence: 1,
        lastAttempted: 1,
        recommendation: {
          $switch: {
            branches: [
              { case: { $lt: ['$accuracy', 40] }, then: 'Focus on fundamental concepts' },
              { case: { $lt: ['$accuracy', 60] }, then: 'Practice basic problems' },
              { case: { $lt: ['$accuracy', 75] }, then: 'Work on application problems' },
              { case: { $lt: ['$accuracy', 90] }, then: 'Master advanced concepts' }
            ],
            default: 'Maintain proficiency with occasional practice'
          }
        }
      }
    }
  ]);
};

module.exports = mongoose.model('Progress', progressSchema);