/**
 * Calculates a dynamic priority score for a task.
 * Higher scores indicate higher urgency and required attention.
 * * Formula: P = (Wt * (1 / hoursRemaining)) + (Wc * complexity) + (We * technicalEffort)
 */
const calculatePriorityScore = (deadline, complexity, technicalEffort) => {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  
  // Calculate time difference in hours
  const timeDiffMs = deadlineDate - now;
  const hoursRemaining = Math.max(timeDiffMs / (1000 * 60 * 60), 0.1); // Prevent division by zero or negative values

  // Weights (Can be tweaked for fine-tuning)
  const W_t = 100; // Urgency weight (spikes heavily as hoursRemaining approaches 0)
  const W_c = 5;   // Complexity weight
  const W_e = 3;   // Technical effort weight

  // Compute individual factors
  const urgencyFactor = W_t * (1 / hoursRemaining);
  const complexityFactor = W_c * complexity;
  const effortFactor = W_e * technicalEffort;

  // Final Score
  const totalScore = urgencyFactor + complexityFactor + effortFactor;

  return parseFloat(totalScore.toFixed(2));
};

module.exports = { calculatePriorityScore };