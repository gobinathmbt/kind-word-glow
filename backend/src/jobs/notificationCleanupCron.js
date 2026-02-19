const cron = require('node-cron');
const dbConnectionManager = require('../config/dbConnectionManager');
const ModelRegistry = require('../models/modelRegistry');
const Company = require('../models/Company');

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
      
      // Get all active companies
      const companies = await Company.find({ subscription_status: 'active' });
      console.log(`📋 Processing ${companies.length} companies for notification cleanup`);
      
      let totalDeleted = 0;
      let totalOldUnreadDeleted = 0;
      let totalFailedDeleted = 0;
      
      // Process each company
      for (const company of companies) {
        try {
          // Get company-specific connection
          const companyConnection = await dbConnectionManager.getCompanyConnection(company._id.toString());
          const Notification = ModelRegistry.getModel('Notification', companyConnection);
          
          // Clean up read notifications older than 2 days
          const result = await Notification.cleanupOldNotifications(2);
          totalDeleted += result.deletedCount;
          
          // Clean up very old unread notifications (older than 30 days)
          const oldUnreadCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          const oldUnreadResult = await Notification.deleteMany({
            is_read: false,
            created_at: { $lt: oldUnreadCutoff }
          });
          totalOldUnreadDeleted += oldUnreadResult.deletedCount;
          
          // Clean up failed notifications older than 7 days
          const failedCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          const failedResult = await Notification.deleteMany({
            status: 'failed',
            created_at: { $lt: failedCutoff }
          });
          totalFailedDeleted += failedResult.deletedCount;
          
          // Decrement active requests
          dbConnectionManager.decrementActiveRequests(company._id.toString());
          
        } catch (error) {
          console.error(`❌ Error cleaning notifications for company ${company._id}:`, error);
        }
      }
      
      console.log(`✅ Notification cleanup completed across ${companies.length} companies`);
      console.log(`   - Read notifications deleted: ${totalDeleted}`);
      console.log(`   - Old unread notifications deleted: ${totalOldUnreadDeleted}`);
      console.log(`   - Failed notifications deleted: ${totalFailedDeleted}`);
      
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
    
    // Get all active companies
    const companies = await Company.find({ subscription_status: 'active' });
    let totalDeleted = 0;
    
    for (const company of companies) {
      try {
        const companyConnection = await dbConnectionManager.getCompanyConnection(company._id.toString());
        const Notification = ModelRegistry.getModel('Notification', companyConnection);
        
        const result = await Notification.cleanupOldNotifications(daysOld);
        totalDeleted += result.deletedCount;
        
        dbConnectionManager.decrementActiveRequests(company._id.toString());
      } catch (error) {
        console.error(`❌ Error in manual cleanup for company ${company._id}:`, error);
      }
    }
    
    console.log(`✅ Manual cleanup completed. Deleted ${totalDeleted} old notifications across ${companies.length} companies`);
    
    return {
      success: true,
      deletedCount: totalDeleted,
      companiesProcessed: companies.length
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