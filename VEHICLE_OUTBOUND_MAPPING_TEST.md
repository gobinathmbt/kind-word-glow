# Vehicle Outbound Workflow - Data Mapping Test Guide

## Issue Analysis and Fix

### Problem Identified
The original implementation had the mapping direction reversed. The database mappings were configured as:
- `source_field`: External field name (e.g., "vehicle_id")
- `target_field`: Internal field name (e.g., "vehicle_stock_id")

But the outbound workflow logic was looking for `mapping.source_field === fieldName` where `fieldName` was from the internal vehicle data.

### Solution Implemented
1. **Backend Fix**: Updated `checkAndTriggerOutboundWorkflows` to use `mapping.target_field === fieldName` for outbound workflows
2. **Frontend Enhancement**: Updated DataMappingNode to be workflow-type aware
3. **UI Improvements**: Added context-appropriate labels and descriptions

## Test Configuration

### Step 1: Create Vehicle Outbound Workflow
1. Navigate to Workflow Management
2. Create new workflow with type "Vehicle Outbound"
3. Configure nodes as follows:

### Step 2: Configure Target Schema Node
```json
{
  "schema_type": "vehicle",
  "trigger_field": "status", 
  "trigger_operator": "equals",
  "trigger_value": "pricing_ready"
}
```

### Step 3: Configure Export Fields Node
Select these fields for export:
- `vehicle_stock_id`
- `make`
- `model`
- `year`
- `vehicle_hero_image`

### Step 4: Configure Data Mapping Node
**Sample External JSON:**
```json
{
  "vehicle_id": 100022,
  "vehicle_image": "https://example.com/images/vehicle_vh12345.jpg",
  "vehicle_make": "Alfa Romeo",
  "vehicle_model": "159",
  "vehicle_year": 2012
}
```

**Expected Mappings (Auto-generated):**
```json
[
  {
    "source_field": "vehicle_id",
    "target_field": "vehicle_stock_id",
    "data_type": "number",
    "is_required": true,
    "is_custom": false
  },
  {
    "source_field": "vehicle_image", 
    "target_field": "vehicle_hero_image",
    "data_type": "string",
    "is_required": false,
    "is_custom": false
  },
  {
    "source_field": "vehicle_make",
    "target_field": "make", 
    "data_type": "string",
    "is_required": false,
    "is_custom": false
  },
  {
    "source_field": "vehicle_model",
    "target_field": "model",
    "data_type": "string", 
    "is_required": false,
    "is_custom": false
  },
  {
    "source_field": "vehicle_year",
    "target_field": "year",
    "data_type": "number",
    "is_required": false,
    "is_custom": false
  }
]
```

## Test Execution

### Test Vehicle Data
Create or update a vehicle with this data:
```json
{
  "vehicle_stock_id": 100022,
  "company_id": "68a405a06c25cd6de3e56198",
  "vehicle_type": "tradein",
  "vehicle_hero_image": "https://via.placeholder.com/400x300",
  "vin": "sdsad",
  "plate_no": "asdasd", 
  "make": "Alfa Romeo",
  "model": "159",
  "year": 2012,
  "chassis_no": "sdsad",
  "dealership_id": "68d12a4c8f236dc2a46393a2",
  "status": "pricing_ready"
}
```

### Expected Console Output

**Debug Information:**
```
Debug: Found 5 mappings: vehicle_stock_id → vehicle_id, vehicle_hero_image → vehicle_image, make → vehicle_make, model → vehicle_model, year → vehicle_year
Debug: Mapped vehicle_stock_id → vehicle_id (value: 100022)
Debug: Mapped vehicle_hero_image → vehicle_image (value: https://via.placeholder.com/400x300)
Debug: Mapped make → vehicle_make (value: Alfa Romeo)
Debug: Mapped model → vehicle_model (value: 159)
Debug: Mapped year → vehicle_year (value: 2012)
```

**Before Mapping (Internal System Fields):**
```
Vehicle Outbound Trigger Activated:
{
  "vehicle_stock_id": 100022,
  "make": "Alfa Romeo",
  "model": "159", 
  "year": 2012,
  "vehicle_hero_image": "https://via.placeholder.com/400x300"
}
```

