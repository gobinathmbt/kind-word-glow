# Nested Array Fields - Visual Examples

## Before vs After Comparison

### Target Schema Node - Field Selection Dropdown

#### BEFORE Implementation
```
┌─────────────────────────────────────┐
│ Select trigger field                │
├─────────────────────────────────────┤
│ ○ vehicle_stock_id      [Number]    │
│ ○ make                  [String]    │
│ ○ model                 [String]    │
│ ○ year                  [Number]    │
│ ○ vehicle_odometer      [Array]     │  ← Only parent field visible
│ ○ vehicle_registration  [Array]     │  ← Only parent field visible
│ ○ vehicle_other_details [Array]     │  ← Only parent field visible
└─────────────────────────────────────┘
```

#### AFTER Implementation
```
┌─────────────────────────────────────────────────────────┐
│ Select trigger field                                    │
├─────────────────────────────────────────────────────────┤
│ ○ vehicle_stock_id                [Number]              │
│ ○ make                            [String]              │
│ ○ model                           [String]              │
│ ○ year                            [Number]              │
│ ○ vehicle_odometer                [Array]               │
│     ○ vehicle_odometer.reading        [Number] [Nested] │  ← NEW!
│     ○ vehicle_odometer.reading_date   [Date]   [Nested] │  ← NEW!
│     ○ vehicle_odometer.created_at     [Date]   [Nested] │  ← NEW!
│ ○ vehicle_registration            [Array]               │
│     ○ vehicle_registration.registered_in_local [Boolean] [Nested] │  ← NEW!
│     ○ vehicle_registration.license_expiry_date [Date]    [Nested] │  ← NEW!
│ ○ vehicle_other_details           [Array]               │
│     ○ vehicle_other_details.status         [String] [Nested] │  ← NEW!
│     ○ vehicle_other_details.purchase_price [Number] [Nested] │  ← NEW!
└─────────────────────────────────────────────────────────┘
```

---

## Export Fields Node - Field List

### BEFORE Implementation
```
┌────────────────────────────────────────────────────────┐
│ Export Fields Configuration                            │
├────────────────────────────────────────────────────────┤
│                                                         │
│ ☐ vehicle_stock_id          [Number]                   │
│ ☐ make                      [String]                   │
│ ☐ model                     [String]                   │
│ ☐ year                      [Number]                   │
│ ☐ vehicle_odometer          [Array]                    │
│ ☐ vehicle_registration      [Array]                    │
│ ☐ vehicle_other_details     [Array]                    │
│                                                         │
│ ⚠️ Cannot select individual subfields                   │
└────────────────────────────────────────────────────────┘
```

### AFTER Implementation
```
┌────────────────────────────────────────────────────────────────┐
│ Export Fields Configuration                                    │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ☐ vehicle_stock_id                    [Number]                 │
│ ☐ make                                [String]                 │
│ ☐ model                               [String]                 │
│ ☐ year                                [Number]                 │
│ ☐ vehicle_odometer                    [Array]                  │
│   ┃                                                             │
│   ┃ ☑ vehicle_odometer.reading        [Number] [Nested]        │  ← NEW!
│   ┃   ↳ Subfield of vehicle_odometer                           │
│   ┃                                                             │
│   ┃ ☑ vehicle_odometer.reading_date   [Date]   [Nested]        │  ← NEW!
│   ┃   ↳ Subfield of vehicle_odometer                           │
│   ┃                                                             │
│   ┃ ☐ vehicle_odometer.created_at     [Date]   [Nested]        │  ← NEW!
│   ┃   ↳ Subfield of vehicle_odometer                           │
│                                                                 │
│ ☐ vehicle_registration                [Array]                  │
│   ┃                                                             │
│   ┃ ☑ vehicle_registration.license_expiry_date [Date] [Nested] │  ← NEW!
│   ┃   ↳ Subfield of vehicle_registration                       │
│                                                                 │
│ ✅ Can now select individual subfields!                         │
└────────────────────────────────────────────────────────────────┘
```

---

## Data Mapping Node - Field Mapping

### BEFORE Implementation
```
┌─────────────────────────────────────────────────────────┐
│ Data Mapping Configuration                              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Mapping 1:                                              │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ External Field (JSON):                              │ │
│ │ [odometer_reading        ▼]                         │ │
│ │                                                     │ │
│ │ Internal Field (Vehicle Schema):                   │ │
│ │ [vehicle_odometer        ▼]  ← Can only map to     │ │
│ │                              entire array!          │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ ⚠️ Cannot map to specific subfield                      │
└─────────────────────────────────────────────────────────┘
```

