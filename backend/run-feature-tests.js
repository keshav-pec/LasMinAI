require('dotenv').config({ path: '/Users/keshavgoyal/Documents/Freelance/Vibe2Ship/LasMinAI/backend/.env' });
const { 
  parseUserMessage, 
  parseWorkstationMessage, 
  parseReminderMessage, 
  parseGeneralMessage, 
  parseOrchestratorIntent 
} = require('./services/geminiService');

const runTests = async () => {
  console.log("🚀 Starting Rigorous Feature Testing...");
  let passed = 0;
  let failed = 0;

  const runTest = async (name, testFn) => {
    try {
      console.log(`\n⏳ Running: ${name}`);
      const result = await testFn();
      console.log(`✅ Passed. Output: ${JSON.stringify(result, null, 2).substring(0, 300)}...`);
      passed++;
    } catch (err) {
      console.error(`❌ Failed: ${name}`, err);
      failed++;
    }
  };

  const userTimezone = "Asia/Kolkata";
  const localTime = "June 25, 2026 at 10:23 PM";
  const timezoneOffset = "+05:30";

  // Test 1: Task Prompter (CREATE)
  await runTest("Task Prompter - CREATE", async () => {
    const res = await parseUserMessage("add task to finish the presentation due tomorrow at 2pm", [], [], userTimezone, localTime, timezoneOffset);
    if (res.action !== "CREATE") throw new Error(`Expected CREATE, got ${res.action}`);
    if (!res.extractedTaskCreate.deadline.includes(timezoneOffset)) throw new Error(`Deadline missing strict offset: ${res.extractedTaskCreate.deadline}`);
    return res;
  });

  // Test 2: Task Prompter (UPDATE)
  await runTest("Task Prompter - UPDATE", async () => {
    const mockTasks = [{ _id: "task_123", title: "presentation for boss", deadline: "2026-06-25T12:00:00Z" }];
    const res = await parseUserMessage("change the presentation deadline to friday", [], mockTasks, userTimezone, localTime, timezoneOffset);
    if (res.action !== "UPDATE") throw new Error(`Expected UPDATE, got ${res.action}`);
    if (res.extractedTaskUpdate.taskIdToUpdate !== "task_123") throw new Error(`Failed fuzzy match: ${res.extractedTaskUpdate.taskIdToUpdate}`);
    return res;
  });

  // Test 3: Reminder Assistant (CREATE)
  await runTest("Reminder Assistant - CREATE", async () => {
    const res = await parseReminderMessage("set a reminder to drink water in 30 minutes", [], [], [], userTimezone, localTime, timezoneOffset);
    if (res.action !== "CREATE") throw new Error(`Expected CREATE, got ${res.action}`);
    if (!res.extractedReminderCreate.remindAt.includes(timezoneOffset)) throw new Error(`Deadline missing strict offset: ${res.extractedReminderCreate.remindAt}`);
    return res;
  });

  // Test 4: Workstation (GATHER_INFO)
  await runTest("Workstation - GATHER_INFO", async () => {
    const res = await parseWorkstationMessage("i want to work now", [], [], userTimezone, localTime);
    if (res.action !== "GATHER_INFO") throw new Error(`Expected GATHER_INFO, got ${res.action}`);
    return res;
  });

  // Test 5: Orchestrator (ROUTING)
  await runTest("Orchestrator - ROUTING TASK", async () => {
    const res = await parseOrchestratorIntent("log a new task to buy groceries");
    if (res.intent !== "TASK_PROMPTER") throw new Error(`Expected TASK_PROMPTER, got ${res.intent}`);
    return res;
  });

  await runTest("Orchestrator - ROUTING GENERAL", async () => {
    const res = await parseOrchestratorIntent("what is the capital of france?");
    if (res.intent !== "GENERAL_CHAT") throw new Error(`Expected GENERAL_CHAT, got ${res.intent}`);
    if (!res.generalReply) throw new Error("Missing direct generalReply optimization");
    return res;
  });

  console.log(`\n===========================================`);
  console.log(`🛡️ FEATURE AUDIT RESULTS: ${passed} Passed, ${failed} Failed 🛡️`);
  console.log(`===========================================`);
  
  if (failed > 0) process.exit(1);
};

runTests();
