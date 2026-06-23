const { GoogleGenAI, Type } = require('@google/genai');
require('dotenv').config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ==========================================
// 1. WORKSTATION CHAT & EXECUTION SCHEMAS
// ==========================================
const workstationSchema = {
  type: Type.OBJECT,
  properties: {
    conversationalReply: { 
      type: Type.STRING, 
      description: "A natural, helpful response using Markdown. Ask the user for their preferred strategy or available time if not provided." 
    },
    action: { 
      type: Type.STRING, 
      description: "The primary intent: 'GATHER_INFO', 'EXECUTE_SCHEDULE', or 'NONE'",
      enum: ["GATHER_INFO", "EXECUTE_SCHEDULE", "NONE"]
    },
    calendarEvents: {
      type: Type.ARRAY,
      description: "Calculated calendar blocks. Populate ONLY if action is 'EXECUTE_SCHEDULE'.",
      items: {
        type: Type.OBJECT,
        properties: {
          taskId: { type: Type.STRING, description: "The exact _id of the task from the Live Database Context" },
          taskTitle: { type: Type.STRING },
          startTime: { type: Type.STRING, description: "ISO 8601 string for Google Calendar start time" },
          endTime: { type: Type.STRING, description: "ISO 8601 string for Google Calendar end time" },
          focusModeRequired: { type: Type.BOOLEAN, description: "True if the task has a complexity > 5" }
        },
        required: ["taskId", "taskTitle", "startTime", "endTime", "focusModeRequired"]
      }
    },
    personalizedRecommendations: {
      type: Type.ARRAY,
      description: "2-3 highly specific productivity tips. Populate ONLY if action is 'EXECUTE_SCHEDULE'.",
      items: { type: Type.STRING }
    }
  },
  required: ["conversationalReply", "action"]
};

/**
 * Parses the Work Station chat, injects live pending tasks, and generates schedules.
 */
const parseWorkstationMessage = async (userMessage, history = [], currentTasks = [], userTimezone = 'Asia/Kolkata', localTime = '') => {
  try {
    const now = new Date();
    
    const systemPrompt = `
      You are LasMinAI's Execution Manager.
      Current Local Date/Time: ${localTime || now.toLocaleString()}
      User Timezone: ${userTimezone}

      LIVE PENDING TASKS:
      ${JSON.stringify(currentTasks, null, 2)}

      Instructions:
      1. Analyze the user's message and the conversation history.
      2. The Work Station flow requires knowing the user's 'available time' and 'execution strategy' (specific task, group of tasks, or Pomodoro technique).
      3. If the user hasn't provided their available time or hasn't selected a strategy, set action to 'GATHER_INFO' and ask them in the 'conversationalReply'. Propose options based on their LIVE PENDING TASKS.
      4. If the user has provided enough info to proceed, set action to 'EXECUTE_SCHEDULE'. You must then generate the 'calendarEvents' array and 'personalizedRecommendations'.
      5. When scheduling, assign logical blocks of time. If a task requires more effort than available, chunk it. 
      6. For Pomodoro, you can schedule 25-minute blocks with 5-minute breaks.
      7. ALWAYS include the exact '_id' of the task in 'taskId' for every calendar event.
      8. Keep your tone highly motivating, professional, and use Markdown for readability.
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
        responseSchema: workstationSchema,
        temperature: 0.1, 
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error(`❌ Workstation Parsing Error: ${error.message || error}`);
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
    extractedTaskCreate: {
      type: Type.OBJECT,
      description: "Populate ONLY for CREATE actions.",
      properties: {
        title: { type: Type.STRING, description: "A concise title for the task. Do NOT include dates here." },
        deadline: { type: Type.STRING, description: "ISO 8601 exact date string. NEVER OMIT THIS FIELD. Calculate relative times (e.g. 'today' -> 11:59 PM today)." },
        complexity: { type: Type.NUMBER, description: "Scale of 1-10. Default to 5 if not specified." },
        technicalEffort: { type: Type.NUMBER, description: "Estimated hours to complete. Default to 2 if not specified." }
      },
      required: ["title", "deadline"]
    },
    extractedTaskUpdate: {
      type: Type.OBJECT,
      description: "Populate ONLY for UPDATE actions.",
      properties: {
        taskIdToUpdate: { type: Type.STRING, description: "The exact _id of the task from the Live Database Context." },
        title: { type: Type.STRING },
        deadline: { type: Type.STRING },
        complexity: { type: Type.NUMBER },
        technicalEffort: { type: Type.NUMBER },
        status: { type: Type.STRING, enum: ["pending", "completed", "overdue"] }
      },
      required: ["taskIdToUpdate"]
    }
  },
  required: ["conversationalReply", "action"]
};

/**
 * Parses the message, injects live DB context, and determines the action.
 */
const parseUserMessage = async (userMessage, history = [], currentTasks = [], userTimezone = 'Asia/Kolkata', localTime = '') => {
  try {
    const now = new Date();
    
    const systemPrompt = `
      You are LasMinAI, an advanced productivity agent.
      Current Local Date/Time: ${localTime || now.toLocaleString()}
      User Timezone: ${userTimezone}

      LIVE DATABASE CONTEXT (Current User Tasks):
      ${JSON.stringify(currentTasks, null, 2)}

      Instructions:
      1. Analyze the user's latest message alongside the conversation history and Live Database Context.
      2. If the user asks what tasks they have, set action to 'READ' and list the tasks from the Live Context in your conversationalReply.
      3. If the user is logging a NEW task, set action to 'CREATE'. You MUST extract a concise 'title' (with no dates/times in it) AND you MUST calculate the exact ISO timestamp for the 'deadline'. Both 'title' and 'deadline' MUST be explicitly populated in the 'extractedTaskCreate' object. If the user provides a date without a specific time (e.g. "due today"), default the time to 11:59 PM of that day.
      4. If the user wants to MODIFY an existing task, set action to 'UPDATE'. You MUST use semantic fuzzy matching to map the task to the Live Context and extract its exact '_id' as 'taskIdToUpdate' inside the 'extractedTaskUpdate' object. You MUST ALSO extract and provide the new values for the properties being updated.
      5. If you have confused with two or more tasks, then ask the user exactly which task he/she wants to modify or ask about.
      6. CRITICAL: In your 'conversationalReply', you MUST convert all task deadlines from UTC to the 'User Timezone' before displaying them to the user. Never show raw UTC times to the user. Use **bolding** for important terms, bullet points for lists, and line breaks for readability.
      7. NEVER echo the user's prompt. Answer intelligently. If they say a generic greeting, greet them back and ask how you can assist their productivity today.
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
    console.error(`❌ Intent Parsing Error: ${error.message || error}`);
    throw error;
  }
};

module.exports = { 
  parseWorkstationMessage, 
  parseUserMessage 
};
