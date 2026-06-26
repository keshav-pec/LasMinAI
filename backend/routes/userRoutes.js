const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { requireAuth } = require('../utils/authMiddleware');
const { z } = require('zod');

const safeString = z.string().max(100).optional().or(z.literal(''));
const longString = z.string().max(500).optional().or(z.literal(''));

const personalDataSchema = z.object({
  phone: safeString,
  altPhone: safeString,
  gender: safeString,
  dob: safeString,
  fathersName: safeString,
  address: longString,
  altAddress: longString,
  pincode: safeString,
  city: safeString,
  state: safeString,
  country: safeString,
  hobby: safeString
});

const professionalDataSchema = z.object({
  schoolName: safeString,
  tenthPassingYear: safeString,
  tenthBoard: safeString,
  marks10th: safeString,
  twelfthPassingYear: safeString,
  twelfthBoard: safeString,
  marks12th: safeString,
  collegeName: safeString,
  collegePassingYear: safeString,
  course: safeString,
  cgpa: safeString,
  industry: safeString,
  yearsOfExperience: safeString,
  linkedinUrl: longString,
  githubUrl: longString
});

router.get('/persona', requireAuth, async (req, res) => {
  try {
    const user = await User.findOne({ googleId: req.user.id });
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    res.json({ success: true, persona: user.persona });
  } catch (error) {
    console.error("Error fetching persona:", error);
    res.status(500).json({ success: false, error: "Failed to fetch persona" });
  }
});

router.put('/persona', requireAuth, async (req, res) => {
  try {
    const { personalData, professionalData } = req.body;

    const user = await User.findOne({ googleId: req.user.id });
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    if (personalData) {
      const parsedPersonal = personalDataSchema.safeParse(personalData);
      if (!parsedPersonal.success) {
        return res.status(400).json({ success: false, error: "Invalid personal data", details: parsedPersonal.error.errors });
      }
      user.persona.personal = { ...user.persona.personal, ...parsedPersonal.data };
    }
    
    if (professionalData) {
      const parsedProfessional = professionalDataSchema.safeParse(professionalData);
      if (!parsedProfessional.success) {
        return res.status(400).json({ success: false, error: "Invalid professional data", details: parsedProfessional.error.errors });
      }
      user.persona.professional = { ...user.persona.professional, ...parsedProfessional.data };
    }

    await user.save();

    res.json({ success: true, persona: user.persona });
  } catch (error) {
    console.error("Error updating persona:", error);
    res.status(500).json({ success: false, error: "Failed to update persona" });
  }
});

module.exports = router;
