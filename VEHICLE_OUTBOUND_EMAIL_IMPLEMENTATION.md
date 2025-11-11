# Vehicle Outbound Email Notification Implementation

## Overview
This document describes the implementation of email notifications for Vehicle Outbound workflows. When a vehicle update triggers an outbound workflow and data is pushed to an external API endpoint, the system now automatically sends email notifications based on the success or failure of the API call.

## Implementation Details

### 1. Email Notification Flow

#### Success Scenario:
1. Vehicle data is updated (e.g., pricing_ready status changed)
2. Outbound workflow trigger condition is met
3. Selected fields are exported and mapped
4. Data is successfully pushed to the configured API endpoint
5. Console logs: **"The details have been pushed successfully to the respective API endpoint."**
6. **Success email is automatically sent** to the configured email address with success content

#### Failure Scenario:
1. Vehicle data is updated
2. Outbound workflow trigger condition is met
3. Selected fields are exported and mapped
4. Data push to API endpoint **fails**
5. Console logs the error
6. **Error email is automatically sent** to the configured email address with error content

### 2. Code Changes

#### File: `backend/src/controllers/workflow.controller.js`

**New Function: `sendOutboundWorkflowEmail`**
- Located before `checkAndTriggerOutboundWorkflows` function
- Handles email sending for both success and error scenarios
- Prepares comprehensive email data including:
  - Vehicle information (stock_id, make, model, year, VIN, etc.)
  - Mapped data that was sent to the API
  - API response status and data
  - Error messages (if applicable)
  - Company information
  - Timestamp

**Modified Function: `makeOutboundAPICall`**
- Now accepts additional parameters: `workflow` and `vehicleData`
- Calls `sendOutboundWorkflowEmail` on success
- Calls `sendOutboundWorkflowEmail` on error (before throwing)
- Maintains existing console logging behavior

**Modified Function: `checkAndTriggerOutboundWorkflows`**
- Updated to pass `workflow` and `vehicleData` to `makeOutboundAPICall`

### 3. Email Data Structure

The email notification includes the following data:

```javascript
{
  vehicle: {
    vehicle_stock_id: "12345",
    make: "Toyota",
    model: "Camry",
    year: 2024,
    vin: "ABC123...",
    plate_no: "XYZ789",
    status: "active",
    // ... all other vehicle fields
  },
  mapped_data: {
    // The actual data sent to the external API
  },
  response: {
    status: "200" or "500",
    message: "Success or error message",
    endpoint: "https://external-api.com/endpoint",
    api_status: 200,
    api_data: { /* API response */ }
  },
  error: {
    message: "Error details if failed"
  },
  company: {
    name: "Company Name"
  },
  timestamp: "2025-11-07T10:30:00.000Z",
  vehicles_summary: {
    total: 1,
    successful: 1 or 0,
    failed: 0 or 1
  }
}
```

### 4. Email Configuration

Email notifications use the existing Email Workflow Configuration nodes:
- **Success Email Node**: Configured in the workflow builder for successful API pushes
- **Error Email Node**: Configured in the workflow builder for failed API pushes

Both nodes support:
- Gmail SMTP
- SendGrid
- Custom email templates with variable substitution
- Dynamic recipient configuration

### 5. Console Logging

The implementation maintains the existing console logging behavior:

**On Success:**
```
The details have been pushed successfully to the respective API endpoint: https://external-api.com/endpoint
Payload pushed to the API endpoint: { ... }
Sending success email for Vehicle Outbound workflow...
Success email sent successfully
```

**On Failure:**
```
API call failed: [error message]
Sending error email for Vehicle Outbound workflow...
Error email sent successfully
```

### 6. Template Variables Available

Email templates can use the following variables:

**Vehicle Information:**
- `{{vehicle.vehicle_stock_id}}`
- `{{vehicle.make}}`
- `{{vehicle.model}}`
- `{{vehicle.year}}`
- `{{vehicle.vin}}`
- `{{vehicle.plate_no}}`
- `{{vehicle.status}}`

**Response Information:**
- `{{response.status}}`
- `{{response.message}}`
- `{{response.endpoint}}`
- `{{response.api_status}}`

**Error Information:**
- `{{error.message}}`
- `{{error_section}}` (conditional - only shows if error exists)

**Company & Metadata:**
- `{{company.name}}`
- `{{timestamp}}`
- `{{vehicles_summary.total}}`
- `{{vehicles_summary.successful}}`
- `{{vehicles_summary.failed}}`

### 7. Workflow Configuration

To enable email notifications for Vehicle Outbound workflows:

1. **Create/Edit a Vehicle Outbound Workflow**
2. **Configure Target Schema Node**: Select schema type and trigger conditions
3. **Configure Export Fields Node**: Select which fields to export
4. **Configure Data Mapping Node**: Map internal fields to external field names
5. **Configure Authentication Node**: 
   - Set API endpoint URL
   - Enable/disable authentication
   - Configure authentication type (JWT, Standard, Static)
6. **Configure Condition Node**: Set response conditions (usually `response.status equals 200`)
7. **Configure Success Email Node**:
   - Select email service (Gmail/SendGrid)
   - Set recipient email
   - Configure subject and body templates
   - Use template variables for dynamic content
8. **Configure Error Email Node**:
   - Select email service (Gmail/SendGrid)
   - Set recipient email
   - Configure subject and body templates
   - Use template variables for error details
9. **Save and Activate** the workflow

### 8. Testing

To test the email notification feature:

1. **Create a test Vehicle Outbound workflow** with email configuration
2. **Update a vehicle** that matches the trigger conditions
3. **Verify console logs** show the success/error message
4. **Check email inbox** for the notification email
5. **Verify email content** includes correct vehicle and API response data

### 9. Error Handling

The implementation includes comprehensive error handling:
- Email sending errors are logged but don't block the workflow
- API call errors trigger error email notifications
- Missing email configuration is handled gracefully
- Invalid email templates are caught and logged

### 10. Compatibility

This implementation:
- ✅ Works with existing Vehicle Inbound workflows (no changes)
- ✅ Maintains all existing Vehicle Outbound functionality
- ✅ Preserves data mapping behavior
- ✅ Compatible with all authentication types
- ✅ Supports both Gmail and SendGrid email services
- ✅ Uses the same email utility functions as Vehicle Inbound

## Summary

The Vehicle Outbound workflow now has complete email notification support, matching the functionality of Vehicle Inbound workflows. When data is successfully pushed to an external API, a success email is sent. When the push fails, an error email is sent. This provides administrators with real-time notifications about the status of their outbound data integrations.
