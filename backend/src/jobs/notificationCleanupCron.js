const cron = require('node-cron');
const Notification = require('../models/Notification');

let isCleanupJobRunning = false;

// Cleanup old read notifications (runs every 6 hours)
const startNotificationCleanupCron = () => {
  console.log('🧹 Starting notification cleanup cron job...');
  
  // Run every 6 hours at minute 0
  cron.schedule('0 */6 * * *', async () => {
    if (isCleanupJobRunning) {
      console.log('⏭️ Notification cleanup job already running, skipping...');
      return;
    }
    
    isCleanupJobRunning = true;
    
    try {
      console.log('🧹 Starting notification cleanup...');
      
      // Clean up read notifications older than 2 days
      const result = await Notification.cleanupOldNotifications(2);
      
      if (result.deletedCount > 0) {
        console.log(`✅ Cleaned up ${result.deletedCount} old read notifications`);
      } else {
        console.log('ℹ️ No old notifications to clean up');
      }
      
      // Also clean up very old unread notifications (older than 30 days)
      const oldUnreadCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const oldUnreadResult = await Notification.deleteMany({
        is_read: false,
        created_at: { $lt: oldUnreadCutoff }
      });
      
      if (oldUnreadResult.deletedCount > 0) {
        console.log(`✅ Cleaned up ${oldUnreadResult.deletedCount} very old unread notifications`);
      }
      
      // Clean up failed notifications older than 7 days
      const failedCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const failedResult = await Notification.deleteMany({
        status: 'failed',
        created_at: { $lt: failedCutoff }
      });
      
      if (failedResult.deletedCount > 0) {
        console.log(`✅ Cleaned up ${failedResult.deletedCount} old failed notifications`);
      }
      
      // Log statistics
      const totalNotifications = await Notification.countDocuments();
      const unreadNotifications = await Notification.countDocuments({ is_read: false });
      
      console.log(`📊 Notification cleanup completed. Total notifications: ${totalNotifications}, Unread: ${unreadNotifications}`);
      
    } catch (error) {
      console.error('❌ Error in notification cleanup cron job:', error);
    } finally {
      isCleanupJobRunning = false;
    }
  });
  
  console.log('✅ Notification cleanup cron job scheduled (every 6 hours)');
};

// Stop the cleanup job
const stopNotificationCleanupCron = () => {
  cron.getTasks().forEach((task) => {
    task.stop();
  });
  console.log('🛑 Notification cleanup cron job stopped');
};

// Manual cleanup function
const runManualCleanup = async (daysOld = 2) => {
  try {
    console.log(`🧹 Running manual notification cleanup for notifications older than ${daysOld} days...`);
    
    const result = await Notification.cleanupOldNotifications(daysOld);
    
    console.log(`✅ Manual cleanup completed. Deleted ${result.deletedCount} old notifications`);
    
    return {
      success: true,
      deletedCount: result.deletedCount
    };
  } catch (error) {
    console.error('❌ Error in manual notification cleanup:', error);
    throw error;
  }
};

module.exports = {
  startNotificationCleanupCron,
  stopNotificationCleanupCron,
  runManualCleanup
};