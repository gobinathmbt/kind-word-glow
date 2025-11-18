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
  shouldLoad?: boolean;
}

export const WorkshopCompletionTimeAnalysisReport: React.FC<WorkshopCompletionTimeAnalysisReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getWorkshopCompletionTimeAnalysis(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load completion time analysis data');
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
    console.log(`Exporting completion time analysis as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.overallMetrics) return null;
    const metrics = data.overallMetrics;
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Reports"
          value={metrics.totalReports || 0}
          icon={<Calendar className="h-5 w-5" />}
          subtitle={`${(metrics.avgWorkEntries || 0).toFixed(1)} avg work entries`}
        />
        <MetricCard
          title="Avg Duration"
          value={`${(metrics.avgDurationDays || 0).toFixed(1)} days`}
          icon={<Clock className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Work Entries"
          value={(metrics.avgWorkEntries || 0).toFixed(1)}
          icon={<TrendingUp className="h-5 w-5" />}
          subtitle={`${(metrics.avgFields || 0).toFixed(1)} avg fields`}
        />
        <MetricCard
          title="Duration Range"
          value={`${(metrics.minDurationDays || 0).toFixed(0)}-${(metrics.maxDurationDays || 0).toFixed(0)} days`}
          icon={<AlertCircle className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    // Color palettes for different charts
    const durationColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    const vehicleTypeColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    const reportTypeColors = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5'];

    const durationDistributionData: PieChartData[] = data.durationDistribution?.map((item: any, index: number) => ({
      name: typeof item._id === 'string' ? item._id : `${item._id} days`,
      value: item.count || 0,
      color: durationColors[index % durationColors.length],
    })) || [];

    const completionByVehicleTypeData = data.completionByVehicleType?.map((item: any) => ({
      vehicleType: item._id || 'Unknown',
      avgDuration: item.avgDurationDays || 0,
      minDuration: item.minDurationDays || 0,
      maxDuration: item.maxDurationDays || 0,
      avgWorkEntries: item.avgWorkEntries || 0,
    })) || [];

    const completionByReportTypeData = data.completionByReportType?.map((item: any) => ({
      reportType: item._id || 'Unknown',
      avgDuration: item.avgDurationDays || 0,
      avgFields: item.avgFields || 0,
      avgWorkEntries: item.avgWorkEntries || 0,
    })) || [];

    const monthlyTrendsData = data.monthlyTrends?.map((item: any) => ({
      month: `${item._id?.year}-${String(item._id?.month).padStart(2, '0')}`,
      avgDuration: item.avgDurationDays || 0,
      reportCount: item.reportCount || 0,
      avgWorkEntries: item.avgWorkEntries || 0,
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

        {completionByReportTypeData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Completion Time by Report Type</h4>
            <StackedBarChart
              data={completionByReportTypeData}
              xAxisKey="reportType"
              series={[
                { dataKey: 'avgDuration', name: 'Avg Duration', color: '#3b82f6' },
                { dataKey: 'avgFields', name: 'Avg Fields', color: '#10b981' },
                { dataKey: 'avgWorkEntries', name: 'Avg Work Entries', color: '#f59e0b' },
              ]}
              height={300}
            />
          </div>
        )}

        {monthlyTrendsData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Monthly Completion Time Trends</h4>
            <LineChart
              data={monthlyTrendsData}
              xAxisKey="month"
              lines={[
                { dataKey: 'avgDuration', name: 'Avg Duration (days)', color: '#3b82f6' },
                { dataKey: 'reportCount', name: 'Report Count', color: '#10b981' },
                { dataKey: 'avgWorkEntries', name: 'Avg Work Entries', color: '#f59e0b' },
              ]}
              height={300}
            />
          </div>
        )}

        {data.efficiencyMetrics && data.efficiencyMetrics.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Efficiency Metrics</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Vehicle Type</th>
                    <th className="px-4 py-3 text-left font-medium">Report Type</th>
                    <th className="px-4 py-3 text-right font-medium">Days/Entry</th>
                    <th className="px-4 py-3 text-right font-medium">Days/Field</th>
                    <th className="px-4 py-3 text-right font-medium">Reports</th>
                  </tr>
                </thead>
                <tbody>
                  {data.efficiencyMetrics.map((item: any, index: number) => (
                    <tr key={index} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">{item._id?.vehicleType || 'N/A'}</td>
                      <td className="px-4 py-3">{item._id?.reportType || 'N/A'}</td>
                      <td className="px-4 py-3 text-right">{(item.avgDaysPerWorkEntry || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">{(item.avgDaysPerField || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">{item.reportCount || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {data.longestRunningReports && data.longestRunningReports.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Longest Running Reports</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Stock ID</th>
                    <th className="px-4 py-3 text-left font-medium">Vehicle</th>
                    <th className="px-4 py-3 text-left font-medium">Type</th>
                    <th className="px-4 py-3 text-left font-medium">Report Type</th>
                    <th className="px-4 py-3 text-right font-medium">Duration (days)</th>
                    <th className="px-4 py-3 text-right font-medium">Work Entries</th>
                    <th className="px-4 py-3 text-right font-medium">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {data.longestRunningReports.map((item: any, index: number) => (
                    <tr key={index} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">{item.vehicle_stock_id || 'N/A'}</td>
                      <td className="px-4 py-3">
                        {item.vehicle_details?.name || 
                         `${item.vehicle_details?.year || ''} ${item.vehicle_details?.make || ''} ${item.vehicle_details?.model || ''}`.trim() || 
                         'N/A'}
                      </td>
                      <td className="px-4 py-3">{item.vehicle_type || 'N/A'}</td>
                      <td className="px-4 py-3">{item.report_type || 'N/A'}</td>
                      <td className="px-4 py-3 text-right">{(item.duration_days || 0).toFixed(1)}</td>
                      <td className="px-4 py-3 text-right">{item.total_work_entries || 0}</td>
                      <td className="px-4 py-3 text-right">${(item.total_cost || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data) return null;

    // Combine data from multiple sources for comprehensive table view
    const vehicleTypeData = data.completionByVehicleType?.map((item: any) => ({
      category: 'Vehicle Type',
      type: item._id || 'Unknown',
      reportCount: item.reportCount || 0,
      avgDuration: `${(item.avgDurationDays || 0).toFixed(1)} days`,
      minDuration: `${(item.minDurationDays || 0).toFixed(1)} days`,
      maxDuration: `${(item.maxDurationDays || 0).toFixed(1)} days`,
      avgWorkEntries: (item.avgWorkEntries || 0).toFixed(1),
      avgFields: '-',
    })) || [];

    const reportTypeData = data.completionByReportType?.map((item: any) => ({
      category: 'Report Type',
      type: item._id || 'Unknown',
      reportCount: item.reportCount || 0,
      avgDuration: `${(item.avgDurationDays || 0).toFixed(1)} days`,
      minDuration: '-',
      maxDuration: '-',
      avgWorkEntries: (item.avgWorkEntries || 0).toFixed(1),
      avgFields: (item.avgFields || 0).toFixed(1),
    })) || [];

    const tableData = [...vehicleTypeData, ...reportTypeData];

    const columns = [
      { key: 'category', label: 'Category' },
      { key: 'type', label: 'Type' },
      { key: 'reportCount', label: 'Reports' },
      { key: 'avgDuration', label: 'Avg Duration' },
      { key: 'minDuration', label: 'Min Duration' },
      { key: 'maxDuration', label: 'Max Duration' },
      { key: 'avgWorkEntries', label: 'Avg Work Entries' },
      { key: 'avgFields', label: 'Avg Fields' },
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
