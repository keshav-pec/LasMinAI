const express = require('express');
const router = express.Router();
const { requireAuth } = require('../utils/authMiddleware');
const { parseOrchestratorIntent, parseGeneralMessage } = require('../services/geminiService');
const { handleChatMessage } = require('../controllers/chatController');
const { handleWorkstationChat } = require('../controllers/workstationController');
const { handleReminderChat } = require('../controllers/reminderController');

// Helper function to mock the Express response object and capture JSON from controllers
const runController = (controllerFn, req) => {
  return new Promise(async (resolve) => {
    const mockRes = {
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        resolve({ statusCode: this.statusCode || 200, data });
      }
    };
    try {
      await controllerFn(req, mockRes);
    } catch(err) {
      resolve({ statusCode: 500, data: { success: false, error: err.message } });
    }
  });
};

// Removed Google Cloud TTS due to fatal unhandled promise rejections when ADC is missing.
// We will rely purely on the browser's Native SpeechSynthesis API.

/**
 * Global Voice Assistant Route
 * 1. Takes user audio transcription.
 * 2. Orchestrator decides intent.
 * 3. Forwards to specific module parser.
 * 4. Returns JSON response and TTS audio string (base64).
 */
router.post('/process', requireAuth, async (req, res) => {
  const { message, localTime = '', timezoneOffset = '' } = req.body;

  try {
    // 1. Orchestrate Intent
    const orchestratorDecision = await parseOrchestratorIntent(message);
    const intent = orchestratorDecision.intent;
    
    let finalReply = "";
    let finalVoiceReply = "";
    let actionTaken = "NONE";
    let intentRoutedTo = intent;

    // 2. Route to specific module by directly injecting into the existing Chat Controllers
    // This allows the Voice Assistant to be a global proxy for all existing Chatbots
    if (intent === 'TASK_PROMPTER') {
      const controllerRes = await runController(handleChatMessage, req);
      finalReply = controllerRes.data.reply || "I've handled that task for you.";
      finalVoiceReply = controllerRes.data.voiceReply || finalReply;
      actionTaken = controllerRes.data.actionTaken || "NONE";

    } else if (intent === 'WORK_STATION') {
      const controllerRes = await runController(handleWorkstationChat, req);
      finalReply = controllerRes.data.reply || "I've updated your workstation schedule.";
      finalVoiceReply = controllerRes.data.voiceReply || finalReply;
      actionTaken = controllerRes.data.actionTaken || "NONE";

    } else if (intent === 'REMINDER') {
      const controllerRes = await runController(handleReminderChat, req);
      finalReply = controllerRes.data.reply || "I've updated your reminders.";
      finalVoiceReply = controllerRes.data.voiceReply || finalReply;
      actionTaken = controllerRes.data.actionTaken || "NONE";

    } else if (intent === 'GENERAL_CHAT' || intent === 'UNKNOWN') {
      const aiResponse = await parseGeneralMessage(message, localTime);
      finalReply = aiResponse.reply;
      finalVoiceReply = orchestratorDecision.generalReplyVoice || finalReply;
    } else {
      finalReply = "I'm not quite sure how to help with that. Could you rephrase it?";
    }

    finalReply = finalReply || "Done."; // Fallback if LLM output was completely empty
    finalVoiceReply = finalVoiceReply || finalReply;

    res.json({
      success: true,
      intent: intentRoutedTo,
      actionTaken,
      reply: finalReply,
      replyVoice: finalVoiceReply
    });

  } catch (error) {
    console.error('Voice Processing Error:', error);
    res.status(500).json({ success: false, message: 'Voice Assistant encountered an error.' });
  }
});

module.exports = router;
