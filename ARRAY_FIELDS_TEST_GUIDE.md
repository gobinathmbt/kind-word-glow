# Array Fields Export - Quick Test Guide

## Setup
1. Navigate to Workflows section
2. Create or edit a Vehicle Outbound workflow
3. Configure the Target Schema node (select Vehicle Schema)
4. Open the Export Fields node configuration

## Test Scenarios

### Scenario 1: Array Field WITHOUT Nested Fields
**Field to Test:** `trade_in_result`

**Steps:**
1. Find `trade_in_result` in the field list
2. Observe the amber warning: "⚠ Array field with no nested structure - selecting this field will include the entire array"
3. Note the current "Selected" count (e.g., 0)
4. Check the `trade_in_result` checkbox
5. **Expected:** Count increases by 1 immediately
6. **Expected:** No nested fields appear below it
7. Uncheck the `trade_in_result` checkbox
8. **Expected:** Count decreases by 1

**Result:** ✅ Pass / ❌ Fail

---

### Scenario 2: Array Field WITH Nested Fields
**Field to Test:** `inspection_report_pdf`

**Steps:**
1. Find `inspection_report_pdf` in the field list
2. Observe the blue info: "ℹ Array field with nested structure - select this to reveal nested fields"
3. Note the current "Selected" count (e.g., 0)
4. Check the `inspection_report_pdf` checkbox
5. **Expected:** Count does NOT increase (stays at 0)
6. **Expected:** Two nested fields appear:
   - `inspection_report_pdf.category` (indented with blue border)
   - `inspection_report_pdf.link` (indented with blue border)
7. Check `inspection_report_pdf.category`
8. **Expected:** Count increases by 1
9. Check `inspection_report_pdf.link`
10. **Expected:** Count increases by 1 (total: 2)
11. Uncheck the parent `inspection_report_pdf`
12. **Expected:** Both nested fields automatically uncheck
13. **Expected:** Count decreases by 2 (back to 0)

**Result:** ✅ Pass / ❌ Fail

---

### Scenario 3: Mixed Selection
**Fields to Test:** `trade_in_result` (no nested) + `vehicle_odometer` (has nested)

**Steps:**
1. Start with count at 0
2. Check `trade_in_result` (no nested fields)
3. **Expected:** Count = 1
4. Check `vehicle_odometer` (has nested fields)
5. **Expected:** Count = 1 (no change)
6. **Expected:** Nested fields appear: `vehicle_odometer.reading`, `vehicle_odometer.reading_date`, etc.
7. Check `vehicle_odometer.reading`
8. **Expected:** Count = 2
9. Check `vehicle_odometer.reading_date`
10. **Expected:** Count = 3
11. Uncheck parent `vehicle_odometer`
12. **Expected:** Both nested fields uncheck automatically
13. **Expected:** Count = 1 (only `trade_in_result` remains)
14. Uncheck `trade_in_result`
15. **Expected:** Count = 0

**Result:** ✅ Pass / ❌ Fail

---

### Scenario 4: Select All Button
**Steps:**
1. Click "Select All" button
2. **Expected:** All fields are selected INCLUDING:
   - Array fields without nested (e.g., `trade_in_result`)
   - Array fields with nested (e.g., `inspection_report_pdf`)
   - All nested fields (e.g., `inspection_report_pdf.category`, `inspection_report_pdf.link`)
3. **Expected:** Count reflects only countable fields:
   - Array fields without nested: counted
   - Nested fields: counted
   - Array parent containers with nested: NOT counted
4. Click "Select None"
5. **Expected:** All fields deselected, count = 0

**Result:** ✅ Pass / ❌ Fail

---

### Scenario 5: Save and Reload
**Steps:**
1. Select a mix of fields:
   - `trade_in_result` (no nested)
   - `inspection_report_pdf` (parent with nested)
   - `inspection_report_pdf.category` (nested)
2. Note the count (should be 2: trade_in_result + category)
3. Click "Save Configuration"
4. Close the dialog
5. Reopen the Export Fields configuration
6. **Expected:** All selections are preserved
7. **Expected:** Count is correct (2)
8. **Expected:** Nested fields are visible under selected parents

**Result:** ✅ Pass / ❌ Fail

---

## Visual Indicators Checklist

### Array Field WITHOUT Nested
- [ ] Shows amber warning icon (⚠)
- [ ] Message: "Array field with no nested structure - selecting this field will include the entire array"
- [ ] Badge shows "Array"
- [ ] No nested fields appear when selected

### Array Field WITH Nested
- [ ] Shows blue info icon (ℹ)
- [ ] Message: "Array field with nested structure - select this to reveal nested fields"
- [ ] Badge shows "Array"
- [ ] Nested fields appear when selected

### Nested Fields
- [ ] Indented with left margin (ml-6)
- [ ] Blue left border (border-l-4 border-l-blue-200)
- [ ] Shows "↳ Subfield of [parent]" in blue text
- [ ] Badge shows "Nested" in blue background
- [ ] Only visible when parent is selected

---

## Count Accuracy Tests

### Test 1: Only Array Fields Without Nested
Select: `trade_in_result`, `inspection_result`
**Expected Count:** 2

### Test 2: Only Nested Fields (No Parents)
Select parent `vehicle_odometer`, then select:
- `vehicle_odometer.reading`
- `vehicle_odometer.reading_date`
**Expected Count:** 2 (parent doesn't count)

### Test 3: Mixed
Select:
- `trade_in_result` (no nested)
- `vehicle_odometer` (parent with nested)
- `vehicle_odometer.reading` (nested)
- `make` (regular field)
**Expected Count:** 3 (trade_in_result + reading + make)

---

## Edge Cases

### Edge Case 1: Deselect Parent with Multiple Nested Selected
1. Select `vehicle_other_details` (parent)
2. Select 5 nested fields under it
3. Count should be 5
4. Deselect parent `vehicle_other_details`
5. **Expected:** All 5 nested fields deselect
6. **Expected:** Count returns to 0

**Result:** ✅ Pass / ❌ Fail

### Edge Case 2: Required Fields
1. Find a required array field with nested structure
2. Select the parent
3. **Expected:** Parent shows "Required" badge
4. **Expected:** Count doesn't increase until nested field selected
5. Select a nested field
6. **Expected:** Count increases

**Result:** ✅ Pass / ❌ Fail

---

## Browser Compatibility
Test in:
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

---

## Performance Test
1. Select "Select All" with 100+ fields
2. **Expected:** UI remains responsive
3. **Expected:** Count updates correctly
4. Click "Select None"
5. **Expected:** All fields deselect quickly

**Result:** ✅ Pass / ❌ Fail

---

## Notes
- Document any unexpected behavior
- Take screenshots of any UI issues
- Note browser console errors if any
