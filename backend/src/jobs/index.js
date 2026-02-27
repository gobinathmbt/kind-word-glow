/**
 * E-Sign Job Scheduler
 * 
 * Central module for initializing and managing all e-sign background jobs
 * 
 * This module supports two modes:
 * 1. SQS-based queues (recommended for production)
 * 2. Cron-based jobs (simpler alternative for smaller deployments)
 */

const env = require('../config/env');

// Import cron jobs
const { startExpiryCronJob } = require('./esignExpiryCron');
const { startReminderCronJob } = require('./esignReminderCron');
const { startRetentionCronJob } = require('./esignRetentionCron');
const { startPdfGenerationCronJob } = require('./esignPdfGenerationCron');
const { startNotificationCronJob } = require('./esignNotificationCron');

// Import SQS queue workers
const { startPdfGenerationWorker } = require('./esignPdfGenerationQueue');
const { startNotificationWorker } = require('./esignNotificationQueue');

// Configuration
const USE_SQS = env.ESIGN_USE_SQS === 'true' || false;

let workers = [];

/**
 * Start all e-sign background jobs
 */
const startEsignJobs = () => {
  console.log('[E-Sign Jobs] Starting e-sign background jobs');
  console.log(`[E-Sign Jobs] Mode: ${USE_SQS ? 'SQS' : 'Cron'}`);
  
  try {
    // Always start these cron jobs (they run periodically regardless of queue type)
    console.log('[E-Sign Jobs] Starting document expiry cron job');
    startExpiryCronJob();
    
    console.log('[E-Sign Jobs] Starting pre-expiry reminder cron job');
    startReminderCronJob();
    
    console.log('[E-Sign Jobs] Starting data retention cron job');
    startRetentionCronJob();
    
    if (USE_SQS) {
      // Use SQS-based workers for PDF generation and notifications
      console.log('[E-Sign Jobs] Starting SQS-based workers');
      
      console.log('[E-Sign Jobs] Starting PDF generation worker');
      const pdfWorker = startPdfGenerationWorker({
        maxMessages: 1,
        waitTimeSeconds: 20,
        pollInterval: 1000,
      });
      workers.push(pdfWorker);
      
      console.log('[E-Sign Jobs] Starting notification worker');
      const notificationWorker = startNotificationWorker({
        maxMessages: 10,
        waitTimeSeconds: 20,
        pollInterval: 1000,
      });
      workers.push(notificationWorker);
    } else {
      // Use cron-based jobs for PDF generation and notifications
      console.log('[E-Sign Jobs] Starting cron-based jobs');
      
      console.log('[E-Sign Jobs] Starting PDF generation cron job');
      startPdfGenerationCronJob();
      
      console.log('[E-Sign Jobs] Starting notification processing cron job');
      startNotificationCronJob();
    }
    
    console.log('[E-Sign Jobs] All e-sign background jobs started successfully');
  } catch (error) {
    console.error('[E-Sign Jobs] Failed to start e-sign background jobs:', error);
    throw error;
  }
};

/**
 * Stop all e-sign background jobs
 */
const stopEsignJobs = () => {
  console.log('[E-Sign Jobs] Stopping e-sign background jobs');
  
  // Stop SQS workers if running
  workers.forEach(worker => {
    if (worker && worker.stop) {
      worker.stop();
    }
  });
  
  workers = [];
  
  console.log('[E-Sign Jobs] All e-sign background jobs stopped');
};

/**
 * Get job status
 */
const getJobStatus = () => {
  return {
    mode: USE_SQS ? 'SQS' : 'Cron',
    workers_running: workers.length,
    jobs: {
      expiry_cron: 'running',
      reminder_cron: 'running',
      retention_cron: 'running',
      pdf_generation: USE_SQS ? 'sqs_worker' : 'cron',
      notifications: USE_SQS ? 'sqs_worker' : 'cron',
    },
  };
};

module.exports = {
  startEsignJobs,
  stopEsignJobs,
  getJobStatus,
};
