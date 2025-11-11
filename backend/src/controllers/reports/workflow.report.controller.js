/**
 * Workflow Report Controller
 * Handles all workflow-related analytics and reporting endpoints
 * Provides comprehensive workflow execution metrics, type distribution, and success rate analysis
 */

const Workflow = require('../../models/Workflow');
const WorkflowExecution = require('../../models/WorkflowExecution');
const { 
  getDealershipFilter, 
  getDateFilter, 
  formatReportResponse, 
  handleReportError,
  buildBasePipeline 
} = require('../../utils/reportHelpers');

/**
 * Get Workflow Execution Metrics
 * Analyzes workflow execution statistics including success rates, duration, and performance
 * 
 * @route GET /api/company/reports/workflow/execution-metrics
 * @access Private (company_super_admin, company_admin)
 */
const getWorkflowExecutionMetrics = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dateFilter = getDateFilter(req.query);

    // 1. Get all workflows for the company
    const workflows = await Workflow.find({ company_id })
      .populate('created_by', 'first_name last_name email')
      .populate('last_modified_by', 'first_name last_name email')
      .lean();

    // 2. Build execution query
    let executionQuery = { company_id };
    if (dateFilter.created_at) {
      executionQuery.created_at = dateFilter.created_at;
    }

    // 3. Get all workflow executions
    const executions = await WorkflowExecution.find(executionQuery)
      .populate('workflow_id', 'name workflow_type')
      .lean();

    // 4. Analyze execution metrics for each workflow
    const workflowMetrics = workflows.map(workflow => {
      const workflowExecutions = executions.filter(
        exec => exec.workflow_id && exec.workflow_id._id.toString() === workflow._id.toString()
      );

      const totalExecutions = workflowExecutions.length;
      const successfulExecutions = workflowExecutions.filter(exec => exec.execution_status === 'success').length;
      const partialSuccessExecutions = workflowExecutions.filter(exec => exec.execution_status === 'partial_success').length;
      const failedExecutions = workflowExecutions.filter(exec => exec.execution_status === 'failed').length;

      // Calculate success rate
      const successRate = totalExecutions > 0 
        ? Math.round((successfulExecutions / totalExecutions) * 100) 
        : 0;

      // Calculate partial success rate
      const partialSuccessRate = totalExecutions > 0
        ? Math.round((partialSuccessExecutions / totalExecutions) * 100)
        : 0;

      // Calculate failure rate
      const failureRate = totalExecutions > 0
        ? Math.round((failedExecutions / totalExecutions) * 100)
        : 0;

      // Calculate average execution duration
      const executionsWithDuration = workflowExecutions.filter(exec => exec.execution_duration_ms);
      const avgExecutionDuration = executionsWithDuration.length > 0
        ? Math.round(
            executionsWithDuration.reduce((sum, exec) => sum + exec.execution_duration_ms, 0) / 
            executionsWithDuration.length
          )
        : 0;

      // Calculate min and max execution duration
      const executionDurations = executionsWithDuration.map(exec => exec.execution_duration_ms);
      const minExecutionDuration = executionDurations.length > 0 ? Math.min(...executionDurations) : 0;
      const maxExecutionDuration = executionDurations.length > 0 ? Math.max(...executionDurations) : 0;

      // Calculate total vehicles processed
      const totalVehiclesProcessed = workflowExecutions.reduce((sum, exec) => sum + (exec.total_vehicles || 0), 0);
      const totalVehiclesSuccessful = workflowExecutions.reduce((sum, exec) => sum + (exec.successful_vehicles || 0), 0);
      const totalVehiclesFailed = workflowExecutions.reduce((sum, exec) => sum + (exec.failed_vehicles || 0), 0);

      // Calculate vehicle success rate
      const vehicleSuccessRate = totalVehiclesProcessed > 0
        ? Math.round((totalVehiclesSuccessful / totalVehiclesProcessed) * 100)
        : 0;

      // Calculate database operations
      const totalVehiclesCreated = workflowExecutions.reduce(
        (sum, exec) => sum + (exec.database_changes?.vehicles_created || 0), 0
      );
      const totalVehiclesUpdated = workflowExecutions.reduce(
        (sum, exec) => sum + (exec.database_changes?.vehicles_updated || 0), 0
      );

      // Get recent executions (last 10)
      const recentExecutions = workflowExecutions
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 10)
        .map(exec => ({
          executionId: exec._id,
          status: exec.execution_status,
          startedAt: exec.execution_started_at,
          completedAt: exec.execution_completed_at,
          duration: exec.execution_duration_ms,
          totalVehicles: exec.total_vehicles,
          successfulVehicles: exec.successful_vehicles,
          failedVehicles: exec.failed_vehicles,
          errorMessage: exec.error_message
        }));

      // Calculate execution frequency (executions per day)
      const oldestExecution = workflowExecutions.length > 0
        ? new Date(Math.min(...workflowExecutions.map(exec => new Date(exec.created_at))))
        : null;
      const daysSinceFirstExecution = oldestExecution
        ? Math.max(1, Math.ceil((new Date() - oldestExecution) / (1000 * 60 * 60 * 24)))
        : 0;
      const executionsPerDay = daysSinceFirstExecution > 0
        ? (totalExecutions / daysSinceFirstExecution).toFixed(2)
        : 0;

      // Determine performance rating
      let performanceRating;
      if (successRate >= 95 && avgExecutionDuration < 5000) {
        performanceRating = 'Excellent';
      } else if (successRate >= 80 && avgExecutionDuration < 10000) {
        performanceRating = 'Good';
      } else if (successRate >= 60 && avgExecutionDuration < 20000) {
        performanceRating = 'Fair';
      } else if (successRate >= 40) {
        performanceRating = 'Poor';
      } else {
        performanceRating = 'Very Poor';
      }

      return {
        workflowId: workflow._id,
        name: workflow.name,
        description: workflow.description,
        workflowType: workflow.workflow_type,
        status: workflow.status,
        createdAt: workflow.created_at,
        updatedAt: workflow.updated_at,
        createdBy: workflow.created_by ? {
          name: `${workflow.created_by.first_name} ${workflow.created_by.last_name}`,
          email: workflow.created_by.email
        } : null,
        lastModifiedBy: workflow.last_modified_by ? {
          name: `${workflow.last_modified_by.first_name} ${workflow.last_modified_by.last_name}`,
          email: workflow.last_modified_by.email
        } : null,
        executionMetrics: {
          totalExecutions,
          successfulExecutions,
          partialSuccessExecutions,
          failedExecutions,
          successRate,
          partialSuccessRate,
          failureRate,
          avgExecutionDuration,
          minExecutionDuration,
          maxExecutionDuration,
          totalVehiclesProcessed,
          totalVehiclesSuccessful,
          totalVehiclesFailed,
          vehicleSuccessRate,
          totalVehiclesCreated,
          totalVehiclesUpdated,
          executionsPerDay: parseFloat(executionsPerDay),
          performanceRating
        },
        recentExecutions,
        lastExecution: workflow.execution_stats?.last_execution || null,
        lastExecutionStatus: workflow.execution_stats?.last_execution_status || null
      };
    });

    // Sort by total executions descending
    workflowMetrics.sort((a, b) => b.executionMetrics.totalExecutions - a.executionMetrics.totalExecutions);

    // 5. Calculate overall statistics
    const totalWorkflows = workflows.length;
    const activeWorkflows = workflows.filter(w => w.status === 'active').length;
    const inactiveWorkflows = workflows.filter(w => w.status === 'inactive').length;
    const draftWorkflows = workflows.filter(w => w.status === 'draft').length;

    const totalExecutionsAll = executions.length;
    const successfulExecutionsAll = executions.filter(exec => exec.execution_status === 'success').length;
    const partialSuccessExecutionsAll = executions.filter(exec => exec.execution_status === 'partial_success').length;
    const failedExecutionsAll = executions.filter(exec => exec.execution_status === 'failed').length;

    const overallSuccessRate = totalExecutionsAll > 0
      ? Math.round((successfulExecutionsAll / totalExecutionsAll) * 100)
      : 0;

    const overallFailureRate = totalExecutionsAll > 0
      ? Math.round((failedExecutionsAll / totalExecutionsAll) * 100)
      : 0;

    // Calculate overall average execution duration
    const allExecutionsWithDuration = executions.filter(exec => exec.execution_duration_ms);
    const overallAvgExecutionDuration = allExecutionsWithDuration.length > 0
      ? Math.round(
          allExecutionsWithDuration.reduce((sum, exec) => sum + exec.execution_duration_ms, 0) / 
          allExecutionsWithDuration.length
        )
      : 0;

    // Calculate total vehicles processed across all workflows
    const totalVehiclesProcessedAll = executions.reduce((sum, exec) => sum + (exec.total_vehicles || 0), 0);
    const totalVehiclesSuccessfulAll = executions.reduce((sum, exec) => sum + (exec.successful_vehicles || 0), 0);
    const totalVehiclesFailedAll = executions.reduce((sum, exec) => sum + (exec.failed_vehicles || 0), 0);

    // 6. Execution timeline (daily aggregation)
    const executionTimeline = {};
    executions.forEach(exec => {
      const date = new Date(exec.created_at).toISOString().split('T')[0]; // YYYY-MM-DD
      if (!executionTimeline[date]) {
        executionTimeline[date] = {
          date,
          totalExecutions: 0,
          successfulExecutions: 0,
          failedExecutions: 0,
          partialSuccessExecutions: 0
        };
      }
      executionTimeline[date].totalExecutions++;
      if (exec.execution_status === 'success') {
        executionTimeline[date].successfulExecutions++;
      } else if (exec.execution_status === 'failed') {
        executionTimeline[date].failedExecutions++;
      } else if (exec.execution_status === 'partial_success') {
        executionTimeline[date].partialSuccessExecutions++;
      }
    });

    const executionTimelineArray = Object.values(executionTimeline).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

    // 7. Top performing workflows
    const topPerformingWorkflows = workflowMetrics
      .filter(w => w.executionMetrics.totalExecutions > 0)
      .sort((a, b) => b.executionMetrics.successRate - a.executionMetrics.successRate)
      .slice(0, 10)
      .map(w => ({
        id: w.workflowId,
        name: w.name,
        workflowType: w.workflowType,
        successRate: w.executionMetrics.successRate,
        totalExecutions: w.executionMetrics.totalExecutions,
        avgDuration: w.executionMetrics.avgExecutionDuration,
        performanceRating: w.executionMetrics.performanceRating
      }));

    // 8. Underperforming workflows
    const underperformingWorkflows = workflowMetrics
      .filter(w => w.executionMetrics.totalExecutions > 0 && w.executionMetrics.successRate < 60)
      .map(w => ({
        id: w.workflowId,
        name: w.name,
        workflowType: w.workflowType,
        successRate: w.executionMetrics.successRate,
        failureRate: w.executionMetrics.failureRate,
        totalExecutions: w.executionMetrics.totalExecutions,
        performanceRating: w.executionMetrics.performanceRating
      }));

    // 9. Workflows without executions
    const workflowsWithoutExecutions = workflowMetrics
      .filter(w => w.executionMetrics.totalExecutions === 0)
      .map(w => ({
        id: w.workflowId,
        name: w.name,
        workflowType: w.workflowType,
        status: w.status,
        createdAt: w.createdAt
      }));

    res.json(formatReportResponse({
      workflows: workflowMetrics,
      overallStatistics: {
        totalWorkflows,
        activeWorkflows,
        inactiveWorkflows,
        draftWorkflows,
        totalExecutions: totalExecutionsAll,
        successfulExecutions: successfulExecutionsAll,
        partialSuccessExecutions: partialSuccessExecutionsAll,
        failedExecutions: failedExecutionsAll,
        overallSuccessRate,
        overallFailureRate,
        overallAvgExecutionDuration,
        totalVehiclesProcessed: totalVehiclesProcessedAll,
        totalVehiclesSuccessful: totalVehiclesSuccessfulAll,
        totalVehiclesFailed: totalVehiclesFailedAll
      },
      executionTimeline: executionTimelineArray,
      topPerformingWorkflows,
      underperformingWorkflows,
      workflowsWithoutExecutions
    }, {
      reportType: 'workflow-execution-metrics',
      filters: {
        dateRange: dateFilter
      }
    }));

  } catch (error) {
    return handleReportError(error, res, 'Workflow Execution Metrics');
  }
};

