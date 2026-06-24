const mongoose = require('mongoose');

const ReminderSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  remindAt: {
    type: Date,
    required: true,
  },
  snoozable: {
    type: Boolean,
    default: true,
  },
  status: {
    type: String,
    enum: ['active', 'dismissed'],
    default: 'active',
  }
}, { timestamps: true });

// Indexing for fast retrieval of active reminders for a user
ReminderSchema.index({ userId: 1, status: 1, remindAt: 1 });

module.exports = mongoose.model('Reminder', ReminderSchema);
