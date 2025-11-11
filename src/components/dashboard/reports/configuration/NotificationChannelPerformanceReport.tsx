import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Radio, TrendingUp, Activity, CheckCircle } from 'lucide-react';

interface NotificationChannelPerformanceReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const NotificationChannelPerformanceReport: React.FC<NotificationChannelPerformanceReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getNotificationChannelPerformance(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load notification channel performance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting notification channel performance as ${format}`);
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
          title="Total Channels"
          value={summary.totalChannels || 0}
          icon={<Radio className="h-5 w-5" />}
        />
        <MetricCard
          title="Active Channels"
          value={summary.activeChannels || 0}
          icon={<Activity className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Delivery Rate"
          value={`${summary.avgDeliveryRate || 0}%`}
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <MetricCard
          title="Best Channel"
          value={summary.bestChannel || 'N/A'}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const channelData: PieChartData[] = data.notificationsByChannel?.map((item: any) => ({
      name: item._id || 'Unknown',
      value: item.count || 0,
    })) || [];

    const performanceData = data.channels?.map((channel: any) => ({
      name: channel.channelName || 'Unknown',
      deliveryRate: channel.deliveryRate || 0,
      engagementRate: channel.engagementRate || 0,
    })) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Notifications by Channel</h4>
            <InteractivePieChart data={channelData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Channel Performance</h4>
            <StackedBarChart
              data={performanceData}
              xAxisKey="name"
              series={[
                { dataKey: 'deliveryRate', name: 'Delivery %', color: '#3b82f6' },
                { dataKey: 'engagementRate', name: 'Engagement %', color: '#10b981' },
              ]}
              height={300}
            />
          </div>
        </div>

        {data.channels && data.channels.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Channel Details</h4>
            <DataTable
              columns={[
                { key: 'channelName', label: 'Channel' },
                { key: 'sent', label: 'Sent' },
                { key: 'delivered', label: 'Delivered' },
                { key: 'deliveryRate', label: 'Delivery Rate' },
                { key: 'status', label: 'Status' },
              ]}
              data={data.channels.map((channel: any) => ({
                channelName: channel.channelName || 'N/A',
                sent: channel.sentCount || 0,
                delivered: channel.deliveredCount || 0,
                deliveryRate: `${channel.deliveryRate || 0}%`,
                status: channel.isActive ? 'Active' : 'Inactive',
              }))}
            />
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.channels) return null;

    const tableData = data.channels.map((channel: any) => ({
      channelName: channel.channelName || 'Unknown',
      sentCount: channel.sentCount || 0,
      deliveredCount: channel.deliveredCount || 0,
      failedCount: channel.failedCount || 0,
      deliveryRate: `${channel.deliveryRate || 0}%`,
      engagementRate: `${channel.engagementRate || 0}%`,
      isActive: channel.isActive ? 'Active' : 'Inactive',
    }));

    const columns = [
      { key: 'channelName', label: 'Channel' },
      { key: 'sentCount', label: 'Sent' },
      { key: 'deliveredCount', label: 'Delivered' },
      { key: 'failedCount', label: 'Failed' },
      { key: 'deliveryRate', label: 'Delivery Rate' },
      { key: 'engagementRate', label: 'Engagement Rate' },
      { key: 'isActive', label: 'Status' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Notification Channel Performance"
      subtitle="Channel-wise delivery and engagement metrics"
      icon={<Radio className="h-5 w-5" />}
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

export default NotificationChannelPerformanceReport;
