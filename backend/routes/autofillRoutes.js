const express = require('express');
const router = express.Router();
const { requireAuth } = require('../utils/authMiddleware');
const User = require('../models/User');
const { generateFormAutofillData } = require('../services/geminiService');

router.post('/process', requireAuth, async (req, res) => {
  try {
    const { formSchema } = req.body;
    if (!formSchema || !Array.isArray(formSchema)) {
      return res.status(400).json({ success: false, message: 'Invalid form schema provided.' });
    }

    // Fetch the user's profile context
    const user = await User.findOne({ googleId: req.user.id }).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Strip out sensitive info like googleId just in case, though it's internal
    const userProfile = {
      name: user.name,
      email: user.email,
      persona: user.persona
    };

    const aiResponse = await generateFormAutofillData(formSchema, userProfile);

    if (aiResponse.success) {
      return res.status(200).json(aiResponse);
    } else {
      return res.status(500).json({ success: false, message: 'AI failed to generate autofill data.', error: aiResponse.error });
    }

  } catch (error) {
    console.error('Autofill Error:', error);
    res.status(500).json({ success: false, message: 'Server error processing autofill request.' });
  }
});

module.exports = router;
