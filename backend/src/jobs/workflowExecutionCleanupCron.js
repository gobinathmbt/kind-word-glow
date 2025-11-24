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
    await cleanupWorkflowExecutionLogs();
  });
};

module.exports = {
  startWorkflowExecutionCleanupCron,
  cleanupWorkflowExecutionLogs,
};
