const cron = require('node-cron');
const WorkflowExecution = require('../models/WorkflowExecution');

/**
 * Cleanup old workflow execution logs (older than 7 days)
 * Runs daily at 2:00 AM
 */
const cleanupWorkflowExecutionLogs = async () => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const result = await WorkflowExecution.deleteMany({
      created_at: { $lt: sevenDaysAgo },
    });
    
    console.log(`✅ Workflow execution logs cleanup completed: ${result.deletedCount} records deleted`);
  } catch (error) {
    console.error('❌ Workflow execution logs cleanup error:', error);
  }
};

/**
 * Start workflow execution cleanup cron job
 */
const startWorkflowExecutionCleanupCron = () => {
  // Run daily at 2:00 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('🔄 Running workflow execution logs cleanup...');
    await cleanupWorkflowExecutionLogs();
  });
  
  console.log('⏰ Workflow execution cleanup cron job initialized (daily at 2:00 AM)');
};

module.exports = {
  startWorkflowExecutionCleanupCron,
  cleanupWorkflowExecutionLogs,
};
