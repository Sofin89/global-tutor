// // models/StudyPlan.js
// const mongoose = require('mongoose');

// const dailyGoalSchema = new mongoose.Schema({
//   day: {
//     type: Number,
//     required: true
//   },
//   date: {
//     type: Date,
//     required: true
//   },
//   tasks: [{
//     type: String,
//     required: true
//   }],
//   focusTopic: {
//     type: String,
//     required: true
//   },
//   reinforceTopic: {
//     type: String,
//     required: true
//   },
//   completed: {
//     type: Boolean,
//     default: false
//   },
//   completedAt: Date,
//   completedTasks: [String],
//   notes: String,
//   difficulty: {
//     type: String,
//     enum: ['easy', 'medium', 'hard'],
//     default: 'medium'
//   }
// });

// const weeklyMilestoneSchema = new mongoose.Schema({
//   week: {
//     type: Number,
//     required: true
//   },
//   title: {
//     type: String,
//     required: true
//   },
//   description: String,
//   goals: [String],
//   completed: {
//     type: Boolean,
//     default: false
//   },
//   completedAt: Date,
//   progress: {
//     type: Number,
//     min: 0,
//     max: 100,
//     default: 0
//   }
// });

// const studyPlanSchema = new mongoose.Schema({
//   planId: {
//     type: String,
//     unique: true,
//     default: () => `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
//   },
//   studentId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   },
//   title: {
//     type: String,
//     required: true,
//     maxlength: 200
//   },
//   examType: {
//     type: String,
//     required: true,
//     enum: ['NEET', 'JEE', 'UPSC', 'SAT', 'GRE', 'IELTS', 'TOEFL', 'CODING']
//   },
//   description: {
//     type: String,
//     maxlength: 1000
//   },
//   currentLevel: {
//     type: String,
//     enum: ['beginner', 'intermediate', 'advanced', 'expert'],
//     default: 'beginner'
//   },
//   targetLevel: {
//     type: String,
//     enum: ['beginner', 'intermediate', 'advanced', 'expert'],
//     required: true
//   },
//   timeframe: {
//     type: String, // e.g., "30 days", "12 weeks"
//     required: true
//   },
//   startDate: {
//     type: Date,
//     required: true
//   },
//   endDate: {
//     type: Date,
//     required: true
//   },
//   dailyStudyHours: {
//     type: Number,
//     required: true,
//     min: 1,
//     max: 8
//   },
//   totalStudyHours: {
//     type: Number,
//     required: true
//   },
//   focusAreas: [{
//     type: String,
//     required: true
//   }],
//   reinforcementAreas: [{
//     type: String,
//     required: true
//   }],
//   dailyGoals: [dailyGoalSchema],
//   weeklyMilestones: [weeklyMilestoneSchema],
//   practiceSchedule: {
//     type: Map,
//     of: {
//       weeklyHours: Number,
//       focus: String,
//       resources: [String]
//     }
//   },
//   resourceRecommendations: {
//     books: [{
//       title: String,
//       author: String,
//       link: String
//     }],
//     videos: [{
//       title: String,
//       channel: String,
//       link: String
//     }],
//     websites: [{
//       name: String,
//       url: String,
//       description: String
//     }]
//   },
//   progress: {
//     type: Number,
//     min: 0,
//     max: 100,
//     default: 0
//   },
//   completedDays: {
//     type: Number,
//     default: 0
//   },
//   completedWeeks: {
//     type: Number,
//     default: 0
//   },
//   active: {
//     type: Boolean,
//     default: true
//   },
//   adaptiveSettings: {
//     enabled: {
//       type: Boolean,
//       default: true
//     },
//     adjustmentFrequency: {
//       type: String,
//       enum: ['daily', 'weekly', 'biweekly'],
//       default: 'weekly'
//     },
//     performanceThreshold: {
//       type: Number,
//       default: 70
//     }
//   },
//   metadata: {
//     createdBy: {
//       type: String,
//       enum: ['ai', 'manual', 'hybrid'],
//       default: 'ai'
//     },
//     aiModel: String,
//     confidence: Number,
//     version: String
//   }
// }, {
//   timestamps: true,
//   toJSON: { virtuals: true },
//   toObject: { virtuals: true }
// });

// // Indexes
// studyPlanSchema.index({ studentId: 1, active: 1 });
// studyPlanSchema.index({ examType: 1, currentLevel: 1 });
// studyPlanSchema.index({ endDate: 1 });
// studyPlanSchema.index({ 'adaptiveSettings.enabled': 1 });

// // Virtual for days remaining
// studyPlanSchema.virtual('daysRemaining').get(function() {
//   const today = new Date();
//   const end = new Date(this.endDate);
//   const diffTime = end - today;
//   return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
// });