### AFTER Implementation
```
┌─────────────────────────────────────────────────────────────┐
│ Data Mapping Configuration                                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Mapping 1:                                                  │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ External Field (JSON):                                │   │
│ │ [odometer_reading              ▼]                     │   │
│ │                                                       │   │
│ │ Internal Field (Vehicle Schema):                     │   │
│ │ ┌───────────────────────────────────────────────┐    │   │
│ │ │ vehicle_stock_id                              │    │   │
│ │ │ make                                          │    │   │
│ │ │ vehicle_odometer                              │    │   │
│ │ │     vehicle_odometer.reading      [nested]    │ ✓  │   │  ← NEW!
│ │ │     vehicle_odometer.reading_date [nested]    │    │   │  ← NEW!
│ │ │     vehicle_odometer.created_at   [nested]    │    │   │  ← NEW!
│ │ └───────────────────────────────────────────────┘    │   │
│ │                                                       │   │
│ │ Selected: vehicle_odometer.reading                   │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                              │
│ ✅ Can now map to specific subfield!                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Workflow Execution - Console Output

### BEFORE Implementation
```javascript
// Backend Console Log
Vehicle Outbound Trigger Activated:
{
  vehicle_stock_id: 12345,
  make: "Toyota",
  model: "Camry",
  vehicle_odometer: [
    {
      reading: 75000,
      reading_date: "2024-01-15T00:00:00.000Z",
      created_at: "2024-01-20T00:00:00.000Z"
    }
  ]
}

// ⚠️ Entire array is exported, cannot select specific subfields
```

### AFTER Implementation
```javascript
// Backend Console Log
Vehicle Outbound Trigger Activated:
{
  vehicle_stock_id: 12345,
  make: "Toyota",
  model: "Camry",
  vehicle_odometer.reading: 75000,              // ← NEW! Specific subfield
  vehicle_odometer.reading_date: "2024-01-15T00:00:00.000Z"  // ← NEW! Specific subfield
}

Mapped External System Fields:
{
  stock_id: 12345,
  manufacturer: "Toyota",
  model_name: "Camry",
  odometer_value: 75000,                        // ← Mapped from vehicle_odometer.reading
  odometer_date: "2024-01-15T00:00:00.000Z"    // ← Mapped from vehicle_odometer.reading_date
}

// ✅ Only selected subfields are exported and mapped!
```

---

## Real-World Use Case Example

### Scenario: Exporting Vehicle Data to External Inventory System

#### External System Expects:
```json
{
  "vehicle_id": 12345,
  "odometer_reading": 75000,
  "odometer_date": "2024-01-15",
  "license_expiry": "2025-12-31",
  "purchase_price": 25000,
  "retail_price": 35000
}
```

#### Internal Vehicle Schema Has:
```javascript
{
  vehicle_stock_id: 12345,
  vehicle_odometer: [
    {
      reading: 75000,
      reading_date: "2024-01-15T00:00:00.000Z",
      created_at: "2024-01-20T00:00:00.000Z"
    }
  ],
  vehicle_registration: [
    {
      license_expiry_date: "2025-12-31T00:00:00.000Z",
      registered_in_local: true
    }
  ],
  vehicle_other_details: [
    {
      purchase_price: 25000,
      retail_price: 35000,
      status: "available"
    }
  ]
}
```

#### BEFORE: Impossible to Map Correctly
```
❌ Could only map entire arrays:
   vehicle_odometer → odometer_reading (WRONG! This is an array)
   vehicle_registration → license_expiry (WRONG! This is an array)
   vehicle_other_details → purchase_price (WRONG! This is an array)
```

#### AFTER: Perfect Mapping
```
✅ Can map specific subfields:
   vehicle_stock_id → vehicle_id
   vehicle_odometer.reading → odometer_reading
   vehicle_odometer.reading_date → odometer_date
   vehicle_registration.license_expiry_date → license_expiry
   vehicle_other_details.purchase_price → purchase_price
   vehicle_other_details.retail_price → retail_price
