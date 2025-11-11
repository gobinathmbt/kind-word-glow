# Vehicle Outbound API Authentication Implementation

## Overview
This implementation adds API endpoint configuration and authentication functionality to the Vehicle Outbound workflow type, enabling automatic data push to external systems when trigger conditions are met.

## Features Implemented

### 1. API Endpoint Configuration
- **Input Field**: Users can enter the API endpoint URL in the Authentication Node
- **HTTP Method**: Fixed as POST (non-editable/disabled as requested)
- **Dynamic Data Support**: Handles varying API endpoints and data structures

### 2. Authentication Toggle
- **Toggle Button**: Enable/disable authentication for the API endpoint
- **When Disabled**: No authentication headers are sent with the API request
- **When Enabled**: Authentication input fields appear based on selected type

### 3. Authentication Types Supported
- **JWT Token**: Bearer token authentication
- **Standard Authentication**: API Key + API Secret headers (x-api-key, x-api-secret)
- **Static Authentication**: Static bearer token

### 4. Console Logging Implementation
- **Mapped External System Fields**: Console logs the field data after applying data mapping transformations
- **Example Output**:
  ```javascript
  Vehicle Outbound Trigger Activated:
  {
    vehicle_stock_id: 100022,
    company_id: new ObjectId("68a405a06c25cd6de3e56198"),
    vehicle_type: 'tradein',
    // ... other selected fields
  }

  Mapped External System Fields:
  {
    vehicle_id: 100022,
    company_id: new ObjectId("68a405a06c25cd6de3e56198"),
    vehicle_type: 'tradein',
    vehicle_image: 'https://via.placeholder.com/400x300',
    vin: 'sdsad',
    plate_no: 'asdasd',
    make: 'Alfa Romeo',
    model: '159',
    year: 2012,
    chassis_no: 'sdsad',
    dealership_id: '68d12a4c8f236dc2a46393a2'
  }
  ```

### 5. API Data Push
- **Automatic Trigger**: When trigger conditions are met, data is automatically sent to the configured API endpoint
- **POST Request**: Uses HTTP POST method as specified
- **JSON Payload**: Sends the mapped external system fields as JSON
- **Success Logging**: Displays success message with API endpoint after successful push

## Implementation Details

### Frontend Changes

#### AuthenticationNode.tsx
- **Enhanced UI**: Added API endpoint input field for Vehicle Outbound workflows
- **Authentication Toggle**: Added switch to enable/disable authentication
- **Conditional Fields**: Authentication input fields only appear when toggle is enabled
- **HTTP Method Display**: Shows POST method as disabled/non-editable
- **Workflow-Aware**: Different behavior for Vehicle Outbound vs other workflow types

### Backend Changes

#### workflow.controller.js
- **Enhanced `checkAndTriggerOutboundWorkflows` function**:
  - Added API endpoint detection from Authentication Node
  - Implemented `makeOutboundAPICall` helper function
  - Added proper authentication header handling
  - Implemented success/error logging

#### makeOutboundAPICall Function
```javascript
const makeOutboundAPICall = async (authConfig, mappedData) => {
  // Prepares headers based on authentication configuration
  // Makes POST request to external API endpoint
  // Handles authentication types: JWT, Standard, Static
  // Logs success message with API endpoint
  // Handles errors gracefully
}
```

## Workflow Execution Flow

1. **Vehicle Operation**: Any vehicle create/update operation occurs
2. **Trigger Check**: `checkAndTriggerOutboundWorkflows` is automatically called
3. **Condition Evaluation**: Target Schema trigger conditions are checked
4. **Field Selection**: Export Fields configuration determines which fields to include
5. **Data Mapping**: Data Mapping Node transforms internal field names to external field names
6. **Console Logging**: Mapped external system fields are logged to console
7. **API Configuration Check**: Authentication Node configuration is retrieved
8. **API Call**: If endpoint is configured, POST request is made with mapped data
9. **Success Logging**: Success message is logged with API endpoint information

