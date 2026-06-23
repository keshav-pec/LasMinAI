const Task = require('../models/Task');
const { calculatePriorityScore } = require('../utils/priorityCalculator');
const { getSortedPendingTasks } = require('../services/taskService');

// Create a new task and compute its initial priority score
exports.createTask = async (req, res) => {
  try {
    const { title, description, deadline, complexity, technicalEffort } = req.body;

    // Validate inputs
    if (!title || !deadline) {
      return res.status(400).json({ success: false, message: 'Title and deadline are required.' });
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
    res.status(500).json({ success: false, error: error.message });
  }
};

// Retrieve all pending tasks ordered by priority score descending
exports.getPrioritizedTasks = async (req, res) => {
  try {
    // ONE LINE REPLACES THE MANUAL DB MAP, SAVE, AND SORT LOOPS
    const updatedTasks = await getSortedPendingTasks(req.user.id);

    res.status(200).json({ success: true, data: updatedTasks });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
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

    const task = await Task.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      { status },
      { new: true }
    );

    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    res.status(200).json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
