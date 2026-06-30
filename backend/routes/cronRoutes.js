const express = require('express');
const router = express.Router();
const Habit = require('../models/Habit');
const Task = require('../models/Task');
const { sweepEmails } = require('../services/emailWorker');
const { sweepZombies } = require('../services/zombieSweeper');

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
      // Parse the stored timezoneOffset (e.g., '+05:30') into minutes
      const offsetMatch = (habit.timezoneOffset || '+00:00').match(/^([+-])(\d{2}):(\d{2})$/);
      const offsetMinutes = offsetMatch 
        ? (offsetMatch[1] === '+' ? 1 : -1) * (parseInt(offsetMatch[2]) * 60 + parseInt(offsetMatch[3]))
        : 0;

      // Get user's local "now" by adding their offset to UTC
      const userLocalNow = new Date(now.getTime() + offsetMinutes * 60000);
      
      // Extract YYYY-MM-DD strictly from the UTC components of the shifted date
      // to avoid the server's local timezone from shifting it a second time.
      const yyyy = userLocalNow.getUTCFullYear();
      const mm = String(userLocalNow.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(userLocalNow.getUTCDate()).padStart(2, '0');
      const userDateStr = `${yyyy}-${mm}-${dd}`;

      // Skip if already generated for this user's specific local day
      if (habit.lastGeneratedDate === userDateStr) {
        continue;
      }


      // 4. Calculate deadline in UTC using offset arithmetic
      const localDeadlineMs = new Date(`${userDateStr}T${habit.deadlineTime}:00Z`).getTime();
      const deadline = new Date(localDeadlineMs - offsetMinutes * 60000);

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


// POST /api/cron/sweep
// This endpoint is meant to be hit every minute by Google Cloud Scheduler
router.post('/sweep', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret || !authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ success: false, message: 'Unauthorized cron request.' });
    }

    // Run both sweeps concurrently. 
    // We await them so the Cloud Run container stays awake during execution.
    await Promise.all([
      sweepEmails(),
      sweepZombies()
    ]);

    res.json({ success: true, message: 'Sweep completed successfully.' });
  } catch (error) {
    console.error('Cron sweep error:', error);
    res.status(500).json({ success: false, message: 'Server error during sweep.' });
  }
});

module.exports = router;
