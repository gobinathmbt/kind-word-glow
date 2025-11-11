# Vehicle Outbound Execution Tracking - Test Guide

## Prerequisites
- Backend server running
- Database connected
- At least one active Vehicle Outbound workflow configured

## Test Scenario 1: Successful Execution

### Step 1: Check Initial Stats
```javascript
// In MongoDB or via API, check the workflow's current stats
db.workflows.findOne({ _id: ObjectId("your_workflow_id") }, { execution_stats: 1 })

// Expected initial state (for a new workflow):
{
  execution_stats: {
    total_executions: 0,
    successful_executions: 0,
    failed_executions: 0,
    last_execution: null,
    last_execution_status: null,
    last_execution_error: null
  }
}
```

### Step 2: Trigger the Workflow
```javascript
// Create or update a vehicle that meets the trigger condition
// For example, if trigger is: status === 'active'

// Via API:
PUT /api/vehicle/:id
{
  "status": "active",
  // ... other vehicle data
}

// Or via vehicle creation:
POST /api/vehicle/create-stock
{
  "status": "active",
  "make": "Toyota",
  "model": "Camry",
  // ... other required fields
}
```

### Step 3: Check Console Logs
Look for these log messages in the backend console:

```
Vehicle Outbound Trigger Activated:
{ vehicle_stock_id: 12345, make: 'Toyota', model: 'Camry', ... }

Mapped External System Fields:
{ stock_id: 12345, manufacturer: 'Toyota', car_model: 'Camry', ... }

The details have been pushed successfully to the respective API endpoint: https://api.example.com/vehicles

Payload pushed to the API endpoint: { ... }

Workflow execution stats updated for workflow 507f1f77bcf86cd799439011: Total=1, Success=1, Failed=0
```

### Step 4: Verify Updated Stats
```javascript
// Check the workflow stats again
db.workflows.findOne({ _id: ObjectId("your_workflow_id") }, { execution_stats: 1 })

// Expected state after successful execution:
{
  execution_stats: {
    total_executions: 1,
    successful_executions: 1,
    failed_executions: 0,
    last_execution: ISODate("2024-01-15T10:30:00.000Z"),
    last_execution_status: "success",
    last_execution_error: ""
  }
}
```

### Step 5: Calculate Success Rate
```javascript
// Success Rate = (successful_executions / total_executions) * 100
// In this case: (1 / 1) * 100 = 100%
```

## Test Scenario 2: Failed Execution

### Step 1: Simulate API Failure
- Temporarily change the API endpoint to an invalid URL
- Or stop the external API service
- Or configure invalid authentication credentials

### Step 2: Trigger the Workflow
```javascript
// Update a vehicle to trigger the workflow
PUT /api/vehicle/:id
{
  "status": "active",
  // ... other vehicle data
}
```

### Step 3: Check Console Logs
Look for error messages:

```
Vehicle Outbound Trigger Activated:
{ vehicle_stock_id: 12345, ... }

API call failed: connect ECONNREFUSED 127.0.0.1:3000

Workflow execution stats updated for workflow 507f1f77bcf86cd799439011: Total=2, Success=1, Failed=1
```

### Step 4: Verify Updated Stats
```javascript
// Check the workflow stats
db.workflows.findOne({ _id: ObjectId("your_workflow_id") }, { execution_stats: 1 })

// Expected state after failed execution:
{
  execution_stats: {
    total_executions: 2,
    successful_executions: 1,
    failed_executions: 1,
    last_execution: ISODate("2024-01-15T10:35:00.000Z"),
    last_execution_status: "failed",
    last_execution_error: "connect ECONNREFUSED 127.0.0.1:3000"
  }
}
```

### Step 5: Calculate Success Rate
```javascript
// Success Rate = (successful_executions / total_executions) * 100
// In this case: (1 / 2) * 100 = 50%
```

## Test Scenario 3: Multiple Executions

### Step 1: Trigger Multiple Times
```javascript
// Trigger the workflow 10 times by updating different vehicles
// or the same vehicle multiple times

for (let i = 0; i < 10; i++) {
  // Update vehicle
  PUT /api/vehicle/:id
  {
    "status": "active",
    "updated_at": new Date()
  }
  
  // Wait a bit between requests
  await sleep(1000);
}
```

### Step 2: Verify Cumulative Stats
```javascript
// Check the workflow stats
db.workflows.findOne({ _id: ObjectId("your_workflow_id") }, { execution_stats: 1 })

// Expected state (assuming all successful):
{
  execution_stats: {
    total_executions: 12,  // 2 from previous tests + 10 new
    successful_executions: 11,  // 1 from test 1 + 10 new
    failed_executions: 1,  // 1 from test 2
    last_execution: ISODate("2024-01-15T10:45:00.000Z"),
    last_execution_status: "success",
    last_execution_error: ""
  }
}
```

