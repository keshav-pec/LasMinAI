const express = require('express');
const { handleReminderChat, getActiveReminders, dismissReminder, snoozeReminder, getRemindersByDate, updateReminder, deleteReminder } = require('../controllers/reminderController');
const { requireAuth } = require('../utils/authMiddleware');

const router = express.Router();

router.use(requireAuth);

router.post('/chat', handleReminderChat);
router.get('/', getActiveReminders);
router.get('/history', getRemindersByDate);
router.put('/:id', updateReminder);
router.put('/:id/dismiss', dismissReminder);
router.put('/:id/snooze', snoozeReminder);
router.delete('/:id', deleteReminder);

module.exports = router;
