const { GoogleGenAI, Type } = require('@google/genai');
require('dotenv').config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ==========================================
// 1. SHARED CONSTANTS
// ==========================================
const COMMON_FORMATTING_RULES = `
      CRITICAL FORMATTING RULES: 
         - Your response MUST be highly visual and spread out.
         - You MUST use true Markdown bullet points (\`-\`) on NEW LINES. NEVER write lists inline in a single paragraph. 
         - Use line breaks (\\n) between paragraphs. 
         - You MUST use emojis, **bolding** for keywords. 
         - Use inline code blocks (\`like this\`) to highlight specific task names or times. Make it look beautiful and easy to skim.
         - NATURAL DATES: When displaying dates or times in your conversational reply, you MUST use natural language. If a date is today, say "Today". If it is tomorrow, say "Tomorrow". Only use exact dates (e.g., "July 28th") for dates further in the future. 
         - NEVER mention the year (e.g., "2026") or the time zone (e.g., UTC or IST) in your responses.
         - CRITICAL TIMEZONE: ALL dates/times in the LIVE DATABASE CONTEXT are stored in UTC. You MUST mentally convert them to the user's local timezone (provided as 'User Timezone Offset') before displaying. For example, if the offset is +05:30 and a deadline is 2026-06-30T18:29:00Z (UTC), the local time is 11:59 PM. ALWAYS show the converted local time, NEVER show UTC times.
`;

