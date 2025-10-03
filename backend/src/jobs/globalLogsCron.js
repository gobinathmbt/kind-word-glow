const cron = require('node-cron');
const GlobalLog = require('../models/GlobalLog');

// CRON job to delete old Global Logs
const deleteOldGlobalLogs = async () => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 6); // Keep only last 6 days

    const result = await GlobalLog.deleteMany({
      created_at: { $lt: cutoffDate }
    });

    console.log(`Deleted ${result.deletedCount} old global logs older than 6 days.`);
  } catch (error) {
    console.error('Error deleting old global logs:', error);
  }
};


// Schedule CRON to run every 6 days at midnight
const startGlobalLogCleanupCron = () => {
  cron.schedule('0 0 */6 * *', async () => {
    console.log('Running global log cleanup CRON job...');
    await deleteOldGlobalLogs();
  });

  console.log('Global log cleanup CRON job scheduled - runs every 6 days at midnight.');
};

module.exports = { startGlobalLogCleanupCron };
