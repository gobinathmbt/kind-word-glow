# Dynamic Console Logging Implementation for Vehicle Outbound Workflows

## Overview
This implementation adds dynamic console logging functionality to the "Vehicle Outbound" workflow system. When a trigger point in the Target Schema is activated, the backend controller now dynamically logs only the vehicle fields that were selected in the "Export Fields" configuration.

## Key Features

### ✅ Dynamic Field Selection
- Console output is based on the `selected_fields` array stored in the Export Fields node configuration
- No hardcoded field lists - completely dynamic based on user configuration
- Supports any number of fields (10, 11, or any other count)

### ✅ Trigger-Based Logging
- Console logging only occurs when the Target Schema trigger condition is met
- No extra logs elsewhere in the system
- Single console output per trigger activation

### ✅ Filtered Output
- Only displays the fields selected in the Export Fields configuration
- Excludes all other vehicle properties from the console output
- Handles nested field access safely

## Implementation Details

### Modified Function: `checkAndTriggerOutboundWorkflows`
**Location:** `backend/src/controllers/workflow.controller.js`

The function now:
1. Finds active "Vehicle Outbound" workflows for the company
2. Checks if the trigger condition in the Target Schema node is met
3. When triggered, locates the Export Fields node configuration
4. Extracts the `selected_fields` array from the Export Fields configuration
5. Filters the vehicle data to include only the selected fields
6. Logs the filtered data to the console

### Integration Points
The function is called from all vehicle update operations in:
- `backend/src/controllers/vehicle.controller.js`
- `backend/src/controllers/mastervehicle.controller.js`
- `backend/src/controllers/commonvehicle.controller.js`

## Example Usage

### Workflow Configuration
```javascript
// Export Fields Node Configuration
{
  "selected_fields": ["vehicle_stock_id", "make", "model", "vin", "chassis_no"],
  "export_format": "json",
  "include_metadata": false
}

// Target Schema Node Configuration
{
  "schema_type": "vehicle",
  "trigger_field": "status",
  "trigger_operator": "equals",
  "trigger_value": "pricing_ready"
}
```

### Console Output
When a vehicle's status changes to "pricing_ready", the console will show:
```
Triggered Vehicle Outbound:
{
  vehicle_stock_id: "VS1234",
  make: "Toyota",
  model: "Corolla",
  vin: "JT12345X",
  chassis_no: "CH56789"
}
```

### Dynamic Field Changes
If the selected fields are updated to include `plate_no`:
```javascript
"selected_fields": ["vehicle_stock_id", "make", "model", "vin", "chassis_no", "plate_no"]
```

The console output automatically updates:
```
Triggered Vehicle Outbound:
{
  vehicle_stock_id: "VS1234",
  make: "Toyota",
  model: "Corolla",
  vin: "JT12345X",
  chassis_no: "CH56789",
  plate_no: "ABC123"
}
```

## Technical Implementation

### Data Flow
1. **Vehicle Update** → Any vehicle CRUD operation
2. **Workflow Check** → `checkAndTriggerOutboundWorkflows()` called
3. **Trigger Evaluation** → Target Schema conditions checked
4. **Field Extraction** → Export Fields `selected_fields` retrieved
5. **Data Filtering** → Vehicle data filtered to selected fields only
6. **Console Output** → Filtered data logged to backend console

### Error Handling
- Graceful handling of missing Export Fields configuration
- Fallback to basic vehicle info if no selected fields found
- Safe nested field access with undefined checks
- No impact on existing functionality if workflow nodes are misconfigured

### Performance Considerations
- Minimal overhead - only processes active "Vehicle Outbound" workflows
- Efficient field filtering using forEach loop
- No database queries for field extraction (uses in-memory workflow data)

## Testing
The implementation was tested with multiple scenarios:
- ✅ Trigger condition met with various selected field combinations
- ✅ Trigger condition not met (no console output)
- ✅ Missing Export Fields configuration (fallback behavior)
- ✅ Different field types and nested field access

## Backward Compatibility
- ✅ No breaking changes to existing functionality
- ✅ Existing workflows continue to work without modification
- ✅ Fallback behavior for workflows without Export Fields configuration
- ✅ All existing API endpoints remain unchanged

## Future Enhancements
- Support for custom field formatting in console output
- Option to log to external systems (webhooks, files, etc.)
- Conditional logging based on additional criteria
- Integration with workflow execution logs for audit trails