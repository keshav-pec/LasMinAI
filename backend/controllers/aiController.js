const { generateAgenticSchedule } = require('../services/geminiService');
const Task = require('../models/Task');
const { calculatePriorityScore } = require('../utils/priorityCalculator');

exports.getAiSchedule = async (req, res) => {
  try {
    const { availableHours } = req.query; // Accept available hours via query param (e.g., ?availableHours=6)
    const hours = availableHours ? parseInt(availableHours) : 8;

    // Fetch all incomplete tasks
    const tasks = await Task.find({ status: { $ne: 'completed' } });

    if (tasks.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No pending tasks found to schedule.",
        data: { calendarEvents: [], personalizedRecommendations: ["Your schedule is completely clear! Take a breather."] }
      });
    }

    // Recalculate priority scores dynamically based on the current timestamp
    const dynamicallySortedTasks = tasks.map(task => {
      const currentScore = calculatePriorityScore(task.deadline, task.complexity, task.technicalEffort);
      return {
        title: task.title,
        description: task.description,
        deadline: task.deadline,
        complexity: task.complexity,
        technicalEffort: task.technicalEffort,
        priorityScore: currentScore
      };
    });

    // Sort descending by the recalculated score
    dynamicallySortedTasks.sort((a, b) => b.priorityScore - a.priorityScore);

    // Pass the sorted array to our Gemini Service
    const aiSchedule = await generateAgenticSchedule(dynamicallySortedTasks, hours);

    res.status(200).json({
      success: true,
      data: aiSchedule
    });
  } catch (error) {
    console.error('❌ AI Controller Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};