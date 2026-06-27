const mongoose = require('mongoose');

const HabitSchema = new mongoose.Schema({
  userId: {
    type: String, // Google ID to match the rest of the app
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
  },
  frequency: {
    type: String,
    enum: ['daily', 'weekly'],
    default: 'daily',
  },
  deadlineTime: {
    type: String,
    required: true, // e.g., "18:00"
  },
  complexity: {
    type: Number,
    default: 5,
  },
  technicalEffort: {
    type: Number,
    default: 1, // hours
  },
  streak: {
    type: Number,
    default: 0,
  },
  bestStreak: {
    type: Number,
    default: 0,
  },
  totalCompleted: {
    type: Number,
    default: 0,
  },
  lastGeneratedDate: {
    type: String, // YYYY-MM-DD format to ensure exactly one run per day
    default: null,
  }
}, { timestamps: true });

HabitSchema.index({ userId: 1 });

module.exports = mongoose.model('Habit', HabitSchema);
