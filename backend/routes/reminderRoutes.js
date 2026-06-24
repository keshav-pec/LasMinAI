const express = require('express');
const { handleReminderChat, getActiveReminders, dismissReminder, snoozeReminder } = require('../controllers/reminderController');
const { requireAuth } = require('../utils/authMiddleware');

const router = express.Router();

router.use(requireAuth);

router.post('/chat', handleReminderChat);
router.get('/', getActiveReminders);
router.put('/:id/dismiss', dismissReminder);
router.put('/:id/snooze', snoozeReminder);

module.exports = router;
