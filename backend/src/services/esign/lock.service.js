/**
 * Distributed Lock Service using MongoDB
 * 
 * Provides distributed locking mechanism to prevent concurrent operations
 * Useful for preventing race conditions in PDF generation and other critical operations
 */

const LOCK_CONFIG = {
  defaultTTL: 60, // 60 seconds default lock TTL
  maxRetries: 3,
  retryDelay: 1000, // 1 second between retries
};

/**
 * Acquire a distributed lock
 * @param {string} lockKey - Lock key (e.g., 'document:123:pdf-generation')
 * @param {number} ttl - Lock TTL in seconds (default: 60)
 * @param {string} lockId - Unique lock identifier (default: random)
 * @returns {Promise<Object>} { acquired, lockId } or { acquired: false }
 */
const acquireLock = async (lockKey, ttl = LOCK_CONFIG.defaultTTL, lockId = null) => {
  try {
    const EsignLock = require('../../models/EsignLock');
    
    const id = lockId || generateLockId();
    const expiresAt = new Date(Date.now() + ttl * 1000);
    
    // Try to create lock only if it doesn't exist
    try {
      const lock = await EsignLock.create({
        lockKey,
        lockId: id,
        expiresAt,
      });
      
      return {
        acquired: true,
        lockId: id,
        expiresAt,
      };
    } catch (error) {
      // Lock already exists (duplicate key error)
      if (error.code === 11000) {
        // Check if existing lock is expired
        const existingLock = await EsignLock.findOne({ lockKey });
        if (existingLock && existingLock.expiresAt < new Date()) {
          // Lock expired, delete and retry
          await EsignLock.deleteOne({ lockKey });
          return await acquireLock(lockKey, ttl, lockId);
        }
        return { acquired: false };
      }
      throw error;
    }
  } catch (error) {
    console.error('Lock acquisition error:', error);
    throw new Error(`Failed to acquire lock: ${error.message}`);
  }
};

/**
 * Release a distributed lock
 * @param {string} lockKey - Lock key
 * @param {string} lockId - Lock identifier (must match the one used to acquire)
 * @returns {Promise<boolean>} True if lock was released
 */
const releaseLock = async (lockKey, lockId) => {
  try {
    const EsignLock = require('../../models/EsignLock');
    
    // Only delete if lock ID matches
    const result = await EsignLock.deleteOne({ lockKey, lockId });
    
    return result.deletedCount > 0;
  } catch (error) {
    console.error('Lock release error:', error);
    throw new Error(`Failed to release lock: ${error.message}`);
  }
};

/**
 * Acquire lock with retries
 * @param {string} lockKey - Lock key
 * @param {number} ttl - Lock TTL in seconds
 * @param {number} maxRetries - Maximum retry attempts (default: 3)
 * @param {number} retryDelay - Delay between retries in ms (default: 1000)
 * @returns {Promise<Object>} { acquired, lockId } or throws error after max retries
 */
const acquireLockWithRetry = async (
  lockKey,
  ttl = LOCK_CONFIG.defaultTTL,
  maxRetries = LOCK_CONFIG.maxRetries,
  retryDelay = LOCK_CONFIG.retryDelay
) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await acquireLock(lockKey, ttl);
      
      if (result.acquired) {
        console.log(`Lock acquired on attempt ${attempt}: ${lockKey}`);
        return result;
      }
      
      // Lock not acquired, wait before retry
      if (attempt < maxRetries) {
        console.log(`Lock not acquired, retrying in ${retryDelay}ms... (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    } catch (error) {
      lastError = error;
      console.error(`Lock acquisition attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
  
  throw new Error(`Failed to acquire lock after ${maxRetries} attempts: ${lastError?.message || 'Lock is held by another process'}`);
};

/**
 * Check if lock exists
 * @param {string} lockKey - Lock key
 * @returns {Promise<boolean>} True if lock exists
 */
const isLocked = async (lockKey) => {
  try {
    const EsignLock = require('../../models/EsignLock');
    
    const lock = await EsignLock.findOne({ lockKey });
    
    if (!lock) {
      return false;
    }
    
    // Check if lock has expired
    if (lock.expiresAt < new Date()) {
      // Lock expired, delete it
      await EsignLock.deleteOne({ lockKey });
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Lock check error:', error);
    throw new Error(`Failed to check lock: ${error.message}`);
  }
};

/**
 * Extend lock TTL
 * @param {string} lockKey - Lock key
 * @param {string} lockId - Lock identifier (must match)
 * @param {number} additionalTTL - Additional TTL in seconds
 * @returns {Promise<boolean>} True if lock was extended
 */
const extendLock = async (lockKey, lockId, additionalTTL) => {
  try {
    const EsignLock = require('../../models/EsignLock');
    
    const lock = await EsignLock.findOne({ lockKey, lockId });
    
    if (!lock) {
      return false;
    }
    
    const newExpiresAt = new Date(lock.expiresAt.getTime() + additionalTTL * 1000);
    
    await EsignLock.updateOne(
      { lockKey, lockId },
      { $set: { expiresAt: newExpiresAt } }
    );
    
    return true;
  } catch (error) {
    console.error('Lock extension error:', error);
    throw new Error(`Failed to extend lock: ${error.message}`);
  }
};

/**
 * Execute function with lock
 * @param {string} lockKey - Lock key
 * @param {Function} fn - Function to execute while holding lock
 * @param {number} ttl - Lock TTL in seconds
 * @returns {Promise<any>} Result of function execution
 */
const withLock = async (lockKey, fn, ttl = LOCK_CONFIG.defaultTTL) => {
  let lockResult;
  
  try {
    // Acquire lock with retry
    lockResult = await acquireLockWithRetry(lockKey, ttl);
    
    // Execute function
    const result = await fn();
    
    return result;
  } finally {
    // Always release lock, even if function throws
    if (lockResult && lockResult.acquired) {
      try {
        await releaseLock(lockKey, lockResult.lockId);
        console.log(`Lock released: ${lockKey}`);
      } catch (error) {
        console.error(`Failed to release lock ${lockKey}:`, error);
      }
    }
  }
};

/**
 * Generate a unique lock ID
 * @returns {string} Unique lock ID
 */
const generateLockId = () => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
};

/**
 * Get lock info
 * @param {string} lockKey - Lock key
 * @returns {Promise<Object|null>} Lock info or null if not locked
 */
const getLockInfo = async (lockKey) => {
  try {
    const EsignLock = require('../../models/EsignLock');
    
    const lock = await EsignLock.findOne({ lockKey });
    
    if (!lock) {
      return null;
    }
    
    const now = new Date();
    const ttl = Math.max(0, Math.floor((lock.expiresAt - now) / 1000));
    
    // If expired, delete and return null
    if (ttl === 0) {
      await EsignLock.deleteOne({ lockKey });
      return null;
    }
    
    return {
      lockId: lock.lockId,
      ttl,
      expiresAt: lock.expiresAt,
    };
  } catch (error) {
    console.error('Get lock info error:', error);
    throw new Error(`Failed to get lock info: ${error.message}`);
  }
};

module.exports = {
  acquireLock,
  releaseLock,
  acquireLockWithRetry,
  isLocked,
  extendLock,
  withLock,
  generateLockId,
  getLockInfo,
  LOCK_CONFIG,
};
