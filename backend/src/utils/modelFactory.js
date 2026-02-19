/**
 * Model Factory
 * 
 * Provides dynamic model creation bound to specific database connections.
 * Implements per-connection model caching to avoid recreation overhead.
 * 
 * Key Features:
 * - Retrieves schemas from ModelRegistry
 * - Creates models bound to specific connections
 * - Caches model instances per connection
 * - Handles errors with descriptive messages
 */

const ModelRegistry = require('../models/modelRegistry');

/**
 * Model cache structure: Map<connectionId, Map<modelName, Model>>
 * - Outer Map: keyed by connection ID
 * - Inner Map: keyed by model name, stores Mongoose model instances
 */
const modelCache = new Map();

/**
 * Get a Mongoose model bound to a specific database connection
 * 
 * @param {string} modelName - Name of the model to retrieve
 * @param {mongoose.Connection} connection - Database connection to bind the model to
 * @returns {mongoose.Model} Mongoose model instance bound to the connection
 * @throws {Error} If model name not found in registry or model creation fails
 * 
 * @example
 * const Vehicle = getModel('Vehicle', companyDbConnection);
 * const vehicles = await Vehicle.find({ status: 'active' });
 */
function getModel(modelName, connection) {
  // Validate inputs
  if (!modelName || typeof modelName !== 'string') {
    throw new Error('Model name must be a non-empty string');
  }

  if (!connection || typeof connection !== 'object') {
    throw new Error('Valid database connection is required');
  }

  // Get connection ID for caching
  const connectionId = connection.id || connection.name || connection._connectionString;
  
  if (!connectionId) {
    throw new Error('Unable to identify connection for caching');
  }

  // Check if we have a cache for this connection
  if (!modelCache.has(connectionId)) {
    modelCache.set(connectionId, new Map());
  }

  const connectionModels = modelCache.get(connectionId);

  // Return cached model if it exists
  if (connectionModels.has(modelName)) {
    return connectionModels.get(modelName);
  }

  // Retrieve schema from ModelRegistry
  let schema;
  try {
    schema = ModelRegistry.getSchema(modelName);
  } catch (error) {
    throw new Error(`Model not found: ${modelName}`);
  }

  // Create model bound to the connection
  let model;
  try {
    model = connection.model(modelName, schema);
  } catch (error) {
    // Handle case where model might already exist on connection
    if (error.name === 'OverwriteModelError') {
      model = connection.model(modelName);
    } else {
      throw new Error(`Model creation failed for ${modelName}: ${error.message}`);
    }
  }

  // Cache the model instance
  connectionModels.set(modelName, model);

  return model;
}

/**
 * Clear model cache for a specific connection
 * Useful for cleanup when a connection is closed
 * 
 * @param {mongoose.Connection} connection - Database connection
 */
function clearConnectionCache(connection) {
  const connectionId = connection.id || connection.name || connection._connectionString;
  if (connectionId && modelCache.has(connectionId)) {
    modelCache.delete(connectionId);
  }
}

/**
 * Clear all model caches
 * Useful for testing or application shutdown
 */
function clearAllCaches() {
  modelCache.clear();
}

/**
 * Get cache statistics for monitoring
 * @returns {Object} Cache statistics
 */
function getCacheStats() {
  const stats = {
    totalConnections: modelCache.size,
    connectionDetails: []
  };

  for (const [connectionId, models] of modelCache.entries()) {
    stats.connectionDetails.push({
      connectionId,
      cachedModels: models.size,
      modelNames: Array.from(models.keys())
    });
  }

  return stats;
}

module.exports = {
  getModel,
  clearConnectionCache,
  clearAllCaches,
  getCacheStats
};