// ==========================================
// 2. WORKSTATION CHAT & EXECUTION SCHEMAS
// ==========================================
const workstationSchema = {
  type: Type.OBJECT,
  properties: {
    conversationalReply: { 
      type: Type.STRING, 
      description: "A visually beautiful response for the UI using Markdown, bullets, and emojis." 
    },
    voiceReply: {
      type: Type.STRING,
      description: "A plain-text script specifically written to be spoken out loud by a voice assistant. NEVER use Markdown, emojis, URLs, or weird time formats (like ISO strings or 'IST'). Write exactly how a human would speak it."
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
          focusModeRequired: { type: Type.BOOLEAN, description: "True if the task has a complexity >= 4" }
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
  required: ["conversationalReply", "voiceReply", "action"]
};

/**
 * Parses the Work Station chat, injects live pending tasks, and generates schedules.
 */
const parseWorkstationMessage = async (userMessage, history = [], currentTasks = [], localTime = '', timezoneOffset = '+00:00') => {
  try {
    const now = new Date();
    
    const systemPrompt = `
      You are LasMinAI's Execution Manager.
      Current Local Date/Time: ${localTime || now.toLocaleString()}
      User Timezone Offset: ${timezoneOffset}

      LIVE PENDING TASKS:
      ${JSON.stringify(currentTasks, null, 2)}

      Instructions:
      1. Analyze the user's message and the conversation history. Do not hallucinate while helping the user.
      2. The Work Station flow requires knowing the user's 'available time' and 'execution strategy' (specific task, group of tasks, or Pomodoro technique).
      3. If the user hasn't provided their available time or hasn't selected a strategy, set action to 'GATHER_INFO' and ask them in the 'conversationalReply'. 
      4. DO NOT list or mention the user's upcoming or pending tasks in your 'conversationalReply' unless the user explicitly requests it (e.g., 'what are my tasks?' or 'what do I have today?'). If they DO explicitly ask, you MUST list their LIVE PENDING TASKS in your reply.
      5. If the user has provided enough info to proceed, set action to 'EXECUTE_SCHEDULE'. You must then generate the 'calendarEvents' array and 'personalizedRecommendations'.
      6. When scheduling, assign logical blocks of time. If a task requires more effort than available, chunk it.
      7. ALWAYS include the exact '_id' of the task in 'taskId' for every calendar event.
      8. Keep your tone highly motivating, professional, and use Markdown for readability.
      9. CRITICAL: NEVER use or mention the word "complexity" in your conversational reply. The complexity metric is strictly for internal mathematical calculations only. Do not attempt to describe it.
      10. ${COMMON_FORMATTING_RULES}
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

    const cleanText = response.text.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (error) {
    console.error(`❌ Workstation Parsing Error: ${error.message || error}`);
    throw error;
  }
};

// ==========================================
// 3. Task Prompter & INTENT EXTRACTION (CRUD)
// ==========================================
const intentSchema = {
  type: Type.OBJECT,
  properties: {
    conversationalReply: { 
      type: Type.STRING, 
      description: "A visually beautiful response for the UI using Markdown, bullets, and emojis." 
    },
    voiceReply: {
      type: Type.STRING,
      description: "A plain-text script specifically written to be spoken out loud by a voice assistant. NEVER use Markdown, emojis, URLs, or weird time formats (like ISO strings or 'IST'). Write exactly how a human would speak it."
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
        description: { type: Type.STRING, description: "Detailed helpful context, instructions, or elaboration provided by the user. If they provide none, leave this empty." },
        deadline: { type: Type.STRING, description: "ISO 8601 exact date string. NEVER OMIT THIS FIELD. Calculate relative times (e.g. 'today' -> 11:59 PM today)." },
        complexity: { type: Type.NUMBER, description: "Scale of 1-5 based on user's feeling (1=very easy, 2=easy, 3=normal, 4=hard, 5=very hard). You MUST intelligently extract this." },
        technicalEffort: { type: Type.NUMBER, description: "Estimated time in minutes required. Default 120." }
      },
      required: ["title", "deadline"]
    },
    extractedTaskUpdate: {
      type: Type.OBJECT,
      description: "Populate ONLY for UPDATE actions.",
      properties: {
        taskIdToUpdate: { type: Type.STRING, description: "The exact _id of the task from the Live Database Context." },
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        deadline: { type: Type.STRING },
        complexity: { type: Type.NUMBER, description: "Scale of 1-5 based on user's feeling (1=very easy, 2=easy, 3=normal, 4=hard, 5=very hard)." },
        technicalEffort: { type: Type.NUMBER, description: "Estimated time in minutes required." },
        status: { type: Type.STRING, enum: ["pending", "completed", "overdue"] }
      },
      required: ["taskIdToUpdate"]
    }
  },
  required: ["conversationalReply", "voiceReply", "action"]
};

/**
 * Parses the message, injects live DB context, and determines the action.
 */
const parseUserMessage = async (userMessage, history = [], currentTasks = [], localTime = '', timezoneOffset = '+00:00') => {
  try {
    const now = new Date();
    
    const systemPrompt = `
      You are LasMinAI (powered by gemini and developed by Keshav Goyal), an advanced productivity agent.
      Current Local Date/Time: ${localTime || now.toLocaleString()}
      User Timezone Offset: ${timezoneOffset}

      LIVE DATABASE CONTEXT (Current User Tasks):
      ${JSON.stringify(currentTasks, null, 2)}

      Instructions:
      1. Analyze the user's latest message alongside the conversation history and Live Database Context. Do not Hallucinate while helping the user.
      2. CRITICAL LIMITATION: You can only CREATE or UPDATE ONE single task per request. If the user asks to perform actions on multiple tasks simultaneously (e.g., 'Add 3 tasks'), you MUST only perform the action on the FIRST task. In your 'conversationalReply', you MUST explicitly tell the user: "Let's add tasks one by one for more clarity and detailing." and state which task you added.
      3. If the user asks what tasks they have, set action to 'READ' and list the tasks from the Live Context in your conversationalReply.
      4. If the user is logging a NEW task, set action to 'CREATE'. You MUST extract a concise 'title' (with no dates/times in it) AND you MUST calculate the exact ISO timestamp for the 'deadline'. If the user provides extra elaboration or helpful context about the task, populate the 'description' field. If they provide no context, leave it empty.
      5. If the user wants to MODIFY an existing task, set action to 'UPDATE'. You MUST use semantic fuzzy matching to map the task to the Live Context and extract its exact '_id'.
      6. If you have confused with two or more tasks, then ask the user exactly which task he/she wants to modify or ask about.
      7. ${COMMON_FORMATTING_RULES}
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

    const cleanText = response.text.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (error) {
    console.error(`❌ Intent Parsing Error: ${error.message || error}`);
    throw error;
  }
};

// ==========================================
// 3. REMINDER ASSISTANT SCHEMAS
// ==========================================
const reminderIntentSchema = {
  type: Type.OBJECT,
  properties: {
    conversationalReply: { 
      type: Type.STRING, 
      description: "A visually beautiful response for the UI using Markdown, bullets, and emojis." 
    },
    voiceReply: {
      type: Type.STRING,
      description: "A plain-text script specifically written to be spoken out loud by a voice assistant. NEVER use Markdown, emojis, URLs, or weird time formats (like ISO strings or 'IST'). Write exactly how a human would speak it."
    },
    action: { 
      type: Type.STRING, 
      description: "The primary intent: 'CREATE', 'READ', 'UPDATE', 'DISMISS', or 'NONE'",
      enum: ["CREATE", "READ", "UPDATE", "DISMISS", "NONE"]
    },
    extractedReminderCreate: {
      type: Type.OBJECT,
      description: "Populate ONLY for CREATE actions.",
      properties: {
        title: { type: Type.STRING, description: "Title of the reminder." },
        remindAt: { type: Type.STRING, description: "ISO 8601 exact date string." },
        snoozable: { type: Type.BOOLEAN, description: "Whether the reminder can be snoozed. Default to true." }
      },
      required: ["title", "remindAt"]
    },
    extractedReminderUpdate: {
      type: Type.OBJECT,
      description: "Populate ONLY for UPDATE actions.",
      properties: {
        reminderId: { type: Type.STRING, description: "The exact _id of the reminder from Live Active Reminders." },
        title: { type: Type.STRING },
        remindAt: { type: Type.STRING }
      },
      required: ["reminderId"]
    },
    extractedReminderDismiss: {
      type: Type.OBJECT,
      description: "Populate ONLY for DISMISS actions.",
      properties: {
        reminderId: { type: Type.STRING, description: "The exact _id of the reminder from Live Active Reminders to dismiss." }
      },
      required: ["reminderId"]
    }
  },
  required: ["conversationalReply", "voiceReply", "action"]
};

/**
 * Parses the reminder message, injects live tasks and active reminders context.
 */
const parseReminderMessage = async (userMessage, history = [], activeTasks = [], activeReminders = [], localTime = '', timezoneOffset = '+00:00') => {
  try {
    const now = new Date();
    
    const systemPrompt = `
      You are LasMinAI's Reminders Bot.
      Current Local Date/Time: ${localTime || now.toLocaleString()}
      User Timezone Offset: ${timezoneOffset}

      LIVE DATABASE CONTEXT:
      Active Reminders: ${JSON.stringify(activeReminders, null, 2)}
      Live Tasks (For context only, do NOT manage tasks here): ${JSON.stringify(activeTasks, null, 2)}

      Instructions:
      1. You manage CUSTOM REMINDERS, not core tasks. Do not hallucinate while helping the user.
      2. If the user asks for reminders, set action to 'READ' and list them.
      3. If the user wants to create a reminder, set action to 'CREATE' and extract 'title' and 'remindAt' (ISO 8601).
      4. If modifying, set action to 'UPDATE' and provide 'reminderId'.
      5. If they want to dismiss/delete a reminder, set action to 'DISMISS' and provide 'reminderId'.
      6. CRITICAL TONE RULE: Your conversationalReply should be short and to the point. Do not over-explain. Do not mention the user's task load unless they specifically ask or it directly conflicts with their reminder request.
      7. ${COMMON_FORMATTING_RULES}
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
        responseSchema: reminderIntentSchema,
        temperature: 0.1, 
      }
    });

    const cleanText = response.text.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (error) {
    console.error(`❌ Reminder Parsing Error: ${error.message || error}`);
    throw error;
  }
};

// ==========================================
// 4. GENERAL CHAT SCHEMA
// ==========================================
const generalChatSchema = {
  type: Type.OBJECT,
  properties: {
    reply: {
      type: Type.STRING,
      description: "A natural, conversational reply to the user."
    },
    voiceReply: {
      type: Type.STRING,
      description: "A plain-text script specifically written to be spoken out loud by a voice assistant. NEVER use Markdown, emojis, URLs, or weird time formats. Write exactly how a human would speak it."
    }
  },
  required: ["reply", "voiceReply"]
};

const parseGeneralMessage = async (userMessage, localTime) => {
  try {
    const systemPrompt = `
      You are LasMinAI, an intelligent productivity assistant.
      The user is asking a general conversational question (e.g., "how are you", "what time is it").
      Answer naturally and concisely.
      Current Time: ${localTime}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: generalChatSchema,
        temperature: 0.7, 
      }
    });

    const cleanText = response.text.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (error) {
    console.error(`❌ General Chat Parsing Error: ${error.message || error}`);
    throw error;
  }
};

// ==========================================
// 5. MASTER ORCHESTRATOR SCHEMA
// ==========================================
const orchestratorSchema = {
  type: Type.OBJECT,
  properties: {
    intent: {
      type: Type.STRING,
      description: "The routed intent of the user's message.",
      enum: ["TASK_PROMPTER", "WORK_STATION", "REMINDER", "GENERAL_CHAT", "UNKNOWN"]
    },
    generalReply: {
      type: Type.STRING,
      description: "If intent is GENERAL_CHAT or UNKNOWN, provide a natural conversational reply here."
    },
    generalReplyVoice: {
      type: Type.STRING,
      description: "If intent is GENERAL_CHAT or UNKNOWN, provide the plain-text script to be spoken aloud."
    }
  },
  required: ["intent"]
};

/**
 * Determines which of the 3 modules the user's spoken intent belongs to.
 */
const parseOrchestratorIntent = async (userMessage) => {
  try {
    const systemPrompt = `
      You are the Master Orchestrator for LasMinAI.
      Your only job is to evaluate the user's spoken request and route it to the correct AI module.

      1. TASK_PROMPTER: If the user is logging a new task, modifying an existing task, or asking what tasks they have to do today. Example: "Remind me to buy groceries", "Log a new task to fix the bug", "What's on my to-do list?". (Note: A task is a general to-do item. Do not confuse with custom time-based reminders).
      2. WORK_STATION: If the user is asking to schedule time blocks on their calendar, wants to start working, execute tasks, use pomodoro, or asks for productivity strategies. Example: "I have 2 hours right now", "Let's use pomodoro", "Schedule my math homework for tonight".
      3. REMINDER: If the user explicitly wants a simple custom reminder (not a core to-do task). Example: "Remind me to call mom at 5pm", "What are my reminders?".
      4. GENERAL_CHAT: If the user is asking a general conversational question, greeting you, or asking for facts like "what is the time now", "hello", "how are you".
      5. UNKNOWN: If the request is complete gibberish.
      
      If the intent is GENERAL_CHAT or UNKNOWN, you MUST fill out 'generalReply' and 'generalReplyVoice' to answer their question directly, so we don't have to make a second AI call. Be concise and friendly.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: orchestratorSchema,
        temperature: 0.1, 
      }
    });

    const cleanText = response.text.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (error) {
    console.error(`❌ Orchestrator Parsing Error: ${error.message || error}`);
    throw error;
  }
};

/**
 * Helper to pause execution
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generates an HTML Email Digest using Google Search Grounding for context.
 * Implements Exponential Backoff and Graceful Fallback to non-grounding if quota is exhausted.
 */
const generateTaskDigestMaterial = async (tasks, retries = 3, backoffDelay = 2000) => {
  try {
    const systemPrompt = `
      You are LasMinAI's helpful Task Preparation Assistant. 
      The user is about to start the following tasks in the next 2 hours.
      Your job is to generate a beautifully formatted HTML email digest containing helpful links, tutorials, and quick-start prep material for these specific tasks.
      
      Tasks:
      ${JSON.stringify(tasks.map(t => ({ title: t.title, description: t.description })), null, 2)}

      Instructions:
      1. If the user provided a 'description' for a task, use it as your guiding light.
      2. DO NOT invent, guess, or hallucinate any URLs or links to tutorials/videos (they will be dead links).
      3. Instead, for each task, generate a "Magic AI Prompt". This should be a highly optimized, detailed prompt that the user can copy/paste into Gemini to get the best possible help, starting code, or tutorial.
      4. As an added bonus, encode that exact prompt into a clickable Perplexity or ChatGPT URL (e.g., <a href="https://www.perplexity.ai/search?q=YOUR+URL+ENCODED+PROMPT">Ask AI instantly</a>).
      5. The output MUST be raw HTML (no markdown code blocks, just raw HTML). 
      6. Use inline CSS. Make it look modern, clean, and inspiring (e.g., sans-serif fonts, soft colors, distinct sections for each task).
      7. Include a brief encouraging message at the top.
    `;

    const config = {
      systemInstruction: systemPrompt,
      temperature: 0.4
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [{ role: 'user', parts: [{ text: "Generate my pre-flight task prep email in HTML." }] }],
      config: config
    });

    const cleanHtml = response.text.replace(/```html/gi, '').replace(/```/g, '').trim();
    return cleanHtml;
    
  } catch (error) {
    const errorString = error.message || error.toString();
    console.error(`⚠️ Gemini Generation Error: ${errorString}`);

    // If Rate Limit (429) or Quota Exhausted, use exponential backoff
    if (errorString.includes('429') || errorString.includes('RESOURCE_EXHAUSTED')) {
      if (retries > 0) {
        console.log(`⏳ Rate Limit Hit. Backing off for ${backoffDelay}ms... (${retries} retries left)`);
        await sleep(backoffDelay);
        return await generateTaskDigestMaterial(tasks, retries - 1, backoffDelay * 2);
      }
    }

    console.error(`❌ Fatal Generation Error: ${errorString}`);
    return "<p>Unable to load dynamic prep material at this time, but you've got this! Start your tasks soon.</p>";
  }
};

const autofillSchema = {
  type: Type.ARRAY,
  description: "A list of filled form fields.",
  items: {
    type: Type.OBJECT,
    properties: {
      fieldKey: { type: Type.STRING, description: "The exact 'id' or 'name' of the form field from the provided schema." },
      value: { type: Type.STRING, description: "The suggested autofill value." }
    },
    required: ["fieldKey", "value"]
  }
};

const generateFormAutofillData = async (formSchema, userProfile, retries = 3, backoffDelay = 2000) => {
  try {
    const systemInstruction = `
      You are an expert form auto-filler assistant.
      The user has provided a JSON array representing the fields found on a web form, and their comprehensive User Profile (including a 'persona' object).
      Your job is to match the user's profile information to the form fields and return an array of filled fields.
      
      CRITICAL INSTRUCTIONS FOR PERSONA DATA:
      - The 'persona' object contains rich, raw string data typed by the user (e.g. they might have typed "95%" for marks or "A+" for grades).
      - You must intelligently adapt this raw string data to fit the specific input type required by the form schema. If the schema demands a pure number for a "percentage" field, strip the "%" sign. If it is a generic text field, use your best judgment.
      - If the user profile lacks the necessary information, invent highly realistic dummy data to fill the gaps.
      - For <select> dropdowns, ensure your output perfectly matches one of the expected option values if they are provided, or matches the expected format.
      
      Always prioritize matching the real user profile data first. Only return the fields you can confidently fill.
    `;

    const config = {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: autofillSchema,
      temperature: 0.2
    };

    const promptText = `User Profile:\n${JSON.stringify(userProfile, null, 2)}\n\nForm Schema:\n${JSON.stringify(formSchema, null, 2)}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [{ role: 'user', parts: [{ text: promptText }] }],
      config
    });

    const parsedArray = JSON.parse(response.text);
    
    // Map array back to a key-value object for the frontend
    const mappedResponse = {};
    parsedArray.forEach(item => {
      mappedResponse[item.fieldKey] = item.value;
    });

    return { success: true, data: mappedResponse };
  } catch (error) {
    const errorString = error.message || error.toString();
    console.error(`⚠️ Gemini Autofill Error: ${errorString}`);

    // If Rate Limit (429) or Quota Exhausted, use exponential backoff
    if (errorString.includes('429') || errorString.includes('RESOURCE_EXHAUSTED')) {
      if (retries > 0) {
        console.log(`⏳ Rate Limit Hit. Backing off for ${backoffDelay}ms... (${retries} retries left)`);
        await sleep(backoffDelay);
        return await generateFormAutofillData(formSchema, userProfile, retries - 1, backoffDelay * 2);
      }
    }

    return { success: false, error: errorString };
  }
};