// // Virtual for days elapsed
// studyPlanSchema.virtual('daysElapsed').get(function() {
//   const today = new Date();
//   const start = new Date(this.startDate);
//   const diffTime = today - start;
//   return Math.floor(diffTime / (1000 * 60 * 60 * 24));
// });

// // Virtual for check if plan is on track
// studyPlanSchema.virtual('isOnTrack').get(function() {
//   const expectedProgress = (this.daysElapsed / this.dailyGoals.length) * 100;
//   return this.progress >= expectedProgress;
// });

// // Virtual for current week
// studyPlanSchema.virtual('currentWeek').get(function() {
//   return Math.ceil(this.daysElapsed / 7);
// });

// // Pre-save middleware to update progress
// studyPlanSchema.pre('save', function(next) {
//   if (this.dailyGoals && this.dailyGoals.length > 0) {
//     const completedDays = this.dailyGoals.filter(goal => goal.completed).length;
//     this.completedDays = completedDays;
//     this.progress = (completedDays / this.dailyGoals.length) * 100;
    
//     // Update weekly milestones
//     this.weeklyMilestones.forEach(milestone => {
//       const weekGoals = this.dailyGoals.filter(
//         goal => Math.ceil(goal.day / 7) === milestone.week
//       );
//       const completedWeekGoals = weekGoals.filter(goal => goal.completed).length;
      
//       milestone.progress = weekGoals.length > 0 ? 
//         (completedWeekGoals / weekGoals.length) * 100 : 0;
      
//       milestone.completed = milestone.progress >= 80;
//       if (milestone.completed && !milestone.completedAt) {
//         milestone.completedAt = new Date();
//       }
//     });
    
//     this.completedWeeks = this.weeklyMilestones.filter(milestone => milestone.completed).length;
//   }
//   next();
// });

// // Instance method to mark day as completed
// studyPlanSchema.methods.markDayCompleted = function(day, completedTasks = [], notes = '') {
//   const goal = this.dailyGoals.find(g => g.day === day);
//   if (goal) {
//     goal.completed = true;
//     goal.completedAt = new Date();
//     goal.completedTasks = completedTasks;
//     if (notes) goal.notes = notes;
//   }
// };

// // Instance method to add custom task
// studyPlanSchema.methods.addCustomTask = function(day, task) {
//   const goal = this.dailyGoals.find(g => g.day === day);
//   if (goal) {
//     goal.tasks.push(task);
//   }
// };

// // Instance method to adjust plan based on performance
// studyPlanSchema.methods.adjustBasedOnPerformance = function(performanceData) {
//   if (!this.adaptiveSettings.enabled) return;
  
//   const { weakAreas, strongAreas, overallScore } = performanceData;
  
//   // Adjust focus areas
//   if (weakAreas && weakAreas.length > 0) {
//     this.focusAreas = [...new Set([...this.focusAreas, ...weakAreas])].slice(0, 5);
//   }
  
//   // Adjust reinforcement areas
//   if (strongAreas && strongAreas.length > 0) {
//     this.reinforcementAreas = strongAreas.slice(0, 3);
//   }
  
//   // Adjust difficulty if needed
//   if (overallScore > 80) {
//     // Increase difficulty for future tasks
//     this.dailyGoals.forEach(goal => {
//       if (!goal.completed && goal.difficulty !== 'hard') {
//         goal.difficulty = this._increaseDifficulty(goal.difficulty);
//       }
//     });
//   } else if (overallScore < 50) {
//     // Decrease difficulty for future tasks
//     this.dailyGoals.forEach(goal => {
//       if (!goal.completed && goal.difficulty !== 'easy') {
//         goal.difficulty = this._decreaseDifficulty(goal.difficulty);
//       }
//     });
//   }
// };

// // Helper methods for difficulty adjustment
// studyPlanSchema.methods._increaseDifficulty = function(currentDifficulty) {
//   const levels = ['easy', 'medium', 'hard'];
//   const currentIndex = levels.indexOf(currentDifficulty);
//   return levels[Math.min(currentIndex + 1, levels.length - 1)];
// };

// studyPlanSchema.methods._decreaseDifficulty = function(currentDifficulty) {
//   const levels = ['easy', 'medium', 'hard'];
//   const currentIndex = levels.indexOf(currentDifficulty);
//   return levels[Math.max(currentIndex - 1, 0)];
// };

// // Instance method to generate progress report
// studyPlanSchema.methods.generateProgressReport = function() {
//   const completedGoals = this.dailyGoals.filter(goal => goal.completed);
//   const pendingGoals = this.dailyGoals.filter(goal => !goal.completed);
  
