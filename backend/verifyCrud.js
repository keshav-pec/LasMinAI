const mongoose = require('mongoose');
const Task = require('./models/Task');
const Reminder = require('./models/Reminder');
require('dotenv').config();

async function runTests() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');

  const userId = 'test-user-' + Date.now();
  const today = new Date();
  
  // Create Task
  const task = new Task({
    userId,
    title: 'Test Task',
    deadline: today,
    technicalEffort: 1,
    complexity: 1
  });
  await task.save();
  console.log('Task created:', task._id);

  // Update Task
  task.title = 'Updated Test Task';
  await task.save();
  console.log('Task updated:', task.title);

  // Delete Task
  await Task.findByIdAndDelete(task._id);
  console.log('Task deleted');

  // Create Reminder
  const reminder = new Reminder({
    userId,
    title: 'Test Reminder',
    remindAt: today
  });
  await reminder.save();
  console.log('Reminder created:', reminder._id);

  // Update Reminder
  reminder.title = 'Updated Test Reminder';
  await reminder.save();
  console.log('Reminder updated:', reminder.title);

  // Delete Reminder
  await Reminder.findByIdAndDelete(reminder._id);
  console.log('Reminder deleted');

  console.log('Automated CRUD verification successful!');
  process.exit(0);
}

runTests().catch(console.error);
