const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  userId: {
    type: String,
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
  deadline: {
    type: Date,
    required: true,
  },
  complexity: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    default: 3,
  },

  technicalEffort: {
    type: Number,
    required: true,
    min: 0.1,
    max: 24,
    default: 2, // E: Estimated hours to complete
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'overdue'],
    default: 'pending',
  },

  digestSent: {
    type: Boolean,
    default: false,
  },
  digestFailed: {
    type: Boolean,
    default: false,
  },
  digestRetryCount: {
    type: Number,
    default: 0,
  },
  habitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Habit',
    default: null,
  },
  completedAt: {
    type: Date,
    default: null,
  }
}, { timestamps: true });

// Compound index for querying a user's tasks by status (e.g., getting all pending tasks for a user)
TaskSchema.index({ userId: 1, status: 1 });

// Compound index to optimize the Zombie Sweeper (finding overdue pending tasks)
TaskSchema.index({ userId: 1, status: 1, deadline: 1 });

module.exports = mongoose.model('Task', TaskSchema);