const { parseUserMessage } = require('./services/geminiService');

(async () => {
  const result = await parseUserMessage("record hackathon video by tomorrow", [], []);
  console.log(JSON.stringify(result, null, 2));
})();
