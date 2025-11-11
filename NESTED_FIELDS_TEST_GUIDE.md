# Nested Array Fields - Testing Guide

## Overview
This guide provides step-by-step instructions to test the nested array fields functionality in the Vehicle Outbound workflow.

## Prerequisites
- Backend server running
- Frontend application running
- User account with workflow access
- Test vehicle data with array fields

## Test Scenarios

### Scenario 1: Target Schema Node - Nested Field Selection

**Objective**: Verify that nested fields appear in the Target Schema configuration

**Steps**:
1. Navigate to Workflows page
2. Create a new "Vehicle Outbound" workflow
3. Add a "Target Schema" node to the canvas
4. Click "Configure Schema" button
5. Select "Vehicle Schema" from Schema Type dropdown
6. Click on "Trigger Field" dropdown

**Expected Results**:
- Dropdown shows both parent and nested fields
- Nested fields are indented (e.g., `vehicle_odometer.reading`)
- Nested fields have a "Nested" badge
- Parent array fields are still visible (e.g., `vehicle_odometer`)

**Example Fields to Verify**:
```
vehicle_odometer (Array)
  ↳ vehicle_odometer.reading (Number) [Nested]
  ↳ vehicle_odometer.reading_date (Date) [Nested]
  ↳ vehicle_odometer.created_at (Date) [Nested]

vehicle_registration (Array)
  ↳ vehicle_registration.registered_in_local (Boolean) [Nested]
  ↳ vehicle_registration.year_first_registered_local (Number) [Nested]
  ↳ vehicle_registration.license_expiry_date (Date) [Nested]

vehicle_other_details (Array)
  ↳ vehicle_other_details.status (String) [Nested]
  ↳ vehicle_other_details.purchase_price (Number) [Nested]
  ↳ vehicle_other_details.retail_price (Number) [Nested]
```

**Test Trigger Configuration**:
1. Select nested field: `vehicle_odometer.reading`
2. Select operator: `greater_than`
3. Enter value: `50000`
4. Click "Save Configuration"

**Expected**: Configuration saves successfully with nested field as trigger

---

### Scenario 2: Export Fields Node - Nested Field Selection

**Objective**: Verify that nested fields can be selected for export

**Steps**:
1. Continue with the workflow from Scenario 1
2. Add an "Export Fields" node to the canvas
3. Connect Target Schema node to Export Fields node
4. Click "Configure Export Fields" button
5. Scroll through the field list

**Expected Results**:
- Nested fields appear in the list
- Nested fields have left indentation and blue left border
- Nested fields show "↳ Subfield of [parent_field]" text
- Nested fields have "Nested" badge
- Nested fields can be selected/deselected

**Test Selection**:
1. Click "Select None" to clear all selections
2. Manually select these nested fields:
   - `vehicle_odometer.reading`
   - `vehicle_odometer.reading_date`
   - `vehicle_registration.license_expiry_date`
   - `vehicle_other_details.purchase_price`
3. Click "Save Configuration"

**Expected**: 
- Selected count shows 4 fields
- Configuration saves successfully
- Preview shows selected nested fields

---

### Scenario 3: Data Mapping Node - Nested Field Mapping

**Objective**: Verify that nested fields can be mapped to external fields

**Steps**:
1. Continue with the workflow from Scenario 2
2. Add a "Data Mapping" node to the canvas
3. Connect Export Fields node to Data Mapping node
4. Click "Configure Mapping" button
5. Go to "Sample JSON & Fields" tab
6. Paste sample JSON:
```json
{
  "odometer_reading": 75000,
  "odometer_date": "2024-01-15",
  "license_expiry": "2025-12-31",
  "purchase_amount": 25000
}
```
7. Go to "Field Mappings" tab

**Expected Results**:
- Auto-mapping creates mappings for the fields
- Target field dropdown includes nested fields
- Nested fields are indented and colored blue
- Nested fields have "nested" badge

**Test Manual Mapping**:
1. Click "Add Mapping" button
2. For Source Field, select: `odometer_reading`
3. For Target Field, select: `vehicle_odometer.reading`
4. Verify the mapping shows correctly
5. Add another mapping:
   - Source: `license_expiry`
   - Target: `vehicle_registration.license_expiry_date`
6. Click "Save Mapping Configuration"

**Expected**: 
- Mappings save successfully
- Preview tab shows correct mappings with nested fields

---

### Scenario 4: Complete Workflow Execution

**Objective**: Verify that the workflow executes correctly with nested fields

**Steps**:
1. Complete the workflow setup:
   - Add Authentication node (configure API endpoint)
   - Add Condition node
   - Add Email nodes (success/error)
   - Connect all nodes
2. Save the workflow
3. Activate the workflow (set status to "Active")
4. Create or update a test vehicle with the following data:
```javascript
{
  vehicle_stock_id: 12345,
  company_id: "[your_company_id]",
  vehicle_type: "master",
  make: "Toyota",
  model: "Camry",
  year: 2024,
  vin: "TEST123456789",
  plate_no: "ABC123",
  chassis_no: "CH123456",
  vehicle_hero_image: "https://example.com/image.jpg",
  vehicle_odometer: [{
    reading: 75000,
    reading_date: new Date("2024-01-15"),
    created_at: new Date()
  }],
  vehicle_registration: [{
    license_expiry_date: new Date("2025-12-31"),
    registered_in_local: true
  }],
  vehicle_other_details: [{
    purchase_price: 25000,
    status: "available"
  }]
}
```

