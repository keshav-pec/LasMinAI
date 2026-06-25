const { parseUserMessage } = require('../services/geminiService');
const Task = require('../models/Task');
const { calculatePriorityScore } = require('../utils/priorityCalculator');

exports.handleChatMessage = async (req, res) => {
  try {
    const { message, history, userTimezone, localTime } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: "Message is required." });
    }

    // ==========================================
    // THE ZOMBIE SWEEPER
    // ==========================================
    const now = new Date();
    // 1. Find tasks that are pending but their deadline is in the past (Isolated to current user)
    await Task.updateMany(
      { userId: req.user.id, status: 'pending', deadline: { $lt: now } },
      { $set: { status: 'overdue' } }
    );

    // 2. Fetch the newly cleaned live context. 
    // We explicitly select _id so Gemini can use it for precise updates.
    const liveTasks = await Task.find({ userId: req.user.id, status: { $ne: 'completed' } })
                                .select('_id title deadline complexity technicalEffort status');

    // 3. Pass everything to the AI Brain
    const aiAnalysis = await parseUserMessage(message, history || [], liveTasks, userTimezone, localTime);

    // ==========================================
    // ACTION ROUTING
    // ==========================================
    if (aiAnalysis.action === 'CREATE' && aiAnalysis.extractedTaskCreate) {
      const { title, complexity, technicalEffort } = aiAnalysis.extractedTaskCreate;
      let { deadline } = aiAnalysis.extractedTaskCreate;

      // Fallback: If Gemini hallucinates or fails to extract the deadline, default to 24 hours from now
      if (!deadline) {
        const fallbackDate = new Date();
        fallbackDate.setHours(fallbackDate.getHours() + 24);
        deadline = fallbackDate.toISOString();
      }
      
      if (title) {
        const priorityScore = calculatePriorityScore(deadline, complexity || 5, technicalEffort || 2);
        const newTask = new Task({
          userId: req.user.id,
          title,
          deadline,
          complexity: complexity || 5,
          technicalEffort: technicalEffort || 2,
          priorityScore
        });
        await newTask.save();
      }
    } 
    
    else if (aiAnalysis.action === 'UPDATE' && aiAnalysis.extractedTaskUpdate && aiAnalysis.extractedTaskUpdate.taskIdToUpdate) {
      
      // Find the exact task using the MongoDB _id
      const taskToUpdate = await Task.findById(aiAnalysis.extractedTaskUpdate.taskIdToUpdate);

      if (taskToUpdate) {
        // Apply the extracted updates dynamically
        if (aiAnalysis.extractedTaskUpdate.title) taskToUpdate.title = aiAnalysis.extractedTaskUpdate.title;
        if (aiAnalysis.extractedTaskUpdate.complexity) taskToUpdate.complexity = aiAnalysis.extractedTaskUpdate.complexity;
        if (aiAnalysis.extractedTaskUpdate.technicalEffort) taskToUpdate.technicalEffort = aiAnalysis.extractedTaskUpdate.technicalEffort;
        if (aiAnalysis.extractedTaskUpdate.deadline) taskToUpdate.deadline = aiAnalysis.extractedTaskUpdate.deadline;
        
        // NEW: Apply status updates (e.g., marking as completed)
        if (aiAnalysis.extractedTaskUpdate.status) {
            taskToUpdate.status = aiAnalysis.extractedTaskUpdate.status;
        }
        
        // Recalculate priority if it's not completed
        if (taskToUpdate.status !== 'completed') {
            taskToUpdate.priorityScore = calculatePriorityScore(taskToUpdate.deadline, taskToUpdate.complexity, taskToUpdate.technicalEffort);
        } else {
            taskToUpdate.priorityScore = 0; // Deprioritize completed tasks
        }
        
        await taskToUpdate.save();
        console.log(`✅ Autonomous Log: Task [${taskToUpdate.title}] updated successfully.`);
      } else {
        console.log(`⚠️ Update Failed: Task ID ${aiAnalysis.extractedTaskUpdate.taskIdToUpdate} not found.`);
      }
    }

    res.status(200).json({
      success: true,
      reply: aiAnalysis.conversationalReply,
      voiceReply: aiAnalysis.voiceReply,
      actionTaken: aiAnalysis.action
    });

  } catch (error) {
    console.error('❌ Chat Controller Error:', error);
    res.status(500).json({ success: false, error: "Failed to process message." });
  }
};