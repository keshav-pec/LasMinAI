const { parseUserMessage } = require('../services/geminiService');
const Task = require('../models/Task');
const { calculatePriorityScore } = require('../utils/priorityCalculator');

exports.handleChatMessage = async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: "Message is required." });
    }

    // ==========================================
    // THE ZOMBIE SWEEPER
    // ==========================================
    const now = new Date();
    // 1. Find tasks that are pending but their deadline is in the past
    await Task.updateMany(
      { status: 'pending', deadline: { $lt: now } },
      { $set: { status: 'overdue' } }
    );

    // 2. Fetch the newly cleaned live context. 
    // We explicitly select _id so Gemini can use it for precise updates.
    const liveTasks = await Task.find({ status: { $ne: 'completed' } })
                                .select('_id title deadline complexity technicalEffort status');

    // 3. Pass everything to the AI Brain
    const aiAnalysis = await parseUserMessage(message, history || [], liveTasks);

    // ==========================================
    // ACTION ROUTING
    // ==========================================
    if (aiAnalysis.action === 'CREATE' && aiAnalysis.extractedTask) {
      const { title, deadline, complexity, technicalEffort } = aiAnalysis.extractedTask;
      
      if (title && deadline) {
        const priorityScore = calculatePriorityScore(deadline, complexity || 5, technicalEffort || 2);
        const newTask = new Task({
          title,
          deadline,
          complexity: complexity || 5,
          technicalEffort: technicalEffort || 2,
          priorityScore
        });
        await newTask.save();
      }
    } 
    
    else if (aiAnalysis.action === 'UPDATE' && aiAnalysis.extractedTask && aiAnalysis.extractedTask.taskIdToUpdate) {
      
      // Find the exact task using the MongoDB _id
      const taskToUpdate = await Task.findById(aiAnalysis.extractedTask.taskIdToUpdate);

      if (taskToUpdate) {
        // Apply the extracted updates dynamically
        if (aiAnalysis.extractedTask.complexity) taskToUpdate.complexity = aiAnalysis.extractedTask.complexity;
        if (aiAnalysis.extractedTask.technicalEffort) taskToUpdate.technicalEffort = aiAnalysis.extractedTask.technicalEffort;
        if (aiAnalysis.extractedTask.deadline) taskToUpdate.deadline = aiAnalysis.extractedTask.deadline;
        
        // NEW: Apply status updates (e.g., marking as completed)
        if (aiAnalysis.extractedTask.status) {
            taskToUpdate.status = aiAnalysis.extractedTask.status;
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
        console.log(`⚠️ Update Failed: Task ID ${aiAnalysis.extractedTask.taskIdToUpdate} not found.`);
      }
    }

    res.status(200).json({
      success: true,
      reply: aiAnalysis.conversationalReply,
      actionTaken: aiAnalysis.action
    });

  } catch (error) {
    console.error('❌ Chat Controller Error:', error);
    res.status(500).json({ success: false, error: "Failed to process message." });
  }
};