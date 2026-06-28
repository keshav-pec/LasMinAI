const { parseUserMessage } = require('../services/geminiService');
const Task = require('../models/Task');
const { calculatePriorityScore } = require('../utils/priorityCalculator');
const { parseLocalToUTC } = require('../utils/dateUtils');

exports.handleChatMessage = async (req, res) => {
  try {
    const { message, history, localTime, timezoneOffset } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: "Message is required." });
    }

    // ==========================================
    // FETCH LIVE TASKS
    // ==========================================
    // 1. Fetch the newly cleaned live context. 
    // We exclude internals but include title, description, deadline, etc.
    const liveTasks = await Task.find({ userId: req.user.id, status: { $ne: 'completed' } })
                                .select('-__v -createdAt -updatedAt');

    // 2. Pass everything to the AI Brain
    const aiAnalysis = await parseUserMessage(message, history || [], liveTasks, localTime);

    // ==========================================
    // ACTION ROUTING
    // ==========================================
    if (aiAnalysis.action === 'CREATE' && aiAnalysis.extractedTaskCreate) {
      const { title, description, complexity, technicalEffort } = aiAnalysis.extractedTaskCreate;
      let { deadline } = aiAnalysis.extractedTaskCreate;

      // Fallback: If Gemini hallucinates or fails to extract the deadline, default to 24 hours from now
      if (!deadline) {
        const fallbackDate = new Date();
        fallbackDate.setHours(fallbackDate.getHours() + 24);
        deadline = fallbackDate.toISOString();
      } else {
        deadline = parseLocalToUTC(deadline, timezoneOffset).toISOString();
      }
      
      if (title) {
        const newTask = new Task({
          userId: req.user.id,
          title,
          description: description || "",
          deadline,
          complexity: complexity || 3,
          technicalEffort: technicalEffort || 2,
          sourceUrl: sourceUrl || "",
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
        if (aiAnalysis.extractedTaskUpdate.description !== undefined) taskToUpdate.description = aiAnalysis.extractedTaskUpdate.description;
        if (aiAnalysis.extractedTaskUpdate.complexity) taskToUpdate.complexity = aiAnalysis.extractedTaskUpdate.complexity;
        if (aiAnalysis.extractedTaskUpdate.technicalEffort) taskToUpdate.technicalEffort = aiAnalysis.extractedTaskUpdate.technicalEffort;
        if (aiAnalysis.extractedTaskUpdate.deadline) taskToUpdate.deadline = parseLocalToUTC(aiAnalysis.extractedTaskUpdate.deadline, timezoneOffset);
        
        // Apply status updates (e.g., marking as completed)
        if (aiAnalysis.extractedTaskUpdate.status) {
            taskToUpdate.status = aiAnalysis.extractedTaskUpdate.status;
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