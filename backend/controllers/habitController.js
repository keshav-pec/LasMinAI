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
    const { title, description, frequency, deadlineTime, complexity, technicalEffort, timezoneOffset } = req.body;
    
    if (!title || !deadlineTime) {
      return res.status(400).json({ success: false, message: 'Title and deadline time are required.' });
    }
    
    if (complexity !== undefined && (typeof complexity !== 'number' || complexity < 1 || complexity > 5)) {
      return res.status(400).json({ success: false, message: 'Complexity must be a number between 1 and 5.' });
    }
    if (technicalEffort !== undefined && (typeof technicalEffort !== 'number' || technicalEffort < 5 || technicalEffort > 1440)) {
      return res.status(400).json({ success: false, message: 'Technical Effort must be between 5 and 1440 minutes.' });
    }

    const newHabit = new Habit({
      userId: req.user.id,
      title,
      description,
      frequency,
      deadlineTime,
      timezoneOffset: timezoneOffset || '+00:00',
      complexity,
      technicalEffort
    });

    // Parse the timezoneOffset (e.g., '+05:30' or '-04:00') to minutes
    const offsetMatch = (timezoneOffset || '+00:00').match(/^([+-])(\d{2}):(\d{2})$/);
    const offsetMinutes = offsetMatch 
      ? (offsetMatch[1] === '+' ? 1 : -1) * (parseInt(offsetMatch[2]) * 60 + parseInt(offsetMatch[3]))
      : 0;

    // Get the user's local "now" by adding their offset to UTC
    const now = new Date();
    const userLocalNow = new Date(now.getTime() + offsetMinutes * 60000);
    
    const formatUTCDate = (dateObj) => {
      const yyyy = dateObj.getUTCFullYear();
      const mm = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getUTCDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    const todayDateStr = formatUTCDate(userLocalNow);
    
    // Build the local deadline string and convert to UTC by subtracting the offset
    const localTodayDeadlineMs = new Date(`${todayDateStr}T${deadlineTime}:00Z`).getTime();
    const todayDeadlineUTC = new Date(localTodayDeadlineMs - offsetMinutes * 60000);
    
    let targetDeadline;
    let targetDateStr;

    if (todayDeadlineUTC > now) {
      // Deadline hasn't passed today yet, spawn for today
      targetDeadline = todayDeadlineUTC;
      targetDateStr = todayDateStr;
    } else {
      // Deadline has passed today, spawn for tomorrow
      const userLocalTomorrow = new Date(userLocalNow.getTime() + 24 * 60 * 60 * 1000);
      targetDateStr = formatUTCDate(userLocalTomorrow);
      const localTomorrowDeadlineMs = new Date(`${targetDateStr}T${deadlineTime}:00Z`).getTime();
      targetDeadline = new Date(localTomorrowDeadlineMs - offsetMinutes * 60000);
    }
    
    // Create the instant task
    const newTask = new Task({
      userId: newHabit.userId,
      habitId: newHabit._id,
      title: newHabit.title,
      description: newHabit.description || 'Recurring Habit',
      deadline: targetDeadline,
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
