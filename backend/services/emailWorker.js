const Task = require('../models/Task');
const { generateTaskDigestMaterial } = require('./geminiService');
const { sendGmailDigest } = require('./gmailService');

// 2 hours in milliseconds for the digest lookahead
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const sweepEmails = async () => {
  try {
    const now = Date.now();
    
    // 1. Fetch all pending tasks that haven't had a digest sent yet (and haven't failed 3 times)
    const activeTasks = await Task.find({ 
      status: 'pending', 
      digestSent: false,
      digestRetryCount: { $lt: 3 }
    });
    
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
        
        // If the start time has arrived (meaning it is exactly deadline - technicalEffort)
        if (timeUntilStartMs <= 0 && timeUntilStartMs > -TWO_HOURS_MS) {
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
          
          // If the task starts anytime between "Right Now" and "Next 2 hours"
          if (timeUntilStartMs > -TWO_HOURS_MS && timeUntilStartMs <= TWO_HOURS_MS) {
            digestTasks.push(task);
          }
        }
        
        if (digestTasks.length > 0) {
          console.log(`🤖 Requesting HTML Material from Gemini for ${digestTasks.length} tasks...`);
          // 4. Generate the Grounded Email Body
          const htmlBody = await generateTaskDigestMaterial(digestTasks);
          
          // 5. Send it via their Native Gmail
          const sentSuccess = await sendGmailDigest(userId, htmlBody);
          
          // 6. Handle success or dead-letter queue retries
          const taskIds = digestTasks.map(t => t._id);
          if (sentSuccess) {
            await Task.updateMany({ _id: { $in: taskIds } }, { $set: { digestSent: true, digestFailed: false } });
            console.log(`✅ Marked ${taskIds.length} tasks as digestSent for User: ${userId}`);
          } else {
            await Task.updateMany({ _id: { $in: taskIds } }, { $inc: { digestRetryCount: 1 }, $set: { digestFailed: true } });
            console.log(`⚠️ Failed to send digest for User: ${userId}. Incremented retry count.`);
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

module.exports = { sweepEmails };
