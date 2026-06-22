// backend/controllers/aiController.js
const { generateAgenticSchedule } = require('../services/geminiService');
const Task = require('../models/Task');
const { calculatePriorityScore } = require('../utils/priorityCalculator');
const { pushScheduleToCalendar } = require('../services/calendarService');
const { oauth2Client } = require('../routes/authRoutes');

exports.getAiSchedule = async (req, res) => {
  try {
    const { availableHours } = req.query;
    const hours = availableHours ? parseInt(availableHours) : 8;

    const tasks = await Task.find({ status: { $ne: 'completed' } });

    if (tasks.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No pending tasks found to schedule.",
        data: { calendarEvents: [], personalizedRecommendations: [] }
      });
    }

    const dynamicallySortedTasks = tasks.map(task => {
      const currentScore = calculatePriorityScore(task.deadline, task.complexity, task.technicalEffort);
      return {
        title: task.title,
        description: task.description,
        deadline: task.deadline,
        complexity: task.complexity,
        technicalEffort: task.technicalEffort,
        priorityScore: currentScore
      };
    });

    dynamicallySortedTasks.sort((a, b) => b.priorityScore - a.priorityScore);

    // Call your optimized Gemini configuration
    const aiSchedule = await generateAgenticSchedule(dynamicallySortedTasks, hours);

    let calendarLinks = [];
    let calendarStatus = "Skipped - No active Google session found. Please hit /api/auth/google first.";

    // Verify token presence explicitly
    if (global.googleTokens && Object.keys(global.googleTokens).length > 0) {
      oauth2Client.setCredentials(global.googleTokens);
      calendarLinks = await pushScheduleToCalendar(oauth2Client, aiSchedule.calendarEvents);
      calendarStatus = `Successfully synced ${calendarLinks.length} events to Google Calendar.`;
    }

    res.status(200).json({
      success: true,
      calendarStatus,
      calendarLinks,
      data: aiSchedule
    });
  } catch (error) {
    console.error('❌ AI Controller Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};