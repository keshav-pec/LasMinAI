const Reminder = require('../models/Reminder');
const Task = require('../models/Task');
const mongoose = require('mongoose');
const { parseReminderMessage } = require('../services/geminiService');

// Handle Chat for Reminders
exports.handleReminderChat = async (req, res) => {
  try {
    const { message, history, localTime, timezone } = req.body;
    const userId = req.user.id;

    if (!message || message.length > 500) {
      return res.status(400).json({ success: false, message: 'Message is required and must be under 500 characters.' });
    }

    // Fetch context - Limit to top 5 most urgent tasks
    const activeTasks = await Task.find({ userId, status: 'pending' })
      .select('title deadline priorityScore')
      .sort({ deadline: 1, priorityScore: -1 })
      .limit(5);
    const activeReminders = await Reminder.find({ userId, status: 'active' });

    // Parse intent
    const safeHistory = Array.isArray(history) ? history.slice(-10) : [];
    const aiResponse = await parseReminderMessage(
      message, 
      safeHistory, 
      activeTasks, 
      activeReminders, 
      timezone, 
      localTime
    );

    const { action, conversationalReply, extractedReminderCreate, extractedReminderUpdate, extractedReminderDismiss } = aiResponse;

    let updatedReminders = activeReminders;

    // Execute actions
    if (action === 'CREATE' && extractedReminderCreate) {
      const newReminder = new Reminder({
        userId,
        title: extractedReminderCreate.title,
        remindAt: new Date(extractedReminderCreate.remindAt),
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
        if (remindAt) updateData.remindAt = new Date(remindAt);

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

    // Add 10 minutes (600,000 ms) to current remindAt time
    const newTime = new Date(reminder.remindAt.getTime() + 10 * 60000);
    reminder.remindAt = newTime;
    await reminder.save();

    res.status(200).json({ success: true, remindAt: newTime });
  } catch (error) {
    console.error('❌ Snooze Reminder Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