//   const focusAreaProgress = {};
//   this.focusAreas.forEach(area => {
//     const areaGoals = this.dailyGoals.filter(goal => 
//       goal.focusTopic === area || goal.reinforceTopic === area
//     );
//     const completedAreaGoals = areaGoals.filter(goal => goal.completed).length;
//     focusAreaProgress[area] = {
//       total: areaGoals.length,
//       completed: completedAreaGoals,
//       progress: areaGoals.length > 0 ? (completedAreaGoals / areaGoals.length) * 100 : 0
//     };
//   });
  
//   return {
//     overallProgress: this.progress,
//     daysCompleted: this.completedDays,
//     totalDays: this.dailyGoals.length,
//     weeksCompleted: this.completedWeeks,
//     totalWeeks: this.weeklyMilestones.length,
//     focusAreaProgress,
//     upcomingGoals: pendingGoals.slice(0, 7),
//     recentAchievements: completedGoals.slice(-5).reverse(),
//     isOnTrack: this.isOnTrack,
//     estimatedCompletion: this.endDate
//   };
// };

// // Static method to find active study plans
// studyPlanSchema.statics.findActivePlans = function(userId) {
//   return this.find({
//     studentId: userId,
//     active: true,
//     endDate: { $gte: new Date() }
//   }).sort({ createdAt: -1 });
// };

// // Static method to get study plan statistics
// studyPlanSchema.statics.getUserStatistics = function(userId) {
//   return this.aggregate([
//     { $match: { studentId: mongoose.Types.ObjectId(userId) } },
//     {
//       $group: {
//         _id: null,
//         totalPlans: { $sum: 1 },
//         activePlans: {
//           $sum: { $cond: ['$active', 1, 0] }
//         },
//         completedPlans: {
//           $sum: { $cond: [{ $gte: ['$progress', 95] }, 1, 0] }
//         },
//         averageProgress: { $avg: '$progress' },
//         totalStudyHours: { $sum: '$totalStudyHours' },
//         byExamType: {
//           $push: {
//             examType: '$examType',
//             progress: '$progress'
//           }
//         }
//       }
//     },
//     {
//       $project: {
//         totalPlans: 1,
//         activePlans: 1,
//         completedPlans: 1,
//         averageProgress: { $round: ['$averageProgress', 2] },
//         totalStudyHours: 1,
//         examTypeDistribution: {
//           $arrayToObject: {
//             $map: {
//               input: { $setUnion: '$byExamType.examType' },
//               as: 'type',
//               in: {
//                 k: '$$type',
//                 v: {
//                   count: {
//                     $size: {
//                       $filter: {
//                         input: '$byExamType',
//                         as: 't',
//                         cond: { $eq: ['$$t.examType', '$$type'] }
//                       }
//                     }
//                   },
//                   averageProgress: {
//                     $round: [
//                       {
//                         $avg: {
//                           $map: {
//                             input: {
//                               $filter: {
//                                 input: '$byExamType',
//                                 as: 't',
//                                 cond: { $eq: ['$$t.examType', '$$type'] }
//                               }
//                             },
//                             as: 't',
//                             in: '$$t.progress'
//                           }
//                         }
//                       },
//                       2
//                     ]
//                   }
//                 }
//               }
//             }
//           }
//         }
//       }
//     }
//   ]);
// };

// module.exports = mongoose.model('StudyPlan', studyPlanSchema);


// models/StudyPlan.js
const mongoose = require('mongoose');

const dailyGoalSchema = new mongoose.Schema({
  day: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  tasks: [{
    type: String,
    required: true
  }],
  focusTopic: {
    type: String,
    required: true
  },
  reinforceTopic: {
    type: String,
    required: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: Date,
  completedTasks: [String],
  notes: String,
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  }
});

const studyPlanSchema = new mongoose.Schema({
  planId: {
    type: String,
    unique: true,
    default: () => `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  examType: {
    type: String,
    required: true,
    enum: ['NEET', 'JEE', 'UPSC', 'SAT', 'GRE', 'IELTS', 'TOEFL', 'CODING']
  },
  description: {
    type: String,
    maxlength: 1000
  },
  currentLevel: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'expert'],
    default: 'beginner'
  },
  targetLevel: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'expert'],
    required: true
  },
  timeframe: {
    type: String, // e.g., "30 days", "12 weeks"
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  dailyStudyHours: {
    type: Number,
    required: true,
    min: 1,
    max: 8
  },
  totalStudyHours: {
    type: Number,
    required: true
  },
  focusAreas: [{
    type: String,
    required: true
  }],
  reinforcementAreas: [{
    type: String,
    required: true
  }],
  dailyGoals: [dailyGoalSchema],
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
studyPlanSchema.index({ studentId: 1, active: 1 });
studyPlanSchema.index({ examType: 1, currentLevel: 1 });
studyPlanSchema.index({ endDate: 1 });

module.exports = mongoose.model('StudyPlan', studyPlanSchema);