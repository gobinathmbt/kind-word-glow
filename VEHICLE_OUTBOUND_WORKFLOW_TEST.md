# Vehicle Outbound Workflow - Implementation Test Guide

## Overview
This document provides a comprehensive test guide for the Vehicle Outbound workflow implementation with data mapping and trigger console functionality.

## Implementation Summary

### Backend Changes Made
1. **Enhanced `checkAndTriggerOutboundWorkflows` function** in `backend/src/controllers/workflow.controller.js`:
   - Added support for Export Fields selection
   - Implemented data mapping from internal to external field names
   - Added dual console logging (before and after mapping)
   - Maintained existing trigger condition checking

### Frontend Components
1. **WorkflowBuilder.tsx**: Already supports Vehicle Outbound workflow type
2. **TargetSchemaNode.tsx**: Handles schema selection and trigger configuration
3. **ExportFieldsNode.tsx**: Manages field selection for export
4. **DataMappingNode.tsx**: Handles field mapping between internal and external systems

## Test Scenarios

### Scenario 1: Basic Vehicle Outbound Workflow Setup

#### Step 1: Create Vehicle Outbound Workflow
1. Navigate to Workflow Management
2. Click "Create New Workflow"
3. Set workflow type to "Vehicle Outbound"
4. Configure the workflow nodes:

#### Step 2: Configure Target Schema Node
```json
{
  "schema_type": "vehicle",
  "trigger_field": "status",
  "trigger_operator": "equals",
  "trigger_value": "pricing_ready"
}
```

#### Step 3: Configure Export Fields Node
Select fields to export:
- `vehicle_stock_id`
- `make`
- `model`
- `year`
- `status`

#### Step 4: Configure Data Mapping Node
Map internal fields to external field names:
```json
{
  "mappings": [
    {
      "source_field": "vehicle_stock_id",
      "target_field": "vehicle_id",
      "data_type": "number",
      "is_required": true,
      "is_custom": false
    },
    {
      "source_field": "make",
      "target_field": "vehicle_make",
      "data_type": "string",
      "is_required": false,
      "is_custom": false
    },
    {
      "source_field": "model",
      "target_field": "vehicle_model",
      "data_type": "string",
      "is_required": false,
      "is_custom": false
    }
  ]
}
```

### Scenario 2: Test Trigger Activation

#### Step 1: Create or Update a Vehicle
Update a vehicle's status to trigger the workflow:

```javascript
// Example vehicle update that should trigger the workflow
const vehicleUpdate = {
  vehicle_stock_id: 100056,
  make: "Maruti",
  model: "Swift",
  year: 2023,
  status: "pricing_ready" // This matches our trigger condition
};
```

#### Step 2: Expected Console Output

**Before Mapping (Internal System Fields):**
```
Vehicle Outbound Trigger Activated:
{
  "vehicle_stock_id": 100056,
  "make": "Maruti",
  "model": "Swift",
  "year": 2023,
  "status": "pricing_ready"
}
```

**After Mapping (External System Fields):**
```
Mapped External System Fields:
{
  "vehicle_id": 100056,
  "vehicle_make": "Maruti",
  "vehicle_model": "Swift",
  "year": 2023,
  "status": "pricing_ready"
}
```

### Scenario 3: Multiple Trigger Conditions

#### Test Different Operators:
1. **Equals**: `status = "pricing_ready"`
2. **Contains**: `make contains "Toyota"`
3. **Greater Than**: `year > 2020`
4. **Is Not Empty**: `vin is_not_empty`

### Scenario 4: Complex Field Mapping

#### Test Nested Field Mapping:
```json
{
  "mappings": [
    {
      "source_field": "vehicle_other_details.0.purchase_price",
      "target_field": "price",
      "data_type": "number"
    },
    {
      "source_field": "vehicle_odometer.0.reading",
      "target_field": "mileage",
      "data_type": "number"
    }
  ]
}
```

## Testing Checklist

### ✅ Backend Functionality
- [ ] Workflow triggers activate on vehicle updates
- [ ] Export fields are correctly filtered
- [ ] Data mapping transforms field names correctly
- [ ] Console logs appear in correct format
- [ ] Multiple workflows can be active simultaneously
- [ ] Trigger conditions work for all operators

### ✅ Frontend Functionality
- [ ] Vehicle Outbound workflow template loads correctly
- [ ] Target Schema Node configuration saves properly
- [ ] Export Fields Node shows available schema fields
- [ ] Data Mapping Node supports field mapping
- [ ] Workflow can be saved and loaded
- [ ] All node configurations persist correctly

### ✅ Integration Testing
- [ ] Vehicle creation triggers outbound workflows
- [ ] Vehicle updates trigger outbound workflows
- [ ] Master vehicle operations trigger workflows
- [ ] Common vehicle operations trigger workflows
- [ ] No console logs appear when trigger conditions are not met

## API Endpoints for Testing

### Create Test Vehicle
```bash
POST /api/vehicle/create-stock
Content-Type: application/json

{
  "make": "Maruti",
  "model": "Swift",
  "year": 2023,
  "vin": "TEST123456789",
  "plate_no": "TEST123",
  "dealership": "dealership_id",
  "status": "pending",
  "purchase_type": "tradein"
}
```

### Update Vehicle Status (Should Trigger Workflow)
```bash
PATCH /api/common-vehicle/pricing-ready/VEHICLE_STOCK_ID
Content-Type: application/json

{
  "vehicle_type": "tradein",
  "is_pricing_ready": true
}
```

### Check Workflow Execution Logs
```bash
GET /api/workflow-execute/logs/WORKFLOW_ID
```

## Expected Behavior

1. **No Export Fields Selected**: Should log basic vehicle info (fallback)
2. **Export Fields Selected**: Should log only selected fields
3. **No Data Mapping**: Should log fields with original names
4. **Data Mapping Configured**: Should log both original and mapped field names
5. **Trigger Not Met**: Should not log anything
6. **Multiple Workflows**: Each workflow should trigger independently

## Troubleshooting

### Common Issues:
1. **No console logs**: Check if workflow is active and trigger conditions are correct
2. **Missing fields**: Verify Export Fields configuration
3. **Incorrect mapping**: Check Data Mapping node configuration
4. **Workflow not triggering**: Ensure vehicle updates call `checkAndTriggerOutboundWorkflows`

### Debug Steps:
1. Check workflow status in database
2. Verify trigger field values in vehicle data
3. Check console for error messages
4. Validate workflow node configurations

## Implementation Notes

- The implementation preserves all existing functionality
- Console logs only appear when triggers are activated
- Data mapping is optional - fields without mapping keep original names
- Multiple workflows can be active simultaneously
- The system supports complex trigger conditions and nested field access