**After Mapping (External System Fields):**
```
Mapped External System Fields:
{
  "vehicle_id": 100022,
  "vehicle_make": "Alfa Romeo", 
  "vehicle_model": "159",
  "vehicle_year": 2012,
  "vehicle_image": "https://via.placeholder.com/400x300"
}
```

## API Test Commands

### 1. Create Test Vehicle
```bash
POST /api/vehicle/create-stock
Content-Type: application/json

{
  "make": "Alfa Romeo",
  "model": "159", 
  "year": 2012,
  "vin": "TEST123456789",
  "plate_no": "TEST123",
  "dealership": "68d12a4c8f236dc2a46393a2",
  "status": "pending",
  "purchase_type": "tradein",
  "vehicle_hero_image": "https://via.placeholder.com/400x300"
}
```

### 2. Trigger Workflow (Update Status)
```bash
PATCH /api/common-vehicle/pricing-ready/{vehicle_stock_id}
Content-Type: application/json

{
  "vehicle_type": "tradein",
  "is_pricing_ready": true
}
```

### 3. Alternative Trigger (Direct Update)
```bash
PUT /api/vehicle/{vehicle_id}/tradein
Content-Type: application/json

{
  "status": "pricing_ready"
}
```

## Verification Checklist

### ✅ Backend Functionality
- [ ] Debug logs show correct mapping count
- [ ] Debug logs show correct field mappings (internal → external)
- [ ] "Vehicle Outbound Trigger Activated" appears with internal field names
- [ ] "Mapped External System Fields" appears with external field names
- [ ] Field values are correctly preserved during mapping
- [ ] Unmapped fields use original names

### ✅ Frontend Functionality  
- [ ] DataMappingNode shows "Field Mapping Configuration (Outbound)" title
- [ ] Labels show "External Field (JSON)" and "Internal Field (Vehicle Schema)"
- [ ] Description shows "Maps vehicle schema fields to external system field names"
- [ ] Preview shows correct mapping direction (internal → external)
- [ ] Auto-mapping works correctly with sample JSON

### ✅ Integration Testing
- [ ] Vehicle creation triggers workflow
- [ ] Vehicle status updates trigger workflow
- [ ] Master vehicle operations trigger workflow
- [ ] Multiple workflows work independently
- [ ] No console output when trigger conditions not met

## Troubleshooting

### Common Issues and Solutions

1. **No console output**
   - Check workflow is active (`status: 'active'`)
   - Verify trigger condition matches vehicle data
   - Ensure vehicle update calls `checkAndTriggerOutboundWorkflows`

2. **Incorrect field mapping**
   - Verify mapping configuration in database
   - Check debug logs for mapping details
   - Ensure `target_field` matches internal field names

3. **Missing fields in output**
   - Check Export Fields configuration
   - Verify selected fields exist in vehicle data
   - Check for nested field access issues

4. **Wrong field names in output**
   - Verify mapping direction (target_field → source_field for outbound)
   - Check sample JSON matches expected external format
   - Ensure auto-mapping worked correctly

### Debug Commands

```bash
# Check workflow configuration
GET /api/workflows/{workflow_id}

# Check workflow execution logs  
GET /api/workflow-execute/logs/{workflow_id}

# Check vehicle data
GET /api/vehicle/detail/{vehicle_stock_id}/tradein
```

## Implementation Notes

### Key Changes Made
1. **Mapping Direction**: Fixed outbound mapping to use `target_field → source_field`
2. **Debug Logging**: Added detailed logging for troubleshooting
3. **UI Context**: Made DataMappingNode workflow-type aware
4. **Field Labels**: Updated labels to be intuitive for outbound workflows

### Backward Compatibility
- Vehicle Inbound workflows remain unchanged
- Existing mapping configurations work as before
- No breaking changes to existing functionality

### Performance Considerations
- Debug logging can be removed in production
- Mapping lookup is O(n) per field (acceptable for typical use cases)
- No significant performance impact on vehicle operations