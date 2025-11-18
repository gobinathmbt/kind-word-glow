import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Zap, TrendingUp, Activity, CheckCircle } from 'lucide-react';

interface NotificationTriggerAnalysisReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
  shouldLoad?: boolean;
}

export const NotificationTriggerAnalysisReport: React.FC<NotificationTriggerAnalysisReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getNotificationTriggerAnalysis(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load notification trigger analysis data');
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
    console.log(`Exporting notification trigger analysis as ${format}`);
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
          icon={<Zap className="h-5 w-5" />}
          subtitle={`${summary.activeConfigurations || 0} active`}
        />
        <MetricCard
          title="Unique Trigger Types"
          value={summary.uniqueTriggerTypes || 0}
          icon={<Activity className="h-5 w-5" />}
          subtitle={`${summary.uniqueTargetSchemas || 0} schemas`}
        />
        <MetricCard
          title="Most Effective Trigger"
          value={summary.mostEffectiveTrigger || 'N/A'}
          icon={<TrendingUp className="h-5 w-5" />}
          subtitle={`Score: ${summary.mostEffectiveTriggerScore || 0}`}
        />
        <MetricCard
          title="Total Notifications"
          value={summary.totalNotificationsSent || 0}
          icon={<CheckCircle className="h-5 w-5" />}
          subtitle={`Avg: ${summary.avgNotificationsPerConfig || 0} per config`}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    // Color palette
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

    // Trigger type distribution
    const hasTriggerData = data.triggerTypes && data.triggerTypes.length > 0 &&
      data.triggerTypes.some((item: any) => (item.configurationCount || 0) > 0);
    
    const triggerTypeData: PieChartData[] = hasTriggerData
      ? data.triggerTypes.map((item: any, index: number) => ({
          name: item.triggerType || 'Unknown',
          value: item.configurationCount || 0,
          color: colors[index % colors.length],
        }))
      : [
          { name: 'Status Change', value: 0, color: colors[0] },
          { name: 'Time Based', value: 0, color: colors[1] },
          { name: 'User Action', value: 0, color: colors[2] },
          { name: 'System Event', value: 0, color: colors[3] },
          { name: 'Custom', value: 0, color: colors[4] },
        ];

    // Effectiveness by trigger type
    const effectivenessData = data.triggerTypes?.slice(0, 10).map((trigger: any) => ({
      name: trigger.triggerType || 'Unknown',
      score: trigger.effectivenessScore || 0,
      configs: trigger.configurationCount || 0,
      notifications: trigger.totalNotificationsSent || 0,
    })) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Configuration Distribution by Trigger Type</h4>
            <InteractivePieChart data={triggerTypeData} height={300} />
            {!hasTriggerData && (
              <p className="text-center text-sm text-gray-500 mt-2">
                No trigger type data available
              </p>
            )}
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Trigger Type Effectiveness</h4>
            <StackedBarChart
              data={effectivenessData}
              xAxisKey="name"
              series={[
                { dataKey: 'score', name: 'Effectiveness Score', color: '#3b82f6' },
              ]}
              height={300}
            />
          </div>
        </div>

        {data.triggerTypes && data.triggerTypes.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Trigger Type Performance</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Trigger Type</th>
                    <th className="px-4 py-3 text-right font-medium">Configurations</th>
                    <th className="px-4 py-3 text-right font-medium">Active</th>
                    <th className="px-4 py-3 text-right font-medium">Notifications Sent</th>
                    <th className="px-4 py-3 text-right font-medium">Delivered</th>
                    <th className="px-4 py-3 text-right font-medium">Read</th>
                    <th className="px-4 py-3 text-right font-medium">Delivery Rate</th>
                    <th className="px-4 py-3 text-right font-medium">Read Rate</th>
                    <th className="px-4 py-3 text-right font-medium">Effectiveness</th>
                  </tr>
                </thead>
                <tbody>
                  {data.triggerTypes.map((trigger: any, index: number) => (
                    <tr key={index} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 capitalize">{trigger.triggerType || 'N/A'}</td>
                      <td className="px-4 py-3 text-right">{trigger.configurationCount || 0}</td>
                      <td className="px-4 py-3 text-right">{trigger.activeConfigurations || 0}</td>
                      <td className="px-4 py-3 text-right">{trigger.totalNotificationsSent || 0}</td>
                      <td className="px-4 py-3 text-right">{trigger.delivered || 0}</td>
                      <td className="px-4 py-3 text-right">{trigger.read || 0}</td>
                      <td className="px-4 py-3 text-right">{trigger.deliveryRate || 0}%</td>
                      <td className="px-4 py-3 text-right">{trigger.readRate || 0}%</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`px-2 py-1 rounded text-xs ${
                          trigger.effectivenessStatus === 'Highly Effective' ? 'bg-green-100 text-green-800' :
                          trigger.effectivenessStatus === 'Effective' ? 'bg-blue-100 text-blue-800' :
                          trigger.effectivenessStatus === 'Moderately Effective' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {trigger.effectivenessStatus || 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {data.targetSchemas && data.targetSchemas.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Target Schema Analysis</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Target Schema</th>
                    <th className="px-4 py-3 text-right font-medium">Configurations</th>
                    <th className="px-4 py-3 text-right font-medium">Active</th>
                    <th className="px-4 py-3 text-right font-medium">Notifications Sent</th>
                    <th className="px-4 py-3 text-right font-medium">Total Read</th>
                    <th className="px-4 py-3 text-right font-medium">Read Rate</th>
                    <th className="px-4 py-3 text-right font-medium">Avg per Config</th>
                  </tr>
                </thead>
                <tbody>
                  {data.targetSchemas.map((schema: any, index: number) => (
                    <tr key={index} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">{schema.targetSchema || 'N/A'}</td>
                      <td className="px-4 py-3 text-right">{schema.configurationCount || 0}</td>
                      <td className="px-4 py-3 text-right">{schema.activeConfigurations || 0}</td>
                      <td className="px-4 py-3 text-right">{schema.totalNotificationsSent || 0}</td>
                      <td className="px-4 py-3 text-right">{schema.totalRead || 0}</td>
                      <td className="px-4 py-3 text-right">{schema.readRate || 0}%</td>
                      <td className="px-4 py-3 text-right">{schema.avgNotificationsPerConfig || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {data.targetUserTypes && data.targetUserTypes.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Target User Type Distribution</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">User Type</th>
                    <th className="px-4 py-3 text-right font-medium">Configurations</th>
                    <th className="px-4 py-3 text-right font-medium">Percentage</th>
                    <th className="px-4 py-3 text-right font-medium">Notifications Sent</th>
                    <th className="px-4 py-3 text-right font-medium">Total Read</th>
                    <th className="px-4 py-3 text-right font-medium">Read Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.targetUserTypes.map((userType: any, index: number) => (
                    <tr key={index} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 capitalize">{userType.targetUserType?.replace('_', ' ') || 'N/A'}</td>
                      <td className="px-4 py-3 text-right">{userType.configurationCount || 0}</td>
                      <td className="px-4 py-3 text-right">{userType.percentage || 0}%</td>
                      <td className="px-4 py-3 text-right">{userType.totalNotificationsSent || 0}</td>
                      <td className="px-4 py-3 text-right">{userType.totalRead || 0}</td>
                      <td className="px-4 py-3 text-right">{userType.readRate || 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {data.conditionUsage && (
          <div>
            <h4 className="text-sm font-medium mb-4">Condition Usage</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="border rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600">{data.conditionUsage.timeBasedConditions || 0}</div>
                <div className="text-sm text-gray-600 mt-1">Time-Based Conditions</div>
              </div>
              <div className="border rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600">{data.conditionUsage.frequencyLimits || 0}</div>
                <div className="text-sm text-gray-600 mt-1">Frequency Limits</div>
              </div>
              <div className="border rounded-lg p-4">
                <div className="text-2xl font-bold text-orange-600">{data.conditionUsage.targetFieldFilters || 0}</div>
                <div className="text-sm text-gray-600 mt-1">Target Field Filters</div>
              </div>
              <div className="border rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-600">{data.conditionUsage.customEvents || 0}</div>
                <div className="text-sm text-gray-600 mt-1">Custom Events</div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.triggerTypes) return null;

    const tableData = data.triggerTypes.map((trigger: any) => ({
      triggerType: trigger.triggerType || 'Unknown',
      configurationCount: trigger.configurationCount || 0,
      activeConfigurations: trigger.activeConfigurations || 0,
      inactiveConfigurations: trigger.inactiveConfigurations || 0,
      totalNotificationsSent: trigger.totalNotificationsSent || 0,
      delivered: trigger.delivered || 0,
      read: trigger.read || 0,
      deliveryRate: `${trigger.deliveryRate || 0}%`,
      readRate: `${trigger.readRate || 0}%`,
      effectivenessScore: trigger.effectivenessScore || 0,
      effectivenessStatus: trigger.effectivenessStatus || 'N/A',
      avgNotificationsPerConfig: trigger.avgNotificationsPerConfig || 0,
    }));

    const columns = [
      { key: 'triggerType', label: 'Trigger Type' },
      { key: 'configurationCount', label: 'Total Configurations' },
      { key: 'activeConfigurations', label: 'Active' },
      { key: 'inactiveConfigurations', label: 'Inactive' },
      { key: 'totalNotificationsSent', label: 'Notifications Sent' },
      { key: 'delivered', label: 'Delivered' },
      { key: 'read', label: 'Read' },
      { key: 'deliveryRate', label: 'Delivery Rate' },
      { key: 'readRate', label: 'Read Rate' },
      { key: 'effectivenessScore', label: 'Effectiveness Score' },
      { key: 'effectivenessStatus', label: 'Effectiveness Status' },
      { key: 'avgNotificationsPerConfig', label: 'Avg per Config' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Notification Trigger Analysis"
      subtitle="Trigger effectiveness and performance"
      icon={<Zap className="h-5 w-5" />}
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

export default NotificationTriggerAnalysisReport;
