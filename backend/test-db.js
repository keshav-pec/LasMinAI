const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const Task = require('./models/Task');
    const tasks = await Task.find({});
    console.log("Total tasks:", tasks.length);
    console.log(tasks);
    process.exit(0);
  })
  .catch(console.error);
