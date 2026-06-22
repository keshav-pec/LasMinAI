const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
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
    max: 10,
    default: 5, // E: Estimated hours to complete
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed'],
    default: 'pending',
  },
  priorityScore: {
    type: Number,
    default: 0,
  }
}, { timestamps: true });

module.exports = mongoose.model('Task', TaskSchema);