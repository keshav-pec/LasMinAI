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
    max: 10,
    default: 5, // C: 1 (Easy) to 10 (Brain-melting)
  },
  technicalEffort: {
    type: Number,
    required: true,
    min: 1,
    max: 24,
    default: 2, // E: Estimated hours to complete
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'overdue'],
    default: 'pending',
  },
  priorityScore: {
    type: Number,
    default: 0,
  },
  digestSent: {
    type: Boolean,
    default: false,
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

TaskSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('Task', TaskSchema);