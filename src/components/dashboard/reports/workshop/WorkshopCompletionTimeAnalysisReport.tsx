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
import { Clock, TrendingUp, Calendar, AlertCircle } from 'lucide-react';

interface WorkshopCompletionTimeAnalysisReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const WorkshopCompletionTimeAnalysisReport: React.FC<WorkshopCompletionTimeAnalysisReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getWorkshopCompletionTimeAnalysis(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load completion time analysis data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting completion time analysis as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.overallMetrics) return null;
    const metrics = data.overallMetrics;
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Avg Duration"
          value={`${(metrics.avgDurationDays || 0).toFixed(1)} days`}
          icon={<Clock className="h-5 w-5" />}
        />
        <MetricCard
          title="Min Duration"
          value={`${(metrics.minDurationDays || 0).toFixed(1)} days`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="Max Duration"
          value={`${(metrics.maxDurationDays || 0).toFixed(1)} days`}
          icon={<AlertCircle className="h-5 w-5" />}
        />
        <MetricCard
          title="Total Reports"
          value={metrics.totalReports || 0}
          icon={<Calendar className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const durationDistributionData: PieChartData[] = data.durationDistribution?.map((item: any) => ({
      name: typeof item._id === 'string' ? item._id : `${item._id} days`,
      value: item.count || 0,
    })) || [];

    const completionByVehicleTypeData = data.completionByVehicleType?.map((item: any) => ({
      vehicleType: item._id || 'Unknown',
      avgDuration: item.avgDurationDays || 0,
      minDuration: item.minDurationDays || 0,
      maxDuration: item.maxDurationDays || 0,
    })) || [];

    const monthlyTrendsData = data.monthlyTrends?.map((item: any) => ({
      month: `${item._id?.year}-${String(item._id?.month).padStart(2, '0')}`,
      avgDuration: item.avgDurationDays || 0,
      reportCount: item.reportCount || 0,
    })) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Duration Distribution</h4>
            <InteractivePieChart data={durationDistributionData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Completion Time by Vehicle Type</h4>
            <StackedBarChart
              data={completionByVehicleTypeData}
              xAxisKey="vehicleType"
              series={[
                { dataKey: 'avgDuration', name: 'Avg Duration', color: '#3b82f6' },
                { dataKey: 'minDuration', name: 'Min Duration', color: '#10b981' },
                { dataKey: 'maxDuration', name: 'Max Duration', color: '#ef4444' },
              ]}
              height={300}
            />
          </div>
        </div>

        {monthlyTrendsData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Monthly Completion Time Trends</h4>
            <LineChart
              data={monthlyTrendsData}
              xAxisKey="month"
              lines={[
                { dataKey: 'avgDuration', name: 'Avg Duration (days)', color: '#3b82f6' },
                { dataKey: 'reportCount', name: 'Report Count', color: '#10b981' },
              ]}
              height={300}
            />
          </div>
        )}

        {data.efficiencyMetrics && data.efficiencyMetrics.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Efficiency Metrics</h4>
            <DataTable
              columns={[
                { key: 'vehicleType', label: 'Vehicle Type' },
                { key: 'reportType', label: 'Report Type' },
                { key: 'avgDaysPerWorkEntry', label: 'Days/Entry' },
                { key: 'avgDaysPerField', label: 'Days/Field' },
                { key: 'reportCount', label: 'Reports' },
              ]}
              data={data.efficiencyMetrics.map((item: any) => ({
                vehicleType: item._id?.vehicleType || 'N/A',
                reportType: item._id?.reportType || 'N/A',
                avgDaysPerWorkEntry: (item.avgDaysPerWorkEntry || 0).toFixed(2),
                avgDaysPerField: (item.avgDaysPerField || 0).toFixed(2),
                reportCount: item.reportCount || 0,
              }))}
            />
          </div>
        )}

        {data.longestRunningReports && data.longestRunningReports.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Longest Running Reports</h4>
            <DataTable
              columns={[
                { key: 'vehicle_stock_id', label: 'Stock ID' },
                { key: 'vehicle_type', label: 'Type' },
                { key: 'duration_days', label: 'Duration (days)' },
                { key: 'total_work_entries', label: 'Work Entries' },
                { key: 'total_cost', label: 'Cost' },
              ]}
              data={data.longestRunningReports.map((item: any) => ({
                vehicle_stock_id: item.vehicle_stock_id || 'N/A',
                vehicle_type: item.vehicle_type || 'N/A',
                duration_days: (item.duration_days || 0).toFixed(1),
                total_work_entries: item.total_work_entries || 0,
                total_cost: `$${(item.total_cost || 0).toLocaleString()}`,
              }))}
            />
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.completionByVehicleType) return null;

    const tableData = data.completionByVehicleType.map((item: any) => ({
      vehicleType: item._id || 'Unknown',
      reportCount: item.reportCount || 0,
      avgDuration: `${(item.avgDurationDays || 0).toFixed(1)} days`,
      minDuration: `${(item.minDurationDays || 0).toFixed(1)} days`,
      maxDuration: `${(item.maxDurationDays || 0).toFixed(1)} days`,
      avgWorkEntries: (item.avgWorkEntries || 0).toFixed(1),
    }));

    const columns = [
      { key: 'vehicleType', label: 'Vehicle Type' },
      { key: 'reportCount', label: 'Reports' },
      { key: 'avgDuration', label: 'Avg Duration' },
      { key: 'minDuration', label: 'Min Duration' },
      { key: 'maxDuration', label: 'Max Duration' },
      { key: 'avgWorkEntries', label: 'Avg Work Entries' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Workshop Completion Time Analysis"
      subtitle="Duration and efficiency metrics for workshop reports"
      icon={<Clock className="h-5 w-5" />}
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

export default WorkshopCompletionTimeAnalysisReport;
