import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Workflow, TrendingUp, Activity, CheckCircle } from 'lucide-react';

interface WorkflowExecutionMetricsReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const WorkflowExecutionMetricsReport: React.FC<WorkflowExecutionMetricsReportProps> = ({
  dealershipIds,
  dateRange,
  refreshTrigger,
  exportEnabled = true,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('chart');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = {};
      if (dealershipIds && dealershipIds.length > 0) {
        params.dealership_ids = dealershipIds.join(',');
      }
      if (dateRange) {
        params.from = dateRange.from;
        params.to = dateRange.to;
      }
      const response = await dashboardAnalyticsServices.getWorkflowExecutionMetrics(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load workflow execution metrics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting workflow execution metrics as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.summary) return null;
    const summary = data.summary;
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Workflows"
          value={summary.totalWorkflows || 0}
          icon={<Workflow className="h-5 w-5" />}
        />
        <MetricCard
          title="Total Executions"
          value={summary.totalExecutions || 0}
          icon={<Activity className="h-5 w-5" />}
        />
        <MetricCard
          title="Success Rate"
          value={`${summary.successRate || 0}%`}
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Execution Time"
          value={`${summary.avgExecutionTime || 0}ms`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const statusData: PieChartData[] = data.executionsByStatus?.map((item: any) => ({
      name: item._id || 'Unknown',
      value: item.count || 0,
    })) || [];

    const executionData = data.workflows?.slice(0, 10).map((workflow: any) => ({
      name: workflow.workflowName || 'Unknown',
      executions: workflow.executionCount || 0,
      success: workflow.successCount || 0,
    })) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Executions by Status</h4>
            <InteractivePieChart data={statusData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Top 10 by Executions</h4>
            <StackedBarChart
              data={executionData}
              xAxisKey="name"
              series={[
                { dataKey: 'executions', name: 'Total', color: '#3b82f6' },
                { dataKey: 'success', name: 'Success', color: '#10b981' },
              ]}
              height={300}
            />
          </div>
        </div>

        {data.workflows && data.workflows.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Workflow Details</h4>
            <DataTable
              columns={[
                { key: 'workflowName', label: 'Workflow' },
                { key: 'executions', label: 'Executions' },
                { key: 'success', label: 'Success' },
                { key: 'successRate', label: 'Success Rate' },
                { key: 'status', label: 'Status' },
              ]}
              data={data.workflows.slice(0, 20).map((workflow: any) => ({
                workflowName: workflow.workflowName || 'N/A',
                executions: workflow.executionCount || 0,
                success: workflow.successCount || 0,
                successRate: `${workflow.successRate || 0}%`,
                status: workflow.isActive ? 'Active' : 'Inactive',
              }))}
            />
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.workflows) return null;

    const tableData = data.workflows.map((workflow: any) => ({
      workflowName: workflow.workflowName || 'Unknown',
      executionCount: workflow.executionCount || 0,
      successCount: workflow.successCount || 0,
      failureCount: workflow.failureCount || 0,
      successRate: `${workflow.successRate || 0}%`,
      avgExecutionTime: `${workflow.avgExecutionTime || 0}ms`,
      isActive: workflow.isActive ? 'Active' : 'Inactive',
    }));

    const columns = [
      { key: 'workflowName', label: 'Workflow' },
      { key: 'executionCount', label: 'Executions' },
      { key: 'successCount', label: 'Success' },
      { key: 'failureCount', label: 'Failures' },
      { key: 'successRate', label: 'Success Rate' },
      { key: 'avgExecutionTime', label: 'Avg Time' },
      { key: 'isActive', label: 'Status' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Workflow Execution Metrics"
      subtitle="Execution statistics and performance"
      icon={<Workflow className="h-5 w-5" />}
      loading={loading}
      error={error}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      showViewToggle={true}
      actions={
        <div className="flex gap-2">
          {exportEnabled && <ExportButton onExport={handleExport} />}
          <RefreshButton onRefresh={handleRefresh} loading={loading} />
        </div>
      }
    >
      {renderMetrics()}
      {viewMode === 'chart' ? renderCharts() : renderTable()}
    </ReportCard>
  );
};

export default WorkflowExecutionMetricsReport;
