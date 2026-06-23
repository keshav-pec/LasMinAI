const { google } = require('googleapis');

const pushScheduleToCalendar = async (oauth2Client, aiScheduleEvents, userTimezone = 'Asia/Kolkata') => {
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  const successfullyInserted = [];

  // 1. Fetch upcoming events created by LasMinAI
  const now = new Date().toISOString();
  let existingEventsList = [];
  try {
    const existingEvents = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now, 
      q: 'LasMinAI:', 
      singleEvents: true,
      maxResults: 2500, // Make sure we get enough events to check extendedProperties
    });
    existingEventsList = existingEvents.data.items || [];
  } catch (error) {
    console.error('❌ Error fetching calendar events:', error.message);
  }

  // 2. Process and Insert/Update events
  for (const event of aiScheduleEvents) {
    const calendarEvent = {
      summary: `LasMinAI: ${event.taskTitle}`,
      description: event.focusModeRequired 
        ? '⚠️ High-Complexity Task. LasMinAI recommends disabling notifications.' 
        : 'LasMinAI autonomous scheduling block.',
      start: { dateTime: event.startTime.replace(/Z$/, ''), timeZone: userTimezone },
      end: { dateTime: event.endTime.replace(/Z$/, ''), timeZone: userTimezone },
      colorId: event.focusModeRequired ? '11' : '9',
      extendedProperties: {
        private: {
          taskId: event.taskId
        }
      }
    };

    try {
      // Check if an event for this taskId already exists in the future
      const existingEvent = existingEventsList.find(e => 
        e.extendedProperties && 
        e.extendedProperties.private && 
        e.extendedProperties.private.taskId === event.taskId
      );

      let response;
      if (existingEvent) {
        // Update existing event
        response = await calendar.events.update({
          calendarId: 'primary',
          eventId: existingEvent.id,
          resource: calendarEvent,
        });
        console.log(`🔄 Updated calendar block for task: ${event.taskTitle}`);
      } else {
        // Insert new event
        response = await calendar.events.insert({
          calendarId: 'primary',
          resource: calendarEvent,
        });
        console.log(`✅ Inserted new calendar block for task: ${event.taskTitle}`);
      }
      successfullyInserted.push(response.data.htmlLink);
    } catch (error) {
      console.error(`❌ Failed to sync ${event.taskTitle}:`, error.message);
    }
  }
  
  return successfullyInserted;
};

module.exports = { pushScheduleToCalendar };