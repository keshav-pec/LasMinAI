const express = require('express');
const router = express.Router();
const { testGeminiConnection } = require('../services/geminiService');

// Route: GET /api/ai/test
// Purpose: Pings Gemini to ensure the API key and setup are working
router.get('/test', async (req, res) => {
  try {
    const aiResponse = await testGeminiConnection();
    res.status(200).json({ 
      success: true, 
      message: 'Gemini is online.', 
      data: aiResponse 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;