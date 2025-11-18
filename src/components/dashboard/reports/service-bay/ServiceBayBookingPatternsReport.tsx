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
import { Calendar, TrendingUp, Clock, BarChart3 } from 'lucide-react';

interface ServiceBayBookingPatternsReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
  shouldLoad?: boolean;
}

export const ServiceBayBookingPatternsReport: React.FC<ServiceBayBookingPatternsReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getServiceBayBookingPatterns(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load service bay booking patterns data');
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
    console.log(`Exporting service bay booking patterns as ${format}`);
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
          title="Total Bookings"
          value={summary.totalBookings || 0}
          icon={<Calendar className="h-5 w-5" />}
        />
        <MetricCard
          title="Total Value"
          value={`$${(summary.totalValue || 0).toLocaleString()}`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Bookings/Day"
          value={(summary.avgBookingsPerDay || 0).toFixed(1)}
          icon={<BarChart3 className="h-5 w-5" />}
        />
        <MetricCard
          title="Peak Day"
          value={summary.peakBookingDay?.day || 'N/A'}
          icon={<Calendar className="h-5 w-5" />}
        />
        <MetricCard
          title="Peak Time"
          value={summary.peakBookingTime?.time || 'N/A'}
          icon={<Clock className="h-5 w-5" />}
        />
        <MetricCard
          title="Morning Bookings"
          value={summary.timeOfDayDistribution?.morning || 0}
          icon={<Clock className="h-5 w-5" />}
        />
        <MetricCard
          title="Afternoon Bookings"
          value={summary.timeOfDayDistribution?.afternoon || 0}
          icon={<Clock className="h-5 w-5" />}
        />
        <MetricCard
          title="Evening Bookings"
          value={summary.timeOfDayDistribution?.evening || 0}
          icon={<Clock className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const dayOfWeekData = data.dayOfWeekAnalysis?.map((day: any) => ({
      name: day.dayOfWeek || 'Unknown',
      bookings: day.totalBookings || 0,
      value: day.totalValue || 0,
      completionRate: day.completionRate || 0,
    })) || [];

    const timeSlotData = data.timeSlotAnalysis?.map((slot: any) => ({
      time: slot.timeSlot || 'Unknown',
      bookings: slot.bookingCount || 0,
      value: slot.totalValue || 0,
    })) || [];

    const monthlyData = data.monthlyTrends?.map((trend: any) => ({
      month: trend.period || 'Unknown',
      bookings: trend.bookingCount || 0,
      value: trend.totalValue || 0,
      completionRate: trend.completionRate || 0,
    })) || [];

    const timeOfDayData: PieChartData[] = data.summary?.timeOfDayDistribution ? [
      { name: 'Morning', value: data.summary.timeOfDayDistribution.morning || 0, color: '#3b82f6' },
      { name: 'Afternoon', value: data.summary.timeOfDayDistribution.afternoon || 0, color: '#10b981' },
      { name: 'Evening', value: data.summary.timeOfDayDistribution.evening || 0, color: '#f59e0b' },
    ] : [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Bookings by Day of Week</h4>
            <StackedBarChart
              data={dayOfWeekData}
              xAxisKey="name"
              series={[
                { dataKey: 'bookings', name: 'Bookings', color: '#3b82f6' },
              ]}
              height={300}
            />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Time of Day Distribution</h4>
            <InteractivePieChart data={timeOfDayData} height={300} />
          </div>
        </div>

        {monthlyData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Monthly Booking Trends</h4>
            <LineChart
              data={monthlyData}
              xAxisKey="month"
              lines={[
                { dataKey: 'bookings', name: 'Bookings', color: '#3b82f6' },
                { dataKey: 'completionRate', name: 'Completion Rate %', color: '#10b981' },
              ]}
              height={300}
            />
          </div>
        )}

        {timeSlotData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Bookings by Time Slot</h4>
            <StackedBarChart
              data={timeSlotData}
              xAxisKey="time"
              series={[
                { dataKey: 'bookings', name: 'Bookings', color: '#8b5cf6' },
              ]}
              height={300}
            />
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.dayOfWeekAnalysis) return null;

    const tableData = data.dayOfWeekAnalysis.map((day: any) => ({
      dayOfWeek: day.dayOfWeek || 'Unknown',
      totalBookings: day.totalBookings || 0,
      totalValue: `$${(day.totalValue || 0).toLocaleString()}`,
      avgValue: `$${(day.avgValue || 0).toLocaleString()}`,
      completedBookings: day.completedBookings || 0,
      completionRate: `${day.completionRate || 0}%`,
      avgBookingsPerBay: (day.avgBookingsPerBay || 0).toFixed(1),
    }));

    const columns = [
      { key: 'dayOfWeek', label: 'Day of Week' },
      { key: 'totalBookings', label: 'Total Bookings' },
      { key: 'totalValue', label: 'Total Value' },
      { key: 'avgValue', label: 'Avg Value' },
      { key: 'completedBookings', label: 'Completed' },
      { key: 'completionRate', label: 'Completion Rate' },
      { key: 'avgBookingsPerBay', label: 'Avg/Bay' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Service Bay Booking Patterns"
      subtitle="Booking trends and patterns analysis"
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

export default ServiceBayBookingPatternsReport;
