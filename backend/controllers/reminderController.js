const Reminder = require('../models/Reminder');
const Task = require('../models/Task');
const mongoose = require('mongoose');
const { parseReminderMessage } = require('../services/geminiService');
const { parseLocalToUTC } = require('../utils/dateUtils');

// Handle Chat for Reminders
exports.handleReminderChat = async (req, res) => {
  try {
    const { message, history, localTime, timezoneOffset } = req.body;
    const userId = req.user.id;

    if (!message || message.length > 500) {
      return res.status(400).json({ success: false, message: 'Message is required and must be under 500 characters.' });
    }

    // Fetch context - Limit to top 5 most urgent tasks
    const activeTasks = await Task.find({ userId, status: 'pending' })
      .select('title deadline')
      .sort({ deadline: 1 })
      .limit(5);
    const activeReminders = await Reminder.find({ userId, status: 'active' });

    // Parse intent
    const safeHistory = Array.isArray(history) ? history.slice(-10) : [];
    const aiResponse = await parseReminderMessage(
      message, 
      safeHistory, 
      activeTasks, 
      activeReminders, 
      localTime,
      timezoneOffset
    );

    const { action, conversationalReply, voiceReply, extractedReminderCreate, extractedReminderUpdate, extractedReminderDismiss } = aiResponse;

    let updatedReminders = activeReminders;

    // Execute actions
    if (action === 'CREATE' && extractedReminderCreate) {
      const newReminder = new Reminder({
        userId,
        title: extractedReminderCreate.title,
        remindAt: parseLocalToUTC(extractedReminderCreate.remindAt, timezoneOffset),
        snoozable: extractedReminderCreate.snoozable !== undefined ? extractedReminderCreate.snoozable : true
      });
      await newReminder.save();
      updatedReminders = await Reminder.find({ userId, status: 'active' });
    } 
    else if (action === 'UPDATE' && extractedReminderUpdate) {
      const { reminderId, title, remindAt } = extractedReminderUpdate;
      if (mongoose.Types.ObjectId.isValid(reminderId)) {
        const updateData = {};
        if (title) updateData.title = title;
        if (remindAt) updateData.remindAt = parseLocalToUTC(remindAt, timezoneOffset);

        await Reminder.findOneAndUpdate({ _id: reminderId, userId }, updateData);
      }
      updatedReminders = await Reminder.find({ userId, status: 'active' });
    }
    else if (action === 'DISMISS' && extractedReminderDismiss) {
      const { reminderId } = extractedReminderDismiss;
      if (mongoose.Types.ObjectId.isValid(reminderId)) {
        await Reminder.findOneAndUpdate({ _id: reminderId, userId }, { status: 'dismissed' });
      }
      updatedReminders = await Reminder.find({ userId, status: 'active' });
    }

    res.status(200).json({
      success: true,
      reply: conversationalReply,
      voiceReply: voiceReply,
      reminders: updatedReminders,
      action
    });

  } catch (error) {
    console.error('❌ Reminder Chat Controller Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// Get active reminders
exports.getActiveReminders = async (req, res) => {
  try {
    const reminders = await Reminder.find({ userId: req.user.id, status: 'active' }).sort({ remindAt: 1 });
    res.status(200).json({ success: true, data: reminders });
  } catch (error) {
    console.error('❌ Get Reminders Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// Dismiss a reminder manually
exports.dismissReminder = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid Reminder ID' });
    }
    await Reminder.findOneAndUpdate({ _id: id, userId: req.user.id }, { status: 'dismissed' });
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Dismiss Reminder Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// Snooze a reminder manually (+10 minutes)
exports.snoozeReminder = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid Reminder ID' });
    }
    
    const reminder = await Reminder.findOne({ _id: id, userId: req.user.id });
    if (!reminder) {
      return res.status(404).json({ success: false, message: 'Reminder not found' });
    }
    if (!reminder.snoozable) {
      return res.status(403).json({ success: false, message: 'This reminder cannot be snoozed' });
    }
    if (reminder.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Only active reminders can be snoozed' });
    }

    // Add 5 minutes (300,000 ms) to current remindAt time
    const newTime = new Date(reminder.remindAt.getTime() + 5 * 60000);
    reminder.remindAt = newTime;
    await reminder.save();

    res.status(200).json({ success: true, remindAt: newTime });
  } catch (error) {
    console.error('❌ Snooze Reminder Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// Fetch all reminders for a specific date range based on remindAt
exports.getRemindersByDate = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ success: false, message: 'Date parameter (YYYY-MM-DD) is required.' });
    }

    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const reminders = await Reminder.find({
      userId: req.user.id,
      remindAt: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: reminders });
  } catch (error) {
    console.error('Get Reminders By Date Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// Update a reminder completely
exports.updateReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, remindAt } = req.body;

    const reminder = await Reminder.findOne({ _id: id, userId: req.user.id });
    if (!reminder) return res.status(404).json({ success: false, message: 'Reminder not found' });

    if (title) reminder.title = title;
    if (remindAt) reminder.remindAt = remindAt;

    await reminder.save();
    res.status(200).json({ success: true, data: reminder });
  } catch (error) {
    console.error('Update Reminder Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// Delete a reminder
exports.deleteReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const reminder = await Reminder.findOneAndDelete({ _id: id, userId: req.user.id });
    if (!reminder) return res.status(404).json({ success: false, message: 'Reminder not found' });

    res.status(200).json({ success: true, message: 'Reminder deleted successfully' });
  } catch (error) {
    console.error('Delete Reminder Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