// ==========================================
// 8. EXTENSION DOM PARSER
// ==========================================
const domTaskExtractionSchema = {
  type: Type.ARRAY,
  description: "A list of extracted tasks from the webpage.",
  items: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "A concise title for the task." },
      description: { type: Type.STRING, description: "Detailed helpful context or instructions found." },
      deadline: { type: Type.STRING, description: "ISO 8601 date string if a deadline is implied. Omit if none." },
      complexity: { type: Type.NUMBER, description: "Scale 1-5 (1=easy, 5=hard). Default 3." },
      technicalEffort: { type: Type.NUMBER, description: "Estimated minutes. Default 120." }
    },
    required: ["title"]
  }
};

const extractTasksFromDOM = async (textContext, urlContext, localTime = '', timezoneOffset = '+00:00') => {
  try {
    const systemInstruction = `
      You are an intelligent task parser for LasMinAI.
      The user has right-clicked on a webpage and triggered the DOM reader.
      I will provide you with the raw text extracted from the webpage.
      URL context: ${urlContext}
      Current Local Date/Time: ${localTime || new Date().toLocaleString()}
      User Timezone Offset: ${timezoneOffset}
      
      Your job is to read this unstructured text and find ALL implied action items, homework, tickets, or tasks.
      CRITICAL: Do not stop at just 3 tasks! Extract EVERY SINGLE valid task you can find on the page (up to 15 tasks).
      CRITICAL: If the text includes meeting links, documentation URLs, or any (https://...) references relevant to the task, YOU MUST include them in the description field.
      Estimate their complexity (1-5) and technical effort in minutes (5-1440m).
      Deduce the deadline if mentioned.
      CRITICAL TIMESTAMPS: You MUST deduce the deadline relative to the 'Current Local Date/Time' provided above. For example, if today is June 2026, '31st of the month' means June 31, 2026 (or next valid 31st). DO NOT hallucinate past years. The deadline field MUST be formatted as an ISO 8601 UTC string (convert the local time you deduced using the 'User Timezone Offset').
      Return an array of JSON objects representing the tasks.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [{ role: 'user', parts: [{ text: textContext }] }],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: domTaskExtractionSchema,
        temperature: 0.2
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error(`❌ DOM Parsing Error:`, error);
    throw error;
  }
};

module.exports = {
  parseUserMessage,
  parseWorkstationMessage,
  parseReminderMessage,
  parseGeneralMessage,
  parseOrchestratorIntent,
  generateTaskDigestMaterial,
  generateFormAutofillData,
  extractTasksFromDOM
};
