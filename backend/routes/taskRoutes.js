const express = require('express');
const router = express.Router();
const { createTask, getPrioritizedTasks, updateTaskStatus } = require('../controllers/taskController');
const { requireAuth } = require('../utils/authMiddleware');

router.post('/', requireAuth, createTask);
router.get('/prioritized', requireAuth, getPrioritizedTasks);
router.put('/:id/status', requireAuth, updateTaskStatus);

module.exports = router;