// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const refreshTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  examType: {
    type: String,
    required: [true, 'Exam type is required'],
    enum: {
      values: ['NEET', 'JEE', 'UPSC', 'SAT', 'GRE', 'IELTS', 'TOEFL', 'CODING'],
      message: 'Please select a valid exam type'
    }
  },
  grade: {
    type: String,
    maxlength: 20
  },
  country: {
    type: String,
    maxlength: 50
  },
  role: {
    type: String,
    enum: ['student', 'content_creator', 'admin'],
    default: 'student'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'deleted'],
    default: 'active'
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  verificationCode: {
    type: String,
    select: false
  },
  verificationExpires: {
    type: Date,
    select: false
  },
  resetPasswordToken: {
    type: String,
    select: false
  },
  resetPasswordExpires: {
    type: Date,
    select: false
  },
  refreshTokens: [refreshTokenSchema],
  preferences: {
    notifications: {
      type: Boolean,
      default: true
    },
    darkMode: {
      type: Boolean,
      default: false
    },
    language: {
      type: String,
      enum: ['en', 'hi', 'es', 'fr'],
      default: 'en'
    },
    dailyStudyGoal: {
      type: Number,
      default: 120 // minutes
    },
    difficultyPreference: {
      type: String,
      enum: ['easy', 'medium', 'hard', 'adaptive'],
      default: 'adaptive'
    }
  },
  profile: {
    avatar: String,
    bio: {
      type: String,
      maxlength: 500
    },
    school: String,
    targetYear: Number,
    strengths: [String],
    weaknesses: [String]
  },
  statistics: {
    totalStudyTime: {
      type: Number,
      default: 0 // in minutes
    },
    testsTaken: {
      type: Number,
      default: 0
    },
    averageScore: {
      type: Number,
      default: 0
    },
    streak: {
      type: Number,
      default: 0
    },
    lastActive: Date
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'premium', 'pro'],
      default: 'free'
    },
    expiresAt: Date,
    features: {
      aiExplanations: { type: Boolean, default: true },
      unlimitedTests: { type: Boolean, default: false },
      advancedAnalytics: { type: Boolean, default: false },
      personalizedTutor: { type: Boolean, default: false }
    }
  },
  lastLogin: Date,
  deletedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
userSchema.index({ email: 1 });
userSchema.index({ examType: 1 });
userSchema.index({ status: 1 });
userSchema.index({ 'subscription.plan': 1 });
userSchema.index({ lastLogin: -1 });

// Virtual for user's full profile URL
userSchema.virtual('profileUrl').get(function() {
  return `/users/${this._id}/profile`;
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to update lastActive
userSchema.pre('save', function(next) {
  if (this.isModified('lastLogin') || this.isNew) {
    this.statistics.lastActive = new Date();
  }
  next();
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to generate password reset token
userSchema.methods.createPasswordResetToken = function() {
  const resetToken = require('crypto').randomBytes(32).toString('hex');
  
  this.resetPasswordToken = require('crypto')
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
    
  this.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  
  return resetToken;
};

// Instance method to check if user can access premium features
userSchema.methods.hasPremiumAccess = function() {
  return this.subscription.plan !== 'free' && 
         (!this.subscription.expiresAt || this.subscription.expiresAt > new Date());
};

// Instance method to update study statistics
userSchema.methods.updateStudyStats = function(studyTime) {
  this.statistics.totalStudyTime += studyTime;
  this.statistics.lastActive = new Date();
  
  // Update streak
  const today = new Date().toDateString();
  const lastActive = this.statistics.lastActive?.toDateString();
  
  if (lastActive !== today) {
    this.statistics.streak++;
  }
};

// Static method to get users by exam type
userSchema.statics.findByExamType = function(examType) {
  return this.find({ examType, status: 'active' });
};

// Static method to get top performers
userSchema.statics.getTopPerformers = function(limit = 10) {
  return this.find({ status: 'active' })
    .sort({ 'statistics.averageScore': -1 })
    .limit(limit)
    .select('name email examType statistics.averageScore');
};

module.exports = mongoose.model('User', userSchema);