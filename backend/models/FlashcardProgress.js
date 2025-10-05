// models/FlashcardProgress.js
const mongoose = require('mongoose');

const reviewHistorySchema = new mongoose.Schema({
  interval: {
    type: Number, // days until next review
    required: true
  },
  nextReview: {
    type: Date,
    required: true
  },
  performance: {
    type: Number, // 0-1 scale
    required: true,
    min: 0,
    max: 1
  },
  reviewDate: {
    type: Date,
    default: Date.now
  }
});

const flashcardProgressSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  setId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FlashcardSet',
    required: true
  },
  flashcards: [{
    flashcardId: {
      type: String,
      required: true
    },
    reviewHistory: [reviewHistorySchema],
    totalReviews: {
      type: Number,
      default: 0
    },
    lastReviewed: Date
  }],
  overallMastery: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  lastReviewed: Date
}, {
  timestamps: true
});

// Compound index for efficient queries
flashcardProgressSchema.index({ studentId: 1, setId: 1 }, { unique: true });
flashcardProgressSchema.index({ lastReviewed: 1 });

module.exports = mongoose.model('FlashcardProgress', flashcardProgressSchema);