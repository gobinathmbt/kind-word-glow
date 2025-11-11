# Nested Array Fields Implementation

## Overview
This implementation adds support for displaying and selecting nested subfields within array-type fields in the Vehicle Outbound workflow. For example, `vehicle_odometer` is an array field that contains nested subfields like `reading`, `reading_date`, and `created_at`. These nested fields are now visible and selectable across all workflow nodes.

## Problem Statement
Previously, when a field was defined as an array with nested subfields (e.g., `vehicle_odometer: [{reading: Number, reading_date: Date, created_at: Date}]`), only the parent array field was visible in the workflow UI. Users could not select or map the individual subfields within the array.

## Solution

### Backend Changes

#### 1. New Helper Function: `extractNestedFieldsFromArray`
**File:** `backend/src/controllers/workflow.controller.js`

Added a helper function that recursively extracts nested fields from array schema types:

```javascript
const extractNestedFieldsFromArray = (schematype, parentPath) => {
  const nestedFields = [];
  
  // Check if this is an array with a schema (subdocument array)
  if (schematype instanceof mongoose.Schema.Types.Array && schematype.schema) {
    const arraySchema = schematype.schema;
    
    // Iterate through the nested schema paths
    arraySchema.eachPath((nestedPath, nestedSchematype) => {
      if (nestedPath === "_id" || nestedPath === "__v") return;
      
      // Determine field type and create nested field entry
      nestedFields.push({
        field_name: `${parentPath}.${nestedPath}`,
        field_type: nestedFieldType,
        is_required: nestedSchematype.isRequired || false,
        is_array: nestedSchematype instanceof mongoose.Schema.Types.Array,
        is_nested: true,
        parent_field: parentPath,
        enum_values: nestedSchematype.enumValues || null,
        description: nestedSchematype.options.description || null,
      });
    });
  }
  
  return nestedFields;
};
```

**Key Features:**
- Detects array fields with subdocument schemas
- Extracts all nested field definitions
- Marks fields with `is_nested: true` flag
- Preserves parent field reference
- Maintains full field path (e.g., `vehicle_odometer.reading`)

#### 2. Updated `getSchemaFields` Function
**File:** `backend/src/controllers/workflow.controller.js`

Modified to call the helper function for array fields:

```javascript
schema.eachPath((pathname, schematype) => {
  // ... existing field extraction code ...
  
  // Extract nested fields from array types
  if (schematype instanceof mongoose.Schema.Types.Array) {
    const nestedFields = extractNestedFieldsFromArray(schematype, pathname);
    fields.push(...nestedFields);
  }
});
```

#### 3. Updated `getVehicleSchemaFields` Function
**File:** `backend/src/controllers/workflow.controller.js`

Applied the same nested field extraction logic to ensure consistency across all schema field endpoints.

#### 4. Enhanced `getNestedFieldValue` Function
**File:** `backend/src/controllers/workflow.controller.js`

Improved the nested field value extraction to properly handle array fields:

```javascript
const getNestedFieldValue = (obj, fieldPath) => {
  const keys = fieldPath.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    
    if (current && typeof current === 'object') {
      // If current value is an array, get the first element
      if (Array.isArray(current)) {
        current = current.length > 0 ? current[0] : undefined;
        if (!current) return undefined;
      }
      
      // Get the next value
      current = current[key];
      
      // Handle array values appropriately
      if (i === keys.length - 1) {
        return current;
      } else if (Array.isArray(current) && current.length > 0) {
        current = current[0];
      }
    } else {
      return undefined;
    }
  }
  
  return current;
};
```

**Key Features:**
- Properly traverses nested object paths
- Handles array fields by accessing the first element
- Returns the actual nested value for use in workflows

### Frontend Changes

#### 1. TargetSchemaNode Component
**File:** `src/components/workflows/nodes/TargetSchemaNode.tsx`

Updated the field selection dropdown to display nested fields with visual indicators:

```tsx
<SelectItem key={field.field_name} value={field.field_name}>
  <div className="flex items-center gap-2">
    <span className={field.is_nested ? 'ml-4 text-xs' : ''}>
      {field.field_name}
    </span>
    <Badge variant="outline" className="text-xs">
      {field.field_type}
    </Badge>
    {field.is_nested && (
      <Badge variant="outline" className="text-xs bg-blue-50">
        Nested
      </Badge>
    )}
  </div>
</SelectItem>
```

**Visual Features:**
- Nested fields are indented with `ml-4` class
- "Nested" badge identifies subfields
- Full field path is displayed (e.g., `vehicle_odometer.reading`)

#### 2. ExportFieldsNode Component
**File:** `src/components/workflows/nodes/ExportFieldsNode.tsx`

Enhanced the field list to show nested fields with clear visual hierarchy:

```tsx
<div
  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
    isSelected ? 'bg-green-50 border-green-200' : 'bg-white hover:bg-gray-50'
  } ${field.is_nested ? 'ml-6 border-l-4 border-l-blue-200' : ''}`}
>
  {/* ... checkbox and field info ... */}
  {field.is_nested && field.parent_field && (
    <p className="text-xs text-blue-600 mb-1">
      ↳ Subfield of {field.parent_field}
    </p>
  )}
