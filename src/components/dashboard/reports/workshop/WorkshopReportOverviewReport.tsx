import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { LineChart } from '@/components/dashboard/charts/LineChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { FileText, DollarSign, Clock, CheckCircle, TrendingUp, Wrench } from 'lucide-react';

interface WorkshopReportOverviewReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
  shouldLoad?: boolean;
}

export const WorkshopReportOverviewReport: React.FC<WorkshopReportOverviewReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getWorkshopReportOverview(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load workshop report overview data');
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
    console.log(`Exporting workshop report overview as ${format}`);
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
          title="Total Reports"
          value={summary.totalReports || 0}
          icon={<FileText className="h-5 w-5" />}
        />
        <MetricCard
          title="Total Cost"
          value={`$${(summary.totalCost || 0).toLocaleString()}`}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Completion Days"
          value={(summary.avgCompletionDays || 0).toFixed(1)}
          icon={<Clock className="h-5 w-5" />}
        />
        <MetricCard
          title="Completion Rate"
          value={`${(summary.completionRate || 0).toFixed(1)}%`}
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <MetricCard
          title="Total Work Entries"
          value={summary.totalWorkEntries || 0}
          icon={<Wrench className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Report Cost"
          value={`$${(summary.avgReportCost || 0).toLocaleString()}`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="Total Parts Cost"
          value={`$${(summary.totalPartsCost || 0).toLocaleString()}`}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <MetricCard
          title="Total Labor Cost"
          value={`$${(summary.totalLaborCost || 0).toLocaleString()}`}
          icon={<DollarSign className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const vehicleTypeColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    const vehicleTypeData: PieChartData[] = data.vehicleTypeDistribution?.map((item: any, index: number) => ({
      name: item._id || 'Unknown',
      value: item.count || 0,
      color: vehicleTypeColors[index % vehicleTypeColors.length],
    })) || [];

    const reportTypeColors = ['#6366f1', '#ec4899', '#14b8a6', '#f97316'];
    const reportTypeData: PieChartData[] = data.reportTypeDistribution?.map((item: any, index: number) => ({
      name: item._id || 'Unknown',
      value: item.count || 0,
      color: reportTypeColors[index % reportTypeColors.length],
    })) || [];

    const monthlyTrendData = data.monthlyTrends?.map((item: any) => ({
      month: `${item._id?.year}-${String(item._id?.month).padStart(2, '0')}`,
      reports: item.reportCount || 0,
      revenue: item.totalRevenue || 0,
      avgCost: item.avgCost || 0,
    })) || [];

    const revenueBreakdown = data.revenueMetrics ? [
      { name: 'Parts', value: data.revenueMetrics.partsRevenue || 0, color: '#3b82f6' },
      { name: 'Labor', value: data.revenueMetrics.laborRevenue || 0, color: '#10b981' },
      { name: 'GST', value: data.revenueMetrics.gstRevenue || 0, color: '#f59e0b' },
    ] : [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Vehicle Type Distribution</h4>
            <InteractivePieChart data={vehicleTypeData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Report Type Distribution</h4>
            <InteractivePieChart data={reportTypeData} height={300} />
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-4">Revenue Breakdown</h4>
          <InteractivePieChart data={revenueBreakdown} height={300} />
        </div>

        {monthlyTrendData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Monthly Trends</h4>
            <LineChart
              data={monthlyTrendData}
              xAxisKey="month"
              lines={[
                { dataKey: 'reports', name: 'Report Count', color: '#3b82f6' },
                { dataKey: 'avgCost', name: 'Avg Cost', color: '#10b981' },
              ]}
              height={300}
            />
          </div>
        )}

        {data.topVehiclesByCost && data.topVehiclesByCost.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Top Vehicles by Cost</h4>
            <DataTable
              columns={[
                { key: 'vehicle_stock_id', label: 'Stock ID' },
                { key: 'vehicle_type', label: 'Type' },
                { key: 'total_cost', label: 'Total Cost' },
                { key: 'work_entries', label: 'Work Entries' },
                { key: 'completion_days', label: 'Days' },
              ]}
              data={data.topVehiclesByCost.map((item: any) => ({
                vehicle_stock_id: item.vehicle_stock_id || 'N/A',
                vehicle_type: item.vehicle_type || 'N/A',
                total_cost: `$${(item.total_cost || 0).toLocaleString()}`,
                work_entries: item.work_entries || 0,
                completion_days: (item.completion_days || 0).toFixed(1),
              }))}
            />
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.vehicleTypeDistribution) return null;

    const tableData = data.vehicleTypeDistribution.map((item: any) => ({
      vehicleType: item._id || 'Unknown',
      count: item.count || 0,
      totalCost: `$${(item.totalCost || 0).toLocaleString()}`,
      avgCost: `$${(item.avgCost || 0).toLocaleString()}`,
      avgCompletionDays: (item.avgCompletionDays || 0).toFixed(1),
      totalWorkEntries: item.totalWorkEntries || 0,
    }));

    const columns = [
      { key: 'vehicleType', label: 'Vehicle Type' },
      { key: 'count', label: 'Count' },
      { key: 'totalCost', label: 'Total Cost' },
      { key: 'avgCost', label: 'Avg Cost' },
      { key: 'avgCompletionDays', label: 'Avg Days' },
      { key: 'totalWorkEntries', label: 'Work Entries' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Workshop Report Overview"
      subtitle="Overall workshop performance metrics and trends"
      icon={<FileText className="h-5 w-5" />}
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

export default WorkshopReportOverviewReport;
