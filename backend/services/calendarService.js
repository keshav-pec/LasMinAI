const { google } = require('googleapis');

const pushScheduleToCalendar = async (oauth2Client, aiScheduleEvents) => {
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  const successfullyInserted = [];

  // --- NEW: THE CLEANUP PHASE ---
  try {
    // 1. Fetch upcoming events created by LasMinAI
    const now = new Date().toISOString();
    const existingEvents = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now, // Only clean up future events
      q: 'LasMinAI:', // Search query to isolate our specific blocks
      singleEvents: true,
    });

    // 2. Delete the old LasMinAI blocks to prevent duplication
    const eventsToDelete = existingEvents.data.items || [];
    for (const event of eventsToDelete) {
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: event.id,
      });
      console.log(`🗑️ Deleted old schedule block: ${event.summary}`);
    }
  } catch (error) {
    console.error('❌ Error during calendar cleanup:', error.message);
  }

  // --- EXISTING: THE INSERTION PHASE ---
  for (const event of aiScheduleEvents) {
    const calendarEvent = {
      summary: `LasMinAI: ${event.taskTitle}`,
      description: event.focusModeRequired 
        ? '⚠️ High-Complexity Task. LasMinAI recommends disabling notifications.' 
        : 'LasMinAI autonomous scheduling block.',
      start: { dateTime: event.startTime, timeZone: 'Asia/Kolkata' },
      end: { dateTime: event.endTime, timeZone: 'Asia/Kolkata' },
      colorId: event.focusModeRequired ? '11' : '9' 
    };

    try {
      const response = await calendar.events.insert({
        calendarId: 'primary',
        resource: calendarEvent,
      });
      successfullyInserted.push(response.data.htmlLink);
    } catch (error) {
      console.error(`❌ Failed to insert ${event.taskTitle}:`, error.message);
    }
  }
  
  return successfullyInserted;
};

module.exports = { pushScheduleToCalendar };