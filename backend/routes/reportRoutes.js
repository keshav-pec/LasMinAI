const express = require('express');
const router = express.Router();
const { requireAuth } = require('../utils/authMiddleware');
const { generateGoogleDocReport } = require('../controllers/reportController');

router.get('/daily-doc', requireAuth, generateGoogleDocReport);

module.exports = router;
