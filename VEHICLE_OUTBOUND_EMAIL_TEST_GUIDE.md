# Vehicle Outbound Email Notification - Test Guide

## Prerequisites

Before testing, ensure you have:
1. A working Vehicle Outbound workflow configured
2. Email service configured (Gmail or SendGrid)
3. A test vehicle in the system
4. An external API endpoint to receive data (or use a mock service like webhook.site)

## Test Scenario 1: Success Email

### Setup
1. **Create a Vehicle Outbound Workflow**
   - Go to Workflows → Create New Workflow
   - Select "Vehicle Outbound" as workflow type
   - Name it "Test Outbound Success Email"

2. **Configure Target Schema Node**
   - Schema Type: `vehicle` (or `master_vehicle`)
   - Trigger Field: `is_pricing_ready`
   - Trigger Operator: `equals`
   - Trigger Value: `true`

3. **Configure Export Fields Node**
   - Select fields to export (e.g., vehicle_stock_id, make, model, year, vin)

4. **Configure Data Mapping Node**
   - Map internal fields to external field names
   - Example: `vehicle_stock_id` → `vehicle_id`

5. **Configure Authentication Node**
   - API Endpoint: `https://webhook.site/your-unique-url` (or your test endpoint)
   - HTTP Method: POST (fixed)
   - Enable Authentication: Toggle ON or OFF based on your test
   - If enabled, configure authentication type

6. **Configure Condition Node**
   - Field: `response.status`
   - Operator: `equals`
   - Value: `200`

7. **Configure Success Email Node**
   - Service: Gmail (or SendGrid)
   - To Email: your-test-email@example.com
   - Subject: `✅ Vehicle Outbound Success - {{vehicle.vehicle_stock_id}}`
   - Body Template:
   ```html
   <h2>Vehicle Data Successfully Pushed</h2>
   <p>The following vehicle data has been successfully pushed to the external API:</p>
   
   <h3>Vehicle Details:</h3>
   <ul>
     <li><strong>Stock ID:</strong> {{vehicle.vehicle_stock_id}}</li>
     <li><strong>Make:</strong> {{vehicle.make}}</li>
     <li><strong>Model:</strong> {{vehicle.model}}</li>
     <li><strong>Year:</strong> {{vehicle.year}}</li>
     <li><strong>VIN:</strong> {{vehicle.vin}}</li>
   </ul>
   
   <h3>API Response:</h3>
   <ul>
     <li><strong>Endpoint:</strong> {{response.endpoint}}</li>
     <li><strong>Status:</strong> {{response.status}}</li>
     <li><strong>Message:</strong> {{response.message}}</li>
   </ul>
   
   <p><small>Timestamp: {{timestamp}}</small></p>
   ```

8. **Configure Error Email Node**
   - Service: Gmail (or SendGrid)
   - To Email: your-test-email@example.com
   - Subject: `❌ Vehicle Outbound Error - {{vehicle.vehicle_stock_id}}`
   - Body Template:
   ```html
   <h2>Vehicle Data Push Failed</h2>
   <p>Failed to push vehicle data to the external API:</p>
   
   <h3>Vehicle Details:</h3>
   <ul>
     <li><strong>Stock ID:</strong> {{vehicle.vehicle_stock_id}}</li>
     <li><strong>Make:</strong> {{vehicle.make}}</li>
     <li><strong>Model:</strong> {{vehicle.model}}</li>
   </ul>
   
   <h3>Error Details:</h3>
   <p style="color: red;"><strong>Error:</strong> {{error.message}}</p>
   
   <h3>API Information:</h3>
   <ul>
     <li><strong>Endpoint:</strong> {{response.endpoint}}</li>
     <li><strong>Status:</strong> {{response.status}}</li>
   </ul>
   
   <p><small>Timestamp: {{timestamp}}</small></p>
   ```

9. **Save and Activate** the workflow

