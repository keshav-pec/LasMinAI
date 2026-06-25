const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const db = mongoose.connection.db;
    const tasksCount = await db.collection('tasks').countDocuments();
    const remindersCount = await db.collection('reminders').countDocuments();
    console.log(`TASKS_IN_DB: ${tasksCount}`);
    console.log(`REMINDERS_IN_DB: ${remindersCount}`);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
