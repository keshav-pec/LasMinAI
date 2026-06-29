const Task = require('../models/Task');

const sweepZombies = async () => {
  try {
    const now = new Date();
    // Update any pending task whose deadline has passed globally across all users
    const result = await Task.updateMany(
      { status: 'pending', deadline: { $lt: now } },
      { $set: { status: 'overdue' } }
    );
    if (result.modifiedCount > 0) {
      console.log(`🧟 Zombie Sweeper: Marked ${result.modifiedCount} tasks as overdue.`);
    }
  } catch (error) {
    console.error('❌ Zombie Sweeper Error:', error);
  }
};

module.exports = { sweepZombies };
