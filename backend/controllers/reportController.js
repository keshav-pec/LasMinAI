const { google } = require('googleapis');
const { GoogleGenAI } = require('@google/genai');
const User = require('../models/User');
const Task = require('../models/Task');
const { oauth2Client } = require('../routes/authRoutes');

// Instantiate Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const escapeHtml = (unsafe) => {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const generateGoogleDocReport = async (req, res) => {
  try {
    const { date, timezone, timezoneOffset } = req.query; // format: YYYY-MM-DD
    const userId = req.user.id; // from auth middleware

    if (!date || typeof date !== 'string') {
      return res.status(400).json({ success: false, message: 'Valid Date string is required (YYYY-MM-DD)' });
    }

    const [year, month, day] = date.split('-');
    
    // Parse the timezoneOffset (e.g., '+05:30' or '-04:00') into minutes
    const offsetMatch = (timezoneOffset || '+00:00').match(/^([+-])(\d{2}):(\d{2})$/);
    const offsetMinutes = offsetMatch 
      ? (offsetMatch[1] === '+' ? 1 : -1) * (parseInt(offsetMatch[2]) * 60 + parseInt(offsetMatch[3]))
      : 0;

    // Construct the bounds strictly in UTC based on the user's offset
    // 00:00:00 local time -> convert to UTC by subtracting the offset
    const localStartMs = new Date(`${year}-${month}-${day}T00:00:00.000Z`).getTime();
    const startOfDay = new Date(localStartMs - offsetMinutes * 60000);
    
    // 23:59:59 local time -> convert to UTC by subtracting the offset
    const localEndMs = new Date(`${year}-${month}-${day}T23:59:59.999Z`).getTime();
    const endOfDay = new Date(localEndMs - offsetMinutes * 60000);

    // 1. Fetch User and Tasks concurrently
    const [user, tasks] = await Promise.all([
      User.findOne({ googleId: userId }),
      Task.find({
        userId,
        deadline: { $gte: startOfDay, $lte: endOfDay }
      }).sort({ deadline: 1 })
    ]);

    if (!user || !user.googleTokens) {
      return res.status(401).json({ success: false, message: 'Google Authentication required' });
    }

    if (!tasks || tasks.length === 0) {
      return res.status(404).json({ success: false, message: 'No tasks found for this date.' });
    }

    // 3. Format tasks for AI prompt and HTML Doc
    const readableDate = new Date(year, month - 1, day).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });
    
    let promptTasksList = `Tasks for ${readableDate}:\n`;
    let htmlTasksList = '';
    let pendingTasksCount = 0;
    
    tasks.forEach((t) => {
      const deadline = new Date(t.deadline).toLocaleTimeString('en-US', { 
        hour: 'numeric', minute: '2-digit',
        timeZone: typeof timezone === 'string' ? timezone : undefined
      });
      const isCompleted = t.status === 'completed';
      
      const titleEscaped = escapeHtml(t.title);
      const descEscaped = escapeHtml(t.description);
      
      // Only send pending tasks to the AI so it doesn't give advice on finished work!
      if (!isCompleted) {
        promptTasksList += `- ${t.title} (Deadline: ${deadline})\n`;
        if (t.description) promptTasksList += `  Notes: ${t.description}\n`;
        pendingTasksCount++;
      }
      
      // Build tight HTML for the Google Doc using <p> and <br> to avoid block padding
      const titleDecor = isCompleted ? 'text-decoration: line-through; color: #94a3b8;' : 'color: #1e293b;';
      const icon = isCompleted ? '✅' : '📌';
      
      htmlTasksList += `
        <p style="margin: 0; padding: 0; margin-bottom: 12px; font-family: 'Arial', sans-serif; line-height: 1.2;">
          <span style="font-size: 14pt; font-weight: bold; ${titleDecor}">
            ${icon} ${titleEscaped}
          </span>
          <span style="font-size: 12pt; font-weight: normal; color: #64748b; margin-left: 8px;">(⏰ ${deadline})</span>
          ${t.description ? `<br><span style="font-size: 12pt; color: #64748b; font-style: italic; margin-left: 28px;">↳ ${descEscaped}</span>` : ''}
        </p>
      `;
    });

    // 4. Prompt Gemini for HTML formatted recommendations
    let prompt = '';
    if (pendingTasksCount > 0) {
      prompt = `You are an expert productivity coach. Analyze the following SCHEDULE OF PENDING TASKS and provide 2-4 actionable and ENCOURAGING recommendations to help the user execute them today. Keep it extremely brief.
      
IMPORTANT: Format your ENTIRE response strictly as a beautifully styled HTML fragment. Use a <h3 style="color: #9333ea; font-family: 'Arial', sans-serif; font-size: 16pt; margin-bottom: 8px; margin-top: 20px;"> heading, and use styling like <ul style="line-height: 1.4; font-family: 'Arial', sans-serif; font-size: 12pt; color: #334155; margin-top: 0;">, <li>, and <b> for the recommendations. Do not use markdown. Just return the raw HTML.

${promptTasksList}`;
    } else {
      prompt = `You are an expert productivity coach. The user has COMPLETED all their tasks for today! Give them a short, highly enthusiastic, and congratulatory message (2-3 sentences max) to celebrate their clean sweep.
      
IMPORTANT: Format your ENTIRE response strictly as a beautifully styled HTML fragment. Use a <h3 style="color: #10b981; font-family: 'Arial', sans-serif; font-size: 16pt; margin-bottom: 8px; margin-top: 20px;"> heading, and a <p style="font-family: 'Arial', sans-serif; font-size: 12pt; color: #334155; margin-top: 0;"> for the message. Do not use markdown. Just return the raw HTML.`;
    }
    
    let aiRecommendationsHtml = '';
    try {
      const aiResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });
      aiRecommendationsHtml = aiResponse.text.replace(/```html|```/g, '').trim();
    } catch (error) {
      console.error('Gemini AI Error:', error);
      aiRecommendationsHtml = "<p style='font-size: 12pt;'><i>Could not generate AI recommendations at this time, but you've got this! Stay focused.</i></p>";
    }

    // 5. Create Google Doc via Drive API (HTML Conversion)
    oauth2Client.setCredentials(user.googleTokens);
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const finalHtml = `
      <html>
        <head>
          <meta charset="UTF-8">
        </head>
        <body style="padding: 0; font-family: 'Arial', sans-serif;">
          <h1 style="color: #2563eb; font-size: 24pt; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 4px; margin-top: 0;">
            🚀 LasMinAI Daily Blueprint
          </h1>
          <p style="color: #64748b; font-size: 12pt; margin-bottom: 24px; margin-top: 4px;">Generated for: <b>${readableDate}</b></p>
          
          <h2 style="color: #475569; font-size: 18pt; margin-bottom: 12px; margin-top: 0;">Today's Tasks</h2>
          ${htmlTasksList}
          
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px dashed #cbd5e1;">
            ${aiRecommendationsHtml}
          </div>
        </body>
      </html>
    `;

    const fileMetadata = {
      name: `LasMinAI Daily Blueprint: ${readableDate}`,
      mimeType: 'application/vnd.google-apps.document'
    };
    
    const media = {
      mimeType: 'text/html',
      body: finalHtml
    };

    const doc = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id'
    });
    
    const documentId = doc.data.id;
    const documentUrl = `https://docs.google.com/document/d/${documentId}/edit`;

    // Return the URL
    res.status(200).json({ success: true, documentUrl });

  } catch (error) {
    console.error('generateGoogleDocReport Error:', error);
    res.status(500).json({ success: false, message: 'Server error generating report', error: error.message });
  }
};

module.exports = {
  generateGoogleDocReport
};
