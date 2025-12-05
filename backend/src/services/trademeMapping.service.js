const TrademeMetadata = require('../models/TrademeMetadata');

/**
 * Trade Me Metadata Mapping Service
 * Maps text values from advertisement payload to Trade Me numeric IDs
 * Uses the TrademeMetadata MongoDB collection
 */

/**
 * Find metadata by type and name (case-insensitive, fuzzy matching)
 * @param {string} metadataType - Type of metadata (MANUFACTURER, MODEL, etc.)
 * @param {string} name - Name to search for
 * @param {object} filters - Additional filters (e.g., parent_id, category_id)
 * @returns {object|null} Metadata document or null
 */
async function findMetadata(metadataType, name, filters = {}) {
  if (!name) return null;
  
  const query = {
    metadata_type: metadataType,
    name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
    is_active: 1,
    ...filters
  };
  
  let result = await TrademeMetadata.findOne(query);
  
  // If exact match not found, try fuzzy matching
  if (!result) {
    const fuzzyQuery = {
      metadata_type: metadataType,
      name: { $regex: new RegExp(name.trim(), 'i') },
      is_active: 1,
      ...filters
    };
    result = await TrademeMetadata.findOne(fuzzyQuery);
  }
  
  return result;
}

/**
 * Map advertisement payload text values to Trade Me numeric IDs
 * @param {object} payload - Advertisement payload with text values
 * @returns {object} Mapped data with Trade Me IDs
 */
async function mapMetadataToIds(payload) {
  const mappedData = {};
  const errors = [];
  
  try {
    // 1. Map Manufacturer (Make)
    if (payload.manufacturerId || payload.make) {
      const makeName = payload.manufacturerId || payload.make;
      
      const make = await findMetadata('MANUFACTURER', makeName);
      
      if (make) {
        mappedData.make = make.value_id;
        mappedData.makeName = make.name;
      } else {
        errors.push(`Manufacturer "${makeName}" not found in Trade Me metadata`);
      }
    } else {
      errors.push('Manufacturer field is missing from payload');
    }
    
    // 2. Map Model (requires Make)
    if ((payload.modelId || payload.model) && mappedData.make) {
      const modelName = payload.modelId || payload.model;
      
      const model = await findMetadata('MODEL', modelName, {
        parent_id: mappedData.make
      });
      
      if (model) {
        mappedData.model = model.value_id;
        mappedData.modelName = model.name;
        
        // Extract category_id from model metadata
        if (model.category_id) {
          mappedData.categoryId = model.category_id;
        }
      } else {
        errors.push(`Model "${modelName}" not found for manufacturer "${mappedData.makeName}"`);
      }
    } else if (!mappedData.make) {
      errors.push('Model cannot be mapped without a valid manufacturer');
    } else {
      errors.push('Model field is missing from payload');
    }
    
    // 3. Map Body Type (Vehicle Type)
    if (payload.bodyTypeId || payload.bodyType) {
      const bodyTypeName = payload.bodyTypeId || payload.bodyType;
      const bodyType = await findMetadata('VEHICLE_TYPE', bodyTypeName);
      
      if (bodyType) {
        mappedData.bodyType = bodyType.value_id;
        mappedData.bodyTypeName = bodyType.name;
      } else {
        // Body type is optional, just log warning
        console.warn(`Body type "${bodyTypeName}" not found in Trade Me metadata`);
      }
    }
    
    // 4. Map Fuel Type
    if (payload.fuelTypeId || payload.fuelType) {
      const fuelTypeName = payload.fuelTypeId || payload.fuelType;
      const fuelType = await findMetadata('FUEL_TYPE', fuelTypeName);
      
      if (fuelType) {
        mappedData.fuelType = fuelType.value_id;
        mappedData.fuelTypeName = fuelType.name;
      }
    }
    
    
    // 5. Map Transmission
    if (payload.transmissionId || payload.transmission) {
      const transmissionName = payload.transmissionId || payload.transmission;
      const transmission = await findMetadata('TRANSMISSION', transmissionName);
      
      if (transmission) {
        mappedData.transmission = transmission.value_id;
        mappedData.transmissionName = transmission.name;
      }
    }
    
    // 6. Map Condition
    if (payload.conditionId || payload.condition) {
      const conditionName = payload.conditionId || payload.condition;
      const condition = await findMetadata('CONDITION', conditionName);
      
      if (condition) {
        mappedData.condition = condition.value_id;
        mappedData.conditionName = condition.name;
      }
    }
    
    // 7. Map Features (if provided)
    if (payload.features && Array.isArray(payload.features)) {
      const featureIds = [];
      
      for (const featureName of payload.features) {
        const feature = await findMetadata('FEATURE', featureName);
        if (feature) {
          featureIds.push(feature.value_id);
        }
      }
      
      if (featureIds.length > 0) {
        mappedData.features = featureIds;
      }
    }
    
    // Return results
    return {
      success: errors.length === 0,
      mappedData,
      errors
    };
    
  } catch (error) {
    console.error('Error mapping metadata:', error);
    throw new Error(`Metadata mapping failed: ${error.message}`);
  }
}

/**
 * Validate required Trade Me fields are mapped
 * @param {object} mappedData - Mapped metadata
 * @returns {object} Validation result
 */
function validateMappedData(mappedData) {
  const required = ['make', 'model'];
  const missing = required.filter(field => !mappedData[field]);
  
  if (missing.length > 0) {
    return {
      valid: false,
      message: `Required Trade Me fields not mapped: ${missing.join(', ')}`
    };
  }
  
  return { valid: true };
}

/**
 * Get available metadata options for dropdown
 * @param {string} metadataType - Type of metadata
 * @param {object} filters - Additional filters
 * @returns {array} List of metadata options
 */
async function getMetadataOptions(metadataType, filters = {}) {
  const query = {
    metadata_type: metadataType,
    is_active: 1,
    ...filters
  };
  
  const options = await TrademeMetadata.find(query)
    .select('value_id name parent_id')
    .sort({ name: 1 })
    .lean();
  
  return options;
}

module.exports = {
  mapMetadataToIds,
  validateMappedData,
  findMetadata,
  getMetadataOptions
};
