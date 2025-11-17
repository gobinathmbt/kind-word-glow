import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { ShieldCheck, TrendingUp, Activity, CheckCircle } from 'lucide-react';

interface GroupPermissionEffectivenessReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const GroupPermissionEffectivenessReport: React.FC<GroupPermissionEffectivenessReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getGroupPermissionEffectiveness(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load group permission effectiveness data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting group permission effectiveness as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.overallStatistics) return null;
    const stats = data.overallStatistics;
    const dist = stats.effectivenessDistribution || {};
    const excellentAndGood = (dist.excellent || 0) + (dist.good || 0);

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Group Permissions"
          value={stats.totalGroupPermissions || 0}
          icon={<ShieldCheck className="h-5 w-5" />}
          subtitle={`${stats.groupPermissionsInUse || 0} in use`}
        />
        <MetricCard
          title="Avg Effectiveness Score"
          value={`${(stats.avgEffectivenessScore || 0).toFixed(1)}%`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="High Performers"
          value={excellentAndGood}
          icon={<CheckCircle className="h-5 w-5" />}
          subtitle="Excellent + Good"
        />
        <MetricCard
          title="Avg Retention Rate"
          value={`${(stats.activityTrends?.avgRetentionRate || 0).toFixed(1)}%`}
          icon={<Activity className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const dist = data.overallStatistics?.effectivenessDistribution || {};
    const effectivenessData: PieChartData[] = [
      { name: 'Excellent', value: dist.excellent || 0, color: '#10b981' },
      { name: 'Good', value: dist.good || 0, color: '#34d399' },
      { name: 'Fair', value: dist.fair || 0, color: '#fbbf24' },
      { name: 'Poor', value: dist.poor || 0, color: '#f97316' },
      { name: 'Very Poor', value: dist.veryPoor || 0, color: '#ef4444' },
      { name: 'Not Used', value: dist.notUsed || 0, color: '#9ca3af' },
    ].filter(item => item.value > 0);

    const groupData = data.groupPermissions?.slice(0, 10).map((group: any) => ({
      name: group.name || 'Unknown',
      effectiveness: group.effectiveness?.overallEffectivenessScore || 0,
      utilization: group.effectiveness?.utilizationScore || 0,
      activity: group.effectiveness?.activityScore || 0,
    })) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Effectiveness Distribution</h4>
            <InteractivePieChart data={effectivenessData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Top Groups by Effectiveness</h4>
            <StackedBarChart
              data={groupData}
              xAxisKey="name"
              series={[
                { dataKey: 'effectiveness', name: 'Effectiveness', color: '#3b82f6' },
                { dataKey: 'utilization', name: 'Utilization', color: '#10b981' },
                { dataKey: 'activity', name: 'Activity', color: '#f59e0b' },
              ]}
              height={300}
            />
          </div>
        </div>

        {data.groupPermissions && data.groupPermissions.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Group Permission Effectiveness Details</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Group Name</th>
                    <th className="px-4 py-3 text-left font-medium">Description</th>
                    <th className="px-4 py-3 text-right font-medium">Effectiveness Score</th>
                    <th className="px-4 py-3 text-center font-medium">Rating</th>
                    <th className="px-4 py-3 text-right font-medium">Total Users</th>
                    <th className="px-4 py-3 text-right font-medium">Active Users</th>
                    <th className="px-4 py-3 text-right font-medium">Activity Rate</th>
                    <th className="px-4 py-3 text-right font-medium">Retention Rate</th>
                    <th className="px-4 py-3 text-center font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.groupPermissions.map((group: any, index: number) => (
                    <tr key={index} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">{group.name || 'N/A'}</td>
                      <td className="px-4 py-3">{group.description || 'N/A'}</td>
                      <td className="px-4 py-3 text-right">{(group.effectiveness?.overallEffectivenessScore || 0).toFixed(1)}%</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs ${group.effectiveness?.effectivenessRating === 'Excellent' ? 'bg-green-100 text-green-800' :
                            group.effectiveness?.effectivenessRating === 'Good' ? 'bg-blue-100 text-blue-800' :
                              group.effectiveness?.effectivenessRating === 'Fair' ? 'bg-yellow-100 text-yellow-800' :
                                group.effectiveness?.effectivenessRating === 'Poor' ? 'bg-orange-100 text-orange-800' :
                                  'bg-red-100 text-red-800'
                          }`}>
                          {group.effectiveness?.effectivenessRating || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">{group.effectiveness?.totalUsers || 0}</td>
                      <td className="px-4 py-3 text-right">{group.effectiveness?.activeUsers || 0}</td>
                      <td className="px-4 py-3 text-right">{(group.effectiveness?.activityRate || 0).toFixed(1)}%</td>
                      <td className="px-4 py-3 text-right">{(group.effectiveness?.retentionRate || 0).toFixed(1)}%</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs ${group.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {group.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {data.topPerformingGroupPermissions && data.topPerformingGroupPermissions.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Top Performing Group Permissions</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {data.topPerformingGroupPermissions.map((group: any, index: number) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-600">{group.effectivenessScore}</div>
                  <div className="text-sm text-gray-600 mt-1">{group.name}</div>
                  <div className="text-xs text-gray-500 mt-2">
                    {group.totalUsers} users • {group.activityRate}% activity
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Rating: {group.effectivenessRating}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.complexityVsEffectiveness && data.complexityVsEffectiveness.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Complexity vs Effectiveness Analysis</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Group Name</th>
                    <th className="px-4 py-3 text-right font-medium">Permission Count</th>
                    <th className="px-4 py-3 text-right font-medium">User Count</th>
                    <th className="px-4 py-3 text-right font-medium">Effectiveness Score</th>
                  </tr>
                </thead>
                <tbody>
                  {data.complexityVsEffectiveness.map((item: any, index: number) => (
                    <tr key={index} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">{item.name || 'N/A'}</td>
                      <td className="px-4 py-3 text-right">{item.permissionCount || 0}</td>
                      <td className="px-4 py-3 text-right">{item.userCount || 0}</td>
                      <td className="px-4 py-3 text-right">{(item.effectivenessScore || 0).toFixed(1)}%</td>
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
    if (!data?.groupPermissions) return null;

    const tableData = data.groupPermissions.map((group: any) => ({
      groupName: group.name || 'Unknown',
      description: group.description || 'N/A',
      effectivenessScore: `${(group.effectiveness?.overallEffectivenessScore || 0).toFixed(1)}%`,
      effectivenessRating: group.effectiveness?.effectivenessRating || 'N/A',
      utilizationScore: `${(group.effectiveness?.utilizationScore || 0).toFixed(1)}%`,
      activityScore: `${(group.effectiveness?.activityScore || 0).toFixed(1)}%`,
      retentionScore: `${(group.effectiveness?.retentionScore || 0).toFixed(1)}%`,
      totalUsers: group.effectiveness?.totalUsers || 0,
      activeUsers: group.effectiveness?.activeUsers || 0,
      activityRate: `${(group.effectiveness?.activityRate || 0).toFixed(1)}%`,
      retentionRate: `${(group.effectiveness?.retentionRate || 0).toFixed(1)}%`,
      permissionCount: group.permissionCount || 0,
      avgDaysSinceLastLogin: group.effectiveness?.avgDaysSinceLastLogin ? `${group.effectiveness.avgDaysSinceLastLogin.toFixed(1)} days` : 'N/A',
      isActive: group.isActive ? 'Active' : 'Inactive',
    }));

    const columns = [
      { key: 'groupName', label: 'Group Name' },
      { key: 'description', label: 'Description' },
      { key: 'effectivenessScore', label: 'Effectiveness Score' },
      { key: 'effectivenessRating', label: 'Rating' },
      { key: 'utilizationScore', label: 'Utilization' },
      { key: 'activityScore', label: 'Activity' },
      { key: 'retentionScore', label: 'Retention' },
      { key: 'totalUsers', label: 'Total Users' },
      { key: 'activeUsers', label: 'Active Users' },
      { key: 'activityRate', label: 'Activity Rate' },
      { key: 'retentionRate', label: 'Retention Rate' },
      { key: 'permissionCount', label: 'Permissions' },
      { key: 'avgDaysSinceLastLogin', label: 'Avg Days Since Login' },
      { key: 'isActive', label: 'Status' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Group Permission Effectiveness"
      subtitle="Permission group effectiveness and utilization"
      icon={<ShieldCheck className="h-5 w-5" />}
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

export default GroupPermissionEffectivenessReport;
