const { parseUserMessage } = require('./services/geminiService');
const currentTasks = [
  {
    _id: "6a3ab0f22c47338829e6d0b2",
    title: 'Backend fix and code review',
    deadline: '2026-06-24T16:14:42.729Z',
  }
];

(async () => {
  try {
    const userTimezone = 'Asia/Kolkata';
    const localTime = '6/23/2026, 10:06:00 PM';
    const result = await parseUserMessage("bckend fix task deadline", [], currentTasks, userTimezone, localTime);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Error:", error);
  }
})();