</div>
```

**Visual Features:**
- Nested fields have left margin (`ml-6`) and blue left border
- Shows parent field reference with arrow indicator
- "Nested" badge for easy identification
- Maintains all existing field metadata (type, required, etc.)

#### 3. DataMappingNode Component
**File:** `src/components/workflows/nodes/DataMappingNode.tsx`

Updated the target field dropdown to display nested fields:

```tsx
<SelectItem key={field.field_name} value={field.field_name} className="text-xs">
  <div className="flex items-center gap-2">
    <span className={`truncate ${field.is_nested ? 'ml-4 text-blue-600' : ''}`}>
      {field.field_name}
    </span>
    {field.is_nested && (
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex-shrink-0 bg-blue-50">
        nested
      </Badge>
    )}
  </div>
</SelectItem>
```

**Visual Features:**
- Nested fields are indented and colored blue
- "nested" badge for identification
- Maintains compatibility with existing mapping logic

## Example Use Case

### Vehicle Schema Definition
```javascript
vehicle_odometer: [
  {
    reading: Number,
    reading_date: Date,
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
]
```

### Fields Now Available in Workflow UI

**Before Implementation:**
- `vehicle_odometer` (Array)

**After Implementation:**
- `vehicle_odometer` (Array) - Parent field
- `vehicle_odometer.reading` (Number) - Nested field
- `vehicle_odometer.reading_date` (Date) - Nested field
- `vehicle_odometer.created_at` (Date) - Nested field

### Workflow Configuration Examples

#### Target Schema Configuration
Users can now select nested fields as trigger conditions:
- Trigger Field: `vehicle_odometer.reading`
- Operator: `greater_than`
- Value: `100000`

#### Export Fields Configuration
Users can select specific nested fields to export:
- ✓ `vehicle_odometer.reading`
- ✓ `vehicle_odometer.reading_date`
- ✗ `vehicle_odometer.created_at` (not selected)

#### Data Mapping Configuration
Users can map external fields to nested internal fields:
- External: `odometer_value` → Internal: `vehicle_odometer.reading`
- External: `odometer_date` → Internal: `vehicle_odometer.reading_date`

## Benefits

1. **Granular Field Selection**: Users can select specific subfields within arrays instead of the entire array
2. **Better Data Mapping**: More precise mapping between external and internal data structures
3. **Improved Workflow Control**: Trigger conditions can be based on nested field values
4. **Enhanced Visibility**: Clear visual hierarchy shows the relationship between parent and nested fields
5. **Backward Compatibility**: Existing workflows continue to work; parent array fields are still available

## Testing Recommendations

### Backend Testing
1. Test schema field extraction for various array types:
   - Simple arrays (e.g., `[String]`)
   - Subdocument arrays (e.g., `[{field: Type}]`)
   - Nested arrays (e.g., `[{nested: [{field: Type}]}]`)

2. Test `getNestedFieldValue` function:
   - Single-level nested fields
   - Multi-level nested fields
   - Array field access
   - Missing field handling

### Frontend Testing
1. **Target Schema Node**:
   - Verify nested fields appear in dropdown
   - Test trigger condition with nested field
   - Verify visual indicators (indentation, badges)

2. **Export Fields Node**:
   - Verify nested fields are selectable
   - Test "Select All" includes nested fields
   - Verify visual hierarchy (indentation, borders)
   - Test field count includes nested fields

3. **Data Mapping Node**:
   - Verify nested fields appear in target field dropdown
   - Test mapping external field to nested field
   - Verify auto-mapping handles nested fields
   - Test validation with nested required fields

### Integration Testing
1. Create a Vehicle Outbound workflow with nested field triggers
2. Configure export fields to include nested fields
3. Map external fields to nested internal fields
4. Trigger the workflow and verify:
   - Nested field values are correctly extracted
   - Mapped data includes nested field values
   - API calls contain the correct nested data

## Impact on Existing Workflows

### Vehicle Inbound Workflows
- No impact - continues to work as before
- Nested fields are available for mapping if needed

### Vehicle Outbound Workflows
- Enhanced functionality - can now use nested fields
- Existing workflows remain functional
- New workflows can leverage nested field selection

## Technical Notes

1. **Field Path Format**: Nested fields use dot notation (e.g., `vehicle_odometer.reading`)
2. **Array Handling**: When accessing nested fields, the system uses the first array element
3. **Schema Validation**: Nested fields inherit validation rules from their schema definition
4. **Performance**: Minimal impact - field extraction happens once during schema loading

## Future Enhancements

1. **Multi-level Nesting**: Support for deeply nested structures (arrays within arrays)
2. **Array Index Selection**: Allow users to specify which array element to access
3. **Aggregate Functions**: Support for operations like sum, average on array fields
4. **Custom Transformations**: Allow custom logic for processing nested array data

## Conclusion

This implementation successfully addresses the requirement to display and select nested subfields within array-type fields across all workflow nodes. The solution maintains backward compatibility while providing enhanced functionality for more granular data control in Vehicle Outbound workflows.
