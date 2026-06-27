const Habit = require('../models/Habit');
const Task = require('../models/Task');
const { format, addDays } = require('date-fns');
const { toZonedTime, fromZonedTime } = require('date-fns-tz');

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
    const { title, description, frequency, deadlineTime, complexity, technicalEffort, timezone } = req.body;
    
    if (!title || !deadlineTime) {
      return res.status(400).json({ success: false, message: 'Title and deadline time are required.' });
    }
    
    if (complexity !== undefined && (typeof complexity !== 'number' || complexity < 1 || complexity > 5)) {
      return res.status(400).json({ success: false, message: 'Complexity must be a number between 1 and 5.' });
    }
    if (technicalEffort !== undefined && (typeof technicalEffort !== 'number' || technicalEffort < 1 || technicalEffort > 24)) {
      return res.status(400).json({ success: false, message: 'Technical Effort must be a number between 1 and 24.' });
    }

    const newHabit = new Habit({
      userId: req.user.id,
      title,
      description,
      frequency,
      deadlineTime,
      timezone: timezone || 'UTC',
      complexity,
      technicalEffort
    });

    const now = new Date();
    const userTimezone = newHabit.timezone;
    const zonedNow = toZonedTime(now, userTimezone);
    const todayDateStr = format(zonedNow, 'yyyy-MM-dd');
    
    // Parse the deadline for today
    const localTodayDeadlineStr = `${todayDateStr}T${deadlineTime}:00`;
    const todayDeadline = fromZonedTime(localTodayDeadlineStr, userTimezone);
    
    let targetDeadline;
    let targetDateStr;

    if (todayDeadline > now) {
      // Deadline hasn't passed today yet, spawn for today
      targetDeadline = todayDeadline;
      targetDateStr = todayDateStr;
    } else {
      // Deadline has passed today, spawn for tomorrow
      const zonedTomorrow = addDays(zonedNow, 1);
      targetDateStr = format(zonedTomorrow, 'yyyy-MM-dd');
      const localTomorrowDeadlineStr = `${targetDateStr}T${deadlineTime}:00`;
      targetDeadline = fromZonedTime(localTomorrowDeadlineStr, userTimezone);
    }
    
    // Create the instant task
    const newTask = new Task({
      userId: newHabit.userId,
      habitId: newHabit._id,
      title: newHabit.title,
      description: newHabit.description || 'Recurring Habit',
      deadline: targetDeadline,
      timezone: userTimezone,
      complexity: newHabit.complexity,
      technicalEffort: newHabit.technicalEffort,
      status: 'pending'
    });
    
    await newTask.save();
    
    // Set lastGeneratedDate so the cron job doesn't duplicate it
    newHabit.lastGeneratedDate = targetDateStr;
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
