const mongoose = require('mongoose');
const Task = require('./models/Task');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const tasks = await Task.find({ title: /Backend/i });
  console.log(tasks);
  process.exit();
});
