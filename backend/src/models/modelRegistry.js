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
}

// Export singleton instance
module.exports = new ModelRegistry();
