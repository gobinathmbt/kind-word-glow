import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { List, TrendingUp, Activity, BarChart3 } from 'lucide-react';

interface DropdownValueDistributionReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
  shouldLoad?: boolean;
}

export const DropdownValueDistributionReport: React.FC<DropdownValueDistributionReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getDropdownValueDistribution(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load dropdown value distribution data');
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
    console.log(`Exporting dropdown value distribution as ${format}`);
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
          title="Total Values"
          value={summary.totalValues || 0}
          icon={<List className="h-5 w-5" />}
        />
        <MetricCard
          title="Active Values"
          value={summary.activeValues || 0}
          icon={<Activity className="h-5 w-5" />}
        />
        <MetricCard
          title="Most Used Value"
          value={summary.mostUsedValue?.label || 'N/A'}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="Usage Count"
          value={summary.mostUsedValue?.usageCount || 0}
          icon={<BarChart3 className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Values/Dropdown"
          value={(summary.avgValuesPerDropdown || 0).toFixed(1)}
          icon={<Activity className="h-5 w-5" />}
        />
        <MetricCard
          title="Inactive Values"
          value={summary.inactiveValues || 0}
          icon={<List className="h-5 w-5" />}
        />
        <MetricCard
          title="Total Usage"
          value={summary.totalUsage || 0}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Usage/Value"
          value={(summary.avgUsagePerValue || 0).toFixed(1)}
          icon={<BarChart3 className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const hasData = data.valueDistribution && data.valueDistribution.length > 0;

    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
    
    const valueDistributionData: PieChartData[] = hasData
      ? data.valueDistribution.slice(0, 8).map((item: any, index: number) => {
          return {
            name: item.dropdownName || 'Unknown',
            value: item.valueCount || 0,
            color: colors[index % colors.length],
          };
        })
      : [
          { name: 'Status', value: 0, color: colors[0] },
          { name: 'Priority', value: 0, color: colors[1] },
          { name: 'Category', value: 0, color: colors[2] },
          { name: 'Type', value: 0, color: colors[3] },
          { name: 'Region', value: 0, color: colors[4] },
        ];

    const topValuesData = hasData && data.topUsedValues?.length > 0
      ? data.topUsedValues.slice(0, 10).map((item: any) => ({
          name: item.valueLabel || 'Unknown',
          usage: item.usageCount || 0,
          dropdown: item.dropdownName || 'N/A',
        }))
      : [{ name: 'No Data', usage: 0, dropdown: 'N/A' }];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Values by Dropdown</h4>
            <InteractivePieChart data={valueDistributionData} height={300} />
            {!hasData && (
              <p className="text-center text-sm text-gray-500 mt-2">
                {data.summary?.message || 'No dropdown configurations found'}
              </p>
            )}
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Top 10 Most Used Values</h4>
            <StackedBarChart
              data={topValuesData}
              xAxisKey="name"
              series={[
                { dataKey: 'usage', name: 'Usage Count', color: '#3b82f6' },
              ]}
              height={300}
            />
            {!hasData && (
              <p className="text-center text-sm text-gray-500 mt-2">
                No usage data available
              </p>
            )}
          </div>
        </div>

        {data.valueDistribution && data.valueDistribution.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Value Distribution Details</h4>
            <DataTable
              columns={[
                { key: 'dropdown', label: 'Dropdown' },
                { key: 'values', label: 'Value Count' },
                { key: 'activeValues', label: 'Active' },
                { key: 'inactiveValues', label: 'Inactive' },
                { key: 'totalUsage', label: 'Total Usage' },
              ]}
              data={data.valueDistribution.slice(0, 20).map((item: any) => ({
                dropdown: item.dropdownName || 'N/A',
                values: item.valueCount || 0,
                activeValues: item.activeValueCount || 0,
                inactiveValues: item.inactiveValueCount || 0,
                totalUsage: item.totalUsage || 0,
              }))}
            />
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.valueDistribution || data.valueDistribution.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          <List className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          <p className="text-lg font-medium">
            {data?.summary?.message || 'No dropdown configurations found'}
          </p>
        </div>
      );
    }

    const tableData = data.valueDistribution.map((item: any) => ({
      dropdownName: item.dropdownName || 'Unknown',
      valueCount: item.valueCount || 0,
      activeValueCount: item.activeValueCount || 0,
      inactiveValueCount: item.inactiveValueCount || 0,
      totalUsage: item.totalUsage || 0,
    }));

    const columns = [
      { key: 'dropdownName', label: 'Dropdown' },
      { key: 'valueCount', label: 'Value Count' },
      { key: 'activeValueCount', label: 'Active Values' },
      { key: 'inactiveValueCount', label: 'Inactive Values' },
      { key: 'totalUsage', label: 'Total Usage' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Dropdown Value Distribution"
      subtitle="Value selection patterns"
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

export default DropdownValueDistributionReport;
