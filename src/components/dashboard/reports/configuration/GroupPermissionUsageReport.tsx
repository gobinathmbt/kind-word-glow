import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Shield, TrendingUp, Activity, Users } from 'lucide-react';

interface GroupPermissionUsageReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
  shouldLoad?: boolean;
}

export const GroupPermissionUsageReport: React.FC<GroupPermissionUsageReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getGroupPermissionUsage(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load group permission usage data');
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
    console.log(`Exporting group permission usage as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.overallStatistics) return null;
    const stats = data.overallStatistics;
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Group Permissions"
          value={stats.totalGroupPermissions || 0}
          icon={<Shield className="h-5 w-5" />}
          subtitle={`${stats.activeGroupPermissions || 0} active`}
        />
        <MetricCard
          title="Total Assigned Users"
          value={stats.totalAssignedUsers || 0}
          icon={<Users className="h-5 w-5" />}
          subtitle={`${stats.usersWithoutGroupPermissions || 0} without groups`}
        />
        <MetricCard
          title="Avg Users/Group"
          value={(stats.avgUsersPerGroup || 0).toFixed(1)}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="Coverage Rate"
          value={`${stats.groupPermissionCoverage || 0}%`}
          icon={<Activity className="h-5 w-5" />}
          subtitle={`${stats.totalUsers || 0} total users`}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    // Color palettes for different charts
    const userColors = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5', '#059669', '#047857', '#065f46', '#064e3b', '#022c22'];

    const groupData: PieChartData[] = data.groupPermissions?.slice(0, 10).map((item: any, index: number) => ({
      name: item.name || 'Unknown',
      value: item.usage?.totalAssignedUsers || 0,
      color: userColors[index % userColors.length],
    })) || [];

    const usageData = data.groupPermissions?.slice(0, 10).map((group: any) => ({
      name: group.name || 'Unknown',
      users: group.usage?.totalAssignedUsers || 0,
      permissions: group.permissionCount || 0,
    })) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Top Groups by Assigned Users</h4>
            <InteractivePieChart data={groupData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Group Usage Overview</h4>
            <StackedBarChart
              data={usageData}
              xAxisKey="name"
              series={[
                { dataKey: 'users', name: 'Users', color: '#10b981' },
                { dataKey: 'permissions', name: 'Permissions', color: '#3b82f6' },
              ]}
              height={300}
            />
          </div>
        </div>

        {data.groupPermissions && data.groupPermissions.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Group Permission Details</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Group Name</th>
                    <th className="px-4 py-3 text-left font-medium">Description</th>
                    <th className="px-4 py-3 text-right font-medium">Total Users</th>
                    <th className="px-4 py-3 text-right font-medium">Active Users</th>
                    <th className="px-4 py-3 text-right font-medium">Permissions</th>
                    <th className="px-4 py-3 text-right font-medium">Activity Rate</th>
                    <th className="px-4 py-3 text-center font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.groupPermissions.map((group: any, index: number) => (
                    <tr key={index} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">{group.name || 'N/A'}</td>
                      <td className="px-4 py-3">{group.description || 'N/A'}</td>
                      <td className="px-4 py-3 text-right">{group.usage?.totalAssignedUsers || 0}</td>
                      <td className="px-4 py-3 text-right">{group.usage?.activeAssignedUsers || 0}</td>
                      <td className="px-4 py-3 text-right">{group.permissionCount || 0}</td>
                      <td className="px-4 py-3 text-right">{(group.usage?.activityRate || 0).toFixed(1)}%</td>
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

        {data.mostPopularGroupPermissions && data.mostPopularGroupPermissions.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Most Popular Group Permissions</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {data.mostPopularGroupPermissions.map((group: any, index: number) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-600">{group.userCount}</div>
                  <div className="text-sm text-gray-600 mt-1">{group.name}</div>
                  {group.activeUserCount !== undefined && (
                    <div className="text-xs text-gray-500 mt-2">
                      {group.activeUserCount} active users • {group.permissionCount} permissions
                    </div>
                  )}
                  {group.activityRate !== undefined && (
                    <div className="text-xs text-gray-500 mt-1">
                      {group.activityRate}% activity rate
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {data.permissionComplexity && data.permissionComplexity.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Permission Complexity Analysis</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Group Name</th>
                    <th className="px-4 py-3 text-right font-medium">Permission Count</th>
                    <th className="px-4 py-3 text-right font-medium">User Count</th>
                    <th className="px-4 py-3 text-center font-medium">Complexity</th>
                  </tr>
                </thead>
                <tbody>
                  {data.permissionComplexity.map((item: any, index: number) => (
                    <tr key={index} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">{item.name || 'N/A'}</td>
                      <td className="px-4 py-3 text-right">{item.permissionCount || 0}</td>
                      <td className="px-4 py-3 text-right">{item.userCount || 0}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs ${
                          item.complexity === 'Low' ? 'bg-green-100 text-green-800' :
                          item.complexity === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {item.complexity}
                        </span>
                      </td>
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
      totalUsers: group.usage?.totalAssignedUsers || 0,
      activeUsers: group.usage?.activeAssignedUsers || 0,
      inactiveUsers: group.usage?.inactiveAssignedUsers || 0,
      permissionCount: group.permissionCount || 0,
      dealershipCount: group.dealershipCount || 0,
      assignmentRate: `${group.usage?.assignmentRate || 0}%`,
      activityRate: `${group.usage?.activityRate || 0}%`,
      usersWithRecentLogin: group.usage?.usersWithRecentLogin || 0,
      createdBy: group.createdBy?.name || 'N/A',
      isActive: group.isActive ? 'Active' : 'Inactive',
    }));

    const columns = [
      { key: 'groupName', label: 'Group Name' },
      { key: 'description', label: 'Description' },
      { key: 'totalUsers', label: 'Total Users' },
      { key: 'activeUsers', label: 'Active Users' },
      { key: 'inactiveUsers', label: 'Inactive Users' },
      { key: 'permissionCount', label: 'Permissions' },
      { key: 'dealershipCount', label: 'Dealerships' },
      { key: 'assignmentRate', label: 'Assignment Rate' },
      { key: 'activityRate', label: 'Activity Rate' },
      { key: 'usersWithRecentLogin', label: 'Recent Logins' },
      { key: 'createdBy', label: 'Created By' },
      { key: 'isActive', label: 'Status' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Group Permission Usage"
      subtitle="Permission group assignment and usage"
      icon={<Shield className="h-5 w-5" />}
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

export default GroupPermissionUsageReport;
