const { parseUserMessage } = require('./services/geminiService');

(async () => {
  try {
    const result = await parseUserMessage("hello", [], []);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Error:", error);
  }
})();
