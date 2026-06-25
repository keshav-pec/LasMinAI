require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const user = await User.findOne();
  if (user) {
    console.log("Found User ID:", user._id.toString());
    console.log("Has Google Tokens:", !!user.googleTokens);
  } else {
    console.log("No users found.");
  }
  process.exit(0);
});
