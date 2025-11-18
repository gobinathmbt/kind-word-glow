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
  shouldLoad?: boolean;
}

export const NotificationEngagementMetricsReport: React.FC<NotificationEngagementMetricsReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getNotificationEngagementMetrics(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load notification engagement metrics data');
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
          title="Total Configurations"
          value={summary.totalConfigurations || 0}
          icon={<Bell className="h-5 w-5" />}
          subtitle={`${summary.activeConfigurations || 0} active`}
        />
        <MetricCard
          title="Notifications Sent"
          value={summary.totalNotificationsSent || 0}
          icon={<Activity className="h-5 w-5" />}
          subtitle={`${summary.totalDelivered || 0} delivered`}
        />
        <MetricCard
          title="Overall Read Rate"
          value={`${summary.overallReadRate || 0}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          subtitle={`${summary.totalRead || 0} read`}
        />
        <MetricCard
          title="Avg Engagement Score"
          value={summary.avgEngagementScore || 0}
          icon={<CheckCircle className="h-5 w-5" />}
          subtitle={`${summary.excellentConfigurations || 0} excellent`}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    // Engagement status distribution
    const hasStatusData = data.summary && (
      (data.summary.excellentConfigurations || 0) > 0 ||
      (data.summary.goodConfigurations || 0) > 0 ||
      (data.summary.fairConfigurations || 0) > 0 ||
      (data.summary.poorConfigurations || 0) > 0
    );
    
    const statusData: PieChartData[] = hasStatusData
      ? [
          { name: 'Excellent', value: data.summary?.excellentConfigurations || 0, color: '#10b981' },
          { name: 'Good', value: data.summary?.goodConfigurations || 0, color: '#84cc16' },
          { name: 'Fair', value: data.summary?.fairConfigurations || 0, color: '#f59e0b' },
          { name: 'Poor', value: data.summary?.poorConfigurations || 0, color: '#ef4444' },
        ].filter(item => item.value > 0)
      : [
          { name: 'Excellent', value: 0, color: '#10b981' },
          { name: 'Good', value: 0, color: '#84cc16' },
          { name: 'Fair', value: 0, color: '#f59e0b' },
          { name: 'Poor', value: 0, color: '#ef4444' },
        ];

    // Top configurations by engagement
    const engagementData = data.topConfigurations?.slice(0, 10).map((config: any) => ({
      name: config.name || 'Unknown',
      score: config.engagementScore || 0,
      readRate: config.readRate || 0,
    })) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Engagement Status Distribution</h4>
            <InteractivePieChart data={statusData} height={300} />
            {!hasStatusData && (
              <p className="text-center text-sm text-gray-500 mt-2">
                No engagement status data available
              </p>
            )}
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Top Configurations by Engagement Score</h4>
            <StackedBarChart
              data={engagementData}
              xAxisKey="name"
              series={[
                { dataKey: 'score', name: 'Engagement Score', color: '#3b82f6' },
              ]}
              height={300}
            />
          </div>
        </div>

        {data.priorityEngagement && data.priorityEngagement.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Engagement by Priority</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Priority</th>
                    <th className="px-4 py-3 text-right font-medium">Sent</th>
                    <th className="px-4 py-3 text-right font-medium">Read</th>
                    <th className="px-4 py-3 text-right font-medium">Read Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.priorityEngagement.map((priority: any, index: number) => (
                    <tr key={index} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 capitalize">{priority.priority || 'N/A'}</td>
                      <td className="px-4 py-3 text-right">{priority.sent || 0}</td>
                      <td className="px-4 py-3 text-right">{priority.read || 0}</td>
                      <td className="px-4 py-3 text-right font-medium">{priority.readRate || 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {data.typeEngagement && data.typeEngagement.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Engagement by Type</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Type</th>
                    <th className="px-4 py-3 text-right font-medium">Sent</th>
                    <th className="px-4 py-3 text-right font-medium">Read</th>
                    <th className="px-4 py-3 text-right font-medium">Read Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.typeEngagement.map((type: any, index: number) => (
                    <tr key={index} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 capitalize">{type.type || 'N/A'}</td>
                      <td className="px-4 py-3 text-right">{type.sent || 0}</td>
                      <td className="px-4 py-3 text-right">{type.read || 0}</td>
                      <td className="px-4 py-3 text-right font-medium">{type.readRate || 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {data.configurationsNeedingAttention && data.configurationsNeedingAttention.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Configurations Needing Attention</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Configuration</th>
                    <th className="px-4 py-3 text-right font-medium">Engagement Score</th>
                    <th className="px-4 py-3 text-right font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Failure Rate</th>
                    <th className="px-4 py-3 text-right font-medium">Total Sent</th>
                  </tr>
                </thead>
                <tbody>
                  {data.configurationsNeedingAttention.map((config: any, index: number) => (
                    <tr key={index} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">{config.name || 'N/A'}</td>
                      <td className="px-4 py-3 text-right">{config.engagementScore || 0}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`px-2 py-1 rounded text-xs ${config.engagementStatus === 'Poor' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                          {config.engagementStatus || 'N/A'}
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
            <h4 className="text-sm font-medium mb-4">Configuration Performance Summary</h4>
            <DataTable
              columns={[
                { key: 'name', label: 'Configuration' },
                { key: 'triggerType', label: 'Trigger Type' },
                { key: 'totalSent', label: 'Sent' },
                { key: 'readRate', label: 'Read Rate' },
                { key: 'engagementScore', label: 'Score' },
                { key: 'status', label: 'Status' },
              ]}
              data={data.configurations.slice(0, 20).map((config: any) => ({
                name: config.name || 'N/A',
                triggerType: config.triggerType || 'N/A',
                totalSent: config.metrics?.totalSent || 0,
                readRate: `${config.metrics?.readRate || 0}%`,
                engagementScore: config.engagementScore || 0,
                status: config.engagementStatus || 'N/A',
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
      const priorityBreakdown = config.priorityBreakdown || {};
      const typeBreakdown = config.typeBreakdown || {};

      return {
        name: config.name || 'Unknown',
        description: config.description || 'N/A',
        triggerType: config.triggerType || 'N/A',
        targetSchema: config.targetSchema || 'N/A',
        channels: config.channels?.join(', ') || 'N/A',
        isActive: config.isActive ? 'Active' : 'Inactive',
        totalSent: metrics.totalSent || 0,
        delivered: metrics.delivered || 0,
        read: metrics.read || 0,
        failed: metrics.failed || 0,
        pending: metrics.pending || 0,
        deliveryRate: `${metrics.deliveryRate || 0}%`,
        readRate: `${metrics.readRate || 0}%`,
        failureRate: `${metrics.failureRate || 0}%`,
        engagementRate: `${metrics.engagementRate || 0}%`,
        avgTimeToRead: `${metrics.avgTimeToReadMinutes || 0} min`,
        priorityLow: priorityBreakdown.low || 0,
        priorityMedium: priorityBreakdown.medium || 0,
        priorityHigh: priorityBreakdown.high || 0,
        priorityUrgent: priorityBreakdown.urgent || 0,
        typeInfo: typeBreakdown.info || 0,
        typeSuccess: typeBreakdown.success || 0,
        typeWarning: typeBreakdown.warning || 0,
        typeError: typeBreakdown.error || 0,
        engagementScore: config.engagementScore || 0,
        engagementStatus: config.engagementStatus || 'N/A',
        createdBy: config.createdBy?.name || 'N/A',
        createdAt: config.createdAt ? new Date(config.createdAt).toLocaleDateString() : 'N/A',
      };
    });

    const columns = [
      { key: 'name', label: 'Configuration Name' },
      { key: 'description', label: 'Description' },
      { key: 'triggerType', label: 'Trigger Type' },
      { key: 'targetSchema', label: 'Target Schema' },
      { key: 'channels', label: 'Channels' },
      { key: 'isActive', label: 'Status' },
      { key: 'totalSent', label: 'Total Sent' },
      { key: 'delivered', label: 'Delivered' },
      { key: 'read', label: 'Read' },
      { key: 'failed', label: 'Failed' },
      { key: 'pending', label: 'Pending' },
      { key: 'deliveryRate', label: 'Delivery Rate' },
      { key: 'readRate', label: 'Read Rate' },
      { key: 'failureRate', label: 'Failure Rate' },
      { key: 'engagementRate', label: 'Engagement Rate' },
      { key: 'avgTimeToRead', label: 'Avg Time to Read' },
      { key: 'priorityLow', label: 'Priority: Low' },
      { key: 'priorityMedium', label: 'Priority: Medium' },
      { key: 'priorityHigh', label: 'Priority: High' },
      { key: 'priorityUrgent', label: 'Priority: Urgent' },
      { key: 'typeInfo', label: 'Type: Info' },
      { key: 'typeSuccess', label: 'Type: Success' },
      { key: 'typeWarning', label: 'Type: Warning' },
      { key: 'typeError', label: 'Type: Error' },
      { key: 'engagementScore', label: 'Engagement Score' },
      { key: 'engagementStatus', label: 'Engagement Status' },
      { key: 'createdBy', label: 'Created By' },
      { key: 'createdAt', label: 'Created At' },
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
