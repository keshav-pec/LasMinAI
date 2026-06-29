const express = require('express');
const router = express.Router();
const { createTask, getPrioritizedTasks, updateTaskStatus, getTasksByDate, updateTask, deleteTask } = require('../controllers/taskController');
const { requireAuth } = require('../utils/authMiddleware');

router.post('/', requireAuth, createTask);
router.get('/', requireAuth, getTasksByDate);
router.get('/prioritized', requireAuth, getPrioritizedTasks);
router.put('/:id', requireAuth, updateTask);
router.put('/:id/status', requireAuth, updateTaskStatus);
router.delete('/:id', requireAuth, deleteTask);

module.exports = router;