const cron = require('node-cron');
const Company = require('../models/Company');

// CRON job to check expired subscriptions
const checkExpiredSubscriptions = async () => {
  try {
    const now = new Date();
    
    // Find companies whose grace period has ended
    const expiredCompanies = await Company.find({
      subscription_status: { $in: ['active', 'grace_period'] },
      grace_period_end: { $lt: now }
    });

    for (const company of expiredCompanies) {
      await Company.findByIdAndUpdate(company._id, {
        subscription_status: 'inactive'
      });
      
      console.log(`Company ${company.company_name} subscription set to inactive`);
    }

    // Update companies entering grace period
    const gracePeriodCompanies = await Company.find({
      subscription_status: 'active',
      subscription_end_date: { $lt: now },
      grace_period_end: { $gt: now }
    });

    for (const company of gracePeriodCompanies) {
      await Company.findByIdAndUpdate(company._id, {
        subscription_status: 'grace_period'
      });
      
      console.log(`Company ${company.company_name} entered grace period`);
    }

  } catch (error) {
    console.error('CRON job error:', error);
  }
};

// Run every hour to check for expired subscriptions
const startSubscriptionCronJob = () => {
  cron.schedule('0 * * * *', async () => {
    console.log('Running subscription expiry check...');
    await checkExpiredSubscriptions();
  });

  console.log('Subscription CRON job started - runs every hour');
};

module.exports = { startSubscriptionCronJob };