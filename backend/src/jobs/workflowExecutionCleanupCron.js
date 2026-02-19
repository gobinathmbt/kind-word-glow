const cron = require('node-cron');
const dbConnectionManager = require('../config/dbConnectionManager');
const ModelRegistry = require('../models/modelRegistry');
const Company = require('../models/Company');

/**
 * Cleanup old workflow execution logs (older than 7 days)
 * Runs daily at 2:00 AM
 */
const cleanupWorkflowExecutionLogs = async () => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // Get all active companies
    const companies = await Company.find({ subscription_status: 'active' });
    console.log(`🧹 Processing ${companies.length} companies for workflow execution cleanup`);
    
    let totalDeleted = 0;
    
    // Process each company
    for (const company of companies) {
      try {
        // Get company-specific connection
        const companyConnection = await dbConnectionManager.getCompanyConnection(company._id.toString());
        const WorkflowExecution = ModelRegistry.getModel('WorkflowExecution', companyConnection);
        
        const result = await WorkflowExecution.deleteMany({
          created_at: { $lt: sevenDaysAgo },
        });
        
        totalDeleted += result.deletedCount;
        
        // Decrement active requests
        dbConnectionManager.decrementActiveRequests(company._id.toString());
        
      } catch (error) {
        console.error(`❌ Error cleaning workflow executions for company ${company._id}:`, error);
      }
    }
    
    console.log(`✅ Workflow execution cleanup completed. Deleted ${totalDeleted} old logs across ${companies.length} companies`);
    
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
