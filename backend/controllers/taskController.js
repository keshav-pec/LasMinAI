const Task = require('../models/Task');
const { calculatePriorityScore } = require('../utils/priorityCalculator');

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
    // Dynamically recalculate scores on fetch to account for passing time
    const tasks = await Task.find({ status: { $ne: 'completed' } });
    
    const updatedTasks = await Promise.all(tasks.map(async (task) => {
      task.priorityScore = calculatePriorityScore(task.deadline, task.complexity, task.technicalEffort);
      return await task.save();
    }));

    // Sort tasks so the highest priority items appear first
    updatedTasks.sort((a, b) => b.priorityScore - a.priorityScore);

    res.status(200).json({ success: true, data: updatedTasks });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};