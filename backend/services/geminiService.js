const { GoogleGenAI, Type } = require('@google/genai');
require('dotenv').config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// The blueprint Gemini MUST follow
const scheduleSchema = {
  type: Type.OBJECT,
  properties: {
    calendarEvents: {
      type: Type.ARRAY,
      description: "A list of calculated calendar blocks to execute the tasks.",
      items: {
        type: Type.OBJECT,
        properties: {
          taskTitle: { type: Type.STRING },
          startTime: { type: Type.STRING, description: "ISO 8601 string for Google Calendar start time" },
          endTime: { type: Type.STRING, description: "ISO 8601 string for Google Calendar end time" },
          focusModeRequired: { type: Type.BOOLEAN, description: "True if the task has a complexity > 5" }
        },
        required: ["taskTitle", "startTime", "endTime", "focusModeRequired"]
      }
    },
    personalizedRecommendations: {
      type: Type.ARRAY,
      description: "2-3 highly specific productivity tips based on the technical effort and complexity of the current batch.",
      items: { type: Type.STRING }
    }
  },
  required: ["calendarEvents", "personalizedRecommendations"]
};

/**
 * Takes the prioritized task array and returns a structured AI schedule.
 */
const generateAgenticSchedule = async (prioritizedTasks, availableHours = 8) => {
  try {
    const prompt = `
      You are the core logic engine of LasMinAI.
      You have been provided a prioritized JSON array of tasks. 
      The current time is ${new Date().toISOString()}.
      The user has ${availableHours} hours available right now.
      
      Instructions:
      1. Analyze the 'technicalEffort' (estimated hours) and 'complexity' (1-10 scale) of each task.
      2. Schedule the tasks into logical blocks for a Google Calendar integration.
      3. If a task requires more effort than available hours, chunk it into a smaller block.
      4. Generate 2 personalized productivity recommendations acknowledging the specific workload (e.g., suggesting a 15-minute screen break after a high-complexity coding task).
      5. Use a motivating tone for the recommendations.

      Raw Task Data:
      ${JSON.stringify(prioritizedTasks, null, 2)}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: `Raw Task Data:\n${JSON.stringify(prioritizedTasks, null, 2)}`, // Keep prompt tiny!
      config: {
        systemInstruction: prompt,
        responseMimeType: 'application/json',
        responseSchema: scheduleSchema,
        temperature: 0.2, // Low temperature for deterministic, logical scheduling
      }
    });

    // The output is perfectly structured JSON ready for Google Calendar API
    return JSON.parse(response.text);

  } catch (error) {
    console.error('❌ AI Scheduling Error:', error);
    throw error;
  }
};

module.exports = { generateAgenticSchedule };