# Testing Guide: Vehicle Outbound Data Mapping Fixes

## Quick Test Scenarios

### Scenario 1: Sample JSON Input Responsiveness Test
**Duration:** 2-3 minutes

1. Navigate to Workflows → Create New Workflow
2. Select "Vehicle Outbound" as workflow type
3. Click on "Data Mapping" node → "Configure Mapping"
4. Go to "Sample JSON & Fields" tab
5. **Test rapid typing:**
   - Type quickly in the textarea
   - Expected: No lag, text appears instantly
6. **Test paste operation:**
   - Copy this JSON:
   ```json
   {
     "vehicle_id": 12345,
     "make": "Toyota",
     "model": "Camry",
     "year": 2024,
     "vin": "1HGBH41JXMN109186",
     "plate_no": "ABC123",
     "status": "available",
     "price": 25000,
     "mileage": 15000,
     "color": "Silver",
     "transmission": "Automatic",
     "fuel_type": "Petrol"
   }
   ```
   - Paste into textarea
   - Expected: Smooth paste, no freezing
7. **Verify parsing:**
   - Wait 500ms
   - Expected: Green success message "Valid JSON - X fields detected"
   - Expected: Fields list appears below

**Pass Criteria:** ✅ No lag, instant updates, smooth experience

---

### Scenario 2: Custom Field Alignment Test
**Duration:** 3-4 minutes

1. Continue from Scenario 1 (or use the JSON above)
2. Go to "Field Mappings" tab
3. **Find a custom field mapping:**
   - Look for fields mapped to "Custom Fields"
   - Example: "color", "transmission", "fuel_type" (if not in vehicle schema)
4. **Verify styling:**
   - Expected: Blue background (light blue)
   - Expected: Border around the section
   - Expected: Warning icon with message
   - Expected: "Custom Field Key" label is bold and dark blue
   - Expected: Input field has white background
5. **Check alignment:**
   - Expected: All elements properly aligned
   - Expected: No overlapping text
   - Expected: Consistent spacing
6. **Edit custom field key:**
   - Type a new key name
   - Expected: Input updates smoothly

**Pass Criteria:** ✅ Clean layout, proper styling, no misalignment

---

### Scenario 3: Schema Selection Dependency Test
**Duration:** 3-4 minutes

1. Create a NEW Vehicle Outbound workflow
2. **Before selecting schema:**
   - Click on "Data Mapping" node
   - Expected: Warning message appears (amber/yellow background)
   - Expected: Message says "Please select a Target Schema first..."
   - Expected: "Configure Mapping" button is DISABLED (grayed out)
3. **After selecting schema:**
   - Click on "Target Schema" node → "Configure Schema"
   - Select "Vehicle Schema" from dropdown
   - Select a trigger field (e.g., "status")
   - Select operator (e.g., "equals")
   - Enter value (e.g., "available")
   - Click "Save Configuration"
4. **Return to Data Mapping:**
   - Click on "Data Mapping" node
   - Expected: Warning message is GONE
   - Expected: "Configure Mapping" button is ENABLED
   - Expected: Can now open configuration dialog

**Pass Criteria:** ✅ Button disabled until schema selected, warning shows/hides correctly

---

### Scenario 4: End-to-End Workflow Test
**Duration:** 5-7 minutes

1. Create complete Vehicle Outbound workflow:
   - **Target Schema:** Select "Vehicle Schema", trigger on "status" equals "available"
   - **Export Fields:** Select 5-10 fields to export
   - **Data Mapping:** 
     - Add sample JSON with 10+ fields
     - Verify auto-mapping works
     - Check that some fields go to custom_fields
     - Verify custom field section styling
   - **Authentication:** Configure JWT or API Key
   - **Condition:** Keep default success/error conditions
   - **Email Nodes:** Configure success/error emails

2. **Save workflow:**
   - Enter workflow name
   - Click "Save"
   - Expected: Success message

3. **Reopen workflow:**
   - Go back to workflow list
   - Click on the workflow you just created
   - Expected: All configurations preserved
   - Expected: Data Mapping still shows correct mappings
   - Expected: Custom fields still properly styled

**Pass Criteria:** ✅ Complete workflow saves and loads correctly

---

### Scenario 5: Vehicle Inbound Compatibility Test
**Duration:** 2-3 minutes

1. Create a NEW Vehicle INBOUND workflow
2. Click on "Data Mapping" node
3. **Verify no schema dependency:**
   - Expected: NO warning message about schema
   - Expected: "Configure Mapping" button is ENABLED immediately
   - Expected: Can open configuration without selecting anything first
4. **Test JSON input:**
   - Add sample JSON
   - Expected: Works smoothly (same as outbound)
5. **Test field mapping:**
   - Expected: All existing functionality works
   - Expected: Custom fields work the same way

**Pass Criteria:** ✅ Vehicle Inbound workflows unaffected by changes

---

## Common Issues and Solutions

### Issue: Button still disabled after selecting schema
**Solution:** 
- Make sure you clicked "Save Configuration" in Target Schema node
- Refresh the page and try again
- Check browser console for errors

### Issue: JSON parsing seems slow
**Solution:**
- This is expected - there's a 500ms debounce
- Wait for the green success message
- If it takes longer than 1 second, check JSON syntax

### Issue: Custom field section not showing blue background
**Solution:**
- Make sure the field is actually mapped to "Custom Fields"
- Check that target_field === 'custom_fields'
- Try refreshing the page

---

## Browser Testing Matrix

| Browser | Version | Status |
|---------|---------|--------|
| Chrome  | Latest  | ✅ Test |
| Firefox | Latest  | ✅ Test |
| Safari  | Latest  | ✅ Test |
| Edge    | Latest  | ✅ Test |

---

## Performance Benchmarks

| Action | Expected Time | Acceptable Range |
|--------|---------------|------------------|
| JSON parsing (small) | < 500ms | 300-700ms |
| JSON parsing (large) | < 1s | 500ms-1.5s |
| Field mapping update | < 100ms | 50-200ms |
| Dialog open/close | < 200ms | 100-300ms |
| Save workflow | < 2s | 1-3s |

---

## Regression Testing Checklist

- [ ] Vehicle Inbound workflows still work
- [ ] Target Schema node unchanged
- [ ] Export Fields node unchanged
- [ ] Authentication node unchanged
- [ ] Email nodes unchanged
- [ ] Workflow save/load works
- [ ] Workflow execution works
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] No layout breaks on mobile

---

## Sign-off

**Tester Name:** _________________
**Date:** _________________
**All Tests Passed:** ☐ Yes ☐ No
**Issues Found:** _________________
**Notes:** _________________
