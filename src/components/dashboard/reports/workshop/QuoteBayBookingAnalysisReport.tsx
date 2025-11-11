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
}

export const QuoteBayBookingAnalysisReport: React.FC<QuoteBayBookingAnalysisReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getQuoteBayBookingAnalysis(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load bay booking data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting bay booking report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.summary) return null;
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Bookings"
          value={data.summary.totalBookings || 0}
          icon={<Calendar className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Booking Duration"
          value={`${(data.summary.avgDuration || 0).toFixed(1)}h`}
        />
        <MetricCard
          title="Utilization Rate"
          value={`${(data.summary.utilizationRate || 0).toFixed(1)}%`}
        />
        <MetricCard
          title="Active Bays"
          value={data.summary.activeBays || 0}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data?.bookingPatterns) return null;

    const trendData = data.bookingPatterns.map((item: any) => ({
      date: item.date || '',
      bookings: item.bookings || 0,
      utilization: item.utilization || 0,
    }));

    return (
      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-medium mb-4">Booking Trends</h4>
          <LineChart
            data={trendData}
            xAxisKey="date"
            lines={[
              { dataKey: 'bookings', name: 'Bookings', color: '#3b82f6' },
              { dataKey: 'utilization', name: 'Utilization %', color: '#10b981' },
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
      bayName: item.bayName || 'Unknown',
      totalBookings: item.totalBookings || 0,
      avgDuration: `${(item.avgDuration || 0).toFixed(1)}h`,
      utilizationRate: `${(item.utilizationRate || 0).toFixed(1)}%`,
    }));

    const columns = [
      { key: 'bayName', label: 'Bay Name' },
      { key: 'totalBookings', label: 'Total Bookings' },
      { key: 'avgDuration', label: 'Avg Duration' },
      { key: 'utilizationRate', label: 'Utilization Rate' },
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
