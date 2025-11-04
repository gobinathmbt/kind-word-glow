import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { DollarSign, TrendingUp, Activity, Layers } from 'lucide-react';

interface CostTypeUtilizationReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const CostTypeUtilizationReport: React.FC<CostTypeUtilizationReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getCostTypeUtilization(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load cost type utilization data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting cost type utilization as ${format}`);
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
          title="Total Cost Types"
          value={summary.totalCostTypes || 0}
          icon={<Layers className="h-5 w-5" />}
        />
        <MetricCard
          title="Active Cost Types"
          value={summary.activeCostTypes || 0}
          icon={<Activity className="h-5 w-5" />}
        />
        <MetricCard
          title="Total Usage"
          value={summary.totalUsage || 0}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="Total Value"
          value={`$${(summary.totalValue || 0).toLocaleString()}`}
          icon={<DollarSign className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const costTypeData: PieChartData[] = data.costTypeUsage?.slice(0, 10).map((item: any) => ({
      name: item.costTypeName || 'Unknown',
      value: item.usageCount || 0,
    })) || [];

    const vehicleTypeData = data.usageByVehicleType?.map((item: any) => ({
      name: item._id || 'Unknown',
      usage: item.count || 0,
      value: item.totalValue || 0,
    })) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Top 10 Cost Types by Usage</h4>
            <InteractivePieChart data={costTypeData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Usage by Vehicle Type</h4>
            <StackedBarChart
              data={vehicleTypeData}
              xAxisKey="name"
              series={[
                { dataKey: 'usage', name: 'Usage Count', color: '#3b82f6' },
              ]}
              height={300}
            />
          </div>
        </div>

        {data.costTypeUsage && data.costTypeUsage.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Cost Type Details</h4>
            <DataTable
              columns={[
                { key: 'costType', label: 'Cost Type' },
                { key: 'usage', label: 'Usage' },
                { key: 'totalValue', label: 'Total Value' },
                { key: 'avgValue', label: 'Avg Value' },
                { key: 'status', label: 'Status' },
              ]}
              data={data.costTypeUsage.slice(0, 20).map((item: any) => ({
                costType: item.costTypeName || 'N/A',
                usage: item.usageCount || 0,
                totalValue: `$${(item.totalValue || 0).toLocaleString()}`,
                avgValue: `$${(item.avgValue || 0).toLocaleString()}`,
                status: item.isActive ? 'Active' : 'Inactive',
              }))}
            />
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.costTypeUsage) return null;

    const tableData = data.costTypeUsage.map((item: any) => ({
      costTypeName: item.costTypeName || 'Unknown',
      usageCount: item.usageCount || 0,
      totalValue: `$${(item.totalValue || 0).toLocaleString()}`,
      avgValue: `$${(item.avgValue || 0).toLocaleString()}`,
      isActive: item.isActive ? 'Active' : 'Inactive',
    }));

    const columns = [
      { key: 'costTypeName', label: 'Cost Type' },
      { key: 'usageCount', label: 'Usage Count' },
      { key: 'totalValue', label: 'Total Value' },
      { key: 'avgValue', label: 'Avg Value' },
      { key: 'isActive', label: 'Status' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Cost Type Utilization"
      subtitle="Cost type usage analysis"
      icon={<DollarSign className="h-5 w-5" />}
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

export default CostTypeUtilizationReport;
