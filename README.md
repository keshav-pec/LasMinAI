# ⚡ LasMinAI (The Last-Minute Life Saver)

<div align="center">
  <p><em>Stop missing deadlines. LasMinAI autonomously restructures your Google Calendar to ensure execution.</em></p>
</div>

---

## 🎯 Solution Overview

In today's fast-paced environment, professionals and students often struggle with task paralysis, poor time estimation, and missing critical deadlines. Traditional to-do lists are static and rely entirely on the user's manual scheduling discipline. 

**LasMinAI** is an intelligent, agentic productivity orchestrator designed to solve this. Instead of a passive list, LasMinAI uses advanced Large Language Models to converse with users, extract hidden tasks from unstructured thoughts, calculate priority scores based on mathematical urgency, and autonomously deploy optimized work schedules directly into the user's Google Calendar. It turns chaotic, last-minute panic into highly structured, actionable execution plans.

## ✨ Key Features

- 🧠 **Conversational Task Logging:** Forget forms. Chat with the AI naturally, and it will semantically extract task titles, calculate exact ISO deadlines, and estimate technical effort.
- 🧮 **Algorithmic Priority Scoring (P-Score):** Tasks are dynamically sorted not just by due date, but by a proprietary algorithm factoring in time-to-deadline, user-perceived complexity, and required effort.
- 🤖 **Agentic Work Station:** An interactive Execution Manager that learns your available time and preferred strategy (e.g., Pomodoro, Specific Task, Grouped Execution) to chunk tasks logically.
- 📅 **Seamless Calendar Sync:** One-click deployment of AI-generated schedules directly into your native Google Calendar, complete with Focus Time flags.
- 🎨 **Premium Modern UI:** A fully responsive, dark/light mode compatible interface featuring floating cards, animated gradient meshes, and an interactive timeline rail.

## ⚙️ Tech Stack & Architecture

LasMinAI is built on a robust, modern architecture, fully decoupled into a RESTful backend and a highly dynamic React frontend.

**Frontend:**
- **Framework:** React.js (Vite)
- **Styling:** Tailwind CSS v4 with custom Glassmorphism and Framer Motion for premium animations.
- **Icons & Markdown:** Lucide React, React Markdown (with remark-gfm).
- **State Management:** React Hooks.

**Backend:**
- **Runtime:** Node.js with Express.js
- **Database:** MongoDB (Mongoose ORM)
- **Authentication:** Google OAuth2.0 with secure JWT cookies.
- **AI Integration:** `@google/genai` SDK.


## 🌐 Google Technologies Utilized

This project heavily leverages Google's developer ecosystem to power its core intelligence and integrations:

1. **Gemini AI (`gemini-3.1-flash-lite`):**
   - Drives the natural language parsing and intent extraction (`CREATE`, `READ`, `UPDATE`).
   - Powers the conversational agent in the Work Station to generate optimized schedules and productivity recommendations.
2. **Google Calendar API:** 
   - Used to programmatically push scheduled blocks, focus sessions, and breaks directly to the user's primary calendar.
3. **Google OAuth 2.0 & Cloud Console:** 
   - Provides secure, seamless single sign-on (SSO) and grants the necessary delegated permissions to manage the user's calendar without storing sensitive credentials natively.
