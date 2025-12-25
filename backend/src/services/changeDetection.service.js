/**
 * Centralized Change Detection Service
 * Handles all change detection and grouping logic for activity logging
 */

class ChangeDetectionService {
  /**
   * Get module name for a field path
   * Uses module_section if provided, otherwise falls back to vehicle type
   * 
   * @param {string} fieldPath - Dot notation path to the field
   * @param {Object} options - Configuration options
   * @param {string} options.moduleSection - Explicit module_section from frontend (highest priority)
   * @param {string} options.vehicleType - Vehicle type for fallback
   * @returns {string} Module name for activity logging
   */
  static getFieldGroup(fieldPath, options = {}) {
    const { moduleSection, vehicleType = 'master' } = options;

    // Priority 1: Use explicit module_section if provided (from frontend)
    // This MUST be checked first and return immediately for ALL fields
    // Handles empty strings, null, undefined properly - ensures moduleSection is always used when provided
    if (moduleSection && typeof moduleSection === 'string' && moduleSection.trim().length > 0) {
      return moduleSection.trim();
    }

    // Fallback: Only used if module_section is missing (should rarely happen in activity logging)
    // This is a safety net for edge cases where module_section might not be provided
    const fallbackNames = {
      pricing: 'Pricing Update',
      master: 'Master Vehicle Update',
      inspection: 'Inspection Update',
      tradein: 'Trade-in Update',
      advertisement: 'Advertisement Update',
    };

    return fallbackNames[vehicleType] || 'Vehicle Update';
  }
  /**
   * Main entry point: Detect and group all changes
   * 
   * @param {Object} oldData - Original data (Mongoose document or plain object)
   * @param {Object} newData - Updated data (Mongoose document or plain object)
   * @param {Object} options - Configuration options
   * @param {string} options.moduleSection - Explicit module_section from frontend
   * @param {string} options.vehicleType - Vehicle type for field grouping
   * @param {Array} options.excludedFields - Additional fields to exclude from change detection
   * @returns {Object} Grouped changes by module_name { "Module Name": [changes] }
   */
  static detectAndGroupChanges(oldData, newData, options = {}) {
    const {
      moduleSection = null,
      vehicleType = 'master',
      excludedFields = []
    } = options;

    // Convert Mongoose documents to plain objects if needed
    const getRaw = (val) => val && val.toObject ? val.toObject() : val;
    const oldObj = getRaw(oldData || {});
    const newObj = getRaw(newData || {});

    // Remove system fields from new data before processing
    const cleanedNewData = this.cleanSystemFields(newObj, excludedFields);

    const groupLogs = {};

    // Process all changes
    this.processFieldChanges(
      cleanedNewData,
      oldObj,
      '',
      groupLogs,
      { moduleSection, vehicleType, excludedFields }
    );

    return groupLogs;
  }

  /**
   * Clean system fields from data
   */
  static cleanSystemFields(data, additionalExcluded = []) {
    const excludedFields = new Set([
      '_id', 'id', '__v',
      'createdAt', 'updatedAt', 'created_at', 'updated_at',
      'module_section',
      ...additionalExcluded
    ]);

    const cleaned = { ...data };
    
    // Remove excluded fields
    for (const key of Object.keys(cleaned)) {
      if (excludedFields.has(key) || key.startsWith('_')) {
        delete cleaned[key];
      }
    }

    return cleaned;
  }

