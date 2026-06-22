const express = require('express');
const router = express.Router();
const { createTask, getPrioritizedTasks } = require('../controllers/taskController');

router.post('/', createTask);
router.get('/prioritized', getPrioritizedTasks);

module.exports = router;