const { parseOrchestratorIntent } = require('./services/geminiService');
require('dotenv').config();

console.log("Running orchestrator...");
parseOrchestratorIntent("assign me the DBMS assignment task for 11:00 p.m. to 12:00 a.m.")
  .then(res => {
    console.log("Result:", res);
    process.exit(0);
  })
  .catch(err => {
    console.error("Error:", err);
    process.exit(1);
  });