### Step 3: Calculate Final Success Rate
```javascript
// Success Rate = (successful_executions / total_executions) * 100
// In this case: (11 / 12) * 100 = 91.67%
```

## Test Scenario 4: Email Notifications

### Step 1: Configure Email Nodes
- Ensure Success Email node is configured
- Ensure Error Email node is configured

### Step 2: Trigger Successful Execution
```javascript
PUT /api/vehicle/:id
{
  "status": "active"
}
```

### Step 3: Check Email Logs
Look for console logs:

```
Sending success email for Vehicle Outbound workflow...
Success email sent successfully
```

### Step 4: Trigger Failed Execution
```javascript
// With invalid API endpoint
PUT /api/vehicle/:id
{
  "status": "active"
}
```

### Step 5: Check Email Logs
Look for console logs:

```
Sending error email for Vehicle Outbound workflow...
Error email sent successfully
```

## Verification Checklist

- [ ] `total_executions` increments after each execution
- [ ] `successful_executions` increments only after successful API calls
- [ ] `failed_executions` increments only after failed API calls
- [ ] `last_execution` timestamp updates after each execution
- [ ] `last_execution_status` reflects the actual execution result
- [ ] `last_execution_error` contains error message for failed executions
- [ ] `last_execution_error` is empty for successful executions
- [ ] Console logs show stats update confirmation
- [ ] Success rate calculation is accurate
- [ ] Email notifications are sent based on execution result
- [ ] Stats persist across server restarts
- [ ] Multiple workflows track stats independently

## Common Issues and Solutions

### Issue 1: Stats Not Updating
**Symptom**: Execution stats remain at 0 after triggering workflow

**Possible Causes**:
1. Workflow is not active (status !== 'active')
2. Trigger condition is not met
3. Workflow ID is incorrect

**Solution**:
- Check workflow status: `db.workflows.findOne({ _id: ObjectId("id") }, { status: 1 })`
- Verify trigger condition matches vehicle data
- Check console logs for "Vehicle Outbound Trigger Activated" message

### Issue 2: Only Failed Executions Tracked
**Symptom**: `failed_executions` increments but `successful_executions` stays at 0

**Possible Causes**:
1. API endpoint is incorrect or unreachable
2. Authentication credentials are invalid
3. External API is down

**Solution**:
- Verify API endpoint URL
- Check authentication configuration
- Test API endpoint manually with curl or Postman
- Check external API service status

### Issue 3: Stats Update But Email Not Sent
**Symptom**: Execution stats update correctly but no email is received

**Possible Causes**:
1. Email node not configured
2. SMTP settings incorrect
3. Email provider blocking emails

**Solution**:
- Verify email node configuration in workflow
- Check SMTP settings in company settings
- Check email provider logs
- Look for email error messages in console logs

## API Endpoints for Testing

### Get Workflow Stats
```
GET /api/workflows/:workflowId
```

Response includes `execution_stats`:
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Vehicle Outbound to External System",
    "execution_stats": {
      "total_executions": 12,
      "successful_executions": 11,
      "failed_executions": 1,
      "last_execution": "2024-01-15T10:45:00.000Z",
      "last_execution_status": "success",
      "last_execution_error": ""
    }
  }
}
```

### Get All Workflows with Stats
```
GET /api/workflows
```

### Get Workflow Statistics Summary
```
GET /api/workflows/stats
```

Response includes aggregated stats:
```json
{
  "success": true,
  "data": {
    "overview": {
      "total_workflows": 5,
      "active_workflows": 3,
      "total_executions": 150,
      "successful_executions": 145,
      "failed_executions": 5
    }
  }
}
```

## Performance Considerations

- Stats update is asynchronous and doesn't block the main workflow execution
- Failed stats updates are logged but don't cause the workflow to fail
- Stats are stored in the same document as the workflow (no additional queries needed)
- Indexes on `company_id` and `workflow_type` ensure fast queries

## Monitoring Recommendations

1. **Set up alerts** for workflows with high failure rates (e.g., > 10%)
2. **Monitor execution frequency** to detect unusual patterns
3. **Track error messages** to identify common failure causes
4. **Review stats regularly** to ensure workflows are functioning correctly
5. **Compare inbound vs outbound** execution rates for consistency

## Next Steps

After successful testing:
1. Document the success rate calculation in user documentation
2. Create dashboard widgets to display execution stats
3. Set up automated alerts for failed executions
4. Consider implementing retry logic for failed executions
5. Add execution history tracking for detailed analysis