## Console Output Examples

### Trigger Activation
```
Vehicle Outbound Trigger Activated:
{
  vehicle_stock_id: 100022,
  company_id: new ObjectId("68a405a06c25cd6de3e56198"),
  vehicle_type: 'tradein',
  make: 'Alfa Romeo',
  model: '159',
  year: 2012
}
```

### Mapped External Fields
```
Mapped External System Fields:
{
  vehicle_id: 100022,
  company_id: new ObjectId("68a405a06c25cd6de3e56198"),
  vehicle_type: 'tradein',
  vehicle_image: 'https://via.placeholder.com/400x300',
  vin: 'sdsad',
  plate_no: 'asdasd',
  make: 'Alfa Romeo',
  model: '159',
  year: 2012,
  chassis_no: 'sdsad',
  dealership_id: '68d12a4c8f236dc2a46393a2'
}
```

### API Success
```
The details have been pushed successfully to the respective API endpoint: http://localhost:3000/api/users
```

## Configuration Requirements

### Authentication Node Configuration
1. **API Endpoint**: Enter the external system's API endpoint URL
2. **HTTP Method**: POST (automatically set, non-editable)
3. **Enable Authentication**: Toggle on/off
4. **Authentication Type**: Select JWT Token, Standard, or Static (if authentication enabled)
5. **Credentials**: Configure appropriate credentials based on authentication type

### Target Schema Node
- **Schema Type**: Select vehicle, master_vehicle, or advertise_vehicle
- **Trigger Field**: Choose field to monitor for changes
- **Trigger Operator**: Set condition operator (equals, not_equals, etc.)
- **Trigger Value**: Set the value that activates the trigger

### Export Fields Node
- **Selected Fields**: Choose which vehicle fields to include in the API payload
- **Field Selection**: Only selected fields will be mapped and sent to external API

### Data Mapping Node
- **Field Mappings**: Map internal vehicle field names to external system field names
- **Mapping Direction**: For outbound workflows, maps internal → external field names

## Error Handling

- **API Call Failures**: Logged to console with error details
- **Authentication Errors**: Handled gracefully with appropriate error messages
- **Network Timeouts**: 30-second timeout configured for API calls
- **Missing Configuration**: Workflow continues without API call if endpoint not configured

## Security Considerations

- **Authentication Headers**: Properly formatted based on authentication type
- **Token Security**: JWT and static tokens sent as Bearer tokens
- **API Credentials**: Standard authentication uses separate API key and secret headers
- **HTTPS Support**: Supports both HTTP and HTTPS endpoints

## Testing

### Test Scenarios
1. **No Authentication**: API endpoint with authentication disabled
2. **JWT Authentication**: API endpoint with JWT token authentication
3. **Standard Authentication**: API endpoint with API key/secret authentication
4. **Static Authentication**: API endpoint with static token authentication
5. **Dynamic Data**: Different vehicle data structures and field mappings
6. **Error Handling**: Invalid endpoints, network failures, authentication failures

### Verification Steps
1. Configure Vehicle Outbound workflow with all nodes
2. Set trigger condition (e.g., vehicle_type equals 'tradein')
3. Configure API endpoint and authentication in Authentication Node
4. Select fields in Export Fields Node
5. Map fields in Data Mapping Node
6. Create/update a vehicle that meets trigger condition
7. Check console logs for mapped external system fields
8. Verify API call success message with endpoint information

## Compatibility

- **Existing Workflows**: Does not affect existing Vehicle Inbound workflows
- **Vehicle Operations**: Works with all vehicle types (inspection, tradein, master, advertisement)
- **Data Mapping**: Compatible with existing data mapping functionality
- **Authentication**: Backward compatible with existing authentication configurations

## Notes

- Console messages appear only in the backend as requested
- No extra console logs are added elsewhere in the system
- Success console message appears inside the controller after API push is complete
- Implementation handles dynamic data structures as required
- API endpoint and console data can vary as the system supports dynamic configurations