function calculateGlobalStreak(heatmapData) {
  if (!heatmapData || heatmapData.length === 0) return 0;
  
  // Create a set of dates where count >= 1
  const activeDates = new Set(
    heatmapData.filter(d => d.count >= 1).map(d => d.date)
  );

  let streak = 0;
  let currentDate = new Date(); // Local today
  
  while (true) {
    const yyyy = currentDate.getFullYear();
    const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dd = String(currentDate.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    if (activeDates.has(dateStr)) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}
