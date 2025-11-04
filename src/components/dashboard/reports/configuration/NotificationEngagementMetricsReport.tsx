import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Bell, TrendingUp, Activity, CheckCircle } from 'lucide-react';

interface NotificationEngagementMetricsReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const NotificationEngagementMetricsReport: React.FC<NotificationEngagementMetricsReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getNotificationEngagementMetrics(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load notification engagement metrics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting notification engagement metrics as ${format}`);
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
          title="Total Notifications"
          value={summary.totalNotifications || 0}
          icon={<Bell className="h-5 w-5" />}
        />
        <MetricCard
          title="Delivered"
          value={summary.deliveredNotifications || 0}
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <MetricCard
          title="Engagement Rate"
          value={`${summary.engagementRate || 0}%`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Open Rate"
          value={`${summary.avgOpenRate || 0}%`}
          icon={<Activity className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const statusData: PieChartData[] = data.notificationsByStatus?.map((item: any) => ({
      name: item._id || 'Unknown',
      value: item.count || 0,
    })) || [];

    const engagementData = data.notifications?.slice(0, 10).map((notification: any) => ({
      name: notification.notificationName || 'Unknown',
      engagement: notification.engagementRate || 0,
      delivered: notification.deliveredCount || 0,
    })) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Notifications by Status</h4>
            <InteractivePieChart data={statusData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Top 10 by Engagement</h4>
            <StackedBarChart
              data={engagementData}
              xAxisKey="name"
              series={[
                { dataKey: 'engagement', name: 'Engagement %', color: '#3b82f6' },
              ]}
              height={300}
            />
          </div>
        </div>

        {data.notifications && data.notifications.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Notification Details</h4>
            <DataTable
              columns={[
                { key: 'notificationName', label: 'Notification' },
                { key: 'delivered', label: 'Delivered' },
                { key: 'opened', label: 'Opened' },
                { key: 'engagement', label: 'Engagement' },
                { key: 'status', label: 'Status' },
              ]}
              data={data.notifications.slice(0, 20).map((notification: any) => ({
                notificationName: notification.notificationName || 'N/A',
                delivered: notification.deliveredCount || 0,
                opened: notification.openedCount || 0,
                engagement: `${notification.engagementRate || 0}%`,
                status: notification.isActive ? 'Active' : 'Inactive',
              }))}
            />
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.notifications) return null;

    const tableData = data.notifications.map((notification: any) => ({
      notificationName: notification.notificationName || 'Unknown',
      deliveredCount: notification.deliveredCount || 0,
      openedCount: notification.openedCount || 0,
      clickedCount: notification.clickedCount || 0,
      engagementRate: `${notification.engagementRate || 0}%`,
      openRate: `${notification.openRate || 0}%`,
      isActive: notification.isActive ? 'Active' : 'Inactive',
    }));

    const columns = [
      { key: 'notificationName', label: 'Notification' },
      { key: 'deliveredCount', label: 'Delivered' },
      { key: 'openedCount', label: 'Opened' },
      { key: 'clickedCount', label: 'Clicked' },
      { key: 'engagementRate', label: 'Engagement Rate' },
      { key: 'openRate', label: 'Open Rate' },
      { key: 'isActive', label: 'Status' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Notification Engagement Metrics"
      subtitle="Delivery and engagement performance"
      icon={<Bell className="h-5 w-5" />}
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

export default NotificationEngagementMetricsReport;
