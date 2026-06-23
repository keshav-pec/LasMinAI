const express = require('express');
const router = express.Router();
const { createTask, getPrioritizedTasks } = require('../controllers/taskController');
const { requireAuth } = require('../utils/authMiddleware');

router.post('/', requireAuth, createTask);
router.get('/prioritized', requireAuth, getPrioritizedTasks);

module.exports = router;