  /**
   * Recursively process field changes
   */
  static processFieldChanges(newData, oldData, currentPath, groupLogs, options) {
    const { moduleSection, vehicleType, excludedFields } = options;

    // Define system fields to exclude
    const excludedFieldsSet = new Set([
      '_id', 'id', '__v',
      'createdAt', 'updatedAt', 'created_at', 'updated_at',
      ...excludedFields
    ]);

    const shouldExclude = (key) => {
      if (excludedFieldsSet.has(key)) return true;
      // Skip private fields except specific ones
      if (key.startsWith('_') && key !== '_expiry') return true;
      return false;
    };

    for (const [key, newValue] of Object.entries(newData)) {
      if (shouldExclude(key)) continue;

      const fieldPath = currentPath ? `${currentPath}.${key}` : key;
      const oldValue = this.getNestedValue(oldData, fieldPath);

      // Check if value has changed
      if (!this.hasChanged(oldValue, newValue)) {
        continue;
      }

      // Special handling for vehicle_ownership when frontend sends object but DB stores array
      // Also handles master vehicle format where it can be stored as direct object
      if (key === 'vehicle_ownership' && typeof newValue === 'object' && !Array.isArray(newValue)) {
        // Handle different storage formats: direct object vs array
        let oldOwnership = {};
        if (oldData.vehicle_ownership) {
          if (Array.isArray(oldData.vehicle_ownership) && oldData.vehicle_ownership.length > 0) {
            // Array format (like other modules)
            oldOwnership = oldData.vehicle_ownership[0];
          } else if (typeof oldData.vehicle_ownership === 'object') {
            // Direct object format (master vehicles)
            oldOwnership = oldData.vehicle_ownership;
          }
        }

        for (const [ownershipKey, ownershipValue] of Object.entries(newValue)) {
          if (shouldExclude(ownershipKey)) continue;

          // Use appropriate field path based on storage format
          const ownershipFieldPath = Array.isArray(oldData.vehicle_ownership) 
            ? `${fieldPath}.0.${ownershipKey}` 
            : `${fieldPath}.${ownershipKey}`;
          const oldOwnershipValue = oldOwnership[ownershipKey];

          if (this.hasChanged(oldOwnershipValue, ownershipValue)) {
            const groupName = this.getFieldGroup(ownershipFieldPath, { moduleSection, vehicleType });

            if (!groupLogs[groupName]) {
              groupLogs[groupName] = [];
            }

            groupLogs[groupName].push({
              field: ownershipKey,
              old_value: this.formatValue(oldOwnershipValue, ownershipFieldPath),
              new_value: this.formatValue(ownershipValue, ownershipFieldPath),
              raw_field: ownershipFieldPath
            });
          }
        }
        continue;
      }

      // Special handling for vehicle_odometer arrays - detect added, removed, and modified entries
      if (key === 'vehicle_odometer' && Array.isArray(newValue)) {
        const oldOdometerArray = Array.isArray(oldValue) ? oldValue : [];
        
        // Helper function to check if two entries are the same
        const isSameEntry = (entry1, entry2) => {
          // First try to match by _id (most reliable)
          if (entry1?._id && entry2?._id) {
            return String(entry1._id) === String(entry2._id);
          }
          // Fallback to reading + reading_date combination
          if (entry1?.reading !== undefined && entry2?.reading !== undefined &&
              entry1?.reading_date && entry2?.reading_date) {
            const date1 = entry1.reading_date instanceof Date 
              ? entry1.reading_date.toISOString().split('T')[0]
              : String(entry1.reading_date).split('T')[0];
            const date2 = entry2.reading_date instanceof Date 
              ? entry2.reading_date.toISOString().split('T')[0]
              : String(entry2.reading_date).split('T')[0];
            return Number(entry1.reading) === Number(entry2.reading) && date1 === date2;
          }
          return false;
        };
        
        // Track which new entries have been matched to old entries (one-to-one matching)
        // Map: newIndex -> oldIndex
        const matchedPairs = new Map();
        
        // Find deleted entries (in old but not in new)
        for (let i = 0; i < oldOdometerArray.length; i++) {
          const oldEntry = oldOdometerArray[i];
          
          // Find matching new entry that hasn't been matched yet
          let foundMatch = false;
          for (let j = 0; j < newValue.length; j++) {
            if (matchedPairs.has(j)) continue; // Skip already matched entries
            
            if (isSameEntry(oldEntry, newValue[j])) {
              matchedPairs.set(j, i); // Map new index to old index
              foundMatch = true;
              break;
            }
          }
          
          if (!foundMatch) {
            // Entry was DELETED
            const groupName = this.getFieldGroup(fieldPath, { moduleSection, vehicleType });
            if (!groupLogs[groupName]) {
              groupLogs[groupName] = [];
            }

            const displayIndex = i + 1;
            const deletedEntrySummary = [];
            
            if (oldEntry.reading !== undefined && oldEntry.reading !== null && oldEntry.reading !== '') {
              deletedEntrySummary.push(`Reading: ${this.formatValue(oldEntry.reading, 'reading')}`);
            }
            if (oldEntry.reading_date) {
              deletedEntrySummary.push(`Date: ${this.formatValue(oldEntry.reading_date, 'reading_date')}`);
            }
            if (oldEntry.odometerStatus) {
              deletedEntrySummary.push(`Status: ${this.formatValue(oldEntry.odometerStatus, 'odometerStatus')}`);
            }
            if (oldEntry.odometerCertified !== undefined && oldEntry.odometerCertified !== null) {
              deletedEntrySummary.push(`Certified: ${this.formatValue(oldEntry.odometerCertified, 'odometerCertified')}`);
            }

            if (deletedEntrySummary.length > 0) {
              groupLogs[groupName].push({
                field: `Odometer Entry ${displayIndex} - Deleted`,
                old_value: deletedEntrySummary.join(', '),
                new_value: null,
                raw_field: `${fieldPath}.${i}`
              });
            }
          }
        }
        
        // Find added and modified entries (in new array)
        for (let i = 0; i < newValue.length; i++) {
          const newEntry = newValue[i];
          
          // If this entry was already matched, check for modifications
          if (matchedPairs.has(i)) {
            // Get the corresponding old entry index from the mapping
            const oldEntryIndex = matchedPairs.get(i);
            const oldEntry = oldOdometerArray[oldEntryIndex];
            
            if (oldEntry) {
              const allEntryKeys = new Set([
                ...Object.keys(oldEntry || {}),
                ...Object.keys(newEntry || {})
              ]);

              // Build summary of changed fields
              const changedFields = [];

              for (const entryFieldKey of allEntryKeys) {
                if (shouldExclude(entryFieldKey)) continue;

                // Normalize values for comparison
                let oldFieldValue = oldEntry[entryFieldKey];
                let newFieldValue = newEntry[entryFieldKey];
                
                // Normalize dates for comparison
                if (entryFieldKey === 'reading_date' || entryFieldKey === 'created_at') {
                  if (oldFieldValue instanceof Date) {
                    oldFieldValue = oldFieldValue.toISOString().split('T')[0];
                  } else if (typeof oldFieldValue === 'string') {
                    oldFieldValue = oldFieldValue.split('T')[0];
                  }
                  if (newFieldValue instanceof Date) {
                    newFieldValue = newFieldValue.toISOString().split('T')[0];
                  } else if (typeof newFieldValue === 'string') {
                    newFieldValue = newFieldValue.split('T')[0];
                  }
                }
                
                // Normalize numbers for comparison
                if (entryFieldKey === 'reading') {
                  oldFieldValue = oldFieldValue != null ? Number(oldFieldValue) : null;
                  newFieldValue = newFieldValue != null ? Number(newFieldValue) : null;
                }

                if (this.hasChanged(oldFieldValue, newFieldValue)) {
                  // Add to changed fields summary
                  const fieldName = this.formatFieldName(entryFieldKey);
                  const oldFormatted = this.formatValue(oldEntry[entryFieldKey], `${fieldPath}.${i}.${entryFieldKey}`);
                  const newFormatted = this.formatValue(newEntry[entryFieldKey], `${fieldPath}.${i}.${entryFieldKey}`);
                  changedFields.push(`${fieldName}: ${oldFormatted} → ${newFormatted}`);
                }
              }
              
              // Log as single combined entry if there are changes
              if (changedFields.length > 0) {
                const groupName = this.getFieldGroup(fieldPath, { moduleSection, vehicleType });
                if (!groupLogs[groupName]) {
                  groupLogs[groupName] = [];
                }

                const displayIndex = i + 1;
                groupLogs[groupName].push({
                  field: `Odometer Entry ${displayIndex} - Updated`,
                  old_value: changedFields.join(', '),
                  new_value: null,
                  raw_field: `${fieldPath}.${i}`
                });
              }
            }
            continue;
          }
          
          // Entry was ADDED (not matched to any old entry)
          const hasData = newEntry.reading !== undefined || newEntry.reading_date || 
                        newEntry.odometerCertified !== undefined || newEntry.odometerStatus;
          
          if (hasData) {
            const groupName = this.getFieldGroup(fieldPath, { moduleSection, vehicleType });
            if (!groupLogs[groupName]) {
              groupLogs[groupName] = [];
            }

            const displayIndex = i + 1;
            // Build summary of added entry
            const addedEntrySummary = [];
            
            if (newEntry.reading !== undefined && newEntry.reading !== null && newEntry.reading !== '') {
              addedEntrySummary.push(`Reading: ${this.formatValue(newEntry.reading, 'reading')}`);
            }
            if (newEntry.reading_date) {
              addedEntrySummary.push(`Date: ${this.formatValue(newEntry.reading_date, 'reading_date')}`);
            }
            if (newEntry.odometerStatus) {
              addedEntrySummary.push(`Status: ${this.formatValue(newEntry.odometerStatus, 'odometerStatus')}`);
            }
            if (newEntry.odometerCertified !== undefined && newEntry.odometerCertified !== null) {
              addedEntrySummary.push(`Certified: ${this.formatValue(newEntry.odometerCertified, 'odometerCertified')}`);
            }

            if (addedEntrySummary.length > 0) {
              groupLogs[groupName].push({
                field: `Odometer Entry ${displayIndex} - Added`,
                old_value: null,
                new_value: addedEntrySummary.join(', '),
                raw_field: `${fieldPath}.${i}`
              });
            }
          }
        }
        
        continue;
      }

      // For nested objects (not arrays), recurse into them
      if (newValue && typeof newValue === 'object' && !Array.isArray(newValue) && !(newValue instanceof Date)) {
        this.processFieldChanges(newValue, oldData, fieldPath, groupLogs, options);
        continue;
      }

      // Handle array/object comparison for single-item arrays
      const normalizedOld = this.normalizeValue(oldValue);
      const normalizedNew = this.normalizeValue(newValue);

      // If both normalized to objects, compare field by field
      if (typeof normalizedOld === 'object' && normalizedOld !== null &&
          typeof normalizedNew === 'object' && normalizedNew !== null &&
          !Array.isArray(normalizedOld) && !Array.isArray(normalizedNew)) {

        const allKeys = new Set([
          ...Object.keys(normalizedOld || {}),
          ...Object.keys(normalizedNew || {})
        ]);

        const filteredKeys = Array.from(allKeys).filter(key => !shouldExclude(key));

        for (const objKey of filteredKeys) {
          const objFullFieldPath = `${fieldPath}.0.${objKey}`;
          const objNewValue = normalizedNew?.[objKey];
          const objOldValue = normalizedOld?.[objKey];

          if (this.hasChanged(objOldValue, objNewValue)) {
            const groupName = this.getFieldGroup(objFullFieldPath, { moduleSection, vehicleType });

            if (!groupLogs[groupName]) {
              groupLogs[groupName] = [];
            }

            groupLogs[groupName].push({
              field: objKey,
              old_value: this.formatValue(objOldValue, objFullFieldPath),
              new_value: this.formatValue(objNewValue, objFullFieldPath),
              raw_field: objFullFieldPath
            });
          }
        }
        continue;
      }

      // If one is undefined/null and other is object, treat undefined as empty object
      if ((normalizedOld === undefined || normalizedOld === null) &&
          typeof normalizedNew === 'object' && normalizedNew !== null) {

        const allKeys = Object.keys(normalizedNew || {});
        const filteredKeys = allKeys.filter(key => !shouldExclude(key));

        for (const objKey of filteredKeys) {
          const objFullFieldPath = `${fieldPath}.0.${objKey}`;
          const objNewValue = normalizedNew?.[objKey];

          const groupName = this.getFieldGroup(objFullFieldPath, { moduleSection, vehicleType });

          if (!groupLogs[groupName]) {
            groupLogs[groupName] = [];
          }

          groupLogs[groupName].push({
            field: objKey,
            old_value: null,
            new_value: this.formatValue(objNewValue, objFullFieldPath),
            raw_field: objFullFieldPath
          });
        }
        continue;
      }

      // If old is object and new is undefined/null, log removals
      if (typeof normalizedOld === 'object' && normalizedOld !== null &&
          (normalizedNew === undefined || normalizedNew === null)) {

        const allKeys = Object.keys(normalizedOld || {});
        const filteredKeys = allKeys.filter(key => !shouldExclude(key));

        for (const objKey of filteredKeys) {
          const objFullFieldPath = `${fieldPath}.0.${objKey}`;
          const objOldValue = normalizedOld?.[objKey];

          const groupName = this.getFieldGroup(objFullFieldPath, { moduleSection, vehicleType });

          if (!groupLogs[groupName]) {
            groupLogs[groupName] = [];
          }

          groupLogs[groupName].push({
            field: objKey,
            old_value: this.formatValue(objOldValue, objFullFieldPath),
            new_value: null,
            raw_field: objFullFieldPath
          });
        }
        continue;
      }

      // Log the change for simple fields
      const groupName = this.getFieldGroup(fieldPath, { moduleSection, vehicleType });

      if (!groupLogs[groupName]) {
        groupLogs[groupName] = [];
      }

      groupLogs[groupName].push({
        field: key,
        old_value: this.formatValue(oldValue, fieldPath),
        new_value: this.formatValue(newValue, fieldPath),
        raw_field: fieldPath
      });
    }
  }

