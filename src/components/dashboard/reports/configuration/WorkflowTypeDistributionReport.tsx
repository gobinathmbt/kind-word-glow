import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { GitBranch, TrendingUp, Activity, CheckCircle } from 'lucide-react';

interface WorkflowTypeDistributionReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
  shouldLoad?: boolean;
}

export const WorkflowTypeDistributionReport: React.FC<WorkflowTypeDistributionReportProps> = ({
  dealershipIds,
  dateRange,
  refreshTrigger,
  exportEnabled = true,
  shouldLoad = false}) => {
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
      const response = await dashboardAnalyticsServices.getWorkflowTypeDistribution(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load workflow type distribution data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (shouldLoad) {
      fetchData();
    }
  }, [shouldLoad, dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting workflow type distribution as ${format}`);
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
          title="Total Types"
          value={summary.totalTypes || 0}
          icon={<GitBranch className="h-5 w-5" />}
        />
        <MetricCard
          title="Active Types"
          value={summary.activeTypes || 0}
          icon={<Activity className="h-5 w-5" />}
        />
        <MetricCard
          title="Total Workflows"
          value={summary.totalWorkflows || 0}
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <MetricCard
          title="Most Used Type"
          value={summary.mostUsedType || 'N/A'}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const typeColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
    
    const hasTypeData = data.workflowsByType && data.workflowsByType.length > 0 &&
      data.workflowsByType.some((item: any) => (item.count || 0) > 0);
    
    const typeData: PieChartData[] = hasTypeData
      ? data.workflowsByType.map((item: any, index: number) => ({
          name: item._id || 'Unknown',
          value: item.count || 0,
          color: typeColors[index % typeColors.length],
        }))
      : [
          { name: 'Approval', value: 0, color: typeColors[0] },
          { name: 'Notification', value: 0, color: typeColors[1] },
          { name: 'Data Processing', value: 0, color: typeColors[2] },
          { name: 'Integration', value: 0, color: typeColors[3] },
          { name: 'Automation', value: 0, color: typeColors[4] },
          { name: 'Scheduled', value: 0, color: typeColors[5] },
        ];

    const usageData = data.types?.slice(0, 10).map((type: any) => ({
      name: type.workflowType || 'Unknown',
      workflows: type.workflowCount || 0,
      executions: type.executionCount || 0,
    })) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Workflows by Type</h4>
            <InteractivePieChart data={typeData} height={300} />
            {!hasTypeData && (
              <p className="text-center text-sm text-gray-500 mt-2">
                No workflow type data available
              </p>
            )}
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Top 10 Types by Usage</h4>
            <StackedBarChart
              data={usageData}
              xAxisKey="name"
              series={[
                { dataKey: 'workflows', name: 'Workflows', color: '#3b82f6' },
                { dataKey: 'executions', name: 'Executions', color: '#10b981' },
              ]}
              height={300}
            />
          </div>
        </div>

        {data.types && data.types.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Type Details</h4>
            <DataTable
              columns={[
                { key: 'type', label: 'Type' },
                { key: 'workflows', label: 'Workflows' },
                { key: 'executions', label: 'Executions' },
                { key: 'successRate', label: 'Success Rate' },
              ]}
              data={data.types.slice(0, 20).map((type: any) => ({
                type: type.workflowType || 'N/A',
                workflows: type.workflowCount || 0,
                executions: type.executionCount || 0,
                successRate: `${type.successRate || 0}%`,
              }))}
            />
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.types) return null;

    const tableData = data.types.map((type: any) => ({
      workflowType: type.workflowType || 'Unknown',
      workflowCount: type.workflowCount || 0,
      executionCount: type.executionCount || 0,
      successCount: type.successCount || 0,
      successRate: `${type.successRate || 0}%`,
      usagePercentage: `${type.usagePercentage || 0}%`,
    }));

    const columns = [
      { key: 'workflowType', label: 'Type' },
      { key: 'workflowCount', label: 'Workflows' },
      { key: 'executionCount', label: 'Executions' },
      { key: 'successCount', label: 'Success' },
      { key: 'successRate', label: 'Success Rate' },
      { key: 'usagePercentage', label: 'Usage %' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Workflow Type Distribution"
      subtitle="Workflow type usage and distribution"
      icon={<GitBranch className="h-5 w-5" />}
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

export default WorkflowTypeDistributionReport;
