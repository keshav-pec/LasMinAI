const Task = require('../models/Task');
const { generateTaskDigestMaterial } = require('./geminiService');
const { sendGmailDigest } = require('./gmailService');

// 30 minutes in milliseconds
const THIRTY_MINUTES_MS = 30 * 60 * 1000;
// 2 hours in milliseconds for the digest lookahead
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const startEmailWorker = () => {
  console.log("🚀 Email Sweep Worker Initialized. Sweeping immediately, then every 60 seconds.");
  
  const sweep = async () => {
    try {
      const now = Date.now();
      
      // 1. Fetch all pending tasks that haven't had a digest sent yet
      const activeTasks = await Task.find({ status: 'pending', digestSent: false });
      
      if (!activeTasks.length) return;

      // Group tasks by User
      const tasksByUser = activeTasks.reduce((acc, task) => {
        if (!acc[task.userId]) acc[task.userId] = [];
        acc[task.userId].push(task);
        return acc;
      }, {});

      // 2. Evaluate tasks per user
      for (const [userId, userTasks] of Object.entries(tasksByUser)) {
        
        let shouldTriggerDigest = false;
        
        // Check if any single task crosses the "30 minutes prior to Start Time" threshold
        for (const task of userTasks) {
          const effortMs = (task.technicalEffort || 2) * 60 * 60 * 1000;
          const startTimeMs = new Date(task.deadline).getTime() - effortMs;
          
          const timeUntilStartMs = startTimeMs - now;
          
          // If the start time is 30 minutes away OR LESS (meaning it's imminent or just started)
          if (timeUntilStartMs <= THIRTY_MINUTES_MS && timeUntilStartMs > -TWO_HOURS_MS) {
            shouldTriggerDigest = true;
            break;
          }
        }

        // 3. Generate Digest if Triggered
        if (shouldTriggerDigest) {
          console.log(`\n⏳ [EmailWorker] Trigger condition met for User: ${userId}. Building Digest...`);
          
          const digestTasks = [];
          
          // Gather ALL tasks for this user that start within the next 2 hours
          for (const task of userTasks) {
            const effortMs = (task.technicalEffort || 2) * 60 * 60 * 1000;
            const startTimeMs = new Date(task.deadline).getTime() - effortMs;
            
            const timeUntilStartMs = startTimeMs - now;
            
            // If the task starts anytime between "Right Now" and "Next 2.5 hours"
            if (timeUntilStartMs > -TWO_HOURS_MS && timeUntilStartMs <= (TWO_HOURS_MS + THIRTY_MINUTES_MS)) {
              digestTasks.push(task);
            }
          }
          
          if (digestTasks.length > 0) {
            console.log(`🤖 Requesting HTML Material from Gemini for ${digestTasks.length} tasks...`);
            // 4. Generate the Grounded Email Body
            const htmlBody = await generateTaskDigestMaterial(digestTasks);
            
            // 5. Send it via their Native Gmail
            const sentSuccess = await sendGmailDigest(userId, htmlBody);
            
            // 6. Mark all bundled tasks as sent so they aren't spammed
            if (sentSuccess) {
              const taskIds = digestTasks.map(t => t._id);
              await Task.updateMany({ _id: { $in: taskIds } }, { $set: { digestSent: true } });
              console.log(`✅ Marked ${taskIds.length} tasks as digestSent for User: ${userId}`);
            }
            
            // Pace the worker: Wait 2 seconds before processing the next user to avoid bursting the API
            await sleep(2000);
          }
        }
      }
      
    } catch (error) {
      console.error("❌ EmailWorker Sweep Error:", error);
    }
  };

  // Run once immediately
  sweep();

  // Then run every 60 seconds
  setInterval(sweep, 60 * 1000);
};

module.exports = { startEmailWorker };
