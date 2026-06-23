const { generateAgenticSchedule } = require('../services/geminiService');
const { getSortedPendingTasks } = require('../services/taskService');
const { pushScheduleToCalendar } = require('../services/calendarService');
const { oauth2Client, getUserTokens } = require('../routes/authRoutes');

exports.getAiSchedule = async (req, res) => {
  try {
    const { availableHours } = req.query;
    const hours = availableHours ? parseInt(availableHours) : 8;

    // Fetch and dynamically score/sort tasks via the abstracted service method
    const dynamicallySortedTasks = await getSortedPendingTasks(req.user.id);

    // Check if there are no pending tasks to process
    if (!dynamicallySortedTasks || dynamicallySortedTasks.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No pending tasks found to schedule.",
        data: { calendarEvents: [], personalizedRecommendations: [] }
      });
    }

    // Pass the pre-sorted tasks directly into your optimized Gemini engine
    const aiSchedule = await generateAgenticSchedule(dynamicallySortedTasks, hours);

    let calendarLinks = [];
    let calendarStatus = "Skipped - No active Google session found. Please hit /api/auth/google first.";

    // Explicitly verify token state and publish to Google Calendar
    const userTokens = getUserTokens(req.user.id);
    if (userTokens && Object.keys(userTokens).length > 0) {
      oauth2Client.setCredentials(userTokens);
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
