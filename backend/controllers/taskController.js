const Task = require('../models/Task');
const { calculatePriorityScore } = require('../utils/priorityCalculator');
const { getSortedPendingTasks } = require('../services/taskService');

// Create a new task and compute its initial priority score
exports.createTask = async (req, res) => {
  try {
    const { title, description, deadline, complexity, technicalEffort } = req.body;

    // Validate inputs
    if (!title || typeof title !== 'string' || title.trim().length === 0 || title.length > 200) {
      return res.status(400).json({ success: false, message: 'Valid title (max 200 chars) is required.' });
    }
    if (!deadline || isNaN(new Date(deadline).getTime())) {
      return res.status(400).json({ success: false, message: 'Valid deadline is required.' });
    }
    if (complexity && (typeof complexity !== 'number' || complexity < 1 || complexity > 10)) {
      return res.status(400).json({ success: false, message: 'Complexity must be a number between 1 and 10.' });
    }
    if (technicalEffort && (typeof technicalEffort !== 'number' || technicalEffort < 1 || technicalEffort > 10)) {
      return res.status(400).json({ success: false, message: 'Technical Effort must be a number between 1 and 10.' });
    }

    // Calculate score
    const priorityScore = calculatePriorityScore(deadline, complexity, technicalEffort);

    const newTask = new Task({
      userId: req.user.id,
      title,
      description,
      deadline,
      complexity,
      technicalEffort,
      priorityScore
    });

    await newTask.save();
    res.status(201).json({ success: true, data: newTask });
  } catch (error) {
    console.error('Create Task Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// Retrieve all pending tasks ordered by priority score descending
exports.getPrioritizedTasks = async (req, res) => {
  try {
    // ONE LINE REPLACES THE MANUAL DB MAP, SAVE, AND SORT LOOPS
    const updatedTasks = await getSortedPendingTasks(req.user.id);

    res.status(200).json({ success: true, data: updatedTasks });
  } catch (error) {
    console.error('Get Prioritized Tasks Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// Update task status
exports.updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'completed', 'overdue'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const task = await Task.findOne({ _id: id, userId: req.user.id });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const wasCompleted = task.status === 'completed';
    task.status = status;

    if (status === 'completed' && !wasCompleted) {
      task.completedAt = new Date();
      
      if (task.habitId) {
        const Habit = require('../models/Habit');
        const habit = await Habit.findById(task.habitId);
        if (habit) {
          habit.totalCompleted += 1;
          habit.streak += 1;
          if (habit.streak > habit.bestStreak) {
            habit.bestStreak = habit.streak;
          }
          await habit.save();
        }
      }
    } else if (status !== 'completed' && wasCompleted) {
      task.completedAt = null;
      
      if (task.habitId) {
        const Habit = require('../models/Habit');
        const habit = await Habit.findById(task.habitId);
        if (habit) {
          habit.totalCompleted = Math.max(0, habit.totalCompleted - 1);
          habit.streak = Math.max(0, habit.streak - 1);
          await habit.save();
        }
      }
    }

    await task.save();

    res.status(200).json({ success: true, data: task });
  } catch (error) {
    console.error('Update Task Status Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
