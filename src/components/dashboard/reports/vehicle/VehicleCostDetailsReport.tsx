import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { DollarSign } from 'lucide-react';

interface VehicleCostDetailsReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const VehicleCostDetailsReport: React.FC<VehicleCostDetailsReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getVehicleCostDetails(params);
      setData(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load cost details data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting cost details report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.metrics) return null;
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Cost"
          value={`$${data.metrics.totalCost?.toLocaleString() || 0}`}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Cost/Vehicle"
          value={`$${data.metrics.avgCostPerVehicle?.toLocaleString() || 0}`}
        />
        <MetricCard
          title="Total Revenue"
          value={`$${data.metrics.totalRevenue?.toLocaleString() || 0}`}
        />
        <MetricCard
          title="Profit Margin"
          value={`${data.metrics.profitMargin || 0}%`}
          trend={{ value: data.metrics.marginTrend || 0, isPositive: true }}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const costTypeData: PieChartData[] = data.costByType?.map((item: any) => ({
      name: item.type,
      value: item.amount,
    })) || [];

    const costBreakdownData = data.costBreakdown || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Cost by Type</h4>
            <InteractivePieChart data={costTypeData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Cost Breakdown by Vehicle Type</h4>
            <StackedBarChart
              data={costBreakdownData}
              xAxisKey="vehicleType"
              series={[
                { dataKey: 'purchase', name: 'Purchase' },
                { dataKey: 'workshop', name: 'Workshop' },
                { dataKey: 'other', name: 'Other' },
              ]}
              height={300}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.tableData) return null;

    const columns = [
      { key: 'vehicleType', label: 'Vehicle Type' },
      { key: 'totalCost', label: 'Total Cost' },
      { key: 'avgCost', label: 'Avg Cost' },
      { key: 'revenue', label: 'Revenue' },
      { key: 'profit', label: 'Profit' },
      { key: 'margin', label: 'Margin %' },
    ];

    return <DataTable columns={columns} data={data.tableData} />;
  };

  return (
    <ReportCard
      title="Vehicle Cost Details"
      subtitle="Cost configuration and pricing analysis"
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

export default VehicleCostDetailsReport;
