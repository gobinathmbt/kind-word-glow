import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { HeatMap } from '@/components/dashboard/charts/HeatMap';
import { LineChart } from '@/components/dashboard/charts/LineChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Calendar } from 'lucide-react';

interface QuoteBayBookingAnalysisReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
  shouldLoad?: boolean;
}

export const QuoteBayBookingAnalysisReport: React.FC<QuoteBayBookingAnalysisReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getQuoteBayBookingAnalysis(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load bay booking data');
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
    console.log(`Exporting bay booking report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.bayUtilization) return null;
    
    const totalBookings = data.bayUtilization.reduce((sum: number, bay: any) => sum + (bay.totalBookings || 0), 0);
    const totalCompleted = data.bayUtilization.reduce((sum: number, bay: any) => sum + (bay.completedBookings || 0), 0);
    const avgAcceptanceRate = data.bayUtilization.length > 0
      ? data.bayUtilization.reduce((sum: number, bay: any) => sum + (bay.acceptanceRate || 0), 0) / data.bayUtilization.length
      : 0;
    const avgCompletionRate = data.bayUtilization.length > 0
      ? data.bayUtilization.reduce((sum: number, bay: any) => sum + (bay.completionRate || 0), 0) / data.bayUtilization.length
      : 0;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Bookings"
          value={totalBookings}
          icon={<Calendar className="h-5 w-5" />}
        />
        <MetricCard
          title="Completed Bookings"
          value={totalCompleted}
        />
        <MetricCard
          title="Avg Acceptance Rate"
          value={`${avgAcceptanceRate.toFixed(1)}%`}
        />
        <MetricCard
          title="Avg Completion Rate"
          value={`${avgCompletionRate.toFixed(1)}%`}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data?.bookingTimePatterns || !data?.bayUtilization) return null;

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    const uniqueHours = [...new Set(data.bookingTimePatterns.map((item: any) => item._id.hour))].sort();
    const uniqueDays = [...new Set(data.bookingTimePatterns.map((item: any) => item._id.dayOfWeek))].sort((a: any, b: any) => Number(a) - Number(b));
    
    const heatmapData = data.bookingTimePatterns.map((item: any) => {
      const dayIndex = Number(item._id.dayOfWeek) - 1;
      const dayName = dayNames[dayIndex] || 'Unknown';
      return {
        x: `${item._id.hour}:00`,
        y: dayName,
        value: item.count || 0,
        label: `${dayName} ${item._id.hour}:00 - ${item.count} bookings`,
      };
    });

    const xLabels = uniqueHours.map(h => `${h}:00`);
    const yLabels = uniqueDays.map((d: any) => dayNames[Number(d) - 1]);

    const bayData = data.bayUtilization.map((item: any) => ({
      bay: item.bayId || 'Unknown',
      acceptanceRate: item.acceptanceRate || 0,
      completionRate: item.completionRate || 0,
      totalBookings: item.totalBookings || 0,
    }));

    return (
      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-medium mb-4">Booking Time Patterns</h4>
          <HeatMap
            data={heatmapData}
            xLabels={xLabels}
            yLabels={yLabels}
            height={300}
            showValues={true}
            colorScale={{
              low: '#dbeafe',
              mid: '#3b82f6',
              high: '#1e40af',
            }}
          />
        </div>
        <div>
          <h4 className="text-sm font-medium mb-4">Bay Performance Metrics</h4>
          <LineChart
            data={bayData}
            xAxisKey="bay"
            lines={[
              { dataKey: 'acceptanceRate', name: 'Acceptance Rate %', color: '#3b82f6' },
              { dataKey: 'completionRate', name: 'Completion Rate %', color: '#10b981' },
            ]}
            height={300}
          />
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.bayUtilization) return null;

    const tableData = data.bayUtilization.map((item: any) => ({
      bayId: item.bayId || item._id || 'Unknown',
      totalBookings: item.totalBookings || 0,
      acceptedBookings: item.acceptedBookings || 0,
      rejectedBookings: item.rejectedBookings || 0,
      completedBookings: item.completedBookings || 0,
      acceptanceRate: `${(item.acceptanceRate || 0).toFixed(1)}%`,
      completionRate: `${(item.completionRate || 0).toFixed(1)}%`,
    }));

    const columns = [
      { key: 'bayId', label: 'Bay ID' },
      { key: 'totalBookings', label: 'Total Bookings' },
      { key: 'acceptedBookings', label: 'Accepted' },
      { key: 'rejectedBookings', label: 'Rejected' },
      { key: 'completedBookings', label: 'Completed' },
      { key: 'acceptanceRate', label: 'Acceptance Rate' },
      { key: 'completionRate', label: 'Completion Rate' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Quote Bay Booking Analysis"
      subtitle="Service bay booking patterns and utilization"
      icon={<Calendar className="h-5 w-5" />}
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

export default QuoteBayBookingAnalysisReport;
