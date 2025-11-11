# Vehicle Outbound Workflow Execution Tracking Implementation

## Overview
This implementation adds execution tracking and success rate calculation for Vehicle Outbound workflows, following the same pattern used in Vehicle Inbound workflows.

## Changes Made

### Backend Changes

#### 1. Updated `backend/src/controllers/workflow.controller.js`

**Added New Helper Function: `updateWorkflowExecutionStats`**
- Location: Before `sendOutboundWorkflowEmail` function
- Purpose: Updates workflow execution statistics after each outbound workflow execution
- Parameters:
  - `workflowId`: The ID of the workflow to update
  - `isSuccess`: Boolean indicating if the execution was successful
  - `errorMessage`: Optional error message if execution failed

**Functionality:**
```javascript
const updateWorkflowExecutionStats = async (workflowId, isSuccess, errorMessage = null) => {
  // Finds the workflow by ID
  // Increments total_executions counter
  // Increments successful_executions or failed_executions based on result
  // Updates last_execution timestamp
  // Updates last_execution_status ('success' or 'failed')
  // Updates last_execution_error if applicable
  // Saves the workflow with updated stats
}
```

**Modified Function: `makeOutboundAPICall`**
- Added call to `updateWorkflowExecutionStats` after successful API call
- Added call to `updateWorkflowExecutionStats` after failed API call
- This ensures stats are updated regardless of success or failure

**Updated Module Exports:**
- Added `updateWorkflowExecutionStats` to the module exports

## How It Works

### Vehicle Outbound Workflow Execution Flow

1. **Trigger Detection**: When a vehicle is created or updated, `checkAndTriggerOutboundWorkflows` is called
2. **Condition Check**: The workflow checks if the trigger condition is met (e.g., `status === 'active'`)
3. **Data Export**: If triggered, selected fields are exported from the vehicle data
4. **Data Mapping**: Fields are mapped from internal names to external API field names
5. **API Call**: `makeOutboundAPICall` sends the data to the external API endpoint
6. **Email Notification**: Success or error email is sent based on the result
7. **Stats Update**: `updateWorkflowExecutionStats` is called to update the workflow's execution statistics ✅ **NEW**

### Execution Statistics Tracked

The following statistics are now tracked for Vehicle Outbound workflows:

- **total_executions**: Total number of times the workflow has been executed
- **successful_executions**: Number of successful executions
- **failed_executions**: Number of failed executions
- **last_execution**: Timestamp of the last execution
- **last_execution_status**: Status of the last execution ('success' or 'failed')
- **last_execution_error**: Error message from the last failed execution (if any)

### Success Rate Calculation

The success rate can be calculated as:
```
Success Rate = (successful_executions / total_executions) * 100
```

This is the same calculation used for Vehicle Inbound workflows.

## Database Schema

The execution stats are stored in the `Workflow` model under the `execution_stats` field:

```javascript
execution_stats: {
  total_executions: Number,
  successful_executions: Number,
  failed_executions: Number,
  last_execution: Date,
  last_execution_status: String, // 'success', 'failed', 'pending', 'partial_success'
  last_execution_error: String
}
```

## Testing

### To Test the Implementation:

1. **Create a Vehicle Outbound Workflow**:
   - Set up a trigger condition (e.g., when `status` equals `'active'`)
   - Configure export fields
   - Set up data mapping
   - Configure API endpoint and authentication
   - Activate the workflow

2. **Trigger the Workflow**:
   - Create or update a vehicle that meets the trigger condition
   - The workflow should automatically execute

3. **Verify Execution Stats**:
   - Check the workflow's `execution_stats` in the database
   - Verify that `total_executions` has incremented
   - Verify that either `successful_executions` or `failed_executions` has incremented
   - Check `last_execution` timestamp
   - Check `last_execution_status`

4. **Check Console Logs**:
   - Look for: `"Workflow execution stats updated for workflow {id}: Total={x}, Success={y}, Failed={z}"`
   - This confirms the stats update was successful

## Comparison with Vehicle Inbound

### Vehicle Inbound Workflow:
- Executes when external API calls the workflow endpoint
- Creates `WorkflowExecution` log for detailed tracking
- Updates workflow `execution_stats` after processing
- Tracks multiple vehicles in a single execution

### Vehicle Outbound Workflow:
- Executes automatically when vehicle data changes
- Updates workflow `execution_stats` after each API call ✅ **NOW IMPLEMENTED**
- Tracks single vehicle per execution
- No separate `WorkflowExecution` log (could be added in future if needed)

## Benefits

1. **Consistent Tracking**: Both inbound and outbound workflows now track execution statistics
2. **Success Rate Monitoring**: Admins can monitor the success rate of outbound workflows
3. **Error Tracking**: Failed executions are tracked with error messages
4. **Performance Metrics**: Total executions provide insight into workflow activity
5. **Debugging**: Last execution status and error help with troubleshooting

## Future Enhancements

Potential improvements that could be added:

1. **WorkflowExecution Logs**: Create detailed execution logs for outbound workflows (similar to inbound)
2. **Execution History**: Store a history of all executions with timestamps
3. **Retry Logic**: Implement automatic retry for failed executions
4. **Alerting**: Send alerts when failure rate exceeds a threshold
5. **Dashboard Metrics**: Display execution stats in the workflow dashboard

## Notes

- The implementation does not affect existing Vehicle Inbound workflows
- No database migrations are required (the schema already supports these fields)
- The implementation is backward compatible
- Console logging provides visibility into the execution tracking process
