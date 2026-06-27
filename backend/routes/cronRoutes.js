const express = require('express');
const router = express.Router();
const Habit = require('../models/Habit');
const Task = require('../models/Task');
const { format } = require('date-fns');
const { toZonedTime, fromZonedTime } = require('date-fns-tz');

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

    const now = new Date();
    
    // 2. Fetch all habits (we will filter them per-timezone in the loop)
    const habits = await Habit.find({});
    
    let generatedCount = 0;

    for (const habit of habits) {
      const userTimezone = habit.timezone || 'UTC';
      const zonedNow = toZonedTime(now, userTimezone);
      const userDateStr = format(zonedNow, 'yyyy-MM-dd'); // User's local date

      // Skip if already generated for this user's specific local day
      if (habit.lastGeneratedDate === userDateStr) {
        continue;
      }

      // 3. Check frequency (skip if weekly and today is not Monday)
      if (habit.frequency === 'weekly') {
        const todayDay = zonedNow.getDay();
        // Assuming weekly habits generate on Monday (1)
        if (todayDay !== 1) continue;
      }

      // 4. Calculate deadline securely inside the user's timezone
      const localDateString = `${userDateStr}T${habit.deadlineTime}:00`;
      const deadline = fromZonedTime(localDateString, userTimezone);

      // 5. Create new Task
      const newTask = new Task({
        userId: habit.userId,
        habitId: habit._id,
        title: habit.title,
        description: habit.description || 'Recurring Habit',
        deadline: deadline,
        timezone: userTimezone,
        complexity: habit.complexity,
        technicalEffort: habit.technicalEffort,
        status: 'pending'
      });

      await newTask.save();
      
      // 6. Update habit's lastGeneratedDate using their LOCAL date string
      habit.lastGeneratedDate = userDateStr;
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
