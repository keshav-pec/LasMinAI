const Task = require('../models/Task');
const { calculatePriorityScore } = require('../utils/priorityCalculator');
const { getSortedPendingTasks } = require('../services/taskService');

// Create a new task and compute its initial priority score
exports.createTask = async (req, res) => {
  try {
    const { title, description, deadline, complexity, technicalEffort, sourceUrl } = req.body;

    // Validate inputs
    if (!title || typeof title !== 'string' || title.trim().length === 0 || title.length > 200) {
      return res.status(400).json({ success: false, message: 'Valid title (max 200 chars) is required.' });
    }
    if (!deadline || isNaN(new Date(deadline).getTime())) {
      return res.status(400).json({ success: false, message: 'Valid deadline is required.' });
    }
    if (complexity && (typeof complexity !== 'number' || complexity < 1 || complexity > 5)) {
      return res.status(400).json({ success: false, message: 'Complexity must be a number between 1 and 5.' });
    }
    if (technicalEffort && (typeof technicalEffort !== 'number' || technicalEffort < 5 || technicalEffort > 1440)) {
      return res.status(400).json({ success: false, message: 'Technical Effort must be between 5 and 1440 minutes.' });
    }

    const newTask = new Task({
      userId: req.user.id,
      title,
      description,
      deadline,
      complexity,
      technicalEffort,
      sourceUrl: sourceUrl || '',
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

// Fetch all tasks for a specific date range based on deadline
exports.getTasksByDate = async (req, res) => {
  try {
    const { date, timezoneOffset } = req.query;
    if (!date) {
      return res.status(400).json({ success: false, message: 'Date parameter (YYYY-MM-DD) is required.' });
    }

    const [year, month, day] = date.split('-');
    
    // Parse the timezoneOffset (e.g., '+05:30' or '-04:00') into minutes
    const offsetMatch = (timezoneOffset || '+00:00').match(/^([+-])(\d{2}):(\d{2})$/);
    const offsetMinutes = offsetMatch 
      ? (offsetMatch[1] === '+' ? 1 : -1) * (parseInt(offsetMatch[2]) * 60 + parseInt(offsetMatch[3]))
      : 0;

    // Construct the bounds strictly in UTC based on the user's offset
    const localStartMs = new Date(`${year}-${month}-${day}T00:00:00.000Z`).getTime();
    const startOfDay = new Date(localStartMs - offsetMinutes * 60000);
    
    const localEndMs = new Date(`${year}-${month}-${day}T23:59:59.999Z`).getTime();
    const endOfDay = new Date(localEndMs - offsetMinutes * 60000);

    const tasks = await Task.find({
      userId: req.user.id,
      deadline: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: tasks });
  } catch (error) {
    console.error('Get Tasks By Date Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// Update a task completely
exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, deadline, complexity, technicalEffort, sourceUrl } = req.body;

    const task = await Task.findOne({ _id: id, userId: req.user.id });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    if (title) task.title = title;
    if (description !== undefined) task.description = description;
    if (deadline) task.deadline = deadline;
    if (complexity) task.complexity = complexity;
    if (technicalEffort) task.technicalEffort = technicalEffort;
    if (sourceUrl !== undefined) task.sourceUrl = sourceUrl;

    await task.save();
    res.status(200).json({ success: true, data: task });
  } catch (error) {
    console.error('Update Task Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// Delete a task
exports.deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findOneAndDelete({ _id: id, userId: req.user.id });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    res.status(200).json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete Task Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
