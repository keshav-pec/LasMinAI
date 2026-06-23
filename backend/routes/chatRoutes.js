const express = require('express');
const router = express.Router();
const { handleChatMessage } = require('../controllers/chatController');
const { requireAuth } = require('../utils/authMiddleware');

router.post('/', requireAuth, handleChatMessage);

module.exports = router;