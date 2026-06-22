const { parseUserMessage } = require('../services/geminiService');
const Task = require('../models/Task');
const { calculatePriorityScore } = require('../utils/priorityCalculator');

exports.handleChatMessage = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: "Message is required." });
    }

    // 1. Pass the raw string to the AI Brain
    const aiAnalysis = await parseUserMessage(message);

    // 2. If the AI found a task, save it to the database autonomously
    if (aiAnalysis.isTaskExtracted && aiAnalysis.extractedTask) {
      const { title, deadline, complexity, technicalEffort } = aiAnalysis.extractedTask;
      
      // Calculate initial priority score
      const priorityScore = calculatePriorityScore(deadline, complexity || 5, technicalEffort || 2);

      const newTask = new Task({
        title,
        deadline,
        complexity: complexity || 5,
        technicalEffort: technicalEffort || 2,
        priorityScore
      });

      await newTask.save();
      console.log(`✅ Autonomous Log: [${title}] saved to database.`);
    }

    // 3. Return the conversational response to the frontend UI
    res.status(200).json({
      success: true,
      reply: aiAnalysis.conversationalReply,
      taskLogged: aiAnalysis.isTaskExtracted
    });

  } catch (error) {
    console.error('❌ Chat Controller Error:', error);
    res.status(500).json({ success: false, error: "Failed to process message." });
  }
};