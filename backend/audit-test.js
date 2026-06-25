const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const User = require('./models/User');

const TEST_EMAIL = 'keshavpec24@gmail.com';
const SERVER_URL = process.env.PORT ? `http://localhost:${process.env.PORT}` : 'http://localhost:5050';

async function runAudit() {
  console.log(`🚀 Starting Senior Security & Features Audit...`);
  console.log(`Connecting to MongoDB...`);
  
  await mongoose.connect(process.env.MONGO_URI);
  console.log(`✅ MongoDB Connected.`);

  // 1. Get User
  const user = await User.findOne({ email: TEST_EMAIL });
  if (!user) {
    console.error(`❌ User ${TEST_EMAIL} not found!`);
    process.exit(1);
  }

  // 2. Generate Auth Token
  const token = jwt.sign(
    { id: user.googleId, email: user.email, name: user.name, picture: user.picture },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  console.log(`✅ Generated Test JWT for ${user.name}`);

  const makeRequest = async (endpoint, payload) => {
    try {
      const response = await fetch(`${SERVER_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth_token=${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      return { status: response.status, data };
    } catch (e) {
      return { status: 500, error: e.message };
    }
  };

  const results = {
    totalSent: 0,
    successCount: 0,
    rateLimitedCount: 0,
    errors: []
  };

  // 3. Define Test Cases (Edge cases, valid intents, heavy payloads)
  const testCases = [
    { name: "Task Creation", endpoint: "/api/voice/process", payload: { message: "Remind me to call the client tomorrow at 2 PM" } },
    { name: "Task Read", endpoint: "/api/voice/process", payload: { message: "What tasks do I have pending?" } },
    { name: "General Chat", endpoint: "/api/voice/process", payload: { message: "Hey, how are you doing today?" } },
    { name: "Workstation Schedule", endpoint: "/api/voice/process", payload: { message: "I have 3 hours free right now, what should I work on?" } },
    { name: "Workstation Edge Case", endpoint: "/api/voice/process", payload: { message: "Schedule my pomodoro for the next 100 hours" } },
    { name: "Gibberish Injection", endpoint: "/api/voice/process", payload: { message: "sdfijsdofijwefoiwejf" } },
    { name: "Reminder Create", endpoint: "/api/voice/process", payload: { message: "Set a reminder to drink water at 8 PM" } },
    { name: "Extremely Long String", endpoint: "/api/voice/process", payload: { message: "a".repeat(1000) } }, // Testing length limiters/regex crashes
    { name: "Contradictory Command", endpoint: "/api/voice/process", payload: { message: "Create a task to sleep but also delete all my tasks and schedule a reminder." } }
  ];

  console.log(`\n⏳ Running Initial Feature Tests (Expected to succeed)...`);
  for (const tc of testCases) {
    console.log(`Testing: ${tc.name}...`);
    const start = Date.now();
    const res = await makeRequest(tc.endpoint, tc.payload);
    const duration = Date.now() - start;
    
    results.totalSent++;
    if (res.status === 200 && res.data.success) {
      results.successCount++;
      console.log(`  ✅ Success (${duration}ms). Intent Routed: ${res.data.intent || 'N/A'}`);
    } else if (res.status === 429) {
      results.rateLimitedCount++;
      console.log(`  🛑 Rate Limited (${duration}ms).`);
    } else {
      console.log(`  ❌ Failed (${duration}ms). Status: ${res.status}`);
      results.errors.push({ test: tc.name, res });
    }
  }

  console.log(`\n⏳ Running Rate Limit Stress Test (Expected to hit 429)...`);
  // Hammer the API to intentionally trigger the express-rate-limit (20 requests/min)
  // We've already sent ~9 requests. Sending 15 more rapidly.
  const promises = [];
  for (let i = 0; i < 15; i++) {
    promises.push(makeRequest('/api/voice/process', { message: "Rate limit test ping" }));
  }

  const stressResults = await Promise.all(promises);
  stressResults.forEach(res => {
    results.totalSent++;
    if (res.status === 200) results.successCount++;
    if (res.status === 429) results.rateLimitedCount++;
  });

  console.log(`\n===========================================`);
  console.log(`🛡️ AUDIT TEST RESULTS 🛡️`);
  console.log(`===========================================`);
  console.log(`Total Requests Sent: ${results.totalSent}`);
  console.log(`Successful Responses: ${results.successCount}`);
  console.log(`Rate Limited (Blocked) Responses: ${results.rateLimitedCount}`);
  if (results.errors.length > 0) {
    console.log(`Errors encountered:`, JSON.stringify(results.errors, null, 2));
  } else {
    console.log(`No fatal server crashes encountered. Edge cases gracefully handled.`);
  }

  // The aiLimiter in server.js limits to 20 requests per minute.
  // We sent ~24 requests in rapid succession. At least 4 should be blocked (429).
  if (results.rateLimitedCount > 0) {
    console.log(`\n✅ SECURITY VERIFIED: Rate Limiter successfully blocked excess AI traffic.`);
  } else {
    console.warn(`\n⚠️ SECURITY WARNING: Rate Limiter did NOT block excess traffic. Check express-rate-limit config!`);
  }

  process.exit(0);
}

runAudit();