```

---

## Visual Indicators in UI

### Color Coding
```
┌─────────────────────────────────────────────────────┐
│ Regular Field:                                      │
│ ○ vehicle_stock_id          [Number]                │
│   └─ Black text, no indentation                     │
│                                                      │
│ Array Parent Field:                                 │
│ ○ vehicle_odometer          [Array]                 │
│   └─ Black text, no indentation                     │
│                                                      │
│ Nested Subfield:                                    │
│     ○ vehicle_odometer.reading    [Number] [Nested] │
│       └─ Blue text, indented, "Nested" badge        │
└─────────────────────────────────────────────────────┘
```

### Badges
```
[Number]      - Field type badge (gray)
[Required]    - Required field badge (red)
[Array]       - Array field badge (gray)
[Nested]      - Nested field badge (blue)
```

### Indentation
```
vehicle_odometer                    ← No indentation (parent)
    vehicle_odometer.reading        ← 4 spaces indentation (nested)
    vehicle_odometer.reading_date   ← 4 spaces indentation (nested)
```

### Borders (Export Fields Node)
```
┌─────────────────────────────────────┐
│ ☐ vehicle_odometer                  │  ← No border
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
┃ ☑ vehicle_odometer.reading          │  ← Blue left border
└─────────────────────────────────────┘
```

---

## Complete Workflow Example

### Step 1: Target Schema Configuration
```
Schema Type: Vehicle Schema
Trigger Field: vehicle_odometer.reading
Operator: greater_than
Value: 50000
```

### Step 2: Export Fields Configuration
```
Selected Fields (4):
✓ vehicle_stock_id
✓ vehicle_odometer.reading
✓ vehicle_odometer.reading_date
✓ vehicle_other_details.purchase_price
```

### Step 3: Data Mapping Configuration
```
Mappings:
vehicle_stock_id → stock_id
vehicle_odometer.reading → odometer_value
vehicle_odometer.reading_date → odometer_date
vehicle_other_details.purchase_price → price
```

### Step 4: Workflow Execution
```javascript
// Input: Vehicle Created/Updated
{
  vehicle_stock_id: 12345,
  vehicle_odometer: [{ reading: 75000, reading_date: "2024-01-15" }],
  vehicle_other_details: [{ purchase_price: 25000 }]
}

// Trigger Check: vehicle_odometer.reading (75000) > 50000 ✓

// Exported Fields:
{
  vehicle_stock_id: 12345,
  vehicle_odometer.reading: 75000,
  vehicle_odometer.reading_date: "2024-01-15",
  vehicle_other_details.purchase_price: 25000
}

// Mapped Output (sent to API):
{
  stock_id: 12345,
  odometer_value: 75000,
  odometer_date: "2024-01-15",
  price: 25000
}
```

---

## Summary of Visual Changes

| Component | Before | After |
|-----------|--------|-------|
| **Target Schema** | Only parent arrays visible | Parent + all nested subfields visible |
| **Export Fields** | Cannot select subfields | Can select individual subfields with visual hierarchy |
| **Data Mapping** | Cannot map to subfields | Can map to specific nested fields |
| **Field Display** | Flat list | Hierarchical with indentation |
| **Visual Indicators** | Type badges only | Type + Nested badges + colors + borders |
| **Field Count** | ~50 fields | ~150+ fields (with nested) |

---

## Benefits Visualization

```
┌─────────────────────────────────────────────────────────────┐
│                    BEFORE                                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  External System          Internal System                   │
│  ┌──────────────┐        ┌──────────────────┐              │
│  │ odometer: ?  │   ❌   │ vehicle_odometer │              │
│  └──────────────┘        │ [Array]          │              │
│                          └──────────────────┘              │
│                                                              │
│  ⚠️ Cannot extract specific subfield                        │
│  ⚠️ Must export entire array                                │
│  ⚠️ External system receives wrong data type                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     AFTER                                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  External System          Internal System                   │
│  ┌──────────────┐        ┌──────────────────────────┐      │
│  │ odometer:    │   ✓    │ vehicle_odometer.reading │      │
│  │ 75000        │ ←───── │ (Number)                 │      │
│  └──────────────┘        └──────────────────────────┘      │
│                                                              │
│  ✅ Extracts specific subfield value                        │
│  ✅ Exports only needed data                                │
│  ✅ External system receives correct data type              │
└─────────────────────────────────────────────────────────────┘
```

---

This visual guide demonstrates the significant improvement in functionality and user experience provided by the nested array fields implementation.
