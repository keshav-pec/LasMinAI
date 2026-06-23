const { handleChatMessage } = require('./controllers/chatController');
const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const req = {
    body: {
      message: "Urgent backend fix and code review due today 11:59 pm",
      history: []
    },
    user: { id: "100414332971207909062" } // A fake google user id
  };

  const res = {
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      console.log("Response:", this.statusCode, JSON.stringify(data, null, 2));
      process.exit(0);
    }
  };

  await handleChatMessage(req, res);
});
