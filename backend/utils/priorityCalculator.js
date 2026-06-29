/**
 * Calculates a dynamic priority score for a task.
 * Buffer Time = hoursRemaining - technicalEffort
 * If Buffer < 0 -> Urgency Mode (massive score, difficult to finish in time)
 * Otherwise -> Exponentially increases as Buffer approaches 0.
 */
const calculatePriorityScore = (deadline, complexity, technicalEffort) => {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  
  // Calculate time difference in hours
  const timeDiffMs = deadlineDate - now;
  const hoursRemaining = timeDiffMs / (1000 * 60 * 60);

  const buffer = hoursRemaining - (technicalEffort / 60);
  
  const W_c = 5; // Complexity weight (Max 5 * 5 = 25)
  
  let urgencyFactor = 0;
  
  if (buffer <= 0 && buffer > (-1)*(technicalEffort/60)) {
    // Urgency Mode: Task is overdue or there is no buffer left
    urgencyFactor = 75; 
  }
  else if (buffer<=-(technicalEffort/60)) {
    urgencyFactor = 100-W_c*complexity;
  } 
  else {
    // As buffer approaches 0.1 hours (6 mins), urgency approaches 75
    // Buffer = 10 -> urgency = 0.75
    // Buffer = 1 -> urgency = 7.5
    // Buffer = 0.1 -> urgency = 75
    const safeBuffer = Math.max(buffer, 0.1);
    urgencyFactor = Math.min(75, 7.5 / safeBuffer);
  }
  
  const complexityFactor = W_c * complexity;
  
  const rawScore = urgencyFactor + complexityFactor;
  
  return Math.min(Math.round(rawScore), 100);
};

module.exports = { calculatePriorityScore };