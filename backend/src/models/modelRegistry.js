/**
 * Model Registry
 *
 * Centralized registry for categorizing Mongoose models into:
 * - Main DB Models: Shared across all companies (users, companies, master data)
 * - Company DB Models: Company-specific operational data
 *
 * Provides schema storage and validation for dynamic model creation.
 */

class ModelRegistry {
  constructor() {
    // Main database models - shared across all companies
    this.mainDbModels = new Set([
      "Body",
      "Company",
      "CustomModuleConfig",
      "GlobalLog",
      "Make",
      "MasterAdmin",
      "MasterDropdown",
      "Model",
      "Plan",
      "Permission",
      "TrademeMetadata",
      "User",
      "Variant",
      "VariantYear",
      "VehicleMetadata",
    ]);

    // Company database models - isolated per company
    this.companyDbModels = new Set([
      "AdvertiseData",
      "AdvertiseVehicle",
      "Conversation",
      "CostConfiguration",
      "Currency",
      "Dealership",
      "DropdownMaster",
      "EsignAPIKey",
      "EsignAuditLog",
      "EsignBulkJob",
      "EsignDocument",
      "EsignProviderConfig",
      "EsignSigningGroup",
      "EsignTemplate",
      "GroupPermission",
      "InspectionConfig",
      "Integration",
      "Invoice",
      "MasterVehicle",
      "Notification",
      "NotificationConfiguration",
      "ServiceBay",
      "Subscriptions",
      "Supplier",
      "Tender",
      "TenderConversation",
      "TenderDealership",
      "TenderDealershipUser",
      "TenderHistory",
      "TenderNotification",
      "TenderVehicle",
      "TradeinConfig",
      "Vehicle",
      "VehicleActivityLog",
      "Workflow",
      "WorkflowExecution",
      "WorkshopQuote",
      "WorkshopReport",
    ]);

    // Schema storage: Map<modelName, schema>
    this.schemas = new Map();
  }

  /**
   * Check if a model is a main database model
   * @param {string} modelName - Name of the model
   * @returns {boolean} True if model belongs to main database
   */
  isMainDbModel(modelName) {
    return this.mainDbModels.has(modelName);
  }

  /**
   * Check if a model is a company database model
   * @param {string} modelName - Name of the model
   * @returns {boolean} True if model belongs to company database
   */
  isCompanyDbModel(modelName) {
    return this.companyDbModels.has(modelName);
  }

  /**
   * Get schema for a model
   * @param {string} modelName - Name of the model
   * @returns {mongoose.Schema} The model's schema
   * @throws {Error} If model not found in registry
   */
  getSchema(modelName) {
    if (!this.schemas.has(modelName)) {
      throw new Error(`Schema not found for model: ${modelName}`);
    }
    return this.schemas.get(modelName);
  }

  /**
   * Register a model with its schema and database type
   * @param {string} modelName - Name of the model
   * @param {mongoose.Schema} schema - Mongoose schema for the model
   * @param {string} type - Database type: 'main' or 'company'
   * @throws {Error} If model name already registered or invalid type
   */
  registerModel(modelName, schema, type) {
    // Validate model name uniqueness
    if (this.schemas.has(modelName)) {
      throw new Error(`Model already registered: ${modelName}`);
    }

    // Validate type
    if (type !== "main" && type !== "company") {
      throw new Error(
        `Invalid model type: ${type}. Must be 'main' or 'company'`,
      );
    }

    // Validate model is in correct category
    if (type === "main" && !this.mainDbModels.has(modelName)) {
      throw new Error(`Model ${modelName} not found in main DB models list`);
    }

    if (type === "company" && !this.companyDbModels.has(modelName)) {
      throw new Error(`Model ${modelName} not found in company DB models list`);
    }

    // Register schema
    this.schemas.set(modelName, schema);
  }

  /**
   * Check if a model is registered
   * @param {string} modelName - Name of the model
   * @returns {boolean} True if model is registered
   */
  isRegistered(modelName) {
    return this.schemas.has(modelName);
  }

  /**
   * Get all registered model names
   * @returns {string[]} Array of registered model names
   */
  getRegisteredModels() {
    return Array.from(this.schemas.keys());
  }

  /**
   * Get or create a model for a specific connection
   * @param {string} modelName - Name of the model
   * @param {mongoose.Connection} connection - Mongoose connection
   * @returns {mongoose.Model} The model instance for the connection
   * @throws {Error} If model not registered or schema not found
   */
  getModel(modelName, connection) {
    // Check if model is registered
    if (!this.isRegistered(modelName)) {
      throw new Error(`Model not registered: ${modelName}`);
    }

    // Get schema
    const schema = this.getSchema(modelName);

    // Check if model already exists on this connection
    try {
      return connection.model(modelName);
    } catch (error) {
      // Model doesn't exist on this connection, create it
      return connection.model(modelName, schema);
    }
  }

  /**
   * Initialize all company models for a new company database
   * Creates all company-specific models on the connection to ensure collections exist
   * 
   * @param {mongoose.Connection} connection - Company database connection
   * @returns {Promise<Object>} Object containing all initialized models
   */
  async initializeCompanyModels(connection) {
    if (!connection || typeof connection !== 'object') {
      throw new Error('Valid database connection is required');
    }

    const initializedModels = {};
    const companyModels = Array.from(this.companyDbModels);

    console.log(`🔧 Initializing ${companyModels.length} company models...`);

    for (const modelName of companyModels) {
      try {
        // Get schema from registry
        const schema = this.getSchema(modelName);
        
        // Create model on connection
        let model;
        try {
          model = connection.model(modelName, schema);
        } catch (error) {
          // Model might already exist
          if (error.name === 'OverwriteModelError') {
            model = connection.model(modelName);
          } else {
            throw error;
          }
        }

        // Sync indexes - this will drop conflicting indexes and create new ones
        try {
          await model.syncIndexes();
        } catch (indexError) {
          // If syncIndexes fails, try createIndexes as fallback
          console.warn(`  ⚠️  syncIndexes failed for ${modelName}, trying createIndexes...`);
          try {
            await model.createIndexes();
          } catch (createError) {
            console.warn(`  ⚠️  Index creation warning for ${modelName}:`, createError.message);
          }
        }
        
        initializedModels[modelName] = model;
        console.log(`  ✓ ${modelName} initialized`);
      } catch (error) {
        console.error(`  ✗ Failed to initialize ${modelName}:`, error.message);
        throw new Error(`Failed to initialize model ${modelName}: ${error.message}`);
      }
    }

    console.log(`✅ All company models initialized successfully`);
    return initializedModels;
  }
}

// Export singleton instance
module.exports = new ModelRegistry();
