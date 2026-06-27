const express = require('express');
const router = express.Router();
const Habit = require('../models/Habit');
const Task = require('../models/Task');

// POST /api/cron/generate-habits
// This endpoint is meant to be hit by a cron service (like cron-job.org or GitHub Actions)
router.post('/generate-habits', async (req, res) => {
  try {
    // 1. Authenticate via a secret token to prevent abuse
    const authHeader = req.headers.authorization;
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret || !authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ success: false, message: 'Unauthorized cron request.' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    
    // 2. Fetch all habits that haven't been generated today
    const habits = await Habit.find({ lastGeneratedDate: { $ne: todayStr } });
    
    let generatedCount = 0;

    for (const habit of habits) {
      // 3. Check frequency (skip if weekly and today is not Monday)
      if (habit.frequency === 'weekly') {
        const todayDay = new Date().getDay();
        // Assuming weekly habits generate on Monday (1)
        if (todayDay !== 1) continue;
      }

      // 4. Calculate deadline based on habit's deadlineTime (e.g. "18:00")
      const [hours, minutes] = habit.deadlineTime.split(':');
      const deadline = new Date();
      deadline.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

      // 5. Create new Task
      const newTask = new Task({
        userId: habit.userId,
        habitId: habit._id,
        title: habit.title,
        description: habit.description || 'Recurring Habit',
        deadline: deadline,
        complexity: habit.complexity,
        technicalEffort: habit.technicalEffort,
        status: 'pending'
      });

      await newTask.save();
      
      // 6. Update habit's lastGeneratedDate
      habit.lastGeneratedDate = todayStr;
      await habit.save();
      
      generatedCount++;
    }

    res.json({ success: true, message: `Successfully generated ${generatedCount} habits.` });
  } catch (error) {
    console.error('Cron generation error:', error);
    res.status(500).json({ success: false, message: 'Server error during generation.' });
  }
});

module.exports = router;
