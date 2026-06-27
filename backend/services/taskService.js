const Task = require('../models/Task');
const { calculatePriorityScore } = require('../utils/priorityCalculator');

/**
 * Fetches all pending tasks, recalculates their live priority scores, 
 * and sorts them from highest urgency to lowest.
 */
const getSortedPendingTasks = async (userId) => {
  const tasks = await Task.find({ userId, status: { $ne: 'completed' } });
  
  const dynamicallySortedTasks = tasks.map(task => {
    return {
      _id: task._id,
      title: task.title,
      description: task.description,
      deadline: task.deadline,
      complexity: task.complexity,
      technicalEffort: task.technicalEffort,
      status: task.status,
      priorityScore: calculatePriorityScore(task.deadline, task.complexity, task.technicalEffort)
    };
  });

  return dynamicallySortedTasks.sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) {
      return b.priorityScore - a.priorityScore;
    }
    // If scores are tied (e.g., both are 100), sort by earliest deadline first
    return new Date(a.deadline) - new Date(b.deadline);
  });
};

module.exports = { getSortedPendingTasks };