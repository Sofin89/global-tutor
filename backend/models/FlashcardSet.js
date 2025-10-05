// models/FlashcardSet.js
const mongoose = require('mongoose');

const flashcardSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  front: {
    type: String,
    required: true,
    maxlength: 1000
  },
  back: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  type: {
    type: String,
    enum: ['concept', 'formula', 'definition', 'example', 'mnemonic'],
    default: 'concept'
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  tags: [String],
  metadata: {
    type: Object,
    default: {}
  }
});

const flashcardSetSchema = new mongoose.Schema({
  setId: {
    type: String,
    unique: true,
    default: () => `set_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  description: {
    type: String,
    maxlength: 1000
  },
  topic: {
    type: String,
    required: true,
    maxlength: 100
  },
  flashcards: [flashcardSchema],
  tags: [String],
  totalCards: {
    type: Number,
    required: true
  },
  estimatedStudyTime: {
    type: Number, // in minutes
    required: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  isAIGenerated: {
    type: Boolean,
    default: false
  },
  metadata: {
    type: Object,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
flashcardSetSchema.index({ studentId: 1, createdAt: -1 });
flashcardSetSchema.index({ topic: 1 });
flashcardSetSchema.index({ tags: 1 });
flashcardSetSchema.index({ isPublic: 1 });

// Virtual for user's progress (will be populated)
flashcardSetSchema.virtual('progress', {
  ref: 'FlashcardProgress',
  localField: '_id',
  foreignField: 'setId',
  justOne: true
});

module.exports = mongoose.model('FlashcardSet', flashcardSetSchema);