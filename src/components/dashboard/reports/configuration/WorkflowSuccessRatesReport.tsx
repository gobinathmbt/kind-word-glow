import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { CheckCircle2, TrendingUp, Activity, AlertCircle } from 'lucide-react';

interface WorkflowSuccessRatesReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const WorkflowSuccessRatesReport: React.FC<WorkflowSuccessRatesReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getWorkflowSuccessRates(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load workflow success rates data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting workflow success rates as ${format}`);
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
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Success Rate"
          value={`${summary.avgSuccessRate || 0}%`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="High Performers"
          value={summary.highPerformers || 0}
          icon={<Activity className="h-5 w-5" />}
        />
        <MetricCard
          title="Low Performers"
          value={summary.lowPerformers || 0}
          icon={<AlertCircle className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const performanceData: PieChartData[] = [
      { name: 'High (>80%)', value: data.summary?.performanceDistribution?.high || 0, color: '#10b981' },
      { name: 'Medium (50-80%)', value: data.summary?.performanceDistribution?.medium || 0, color: '#f59e0b' },
      { name: 'Low (<50%)', value: data.summary?.performanceDistribution?.low || 0, color: '#ef4444' },
    ];

    const successData = data.workflows?.slice(0, 10).map((workflow: any) => ({
      name: workflow.workflowName || 'Unknown',
      successRate: workflow.successRate || 0,
      executions: workflow.executionCount || 0,
    })) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Performance Distribution</h4>
            <InteractivePieChart data={performanceData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Top 10 by Success Rate</h4>
            <StackedBarChart
              data={successData}
              xAxisKey="name"
              series={[
                { dataKey: 'successRate', name: 'Success Rate %', color: '#3b82f6' },
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
                { key: 'failures', label: 'Failures' },
                { key: 'successRate', label: 'Success Rate' },
              ]}
              data={data.workflows.slice(0, 20).map((workflow: any) => ({
                workflowName: workflow.workflowName || 'N/A',
                executions: workflow.executionCount || 0,
                success: workflow.successCount || 0,
                failures: workflow.failureCount || 0,
                successRate: `${workflow.successRate || 0}%`,
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
      performance: workflow.performance || 'N/A',
      isActive: workflow.isActive ? 'Active' : 'Inactive',
    }));

    const columns = [
      { key: 'workflowName', label: 'Workflow' },
      { key: 'executionCount', label: 'Executions' },
      { key: 'successCount', label: 'Success' },
      { key: 'failureCount', label: 'Failures' },
      { key: 'successRate', label: 'Success Rate' },
      { key: 'performance', label: 'Performance' },
      { key: 'isActive', label: 'Status' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Workflow Success Rates"
      subtitle="Success and failure analysis"
      icon={<CheckCircle2 className="h-5 w-5" />}
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

export default WorkflowSuccessRatesReport;
