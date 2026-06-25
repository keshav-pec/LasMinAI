const { parseWorkstationMessage } = require('../services/geminiService');
const { getSortedPendingTasks } = require('../services/taskService');
const { pushScheduleToCalendar } = require('../services/calendarService');
const { oauth2Client, getUserTokens } = require('../routes/authRoutes');

exports.handleWorkstationChat = async (req, res) => {
  try {
    const { message, history, userTimezone, localTime } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: "Message is required." });
    }

    // Fetch the live pending tasks for context and take top 10 to prevent token explosion
    let dynamicallySortedTasks = await getSortedPendingTasks(req.user.id);
    dynamicallySortedTasks = dynamicallySortedTasks.slice(0, 10);

    // Pass everything to the AI Brain (Workstation Persona)
    const aiAnalysis = await parseWorkstationMessage(message, history || [], dynamicallySortedTasks, userTimezone, localTime);

    let calendarLinks = [];
    let calendarStatus = "Awaiting user preference before scheduling.";

    // If the AI decides it's time to execute the schedule
    if (aiAnalysis.action === 'EXECUTE_SCHEDULE' && aiAnalysis.calendarEvents && aiAnalysis.calendarEvents.length > 0) {
      // Explicitly verify token state and publish to Google Calendar
      const userTokens = await getUserTokens(req.user.id);
      if (userTokens && Object.keys(userTokens).length > 0) {
        oauth2Client.setCredentials(userTokens);
        calendarLinks = await pushScheduleToCalendar(oauth2Client, aiAnalysis.calendarEvents, userTimezone);
        calendarStatus = `Successfully synced ${calendarLinks.length} events to Google Calendar.`;
      } else {
        calendarStatus = "Skipped - No active Google session found. Please authenticate.";
      }
    }

    res.status(200).json({
      success: true,
      reply: aiAnalysis.conversationalReply,
      voiceReply: aiAnalysis.voiceReply,
      actionTaken: aiAnalysis.action,
      calendarStatus,
      calendarLinks,
      personalizedRecommendations: aiAnalysis.personalizedRecommendations || []
    });

  } catch (error) {
    console.error('❌ Workstation Controller Error:', error);
    res.status(500).json({ success: false, error: "Failed to process message." });
  }
};
