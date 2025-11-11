# Vehicle Outbound Email Notification Flow

## Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                     VEHICLE UPDATE TRIGGER                          │
│  (e.g., is_pricing_ready changed to true)                          │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│              checkAndTriggerOutboundWorkflows()                     │
│  • Find active Vehicle Outbound workflows                          │
│  • Check trigger conditions                                        │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │ Trigger Match? │
                    └────────┬───────┘
                             │
                    ┌────────┴────────┐
                    │                 │
                   YES               NO
                    │                 │
                    ▼                 ▼
         ┌──────────────────┐   [End - No Action]
         │  Export Fields   │
         │  (Selected Only) │
         └────────┬─────────┘
                  │
                  ▼
         ┌──────────────────┐
         │   Data Mapping   │
         │ (Internal → Ext) │
         └────────┬─────────┘
                  │
                  ▼
         ┌──────────────────────────────────────────┐
         │      makeOutboundAPICall()               │
         │  • Prepare headers                       │
         │  • Add authentication (if enabled)       │
         │  • POST to external API endpoint         │
         └────────┬─────────────────────────────────┘
                  │
         ┌────────┴────────┐
         │                 │
      SUCCESS            ERROR
         │                 │
         ▼                 ▼
┌─────────────────┐  ┌─────────────────┐
│ Console Log:    │  │ Console Log:    │
│ "The details    │  │ "API call       │
│  have been      │  │  failed: ..."   │
│  pushed         │  │                 │
│  successfully"  │  │                 │
└────────┬────────┘  └────────┬────────┘
         │                     │
         ▼                     ▼
┌─────────────────┐  ┌─────────────────┐
│ Console Log:    │  │ Console Log:    │
│ "Payload pushed │  │ "Sending error  │
│  to API: {...}" │  │  email..."      │
└────────┬────────┘  └────────┬────────┘
         │                     │
         ▼                     ▼
┌──────────────────────────────────────────────────┐
│      sendOutboundWorkflowEmail()                 │
│  • Prepare email data (vehicle, response, etc.) │
│  • Find appropriate email node (success/error)  │
│  • Replace template variables                   │
│  • Send email via Gmail/SendGrid                │
└────────┬─────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│ Console Log:    │
│ "Success/Error  │
│  email sent     │
│  successfully"  │
└─────────────────┘
         │
         ▼
    [End - Email Sent]
```

## Detailed Step-by-Step Flow

### 1. Vehicle Update Trigger
```javascript
// Example: User updates vehicle pricing_ready status
vehicle.is_pricing_ready = true;
await vehicle.save();

// This triggers:
await checkAndTriggerOutboundWorkflows(vehicle.toObject(), req.user.company_id);
```

### 2. Workflow Discovery & Trigger Check
```javascript
// Find all active Vehicle Outbound workflows
const outboundWorkflows = await Workflow.find({
  company_id: companyId,
  workflow_type: 'vehicle_outbound',
  status: 'active'
});

// For each workflow, check trigger condition
const triggerActivated = checkTriggerCondition(
  fieldValue,           // e.g., true
  config.trigger_operator,  // e.g., "equals"
  config.trigger_value      // e.g., true
);
```

### 3. Field Export
```javascript
// Get selected fields from Export Fields Node
const selectedFields = exportFieldsNode.data.config.selected_fields;
// e.g., ['vehicle_stock_id', 'make', 'model', 'year', 'vin']

// Extract only selected fields from vehicle data
const filteredVehicleData = {};
selectedFields.forEach(fieldName => {
  filteredVehicleData[fieldName] = vehicleData[fieldName];
});
```

### 4. Data Mapping
```javascript
// Map internal field names to external field names
const mappings = dataMappingNode.data.config.mappings;
const mappedVehicleData = {};

selectedFields.forEach(fieldName => {
  const mapping = mappings.find(m => m.target_field === fieldName);
  if (mapping && mapping.source_field) {
    // Use external field name
    mappedVehicleData[mapping.source_field] = vehicleData[fieldName];
  } else {
    // Use original field name
    mappedVehicleData[fieldName] = vehicleData[fieldName];
  }
});

