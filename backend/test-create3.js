const { parseUserMessage } = require('./services/geminiService');

(async () => {
  try {
    const userTimezone = 'Asia/Kolkata';
    const localTime = '6/23/2026, 10:18:03 PM';
    const result = await parseUserMessage("leet code daily question to solved by today", [], [], userTimezone, localTime);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Error:", error);
  }
})();
