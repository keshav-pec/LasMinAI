const express = require('express');
const router = express.Router();
const { getAiSchedule } = require('../controllers/aiController');
const { testGeminiConnection } = require('../services/geminiService');

// Test route
router.get('/test', async (req, res) => {
  try {
    const aiResponse = await testGeminiConnection();
    res.status(200).json({ success: true, data: aiResponse });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Production scheduling route
router.get('/schedule', getAiSchedule);

module.exports = router;