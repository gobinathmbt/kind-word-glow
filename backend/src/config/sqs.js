const { SQS } = require('@aws-sdk/client-sqs');
const MasterAdmin = require('../models/MasterAdmin');

let sqsClient = null;
let isInitialized = false;

/**
 * Initialize SQS client with master admin settings
 */
const initializeSQS = async () => {
  if (sqsClient && isInitialized) {
    return sqsClient;
  }

  try {
    // Get AWS settings from master admin
    const masterAdmin = await MasterAdmin.findOne({ role: 'master_admin' });
    
    if (!masterAdmin || !masterAdmin.aws_settings) {
      throw new Error('AWS settings not configured in master admin');
    }

    const { access_key_id, secret_access_key, region } = masterAdmin.aws_settings;

    if (!access_key_id || !secret_access_key || !region) {
      throw new Error('Incomplete AWS settings in master admin');
    }

    // Initialize SQS client
    sqsClient = new SQS({
      region,
      credentials: {
        accessKeyId: access_key_id,
        secretAccessKey: secret_access_key,
      },
    });

    isInitialized = true;

    console.log('SQS: Connected and ready');

    return sqsClient;
  } catch (error) {
    console.error('Failed to initialize SQS:', error);
    throw error;
  }
};

/**
 * Get SQS client instance
 */
const getSQSClient = async () => {
  if (!sqsClient || !isInitialized) {
    await initializeSQS();
  }
  return sqsClient;
};

/**
 * Check SQS health
 */
const checkSQSHealth = async () => {
  try {
    if (!sqsClient || !isInitialized) {
      return {
        status: 'disconnected',
        message: 'SQS client not initialized',
      };
    }

    // Test SQS by listing queues
    const startTime = Date.now();
    await sqsClient.listQueues({ MaxResults: 1 });
    const responseTime = Date.now() - startTime;

    return {
      status: 'healthy',
      message: 'SQS is connected and responding',
      responseTime: `${responseTime}ms`,
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.message,
    };
  }
};

/**
 * SQS utility functions
 */
const sqsUtils = {
  /**
   * Send message to SQS queue
   */
  sendMessage: async (queueUrl, messageBody, delaySeconds = 0) => {
    const client = await getSQSClient();
    const params = {
      QueueUrl: queueUrl,
      MessageBody: typeof messageBody === 'object' ? JSON.stringify(messageBody) : messageBody,
      DelaySeconds: delaySeconds,
    };
    
    return await client.sendMessage(params);
  },

  /**
   * Send batch messages to SQS queue
   */
  sendMessageBatch: async (queueUrl, messages) => {
    const client = await getSQSClient();
    const entries = messages.map((msg, index) => ({
      Id: `msg-${index}`,
      MessageBody: typeof msg === 'object' ? JSON.stringify(msg) : msg,
    }));
    
    const params = {
      QueueUrl: queueUrl,
      Entries: entries,
    };
    
    return await client.sendMessageBatch(params);
  },

  /**
   * Receive messages from SQS queue
   */
  receiveMessages: async (queueUrl, maxMessages = 1, waitTimeSeconds = 0) => {
    const client = await getSQSClient();
    const params = {
      QueueUrl: queueUrl,
      MaxNumberOfMessages: maxMessages,
      WaitTimeSeconds: waitTimeSeconds,
      VisibilityTimeout: 30,
    };
    
    const result = await client.receiveMessage(params);
    return result.Messages || [];
  },

  /**
   * Delete message from SQS queue
   */
  deleteMessage: async (queueUrl, receiptHandle) => {
    const client = await getSQSClient();
    const params = {
      QueueUrl: queueUrl,
      ReceiptHandle: receiptHandle,
    };
    
    return await client.deleteMessage(params);
  },

  /**
   * Get queue URL by name
   */
  getQueueUrl: async (queueName) => {
    const client = await getSQSClient();
    const result = await client.getQueueUrl({ QueueName: queueName });
    return result.QueueUrl;
  },

  /**
   * Get queue attributes
   */
  getQueueAttributes: async (queueUrl) => {
    const client = await getSQSClient();
    const params = {
      QueueUrl: queueUrl,
      AttributeNames: ['All'],
    };
    
    const result = await client.getQueueAttributes(params);
    return result.Attributes;
  },
};

module.exports = {
  initializeSQS,
  getSQSClient,
  checkSQSHealth,
  sqsUtils,
};