/**
 * Get Workflow Type Distribution
 * Analyzes workflow distribution by type and provides usage patterns
 * 
 * @route GET /api/company/reports/workflow/type-distribution
 * @access Private (company_super_admin, company_admin)
 */
const getWorkflowTypeDistribution = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dateFilter = getDateFilter(req.query);

    // 1. Get all workflows for the company
    const workflows = await Workflow.find({ company_id })
      .populate('created_by', 'first_name last_name email')
      .lean();

    // 2. Build execution query
    let executionQuery = { company_id };
    if (dateFilter.created_at) {
      executionQuery.created_at = dateFilter.created_at;
    }

    // 3. Get all workflow executions
    const executions = await WorkflowExecution.find(executionQuery)
      .populate('workflow_id', 'name workflow_type')
      .lean();

    // 4. Analyze distribution by workflow type
    const workflowTypes = ['vehicle_inbound', 'vehicle_property_trigger', 'email_automation'];
    
    const typeDistribution = workflowTypes.map(type => {
      const workflowsOfType = workflows.filter(w => w.workflow_type === type);
      const totalWorkflows = workflowsOfType.length;
      const activeWorkflows = workflowsOfType.filter(w => w.status === 'active').length;
      const inactiveWorkflows = workflowsOfType.filter(w => w.status === 'inactive').length;
      const draftWorkflows = workflowsOfType.filter(w => w.status === 'draft').length;

      // Get executions for this workflow type
      const executionsOfType = executions.filter(exec => 
        exec.workflow_id && exec.workflow_id.workflow_type === type
      );

      const totalExecutions = executionsOfType.length;
      const successfulExecutions = executionsOfType.filter(exec => exec.execution_status === 'success').length;
      const partialSuccessExecutions = executionsOfType.filter(exec => exec.execution_status === 'partial_success').length;
      const failedExecutions = executionsOfType.filter(exec => exec.execution_status === 'failed').length;

      const successRate = totalExecutions > 0
        ? Math.round((successfulExecutions / totalExecutions) * 100)
        : 0;

      // Calculate average execution duration for this type
      const executionsWithDuration = executionsOfType.filter(exec => exec.execution_duration_ms);
      const avgExecutionDuration = executionsWithDuration.length > 0
        ? Math.round(
            executionsWithDuration.reduce((sum, exec) => sum + exec.execution_duration_ms, 0) / 
            executionsWithDuration.length
          )
        : 0;

      // Calculate total vehicles processed for this type
      const totalVehiclesProcessed = executionsOfType.reduce((sum, exec) => sum + (exec.total_vehicles || 0), 0);
      const totalVehiclesSuccessful = executionsOfType.reduce((sum, exec) => sum + (exec.successful_vehicles || 0), 0);
      const totalVehiclesFailed = executionsOfType.reduce((sum, exec) => sum + (exec.failed_vehicles || 0), 0);

      // Calculate database operations for this type
      const totalVehiclesCreated = executionsOfType.reduce(
        (sum, exec) => sum + (exec.database_changes?.vehicles_created || 0), 0
      );
      const totalVehiclesUpdated = executionsOfType.reduce(
        (sum, exec) => sum + (exec.database_changes?.vehicles_updated || 0), 0
      );

      // Get workflow list for this type
      const workflowList = workflowsOfType.map(w => ({
        id: w._id,
        name: w.name,
        status: w.status,
        createdAt: w.created_at,
        totalExecutions: executions.filter(exec => 
          exec.workflow_id && exec.workflow_id._id.toString() === w._id.toString()
        ).length
      }));

      // Calculate usage percentage
      const usagePercentage = workflows.length > 0
        ? Math.round((totalWorkflows / workflows.length) * 100)
        : 0;

      // Calculate execution percentage
      const executionPercentage = executions.length > 0
        ? Math.round((totalExecutions / executions.length) * 100)
        : 0;

      return {
        workflowType: type,
        typeName: type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        totalWorkflows,
        activeWorkflows,
        inactiveWorkflows,
        draftWorkflows,
        usagePercentage,
        executionMetrics: {
          totalExecutions,
          successfulExecutions,
          partialSuccessExecutions,
          failedExecutions,
          successRate,
          avgExecutionDuration,
          executionPercentage,
          totalVehiclesProcessed,
          totalVehiclesSuccessful,
          totalVehiclesFailed,
          totalVehiclesCreated,
          totalVehiclesUpdated
        },
        workflows: workflowList
      };
    });

    // Sort by total workflows descending
    typeDistribution.sort((a, b) => b.totalWorkflows - a.totalWorkflows);

    // 5. Calculate overall statistics
    const totalWorkflows = workflows.length;
    const totalExecutions = executions.length;

    // 6. Most popular workflow type
    const mostPopularType = typeDistribution.reduce((prev, current) => 
      (current.totalWorkflows > prev.totalWorkflows) ? current : prev
    , typeDistribution[0] || null);

    // 7. Most executed workflow type
    const mostExecutedType = typeDistribution.reduce((prev, current) => 
      (current.executionMetrics.totalExecutions > prev.executionMetrics.totalExecutions) ? current : prev
    , typeDistribution[0] || null);

    // 8. Best performing workflow type (by success rate)
    const bestPerformingType = typeDistribution
      .filter(t => t.executionMetrics.totalExecutions > 0)
      .reduce((prev, current) => 
        (current.executionMetrics.successRate > prev.executionMetrics.successRate) ? current : prev
      , typeDistribution.find(t => t.executionMetrics.totalExecutions > 0) || null);

    // 9. Workflow type creation timeline
    const typeCreationTimeline = {};
    workflows.forEach(workflow => {
      const monthYear = new Date(workflow.created_at).toISOString().substring(0, 7); // YYYY-MM
      if (!typeCreationTimeline[monthYear]) {
        typeCreationTimeline[monthYear] = {
          month: monthYear,
          vehicle_inbound: 0,
          vehicle_property_trigger: 0,
          email_automation: 0
        };
      }
      typeCreationTimeline[monthYear][workflow.workflow_type]++;
    });

    const typeCreationTimelineArray = Object.values(typeCreationTimeline).sort((a, b) => 
      a.month.localeCompare(b.month)
    );

    // 10. Execution distribution by type over time
    const typeExecutionTimeline = {};
    executions.forEach(exec => {
      if (exec.workflow_id && exec.workflow_id.workflow_type) {
        const date = new Date(exec.created_at).toISOString().split('T')[0]; // YYYY-MM-DD
        if (!typeExecutionTimeline[date]) {
          typeExecutionTimeline[date] = {
            date,
            vehicle_inbound: 0,
            vehicle_property_trigger: 0,
            email_automation: 0
          };
        }
        typeExecutionTimeline[date][exec.workflow_id.workflow_type]++;
      }
    });

    const typeExecutionTimelineArray = Object.values(typeExecutionTimeline).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

    res.json(formatReportResponse({
      typeDistribution,
      overallStatistics: {
        totalWorkflows,
        totalExecutions,
        mostPopularType: mostPopularType ? {
          type: mostPopularType.workflowType,
          typeName: mostPopularType.typeName,
          count: mostPopularType.totalWorkflows
        } : null,
        mostExecutedType: mostExecutedType ? {
          type: mostExecutedType.workflowType,
          typeName: mostExecutedType.typeName,
          executions: mostExecutedType.executionMetrics.totalExecutions
        } : null,
        bestPerformingType: bestPerformingType ? {
          type: bestPerformingType.workflowType,
          typeName: bestPerformingType.typeName,
          successRate: bestPerformingType.executionMetrics.successRate
        } : null
      },
      typeCreationTimeline: typeCreationTimelineArray,
      typeExecutionTimeline: typeExecutionTimelineArray
    }, {
      reportType: 'workflow-type-distribution',
      filters: {
        dateRange: dateFilter
      }
    }));

  } catch (error) {
    return handleReportError(error, res, 'Workflow Type Distribution');
  }
};