// Example result:
// { vehicle_id: 12345, make: 'Toyota', model: 'Camry', ... }
```

### 5. API Call
```javascript
// Prepare headers with authentication
const headers = { 'Content-Type': 'application/json' };
if (authConfig.enable_authentication) {
  // Add auth headers based on type (JWT, Standard, Static)
}

// Make POST request
const response = await axios.post(
  authConfig.api_endpoint,
  mappedVehicleData,
  { headers, timeout: 30000 }
);
```

### 6. Success Path
```javascript
// Log success
console.log(`The details have been pushed successfully to the respective API endpoint: ${endpoint}`);
console.log("Payload pushed to the API endpoint:", JSON.stringify(mappedData, null, 2));

// Send success email
await sendOutboundWorkflowEmail(workflow, vehicleData, mappedData, {
  success: true,
  status: response.status,
  data: response.data,
  endpoint: authConfig.api_endpoint
});
```

### 7. Error Path
```javascript
// Log error
console.error('API call failed:', error.message);

// Send error email
await sendOutboundWorkflowEmail(workflow, vehicleData, mappedData, {
  success: false,
  error: error.message,
  endpoint: authConfig.api_endpoint
});
```

### 8. Email Preparation & Sending
```javascript
// Prepare email data
const emailData = {
  vehicle: { vehicle_stock_id, make, model, year, ... },
  mapped_data: { vehicle_id, make, model, ... },
  response: {
    status: '200' or '500',
    message: 'Success or error message',
    endpoint: 'API URL',
    api_status: 200,
    api_data: { ... }
  },
  error: { message: 'Error details' },
  company: { name: 'Company Name' },
  timestamp: '2025-11-07T10:30:00.000Z',
  vehicles_summary: { total: 1, successful: 1, failed: 0 }
};

// Find appropriate email node
const emailNode = apiResult.success ? emailSuccessNode : emailErrorNode;

// Send email
const emailResult = await sendWorkflowEmail(emailNode.data.config, emailData);
```

## Key Points

### 1. Trigger Conditions
- Workflows are triggered by vehicle updates
- Trigger conditions are evaluated for each active workflow
- Only matching conditions trigger the workflow

### 2. Field Selection
- Only fields selected in Export Fields Node are included
- This allows fine-grained control over what data is sent

### 3. Data Mapping
- Internal field names (vehicle schema) are mapped to external field names
- Mapping is configured in Data Mapping Node
- Unmapped fields use their original names

### 4. Authentication
- Optional authentication can be enabled/disabled
- Supports JWT Token, Standard (API Key/Secret), and Static Token
- Authentication headers are added automatically

### 5. Email Notifications
- Success email sent when API call succeeds (status 200)
- Error email sent when API call fails (any error)
- Email templates support variable substitution
- Email sending is asynchronous (non-blocking)

### 6. Console Logging
- All steps are logged to console for debugging
- Success message: "The details have been pushed successfully..."
- Payload is logged in JSON format
- Email sending status is logged

## Error Handling

### API Call Errors
- Network errors (ECONNREFUSED, ETIMEDOUT, etc.)
- HTTP errors (4xx, 5xx status codes)
- Authentication errors
- Timeout errors (30 second timeout)

### Email Sending Errors
- Email service configuration errors
- Invalid email addresses
- Template rendering errors
- SMTP/SendGrid errors

All errors are logged but don't block the workflow execution.

## Performance Considerations

- Email sending is asynchronous (doesn't block API call)
- Workflow execution is triggered per vehicle update
- Multiple vehicle updates trigger multiple workflow executions
- Each execution sends a separate email

## Comparison with Vehicle Inbound

| Feature | Vehicle Inbound | Vehicle Outbound |
|---------|----------------|------------------|
| Trigger | External API call | Vehicle update |
| Direction | External → Internal | Internal → External |
| Data Flow | Receive data | Send data |
| Email Timing | After data saved | After API call |
| Email Data | Incoming payload | Outgoing payload |
| Authentication | Incoming request | Outgoing request |

Both workflows use the same email infrastructure and support the same email services and template variables.
