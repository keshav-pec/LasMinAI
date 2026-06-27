const Habit = require('../models/Habit');
const Task = require('../models/Task');

// Get all habits for the user
const getHabits = async (req, res) => {
  try {
    const habits = await Habit.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, habits });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create a new habit
const createHabit = async (req, res) => {
  try {
    const { title, description, frequency, deadlineTime, complexity, technicalEffort } = req.body;
    
    if (!title || !deadlineTime) {
      return res.status(400).json({ success: false, message: 'Title and deadline time are required.' });
    }
    
    if (complexity !== undefined && (typeof complexity !== 'number' || complexity < 1 || complexity > 10)) {
      return res.status(400).json({ success: false, message: 'Complexity must be a number between 1 and 10.' });
    }
    if (technicalEffort !== undefined && (typeof technicalEffort !== 'number' || technicalEffort < 1 || technicalEffort > 10)) {
      return res.status(400).json({ success: false, message: 'Technical Effort must be a number between 1 and 10.' });
    }

    const newHabit = new Habit({
      userId: req.user.id,
      title,
      description,
      frequency,
      deadlineTime,
      complexity,
      technicalEffort
    });

    await newHabit.save();
    res.status(201).json({ success: true, habit: newHabit });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete a habit
const deleteHabit = async (req, res) => {
  try {
    const habit = await Habit.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!habit) {
      return res.status(404).json({ success: false, message: 'Habit not found.' });
    }
    res.json({ success: true, message: 'Habit deleted.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get Heatmap data
// Returns { date: 'YYYY-MM-DD', count: N } for the last 90 days
const getHeatmapData = async (req, res) => {
  try {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const tasks = await Task.find({
      userId: req.user.id,
      status: 'completed',
      completedAt: { $gte: ninetyDaysAgo }
    });

    const counts = {};
    
    tasks.forEach(task => {
      // The user wants the heatmap to show all completed tasks on that day.
      // Not just habits, but all tasks? Prompt: "The heatmap will constitute of all the habits completed on that day. It will not be separate for every task."
      // Ah, "all the habits completed on that day". So only tasks with a habitId!
      if (!task.habitId) return;
      
      const dateStr = task.completedAt.toISOString().split('T')[0];
      counts[dateStr] = (counts[dateStr] || 0) + 1;
    });

    const data = Object.keys(counts).map(date => ({
      date,
      count: counts[date]
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getHabits,
  createHabit,
  deleteHabit,
  getHeatmapData
};
