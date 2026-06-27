const express = require('express');
const router = express.Router();
const { requireAuth } = require('../utils/authMiddleware');
const { extractTasksFromDOM } = require('../services/geminiService');

router.post('/parse-dom', requireAuth, async (req, res) => {
  try {
    const { text, url } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, message: 'Text context is required' });
    }

    const tasks = await extractTasksFromDOM(text, url);
    res.status(200).json({ success: true, tasks });
  } catch (error) {
    console.error('Error parsing DOM:', error);
    res.status(500).json({ success: false, message: 'Failed to extract tasks' });
  }
});

module.exports = router;
