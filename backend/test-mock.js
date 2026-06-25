const { handleChatMessage } = require('./controllers/chatController');
const mongoose = require('mongoose');
require('dotenv').config();

const runController = (controllerFn, req) => {
  return new Promise(async (resolve) => {
    const mockRes = {
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        resolve({ statusCode: this.statusCode || 200, data });
      }
    };
    try {
      await controllerFn(req, mockRes);
    } catch(err) {
      resolve({ statusCode: 500, data: { success: false, error: err.message } });
    }
  });
};

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const req = {
    body: { message: "assign me the DBMS assignment task for 11:00 p.m. to 12:00 a.m.", userTimezone: "Asia/Kolkata", localTime: "2026-06-25T18:00:00" },
    user: { id: "testuser" }
  };
  console.log("Running controller...");
  const res = await runController(handleChatMessage, req);
  console.log("Result:", JSON.stringify(res, null, 2));
  process.exit(0);
}).catch(console.error);
