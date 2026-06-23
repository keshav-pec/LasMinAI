const { GoogleGenAI, Type } = require('@google/genai');
require('dotenv').config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ==========================================
// 1. SCHEDULING BLUEPRINT & CONFIGURATION
// ==========================================
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
      User Timezone: Asia/Kolkata (IST)
      The current time is ${new Date().toISOString()}.
      The user has ${availableHours} hours available right now.
      
      Instructions:
      1. Analyze the 'technicalEffort' (estimated hours) and 'complexity' (1-10 scale) of each task.
      2. Schedule the tasks into logical blocks for a Google Calendar integration.
      3. Remember that the user would be expecting the Asia/Kolkata timezone.
      4. If a task requires more effort than available hours, chunk it into a smaller block.
      5. Generate 2 personalized productivity recommendations acknowledging the specific workload (e.g., suggesting a 15-minute screen break after a high-complexity coding task).
      6. Include emojis in your output (not much but frequently).
      7. Use a motivating and enthusiastic tone for the recommendations.

      Raw Task Data:
      ${JSON.stringify(prioritizedTasks, null, 2)}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `Raw Task Data:\n${JSON.stringify(prioritizedTasks, null, 2)}`,
      config: {
        systemInstruction: prompt,
        responseMimeType: 'application/json',
        responseSchema: scheduleSchema,
        temperature: 0.2,
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error('❌ AI Scheduling Error:', error);
    throw error;
  }
};

// ==========================================
// 2. CHAT PARSING & INTENT EXTRACTION (CRUD)
// ==========================================
const intentSchema = {
  type: Type.OBJECT,
  properties: {
    conversationalReply: { 
      type: Type.STRING, 
      description: "A natural, helpful response using Markdown formatting." 
    },
    action: { 
      type: Type.STRING, 
      description: "The primary intent: 'CREATE', 'READ', 'UPDATE', or 'NONE'",
      enum: ["CREATE", "READ", "UPDATE", "NONE"]
    },
    extractedTask: {
      type: Type.OBJECT,
      description: "Populate for CREATE or UPDATE actions.",
      properties: {
        title: { type: Type.STRING, description: "A concise title for the task. Do NOT include dates here." },
        deadline: { type: Type.STRING, description: "ISO 8601 date string representing the exact deadline. MUST be provided for CREATE." },
        complexity: { type: Type.NUMBER, description: "Scale of 1-10. Default to 5 if not specified." },
        technicalEffort: { type: Type.NUMBER, description: "Estimated hours to complete. Default to 2 if not specified." },
        status: { type: Type.STRING, enum: ["pending", "completed", "overdue"] },
        taskIdToUpdate: { type: Type.STRING, description: "If updating, the exact _id of the task from the Live Database Context." }
      }
    }
  },
  required: ["conversationalReply", "action"]
};

/**
 * Parses the message, injects live DB context, and determines the action.
 */
const parseUserMessage = async (userMessage, history = [], currentTasks = []) => {
  try {
    const now = new Date();
    
    const systemPrompt = `
      You are LasMinAI, an advanced productivity agent.
      Current Date/Time: ${now.toISOString()}
      User Timezone: Asia/Kolkata (IST)

      LIVE DATABASE CONTEXT (Current User Tasks):
      ${JSON.stringify(currentTasks, null, 2)}

      Instructions:
      1. Analyze the user's latest message alongside the conversation history and Live Database Context.
      2. If the user asks what tasks they have, set action to 'READ' and list the tasks from the Live Context in your conversationalReply.
      3. If the user is logging a NEW task, set action to 'CREATE' and extract all available parameters. Convert relative times (like "tomorrow") to ISO timestamps and put it EXPLICITLY in the 'deadline' field. Never put the date inside the 'title'.
      4. If the user wants to MODIFY an existing task, set action to 'UPDATE'. You MUST use semantic fuzzy matching to map the user's shorthand, acronyms, or partial names (e.g., "DBMS" for "Database Management Systems") to the correct task in the Live Context. Extract its exact '_id' as 'taskIdToUpdate'.
      5. If you have confused with two or more tasks, then ask the user exactly which task he/she wants to modify or ask about.
      6. CRITICAL: In your 'conversationalReply', you should use Markdown oftenly. Use **bolding** for important terms (task names, deadlines), use bullet points for lists, and use line breaks to make your response highly readable.
      7. NEVER echo the user's prompt. Answer intelligently. If they say a generic greeting, greet them back and ask how you can assist their productivity today.
      8. CRITICAL RULE: If you set action to 'CREATE', you MUST provide the 'title' and 'deadline' inside 'extractedTask'.
    `;

    const formattedContents = history.map(msg => ({
      role: msg.role === 'ai' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));
    formattedContents.push({ role: 'user', parts: [{ text: userMessage }] });

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: formattedContents,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: intentSchema,
        temperature: 0.1, 
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error('❌ Intent Parsing Error:', error);
    throw error;
  }
};

module.exports = { 
  generateAgenticSchedule, 
  parseUserMessage 
};