### Execute Test
1. **Navigate to a test vehicle** (e.g., Pricing Ready page)
2. **Toggle the pricing_ready status to `true`**
3. **Save the vehicle**

### Expected Results
1. **Console Output:**
   ```
   Vehicle Outbound Trigger Activated:
   { vehicle_stock_id: 12345, make: 'Toyota', ... }
   Mapped External System Fields:
   { vehicle_id: 12345, make: 'Toyota', ... }
   The details have been pushed successfully to the respective API endpoint: https://webhook.site/...
   Payload pushed to the API endpoint: { ... }
   Sending success email for Vehicle Outbound workflow...
   Success email sent successfully
   ```

2. **Email Received:**
   - Check your inbox for the success email
   - Verify all template variables are replaced correctly
   - Verify vehicle details are accurate

3. **External API:**
   - Check webhook.site (or your endpoint) to verify data was received
   - Verify the payload matches the mapped fields

## Test Scenario 2: Error Email

### Setup
Use the same workflow from Test Scenario 1, but modify:

1. **Configure Authentication Node**
   - API Endpoint: `https://invalid-endpoint-that-does-not-exist.com/api`
   - This will cause the API call to fail

2. **Save the workflow**

### Execute Test
1. **Navigate to a test vehicle**
2. **Toggle the pricing_ready status** (change it to trigger the workflow)
3. **Save the vehicle**

### Expected Results
1. **Console Output:**
   ```
   Vehicle Outbound Trigger Activated:
   { vehicle_stock_id: 12345, make: 'Toyota', ... }
   Mapped External System Fields:
   { vehicle_id: 12345, make: 'Toyota', ... }
   API call failed: getaddrinfo ENOTFOUND invalid-endpoint-that-does-not-exist.com
   Sending error email for Vehicle Outbound workflow...
   Error email sent successfully
   Error making outbound API call: Error: getaddrinfo ENOTFOUND...
   ```

2. **Email Received:**
   - Check your inbox for the error email
   - Verify error message is displayed
   - Verify vehicle details are accurate

## Test Scenario 3: Multiple Vehicle Updates

### Setup
Use the same workflow from Test Scenario 1 (with valid endpoint)

### Execute Test
1. **Update multiple vehicles** that match the trigger condition
2. **Each vehicle update should trigger a separate email**

### Expected Results
- One email per vehicle update
- Each email contains the correct vehicle information
- All emails are sent successfully

## Verification Checklist

- [ ] Success email is sent when API call succeeds
- [ ] Error email is sent when API call fails
- [ ] Console logs show the correct messages
- [ ] Email template variables are replaced correctly
- [ ] Vehicle data in email matches the actual vehicle
- [ ] API endpoint receives the correct payload
- [ ] Mapped fields are correctly transformed
- [ ] Authentication headers are included (if enabled)
- [ ] Multiple vehicle updates trigger multiple emails
- [ ] Email service (Gmail/SendGrid) is working correctly

## Troubleshooting

### Email Not Received
1. Check spam/junk folder
2. Verify email service configuration (Gmail/SendGrid credentials)
3. Check console logs for email sending errors
4. Verify email node configuration (to_email, service)

### API Call Fails
1. Verify API endpoint URL is correct
2. Check authentication configuration
3. Verify external API is accessible
4. Check console logs for detailed error messages

### Workflow Not Triggered
1. Verify workflow status is "active"
2. Check trigger condition configuration
3. Verify the field being updated matches the trigger field
4. Check console logs for trigger activation messages

### Template Variables Not Replaced
1. Verify variable names match the available data structure
2. Check for typos in variable names (case-sensitive)
3. Ensure the data exists in the vehicle object
4. Review email template syntax

## Additional Notes

- Email notifications are sent asynchronously and don't block the workflow
- Failed email sending is logged but doesn't affect the API call
- Each vehicle update triggers a separate workflow execution
- Email data includes both the original vehicle data and the mapped data sent to the API
- The implementation is compatible with all existing Vehicle Inbound workflows
