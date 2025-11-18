import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { List, CheckCircle, AlertCircle, Activity, TrendingUp } from 'lucide-react';

interface DropdownConfigurationHealthReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
  shouldLoad?: boolean;
}

export const DropdownConfigurationHealthReport: React.FC<DropdownConfigurationHealthReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getDropdownConfigurationHealth(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load dropdown configuration health data');
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
    console.log(`Exporting dropdown configuration health as ${format}`);
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
          title="Total Dropdowns"
          value={summary.totalDropdowns || 0}
          icon={<List className="h-5 w-5" />}
        />
        <MetricCard
          title="Healthy Dropdowns"
          value={summary.healthyDropdowns || 0}
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <MetricCard
          title="Issues Found"
          value={summary.issuesFound || 0}
          icon={<AlertCircle className="h-5 w-5" />}
        />
        <MetricCard
          title="Health Score"
          value={`${(summary.overallHealthScore || 0).toFixed(1)}%`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="Empty Dropdowns"
          value={summary.emptyDropdowns || 0}
          icon={<AlertCircle className="h-5 w-5" />}
        />
        <MetricCard
          title="Unused Dropdowns"
          value={summary.unusedDropdowns || 0}
          icon={<AlertCircle className="h-5 w-5" />}
        />
        <MetricCard
          title="Complete Dropdowns"
          value={summary.completeDropdowns || 0}
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <MetricCard
          title="Completeness Rate"
          value={`${(summary.completenessRate || 0).toFixed(1)}%`}
          icon={<Activity className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const hasData = data.summary?.totalValues > 0 && data.valueDistribution && data.valueDistribution.length > 0;

    const healthStatusData: PieChartData[] = hasData ? [
      { name: 'Healthy', value: data.summary?.healthyDropdowns || 0, color: '#10b981' },
      { name: 'Issues', value: data.summary?.issuesFound || 0, color: '#ef4444' },
      { name: 'Empty', value: data.summary?.emptyDropdowns || 0, color: '#f59e0b' },
    ] : [
      { name: 'Healthy', value: 0, color: '#10b981' },
      { name: 'Issues', value: 0, color: '#ef4444' },
      { name: 'Empty', value: 0, color: '#f59e0b' },
      { name: 'Unused', value: 0, color: '#6b7280' },
      { name: 'Complete', value: 0, color: '#3b82f6' },
    ];

    const issueTypeData = hasData && data.issuesByType?.length > 0
      ? data.issuesByType.map((item: any) => ({
        name: item.issueType || 'Unknown',
        count: item.count || 0,
      }))
      : [{ name: 'No Data', count: 0 }];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Health Status Distribution</h4>
            <InteractivePieChart data={healthStatusData} height={300} />
            {!hasData && (
              <p className="text-center text-sm text-gray-500 mt-2">
                {data.summary?.message || 'No dropdown configurations found'}
              </p>
            )}
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Issues by Type</h4>
            <StackedBarChart
              data={issueTypeData}
              xAxisKey="name"
              series={[
                { dataKey: 'count', name: 'Issue Count', color: '#ef4444' },
              ]}
              height={300}
            />
            {!hasData && (
              <p className="text-center text-sm text-gray-500 mt-2">
                No issues data available
              </p>
            )}
          </div>
        </div>

        {data.dropdownHealth && data.dropdownHealth.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Dropdown Health Details</h4>
            <DataTable
              columns={[
                { key: 'dropdown', label: 'Dropdown' },
                { key: 'values', label: 'Values' },
                { key: 'usage', label: 'Usage' },
                { key: 'healthScore', label: 'Health Score' },
                { key: 'status', label: 'Status' },
                { key: 'issues', label: 'Issues' },
              ]}
              data={data.dropdownHealth.slice(0, 20).map((item: any) => ({
                dropdown: item.dropdownName || 'N/A',
                values: item.valueCount || 0,
                usage: item.usageCount || 0,
                healthScore: `${(item.healthScore || 0).toFixed(1)}%`,
                status: item.healthStatus || 'N/A',
                issues: item.issues?.join(', ') || 'None',
              }))}
            />
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.dropdownHealth || data.dropdownHealth.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          <p className="text-lg font-medium">
            {data?.summary?.message || 'No dropdown configurations found'}
          </p>
        </div>
      );
    }

    const tableData = data.dropdownHealth.map((item: any) => ({
      dropdownName: item.dropdownName || 'Unknown',
      valueCount: item.valueCount || 0,
      usageCount: item.usageCount || 0,
      healthScore: `${(item.healthScore || 0).toFixed(1)}%`,
      healthStatus: item.healthStatus || 'Unknown',
      issues: item.issues?.join(', ') || 'None',
      isActive: item.isActive ? 'Active' : 'Inactive',
    }));

    const columns = [
      { key: 'dropdownName', label: 'Dropdown' },
      { key: 'valueCount', label: 'Values' },
      { key: 'usageCount', label: 'Usage' },
      { key: 'healthScore', label: 'Health Score' },
      { key: 'healthStatus', label: 'Status' },
      { key: 'issues', label: 'Issues' },
      { key: 'isActive', label: 'Active' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Dropdown Configuration Health"
      subtitle="Configuration completeness analysis"
      icon={<List className="h-5 w-5" />}
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

export default DropdownConfigurationHealthReport;