**Expected Results**:
1. Workflow triggers automatically (if trigger condition is met)
2. Backend console logs show:
   ```
   Vehicle Outbound Trigger Activated:
   {
     vehicle_odometer.reading: 75000,
     vehicle_odometer.reading_date: "2024-01-15T00:00:00.000Z",
     vehicle_registration.license_expiry_date: "2025-12-31T00:00:00.000Z",
     vehicle_other_details.purchase_price: 25000
   }
   ```
3. Mapped External System Fields show the correct external field names
4. API call is made with the mapped data
5. Email notification is sent (if configured)

---

### Scenario 5: Nested Field Value Extraction

**Objective**: Verify that nested field values are correctly extracted from vehicle data

**Steps**:
1. Check backend console logs when workflow executes
2. Look for "Vehicle Outbound Trigger Activated" log
3. Verify the logged data contains nested field values

**Expected Console Output**:
```
Vehicle Outbound Trigger Activated:
{
  vehicle_odometer.reading: 75000,
  vehicle_odometer.reading_date: "2024-01-15T00:00:00.000Z"
}

Mapped External System Fields:
{
  odometer_reading: 75000,
  odometer_date: "2024-01-15T00:00:00.000Z"
}

The details have been pushed successfully to the respective API endpoint: [endpoint_url]
Payload pushed to the API endpoint: {
  "odometer_reading": 75000,
  "odometer_date": "2024-01-15T00:00:00.000Z"
}
```

---

## Edge Cases to Test

### Edge Case 1: Empty Array Fields
**Test**: Create a vehicle with empty array fields
```javascript
{
  vehicle_odometer: [],
  vehicle_registration: []
}
```
**Expected**: Workflow should handle gracefully, nested field values should be undefined

### Edge Case 2: Multiple Array Elements
**Test**: Create a vehicle with multiple elements in array
```javascript
{
  vehicle_odometer: [
    { reading: 50000, reading_date: new Date("2023-01-01") },
    { reading: 75000, reading_date: new Date("2024-01-01") }
  ]
}
```
**Expected**: System uses the first element (reading: 50000)

### Edge Case 3: Missing Nested Fields
**Test**: Create a vehicle with partial nested data
```javascript
{
  vehicle_odometer: [
    { reading: 75000 }  // missing reading_date
  ]
}
```
**Expected**: Available fields are extracted, missing fields are undefined

### Edge Case 4: Nested Field in Trigger Condition
**Test**: Configure trigger with nested field condition
- Trigger Field: `vehicle_odometer.reading`
- Operator: `greater_than`
- Value: `100000`

Create vehicle with reading: 50000
**Expected**: Workflow does NOT trigger

Create vehicle with reading: 150000
**Expected**: Workflow DOES trigger

---

## Visual Verification Checklist

### Target Schema Node
- [ ] Nested fields appear in dropdown
- [ ] Nested fields are indented
- [ ] "Nested" badge is visible
- [ ] Field type badge shows correct type
- [ ] Parent field is still selectable

### Export Fields Node
- [ ] Nested fields appear in field list
- [ ] Nested fields have left margin and blue border
- [ ] "↳ Subfield of [parent]" text is visible
- [ ] "Nested" badge is visible
- [ ] Checkbox works for nested fields
- [ ] Selected count includes nested fields

### Data Mapping Node
- [ ] Nested fields appear in target dropdown
- [ ] Nested fields are indented and blue
- [ ] "nested" badge is visible
- [ ] Mapping preview shows nested field paths
- [ ] Validation works with nested fields

---

## Troubleshooting

### Issue: Nested fields not appearing
**Solution**: 
1. Check backend console for errors
2. Verify schema has array fields with subdocuments
3. Clear browser cache and reload
4. Check API response from `/api/workflows/schema-fields/vehicle`

### Issue: Nested field values not extracted
**Solution**:
1. Check vehicle data structure in database
2. Verify array has at least one element
3. Check backend logs for `getNestedFieldValue` function
4. Verify field path is correct (e.g., `vehicle_odometer.reading`)

### Issue: Workflow not triggering with nested field condition
**Solution**:
1. Verify trigger field path is correct
2. Check vehicle data has the nested field populated
3. Verify operator and value are correct
4. Check backend logs for trigger evaluation

---

## Success Criteria

The implementation is successful if:

1. ✅ Nested fields appear in all three workflow nodes (Target Schema, Export Fields, Data Mapping)
2. ✅ Nested fields are visually distinguishable (indentation, badges, colors)
3. ✅ Nested fields can be selected and configured
4. ✅ Workflow triggers correctly based on nested field conditions
5. ✅ Nested field values are correctly extracted from vehicle data
6. ✅ Mapped data includes nested field values
7. ✅ API calls contain the correct nested field data
8. ✅ Existing workflows continue to work without issues
9. ✅ No console errors or warnings
10. ✅ Performance is not significantly impacted

---

## Reporting Issues

If you encounter any issues during testing, please report with:
1. Scenario number and step where issue occurred
2. Expected behavior vs actual behavior
3. Screenshots (if applicable)
4. Browser console errors
5. Backend console logs
6. Vehicle data structure used
7. Workflow configuration (export as JSON)

---

## Additional Notes

- The system currently uses the first element of array fields when extracting nested values
- Nested fields inherit validation rules from their schema definition
- Field paths use dot notation (e.g., `vehicle_odometer.reading`)
- All existing workflows remain backward compatible
