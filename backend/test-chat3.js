const { parseUserMessage } = require('./services/geminiService');

(async () => {
  try {
    const result = await parseUserMessage("Urgent backend fix and code review due today 11:59 pm", [], []);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Error:", error);
  }
})();
