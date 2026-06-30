# ⚡ LasMinAI (The Last-Minute Life Saver)

<div align="center">
  <p><em>Stop missing deadlines. LasMinAI autonomously manages your tasks & schedule, enforces your focus, and seamlessly synchronizes your digital life using Agentic AI.</em></p>
</div>

---

## 🎯 Solution Overview

In today's fast-paced environment, professionals and students often struggle with task paralysis, poor time estimation, and missing critical deadlines. Traditional to-do lists are passive and rely entirely on manual scheduling discipline. 

**LasMinAI** is a comprehensive, intelligent productivity ecosystem designed to solve this. Using advanced Large Language Models, LasMinAI converses with users via text or voice, extracts hidden tasks from unstructured thoughts, calculates priority scores based on mathematical urgency, autonomously deploys optimized work schedules directly into Google Calendar, and enforces your focus via a powerful cross-platform Chrome Extension. It turns chaotic, last-minute panic into highly structured, actionable execution plans.

## ✨ Key Features

- 🧠 **Conversational Task Logging & Auto-Extraction:** Forget manual forms. Chat with the AI naturally (or highlight text on any webpage) to semantically extract task titles, calculate exact ISO deadlines, and estimate technical effort.
- 🧮 **Algorithmic Priority Scoring (P-Score):** Tasks are dynamically sorted not just by due date, but by a proprietary algorithm factoring in time-to-deadline, user-perceived complexity, and required effort.
- 🎙️ **Hands-Free Global Voice Assistant:** Speak directly to LasMinAI. It leverages the Web Speech API and Text-to-Speech (TTS) to process your commands, read out schedules, and manage your tasks without you touching the keyboard.
- 🤖 **Agentic Work Station & Calendar Sync:** An interactive Execution Manager that learns your available time and preferred strategy (e.g., Pomodoro, Themed Blocking). It can deploy AI-generated schedules directly into your native Google Calendar with one click.
- 🛡️ **LasMinAI Everywhere (Chrome Extension):** A production-ready browser extension that injects productivity across the web. Features include:
  - **Full-Screen Focus Blockers:** Intrusive screen blockers for due reminders that force you to solve a math problem before you can dismiss or snooze them.
  - **Instant Bidirectional Sync:** Dismissing a reminder on your phone or web app instantly syncs to the browser extension across all tabs via a robust messaging bridge.
  - **Contextual Form Autofill:** Right-click to let the AI automatically fill out complex web forms based on your saved profile and active tasks.
- 🔁 **Automated Daily Habits:** Track daily recurring tasks. Powered by Google Cloud Scheduler, your daily habits automatically regenerate at midnight in your specific local timezone.
- 📄 **Automated Google Docs Reporting:** One-click generation of comprehensive, well-formatted task execution reports directly into a native Google Doc, summarizing pending work, completed tasks, and upcoming deadlines.
- 🎨 **Premium Modern UI:** A fully responsive, dark/light mode compatible interface featuring floating cards, animated gradient meshes, and interactive timeline rails.

## ⚙️ Tech Stack & Architecture

LasMinAI is built on a robust, modern architecture, fully decoupled into a RESTful backend, a dynamic React frontend, and a Manifest V3 Chrome Extension.

**Frontend (Web App):**
- **Framework:** React.js (Vite)
- **Styling:** Tailwind CSS v4 with custom Glassmorphism and Framer Motion for premium micro-animations.
- **Icons & Markdown:** Lucide React, React Markdown (with remark-gfm).
- **State Management:** Custom React Hooks and BroadcastChannel API for multi-tab sync.

**Backend (REST API):**
- **Runtime:** Node.js with Express.js
- **Database:** MongoDB (Mongoose ORM)
- **Authentication:** Google OAuth 2.0 with secure HTTP-only JWT cookies.
- **AI Integration:** `@google/genai` SDK.
- **Background Jobs:** Handled via authenticated Cron Webhooks triggered by Google Cloud Scheduler.

**Chrome Extension:**
- **Architecture:** Manifest V3.
- **Components:** Background Service Workers, UI-injected Content Scripts, and an interactive popup.
- **Capabilities:** Local Storage Sync, Context Menus, and cross-tab window event messaging.

## 🌐 Google Technologies Utilized

This project heavily leverages Google's developer ecosystem to power its core intelligence and integrations:

1. **Gemini AI (`gemini-3.1-flash-lite`):**
   - Drives natural language parsing and intent extraction (creating tasks, reminders, and schedules).
   - Powers the conversational agent in the Work Station and the Voice Assistant.
2. **Google Calendar API:** 
   - Used to programmatically push scheduled blocks, focus sessions, and breaks directly to the user's primary calendar.
3. **Google Docs API:**
   - Programmatically generates beautiful, formatted Markdown reports directly into the user's Google Drive.
4. **Google OAuth 2.0 & Cloud Console:** 
   - Provides secure, seamless single sign-on (SSO) and grants the necessary delegated permissions to manage the user's calendar and docs.
5. **Google Cloud Run & Cloud Scheduler:**
   - Serves the decoupled production environments and reliably pings the secure cron endpoints to manage background zombies and daily habit generation.
