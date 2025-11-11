# Nested Array Fields - Quick Reference Card

## 🎯 What Changed?

Array fields with nested subfields are now fully accessible in workflows.

**Example**: `vehicle_odometer` array now exposes:
- `vehicle_odometer.reading`
- `vehicle_odometer.reading_date`
- `vehicle_odometer.created_at`

## 📁 Files Modified

### Backend (1 file)
- `backend/src/controllers/workflow.controller.js`

### Frontend (3 files)
- `src/components/workflows/nodes/TargetSchemaNode.tsx`
- `src/components/workflows/nodes/ExportFieldsNode.tsx`
- `src/components/workflows/nodes/DataMappingNode.tsx`

## 🔍 How to Identify Nested Fields

### Visual Indicators
- **Indentation**: Nested fields are indented
- **Color**: Blue text color for nested fields
- **Badge**: "Nested" badge appears
- **Border**: Blue left border (Export Fields Node)
- **Text**: "↳ Subfield of [parent]" (Export Fields Node)

### Field Path Format
```
parent_field.nested_field
```

Examples:
```
vehicle_odometer.reading
vehicle_registration.license_expiry_date
vehicle_other_details.purchase_price
```

## 🚀 Quick Start Guide

### 1. Target Schema Configuration
```
1. Open workflow
2. Click "Configure Schema" on Target Schema node
3. Select schema type (e.g., "Vehicle Schema")
4. Open "Trigger Field" dropdown
5. Select nested field (e.g., "vehicle_odometer.reading")
6. Choose operator (e.g., "greater_than")
7. Enter value (e.g., "50000")
8. Save
```

### 2. Export Fields Configuration
```
1. Click "Configure Export Fields" on Export Fields node
2. Scroll to find nested fields (indented with blue border)
3. Check boxes for desired nested fields
4. Save
```

### 3. Data Mapping Configuration
```
1. Click "Configure Mapping" on Data Mapping node
2. Add or edit mapping
3. Select nested field from "Internal Field" dropdown
4. Map to external field name
5. Save
```

## 📊 Common Array Fields

### vehicle_odometer
- `vehicle_odometer.reading` (Number)
- `vehicle_odometer.reading_date` (Date)
- `vehicle_odometer.created_at` (Date)

### vehicle_registration
- `vehicle_registration.license_expiry_date` (Date)
- `vehicle_registration.registered_in_local` (Boolean)
- `vehicle_registration.year_first_registered_local` (Number)

### vehicle_other_details
- `vehicle_other_details.purchase_price` (Number)
- `vehicle_other_details.retail_price` (Number)
- `vehicle_other_details.status` (String)

### vehicle_specifications
- `vehicle_specifications.number_of_seats` (Number)
- `vehicle_specifications.interior_color` (String)
- `vehicle_specifications.exterior_primary_color` (String)

### vehicle_eng_transmission
- `vehicle_eng_transmission.engine_type` (String)
- `vehicle_eng_transmission.transmission_type` (String)
- `vehicle_eng_transmission.engine_size` (Number)

## 💡 Use Cases

### Use Case 1: Trigger on Odometer Reading
```
Trigger: vehicle_odometer.reading > 100000
Action: Send notification about high mileage vehicle
```

### Use Case 2: Export Specific Price Data
```
Export Fields:
- vehicle_other_details.purchase_price
- vehicle_other_details.retail_price
- vehicle_other_details.sold_price
```

### Use Case 3: Map Registration Data
```
Mapping:
license_expiry → vehicle_registration.license_expiry_date
registered_locally → vehicle_registration.registered_in_local
```

## 🔧 Troubleshooting

### Nested fields not appearing?
✅ Check backend console for errors
✅ Verify schema type is selected
✅ Refresh browser cache

### Values not extracted?
✅ Verify array has at least one element
✅ Check field path uses dot notation
✅ Verify vehicle data structure

### Workflow not triggering?
✅ Check trigger condition is correct
✅ Verify nested field has value
✅ Check workflow is "Active"

## 📖 Documentation Files

| File | Purpose |
|------|---------|
| `NESTED_ARRAY_FIELDS_IMPLEMENTATION.md` | Technical details |
| `NESTED_FIELDS_TEST_GUIDE.md` | Testing instructions |
| `NESTED_FIELDS_SUMMARY.md` | Overview and summary |
| `NESTED_FIELDS_VISUAL_EXAMPLE.md` | Visual examples |
| `IMPLEMENTATION_CHECKLIST.md` | Deployment checklist |
| `QUICK_REFERENCE.md` | This file |

## 🎓 Key Concepts

### Nested Field
A field that exists inside an array field's subdocument schema.

### Parent Field
The array field that contains nested fields.

### Field Path
The dot-notation path to access a nested field (e.g., `parent.child`).

### Array Access
System uses first element (index 0) of arrays.

## ⚡ Quick Tips

1. **Use nested fields for precise data control**
2. **Parent fields are still available if needed**
3. **Nested fields inherit validation from schema**
4. **Field paths use dot notation**
5. **Visual indicators help identify nested fields**

## 🔗 API Endpoints

### Get Schema Fields
```
GET /api/workflows/schema-fields/:schemaType
```

Response includes nested fields:
```json
{
  "success": true,
  "data": {
    "fields": [
      {
        "field_name": "vehicle_odometer",
        "field_type": "array",
        "is_array": true
      },
      {
        "field_name": "vehicle_odometer.reading",
        "field_type": "number",
        "is_nested": true,
        "parent_field": "vehicle_odometer"
      }
    ]
  }
}
```

## 🎨 Visual Cheat Sheet

```
Regular Field:
○ vehicle_stock_id [Number]

Array Parent:
○ vehicle_odometer [Array]

Nested Subfield:
    ○ vehicle_odometer.reading [Number] [Nested]
    └─ Indented, blue text, "Nested" badge
```

## ✅ Backward Compatibility

- ✅ Existing workflows work unchanged
- ✅ Parent array fields still selectable
- ✅ No breaking changes
- ✅ Vehicle Inbound workflows unaffected

## 📞 Support

For issues or questions:
1. Check troubleshooting section above
2. Review full documentation files
3. Check backend/frontend console logs
4. Verify vehicle data structure

---

**Quick Reference Version**: 1.0.0
**Last Updated**: [Current Date]
