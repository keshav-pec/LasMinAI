const express = require('express');
const router = express.Router();
const { getAiSchedule } = require('../controllers/aiController');
const { requireAuth } = require('../utils/authMiddleware');

// Production scheduling route
router.get('/schedule', requireAuth, getAiSchedule);

module.exports = router;