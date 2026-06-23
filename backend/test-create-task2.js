const { parseUserMessage } = require('./services/geminiService');

(async () => {
  try {
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const localTime = new Date().toLocaleString('en-US', { timeZone: userTimezone });

    const result = await parseUserMessage("Leetcode question solving due 3 am", [], [], userTimezone, localTime);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Error:", error);
  }
})();
