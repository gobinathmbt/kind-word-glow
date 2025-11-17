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
    const inApp = data.channelHealth?.inApp || {};

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Configurations"
          value={summary.totalConfigurations || 0}
          icon={<Radio className="h-5 w-5" />}
          subtitle={`${summary.inAppEnabledConfigurations || 0} in-app enabled`}
        />
        <MetricCard
          title="In-App Delivery Rate"
          value={`${summary.overallInAppDeliveryRate || 0}%`}
          icon={<Activity className="h-5 w-5" />}
          subtitle={`${inApp.totalDelivered || 0} delivered`}
        />
        <MetricCard
          title="In-App Read Rate"
          value={`${summary.overallInAppReadRate || 0}%`}
          icon={<CheckCircle className="h-5 w-5" />}
          subtitle={`${inApp.totalRead || 0} read`}
        />
        <MetricCard
          title="Channel Health Score"
          value={summary.overallChannelHealthScore || 0}
          icon={<TrendingUp className="h-5 w-5" />}
          subtitle={inApp.healthStatus || 'N/A'}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    // Performance status distribution
    const hasStatusData = data.summary && (
      (data.summary.excellentPerformers || 0) > 0 ||
      (data.summary.goodPerformers || 0) > 0 ||
      (data.summary.fairPerformers || 0) > 0 ||
      (data.summary.poorPerformers || 0) > 0
    );
    
    const statusData: PieChartData[] = hasStatusData
      ? [
          { name: 'Excellent', value: data.summary?.excellentPerformers || 0, color: '#10b981' },
          { name: 'Good', value: data.summary?.goodPerformers || 0, color: '#84cc16' },
          { name: 'Fair', value: data.summary?.fairPerformers || 0, color: '#f59e0b' },
          { name: 'Poor', value: data.summary?.poorPerformers || 0, color: '#ef4444' },
        ].filter(item => item.value > 0)
      : [
          { name: 'Excellent', value: 0, color: '#10b981' },
          { name: 'Good', value: 0, color: '#84cc16' },
          { name: 'Fair', value: 0, color: '#f59e0b' },
          { name: 'Poor', value: 0, color: '#ef4444' },
        ];

    // Top performers
    const performanceData = data.topChannelPerformers?.map((config: any) => ({
      name: config.name || 'Unknown',
      score: config.performanceScore || 0,
      deliveryRate: config.deliveryRate || 0,
      readRate: config.readRate || 0,
    })) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Performance Status Distribution</h4>
            <InteractivePieChart data={statusData} height={300} />
            {!hasStatusData && (
              <p className="text-center text-sm text-gray-500 mt-2">
                No performance status data available
              </p>
            )}
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Top Channel Performers</h4>
            <StackedBarChart
              data={performanceData}
              xAxisKey="name"
              series={[
                { dataKey: 'score', name: 'Performance Score', color: '#3b82f6' },
              ]}
              height={300}
            />
          </div>
        </div>

        {data.channelHealth && (
          <div>
            <h4 className="text-sm font-medium mb-4">In-App Channel Health</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="border rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600">{data.channelHealth.inApp?.totalSent || 0}</div>
                <div className="text-sm text-gray-600 mt-1">Total Sent</div>
              </div>
              <div className="border rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600">{data.channelHealth.inApp?.deliveryRate || 0}%</div>
                <div className="text-sm text-gray-600 mt-1">Delivery Rate</div>
              </div>
              <div className="border rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-600">{data.channelHealth.inApp?.readRate || 0}%</div>
                <div className="text-sm text-gray-600 mt-1">Read Rate</div>
              </div>
              <div className="border rounded-lg p-4">
                <div className="text-2xl font-bold text-orange-600">{data.channelHealth.inApp?.healthScore || 0}</div>
                <div className="text-sm text-gray-600 mt-1">Health Score</div>
                <div className="text-xs text-gray-500 mt-1">{data.channelHealth.inApp?.healthStatus || 'N/A'}</div>
              </div>
            </div>
          </div>
        )}

        {data.priorityChannelPerformance && data.priorityChannelPerformance.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Performance by Priority</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Priority</th>
                    <th className="px-4 py-3 text-right font-medium">Sent</th>
                    <th className="px-4 py-3 text-right font-medium">Delivered</th>
                    <th className="px-4 py-3 text-right font-medium">Read</th>
                    <th className="px-4 py-3 text-right font-medium">Delivery Rate</th>
                    <th className="px-4 py-3 text-right font-medium">Read Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.priorityChannelPerformance.map((priority: any, index: number) => (
                    <tr key={index} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 capitalize">{priority.priority || 'N/A'}</td>
                      <td className="px-4 py-3 text-right">{priority.sent || 0}</td>
                      <td className="px-4 py-3 text-right">{priority.delivered || 0}</td>
                      <td className="px-4 py-3 text-right">{priority.read || 0}</td>
                      <td className="px-4 py-3 text-right">{priority.deliveryRate || 0}%</td>
                      <td className="px-4 py-3 text-right">{priority.readRate || 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {data.configurationsWithIssues && data.configurationsWithIssues.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Configurations with Issues</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Configuration</th>
                    <th className="px-4 py-3 text-right font-medium">Performance Score</th>
                    <th className="px-4 py-3 text-right font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Failure Rate</th>
                    <th className="px-4 py-3 text-right font-medium">Total Sent</th>
                  </tr>
                </thead>
                <tbody>
                  {data.configurationsWithIssues.map((config: any, index: number) => (
                    <tr key={index} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">{config.name || 'N/A'}</td>
                      <td className="px-4 py-3 text-right">{config.performanceScore || 0}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800">
                          {config.performanceStatus || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-red-600">{config.failureRate || 0}%</td>
                      <td className="px-4 py-3 text-right">{config.totalSent || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {data.configurations && data.configurations.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Configuration Channel Performance</h4>
            <DataTable
              columns={[
                { key: 'name', label: 'Configuration' },
                { key: 'inAppSent', label: 'In-App Sent' },
                { key: 'delivered', label: 'Delivered' },
                { key: 'read', label: 'Read' },
                { key: 'deliveryRate', label: 'Delivery Rate' },
                { key: 'readRate', label: 'Read Rate' },
                { key: 'performanceStatus', label: 'Status' },
              ]}
              data={data.configurations.map((config: any) => ({
                name: config.name || 'N/A',
                inAppSent: config.metrics?.inAppSent || 0,
                delivered: config.metrics?.inAppDelivered || 0,
                read: config.metrics?.inAppRead || 0,
                deliveryRate: `${config.metrics?.deliveryRate || 0}%`,
                readRate: `${config.metrics?.readRate || 0}%`,
                performanceStatus: config.performanceStatus || 'N/A',
              }))}
            />
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.configurations) return null;

    const tableData = data.configurations.map((config: any) => {
      const metrics = config.metrics || {};

      return {
        configurationName: config.name || 'Unknown',
        isActive: config.isActive ? 'Active' : 'Inactive',
        inAppEnabled: config.inAppEnabled ? 'Yes' : 'No',
        totalNotifications: metrics.totalNotifications || 0,
        inAppSent: metrics.inAppSent || 0,
        inAppDelivered: metrics.inAppDelivered || 0,
        inAppRead: metrics.inAppRead || 0,
        inAppFailed: metrics.inAppFailed || 0,
        deliveryRate: `${metrics.deliveryRate || 0}%`,
        readRate: `${metrics.readRate || 0}%`,
        failureRate: `${metrics.failureRate || 0}%`,
        performanceScore: config.performanceScore || 0,
        performanceStatus: config.performanceStatus || 'N/A',
      };
    });

    const columns = [
      { key: 'configurationName', label: 'Configuration Name' },
      { key: 'isActive', label: 'Active' },
      { key: 'inAppEnabled', label: 'In-App Enabled' },
      { key: 'totalNotifications', label: 'Total Notifications' },
      { key: 'inAppSent', label: 'In-App Sent' },
      { key: 'inAppDelivered', label: 'Delivered' },
      { key: 'inAppRead', label: 'Read' },
      { key: 'inAppFailed', label: 'Failed' },
      { key: 'deliveryRate', label: 'Delivery Rate' },
      { key: 'readRate', label: 'Read Rate' },
      { key: 'failureRate', label: 'Failure Rate' },
      { key: 'performanceScore', label: 'Performance Score' },
      { key: 'performanceStatus', label: 'Performance Status' },
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
