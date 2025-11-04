import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { List, TrendingUp, Activity, Layers } from 'lucide-react';

interface DropdownUsageAnalysisReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const DropdownUsageAnalysisReport: React.FC<DropdownUsageAnalysisReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getDropdownUsageAnalysis(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load dropdown usage analysis data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting dropdown usage analysis as ${format}`);
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
          title="Active Dropdowns"
          value={summary.activeDropdowns || 0}
          icon={<Activity className="h-5 w-5" />}
        />
        <MetricCard
          title="Total Values"
          value={summary.totalValues || 0}
          icon={<Layers className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Values/Dropdown"
          value={(summary.avgValuesPerDropdown || 0).toFixed(1)}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="Most Used Dropdown"
          value={summary.mostUsedDropdown?.name || 'N/A'}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="Usage Count"
          value={summary.mostUsedDropdown?.usageCount || 0}
          icon={<Activity className="h-5 w-5" />}
        />
        <MetricCard
          title="Inactive Dropdowns"
          value={summary.inactiveDropdowns || 0}
          icon={<List className="h-5 w-5" />}
        />
        <MetricCard
          title="Utilization Rate"
          value={`${(summary.utilizationRate || 0).toFixed(1)}%`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const usageData: PieChartData[] = data.dropdownUsage?.slice(0, 10).map((item: any) => ({
      name: item.dropdownName || 'Unknown',
      value: item.usageCount || 0,
    })) || [];

    const valueCountData = data.dropdownUsage?.slice(0, 10).map((item: any) => ({
      name: item.dropdownName || 'Unknown',
      values: item.valueCount || 0,
      usage: item.usageCount || 0,
    })) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Top 10 Dropdowns by Usage</h4>
            <InteractivePieChart data={usageData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Values vs Usage</h4>
            <StackedBarChart
              data={valueCountData}
              xAxisKey="name"
              series={[
                { dataKey: 'values', name: 'Value Count', color: '#3b82f6' },
                { dataKey: 'usage', name: 'Usage Count', color: '#10b981' },
              ]}
              height={300}
            />
          </div>
        </div>

        {data.dropdownUsage && data.dropdownUsage.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Dropdown Details</h4>
            <DataTable
              columns={[
                { key: 'dropdown', label: 'Dropdown' },
                { key: 'values', label: 'Values' },
                { key: 'usage', label: 'Usage' },
                { key: 'status', label: 'Status' },
              ]}
              data={data.dropdownUsage.slice(0, 20).map((item: any) => ({
                dropdown: item.dropdownName || 'N/A',
                values: item.valueCount || 0,
                usage: item.usageCount || 0,
                status: item.isActive ? 'Active' : 'Inactive',
              }))}
            />
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.dropdownUsage) return null;

    const tableData = data.dropdownUsage.map((item: any) => ({
      dropdownName: item.dropdownName || 'Unknown',
      valueCount: item.valueCount || 0,
      usageCount: item.usageCount || 0,
      isActive: item.isActive ? 'Active' : 'Inactive',
      createdAt: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A',
    }));

    const columns = [
      { key: 'dropdownName', label: 'Dropdown Name' },
      { key: 'valueCount', label: 'Value Count' },
      { key: 'usageCount', label: 'Usage Count' },
      { key: 'isActive', label: 'Status' },
      { key: 'createdAt', label: 'Created' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Dropdown Usage Analysis"
      subtitle="Dropdown utilization metrics"
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

export default DropdownUsageAnalysisReport;