  /**
   * Get nested value from object using dot notation
   * Handles singleton arrays (extracts first element if array)
   */
  static getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      // Handle singleton array logic: many fields in schema are stored as single-item arrays
      if (Array.isArray(current) && current.length > 0 && isNaN(key)) {
        current = current[0];
      }

      if (current && typeof current === 'object') {
        return current[key];
      }
      return undefined;
    }, obj);
  }

  /**
   * Normalize single-item arrays to objects for comparison
   */
  static normalizeValue(val) {
    if (Array.isArray(val) && val.length === 1 && typeof val[0] === 'object') {
      return val[0];
    }
    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      return val;
    }
    return val;
  }

  /**
   * Format field name for display (converts camelCase to Title Case)
   */
  static formatFieldName(fieldName) {
    // Convert camelCase to Title Case
    return fieldName
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
      .trim();
  }

  /**
   * Format value for display in activity logs
   */
  static formatValue(val, fieldName = '') {
    if (val === null || val === undefined) return null;
    if (val === '') return '';

    // Handle boolean
    if (typeof val === 'boolean') {
      return val ? 'Yes' : 'No';
    }

    // Check if this is a date field or date value
    const dateFields = ['_date', 'created_at', 'updated_at', 'timestamp', '_expiry', 
                        'purchase_date', 'registration_date', 'license_expiry_date', 
                        'wof_cof_expiry_date'];
    const isDateField = dateFields.some(field => fieldName.toLowerCase().includes(field));

    const isDate = (v) => {
      if (v instanceof Date) return true;
      if (typeof v === 'string') {
        const datePatterns = [
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
          /^\d{4}-\d{2}-\d{2}$/,
          /^\d{2}\/\d{2}\/\d{4}$/,
          /^\d{2}-\d{2}-\d{4}$/,
          /^\d{4}\/\d{2}\/\d{2}$/,
        ];
        return datePatterns.some(pattern => pattern.test(v)) && !isNaN(Date.parse(v));
      }
      return false;
    };

    if (isDate(val) || isDateField) {
      try {
        const dateObj = new Date(val);
        if (!isNaN(dateObj.getTime())) {
          return dateObj.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
        }
      } catch (e) {
        // If date parsing fails, continue
      }
    }

    // Handle arrays
    if (Array.isArray(val)) {
      return `[${val.length} item(s)]`;
    }

    // Handle objects
    if (typeof val === 'object' && val !== null) {
      return '[Object]';
    }

    // Handle numbers
    if (typeof val === 'number') {
      const currencyFields = ['price', 'cost', 'expense', 'amount', 'fee'];
      if (currencyFields.some(field => fieldName.toLowerCase().includes(field))) {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 2
        }).format(val);
      }

      // Format large numbers with commas
      if (val >= 1000) {
        return new Intl.NumberFormat('en-US').format(val);
      }

      return val.toString();
    }

    return val.toString();
  }

  /**
   * Check if value has changed
   */
  static hasChanged(oldVal, newVal) {
    // Handle null/undefined
    if (oldVal === newVal) return false;
    if (oldVal == null && newVal == null) return false;
    if (oldVal == null || newVal == null) return true;

    // Handle Date objects - compare only date part (ignore time)
    if (oldVal instanceof Date && newVal instanceof Date) {
      return oldVal.toDateString() !== newVal.toDateString();
    }

    // Handle Date strings - convert to date and compare date part only
    if ((oldVal instanceof Date || typeof oldVal === 'string') &&
        (newVal instanceof Date || typeof newVal === 'string')) {
      try {
        const dateA = new Date(oldVal);
        const dateB = new Date(newVal);
        if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
          return dateA.toDateString() !== dateB.toDateString();
        }
      } catch (e) {
        // Continue with other comparisons
      }
    }

    // For objects/arrays, use JSON comparison
    if (typeof oldVal === 'object' && typeof newVal === 'object') {
      try {
        return JSON.stringify(oldVal) !== JSON.stringify(newVal);
      } catch (e) {
        return true; // If can't stringify, assume changed
      }
    }

    // Simple inequality check
    return oldVal != newVal;
  }
}

module.exports = ChangeDetectionService;