/**
 * Get Workflow Success Rates
 * Analyzes workflow success and failure patterns with detailed error analysis
 * 
 * @route GET /api/company/reports/workflow/success-rates
 * @access Private (company_super_admin, company_admin)
 */
const getWorkflowSuccessRates = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dateFilter = getDateFilter(req.query);

    // 1. Get all workflows for the company
    const workflows = await Workflow.find({ company_id })
      .populate('created_by', 'first_name last_name email')
      .lean();

    // 2. Build execution query
    let executionQuery = { company_id };
    if (dateFilter.created_at) {
      executionQuery.created_at = dateFilter.created_at;
    }

    // 3. Get all workflow executions
    const executions = await WorkflowExecution.find(executionQuery)
      .populate('workflow_id', 'name workflow_type')
      .lean();

    // 4. Analyze success rates for each workflow
    const workflowSuccessAnalysis = workflows.map(workflow => {
      const workflowExecutions = executions.filter(
        exec => exec.workflow_id && exec.workflow_id._id.toString() === workflow._id.toString()
      );

      const totalExecutions = workflowExecutions.length;
      const successfulExecutions = workflowExecutions.filter(exec => exec.execution_status === 'success').length;
      const partialSuccessExecutions = workflowExecutions.filter(exec => exec.execution_status === 'partial_success').length;
      const failedExecutions = workflowExecutions.filter(exec => exec.execution_status === 'failed').length;

      // Calculate rates
      const successRate = totalExecutions > 0 
        ? Math.round((successfulExecutions / totalExecutions) * 100) 
        : 0;
      const partialSuccessRate = totalExecutions > 0
        ? Math.round((partialSuccessExecutions / totalExecutions) * 100)
        : 0;
      const failureRate = totalExecutions > 0
        ? Math.round((failedExecutions / totalExecutions) * 100)
        : 0;

      // Analyze failure patterns
      const failedExecutionsList = workflowExecutions.filter(exec => exec.execution_status === 'failed');
      
      // Group errors by error message
      const errorPatterns = {};
      failedExecutionsList.forEach(exec => {
        const errorMsg = exec.error_message || 'Unknown error';
        if (!errorPatterns[errorMsg]) {
          errorPatterns[errorMsg] = {
            errorMessage: errorMsg,
            count: 0,
            firstOccurrence: exec.created_at,
            lastOccurrence: exec.created_at
          };
        }
        errorPatterns[errorMsg].count++;
        if (new Date(exec.created_at) < new Date(errorPatterns[errorMsg].firstOccurrence)) {
          errorPatterns[errorMsg].firstOccurrence = exec.created_at;
        }
        if (new Date(exec.created_at) > new Date(errorPatterns[errorMsg].lastOccurrence)) {
          errorPatterns[errorMsg].lastOccurrence = exec.created_at;
        }
      });

      const errorPatternsArray = Object.values(errorPatterns)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5); // Top 5 error patterns

      // Calculate success trend (last 30 days vs previous 30 days)
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      const recentExecutions = workflowExecutions.filter(exec => 
        new Date(exec.created_at) >= thirtyDaysAgo
      );
      const previousExecutions = workflowExecutions.filter(exec => 
        new Date(exec.created_at) >= sixtyDaysAgo && new Date(exec.created_at) < thirtyDaysAgo
      );

      const recentSuccessRate = recentExecutions.length > 0
        ? Math.round((recentExecutions.filter(exec => exec.execution_status === 'success').length / recentExecutions.length) * 100)
        : 0;
      const previousSuccessRate = previousExecutions.length > 0
        ? Math.round((previousExecutions.filter(exec => exec.execution_status === 'success').length / previousExecutions.length) * 100)
        : 0;

      const successTrend = recentSuccessRate - previousSuccessRate;
      const trendDirection = successTrend > 0 ? 'improving' : successTrend < 0 ? 'declining' : 'stable';

      // Calculate vehicle-level success rates
      const totalVehiclesProcessed = workflowExecutions.reduce((sum, exec) => sum + (exec.total_vehicles || 0), 0);
      const totalVehiclesSuccessful = workflowExecutions.reduce((sum, exec) => sum + (exec.successful_vehicles || 0), 0);
      const totalVehiclesFailed = workflowExecutions.reduce((sum, exec) => sum + (exec.failed_vehicles || 0), 0);

      const vehicleSuccessRate = totalVehiclesProcessed > 0
        ? Math.round((totalVehiclesSuccessful / totalVehiclesProcessed) * 100)
        : 0;

      // Calculate reliability score (0-100)
      // Based on: success rate (60%), consistency (20%), vehicle success rate (20%)
      const consistency = totalExecutions >= 10 ? 100 : (totalExecutions * 10);
      const reliabilityScore = Math.round(
        (successRate * 0.6) + (consistency * 0.2) + (vehicleSuccessRate * 0.2)
      );

      // Determine reliability rating
      let reliabilityRating;
      if (reliabilityScore >= 90) {
        reliabilityRating = 'Excellent';
      } else if (reliabilityScore >= 75) {
        reliabilityRating = 'Good';
      } else if (reliabilityScore >= 60) {
        reliabilityRating = 'Fair';
      } else if (reliabilityScore >= 40) {
        reliabilityRating = 'Poor';
      } else {
        reliabilityRating = 'Very Poor';
      }

      // Recent failures (last 10)
      const recentFailures = failedExecutionsList
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 10)
        .map(exec => ({
          executionId: exec._id,
          failedAt: exec.created_at,
          errorMessage: exec.error_message,
          totalVehicles: exec.total_vehicles,
          failedVehicles: exec.failed_vehicles
        }));

      // Identify issues and recommendations
      const issues = [];
      const recommendations = [];

      if (failureRate > 30) {
        issues.push('High failure rate');
        recommendations.push('Review workflow configuration and error logs');
      }
      if (totalExecutions < 5) {
        issues.push('Insufficient execution history');
        recommendations.push('Monitor workflow performance over time');
      }
      if (trendDirection === 'declining') {
        issues.push('Success rate declining');
        recommendations.push('Investigate recent changes or external factors');
      }
      if (vehicleSuccessRate < 80 && totalVehiclesProcessed > 0) {
        issues.push('Low vehicle-level success rate');
        recommendations.push('Review vehicle data validation and processing logic');
      }
      if (errorPatternsArray.length > 0 && errorPatternsArray[0].count > failedExecutions * 0.5) {
        issues.push('Recurring error pattern detected');
        recommendations.push(`Address primary error: ${errorPatternsArray[0].errorMessage}`);
      }

      return {
        workflowId: workflow._id,
        name: workflow.name,
        description: workflow.description,
        workflowType: workflow.workflow_type,
        status: workflow.status,
        createdAt: workflow.created_at,
        successMetrics: {
          totalExecutions,
          successfulExecutions,
          partialSuccessExecutions,
          failedExecutions,
          successRate,
          partialSuccessRate,
          failureRate,
          reliabilityScore,
          reliabilityRating
        },
        vehicleMetrics: {
          totalVehiclesProcessed,
          totalVehiclesSuccessful,
          totalVehiclesFailed,
          vehicleSuccessRate
        },
        trends: {
          recentSuccessRate,
          previousSuccessRate,
          successTrend,
          trendDirection
        },
        errorAnalysis: {
          totalErrors: failedExecutions,
          uniqueErrorPatterns: Object.keys(errorPatterns).length,
          topErrorPatterns: errorPatternsArray,
          recentFailures
        },
        issues,
        recommendations
      };
    });

    // Sort by reliability score descending
    workflowSuccessAnalysis.sort((a, b) => b.successMetrics.reliabilityScore - a.successMetrics.reliabilityScore);

    // 5. Calculate overall statistics
    const totalWorkflows = workflows.length;
    const totalExecutions = executions.length;
    const successfulExecutions = executions.filter(exec => exec.execution_status === 'success').length;
    const partialSuccessExecutions = executions.filter(exec => exec.execution_status === 'partial_success').length;
    const failedExecutions = executions.filter(exec => exec.execution_status === 'failed').length;

    const overallSuccessRate = totalExecutions > 0
      ? Math.round((successfulExecutions / totalExecutions) * 100)
      : 0;
    const overallPartialSuccessRate = totalExecutions > 0
      ? Math.round((partialSuccessExecutions / totalExecutions) * 100)
      : 0;
    const overallFailureRate = totalExecutions > 0
      ? Math.round((failedExecutions / totalExecutions) * 100)
      : 0;

    // 6. Reliability distribution
    const reliabilityDistribution = {
      excellent: workflowSuccessAnalysis.filter(w => w.successMetrics.reliabilityRating === 'Excellent').length,
      good: workflowSuccessAnalysis.filter(w => w.successMetrics.reliabilityRating === 'Good').length,
      fair: workflowSuccessAnalysis.filter(w => w.successMetrics.reliabilityRating === 'Fair').length,
      poor: workflowSuccessAnalysis.filter(w => w.successMetrics.reliabilityRating === 'Poor').length,
      veryPoor: workflowSuccessAnalysis.filter(w => w.successMetrics.reliabilityRating === 'Very Poor').length
    };

    // 7. Most reliable workflows
    const mostReliableWorkflows = workflowSuccessAnalysis
      .filter(w => w.successMetrics.totalExecutions > 0)
      .slice(0, 10)
      .map(w => ({
        id: w.workflowId,
        name: w.name,
        workflowType: w.workflowType,
        reliabilityScore: w.successMetrics.reliabilityScore,
        reliabilityRating: w.successMetrics.reliabilityRating,
        successRate: w.successMetrics.successRate,
        totalExecutions: w.successMetrics.totalExecutions
      }));

    // 8. Least reliable workflows
    const leastReliableWorkflows = workflowSuccessAnalysis
      .filter(w => w.successMetrics.totalExecutions > 0)
      .sort((a, b) => a.successMetrics.reliabilityScore - b.successMetrics.reliabilityScore)
      .slice(0, 10)
      .map(w => ({
        id: w.workflowId,
        name: w.name,
        workflowType: w.workflowType,
        reliabilityScore: w.successMetrics.reliabilityScore,
        reliabilityRating: w.successMetrics.reliabilityRating,
        failureRate: w.successMetrics.failureRate,
        totalExecutions: w.successMetrics.totalExecutions,
        issues: w.issues
      }));

    // 9. Overall error analysis
    const allErrors = {};
    executions.filter(exec => exec.execution_status === 'failed').forEach(exec => {
      const errorMsg = exec.error_message || 'Unknown error';
      if (!allErrors[errorMsg]) {
        allErrors[errorMsg] = {
          errorMessage: errorMsg,
          count: 0,
          affectedWorkflows: new Set()
        };
      }
      allErrors[errorMsg].count++;
      if (exec.workflow_id) {
        allErrors[errorMsg].affectedWorkflows.add(exec.workflow_id._id.toString());
      }
    });

    const topErrors = Object.values(allErrors)
      .map(error => ({
        errorMessage: error.errorMessage,
        count: error.count,
        affectedWorkflowsCount: error.affectedWorkflows.size
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 10. Success rate timeline
    const successRateTimeline = {};
    executions.forEach(exec => {
      const date = new Date(exec.created_at).toISOString().split('T')[0]; // YYYY-MM-DD
      if (!successRateTimeline[date]) {
        successRateTimeline[date] = {
          date,
          totalExecutions: 0,
          successfulExecutions: 0,
          failedExecutions: 0
        };
      }
      successRateTimeline[date].totalExecutions++;
      if (exec.execution_status === 'success') {
        successRateTimeline[date].successfulExecutions++;
      } else if (exec.execution_status === 'failed') {
        successRateTimeline[date].failedExecutions++;
      }
    });

    const successRateTimelineArray = Object.values(successRateTimeline)
      .map(day => ({
        ...day,
        successRate: day.totalExecutions > 0
          ? Math.round((day.successfulExecutions / day.totalExecutions) * 100)
          : 0
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json(formatReportResponse({
      workflows: workflowSuccessAnalysis,
      overallStatistics: {
        totalWorkflows,
        totalExecutions,
        successfulExecutions,
        partialSuccessExecutions,
        failedExecutions,
        overallSuccessRate,
        overallPartialSuccessRate,
        overallFailureRate,
        reliabilityDistribution
      },
      mostReliableWorkflows,
      leastReliableWorkflows,
      errorAnalysis: {
        totalErrors: failedExecutions,
        uniqueErrorTypes: Object.keys(allErrors).length,
        topErrors
      },
      successRateTimeline: successRateTimelineArray
    }, {
      reportType: 'workflow-success-rates',
      filters: {
        dateRange: dateFilter
      }
    }));

  } catch (error) {
    return handleReportError(error, res, 'Workflow Success Rates');
  }
};

module.exports = {
  getWorkflowExecutionMetrics,
  getWorkflowTypeDistribution,
  getWorkflowSuccessRates
};
