import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { ComparisonChart } from '@/components/dashboard/charts/ComparisonChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { LogIn, Clock, Shield, TrendingUp, Users } from 'lucide-react';

interface UserLoginPatternsReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
  shouldLoad?: boolean;
}

export const UserLoginPatternsReport: React.FC<UserLoginPatternsReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getUserLoginPatterns(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load login patterns data');
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
    console.log(`Exporting login patterns report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data) return null;
    
    const userLoginDetails = data.userLoginDetails || [];
    const securityMetrics = data.securityMetrics || {};
    const roleLoginPatterns = data.roleLoginPatterns || [];
    
    const totalUsers = securityMetrics.totalUsers || userLoginDetails.length;
    const usersWithLogin = userLoginDetails.filter((u: any) => u.hasLoggedIn).length;
    const activeUsers = userLoginDetails.filter((u: any) => u.activityStatus === 'Active').length;
    const avgDaysSinceLogin = userLoginDetails.length > 0
      ? (userLoginDetails.reduce((sum: number, u: any) => sum + (u.daysSinceLastLogin || 0), 0) / userLoginDetails.length).toFixed(1)
      : '0.0';

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Users"
          value={totalUsers}
          icon={<Users className="h-5 w-5" />}
          subtitle={`${usersWithLogin} with login`}
        />
        <MetricCard
          title="Active Users"
          value={activeUsers}
          icon={<LogIn className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Days Since Login"
          value={avgDaysSinceLogin}
          icon={<Clock className="h-5 w-5" />}
        />
        <MetricCard
          title="Locked Accounts"
          value={securityMetrics.lockedAccounts || 0}
          icon={<Shield className="h-5 w-5" />}
          subtitle={`${securityMetrics.lockRate || 0}% lock rate`}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    // Color palettes for different charts
    const frequencyColors = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0'];
    const activityColors = ['#10b981', '#f59e0b', '#ef4444'];
    const roleColors = ['#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

    const userLoginDetails = data.userLoginDetails || [];
    const frequencyDistribution = data.frequencyDistribution || [];
    const roleLoginPatterns = data.roleLoginPatterns || [];

    // Login Frequency Distribution
    const frequencyData: PieChartData[] = frequencyDistribution.map((item: any, index: number) => ({
      name: item.category || 'Unknown',
      value: item.count || 0,
      label: `${item.count || 0} users`,
      color: frequencyColors[index % frequencyColors.length],
    }));

    // Activity Status Distribution
    const activityStatusMap = new Map();
    userLoginDetails.forEach((user: any) => {
      const status = user.activityStatus || 'Inactive';
      activityStatusMap.set(status, (activityStatusMap.get(status) || 0) + 1);
    });

    const activityData: PieChartData[] = Array.from(activityStatusMap.entries()).map(([status, count], index) => ({
      name: status,
      value: count as number,
      label: `${count} users`,
      color: activityColors[index % activityColors.length],
    }));

    // Role Login Patterns
    const rolePatternData = roleLoginPatterns
      .sort((a: any, b: any) => (b.activityRate || 0) - (a.activityRate || 0))
      .map((role: any, index: number) => ({
        name: role._id || 'Unknown',
        value: role.activityRate || 0,
        label: `${(role.activityRate || 0).toFixed(1)}%`,
        color: roleColors[index % roleColors.length],
      }));

    const roleComparisonData = roleLoginPatterns.map((role: any) => ({
      name: role._id || 'Unknown',
      totalUsers: role.totalUsers || 0,
      activeUsers: role.activeUsers || 0,
      recentlyActive: role.recentlyActive || 0,
    }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Login Frequency Distribution</h4>
            <InteractivePieChart data={frequencyData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Activity Status Distribution</h4>
            <InteractivePieChart data={activityData} height={300} />
          </div>
        </div>
        {rolePatternData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Activity Rate by Role</h4>
            <ComparisonChart data={rolePatternData} height={300} />
          </div>
        )}
        {roleComparisonData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">User Activity by Role</h4>
            <StackedBarChart
              data={roleComparisonData}
              xAxisKey="name"
              series={[
                { dataKey: 'totalUsers', name: 'Total Users', color: '#3b82f6' },
                { dataKey: 'activeUsers', name: 'Active Users', color: '#10b981' },
                { dataKey: 'recentlyActive', name: 'Recently Active', color: '#f59e0b' },
              ]}
              height={300}
            />
          </div>
        )}
        {roleLoginPatterns.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Role Login Patterns</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Role</th>
                    <th className="px-4 py-3 text-right font-medium">Total Users</th>
                    <th className="px-4 py-3 text-right font-medium">Users with Login</th>
                    <th className="px-4 py-3 text-right font-medium">Active Users</th>
                    <th className="px-4 py-3 text-right font-medium">Recently Active</th>
                    <th className="px-4 py-3 text-right font-medium">Avg Days Since Login</th>
                    <th className="px-4 py-3 text-right font-medium">Login Rate</th>
                    <th className="px-4 py-3 text-right font-medium">Activity Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {roleLoginPatterns.map((role: any, index: number) => (
                    <tr key={index} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">{role._id || 'Unknown'}</td>
                      <td className="px-4 py-3 text-right">{role.totalUsers || 0}</td>
                      <td className="px-4 py-3 text-right">{role.usersWithLogin || 0}</td>
                      <td className="px-4 py-3 text-right">{role.activeUsers || 0}</td>
                      <td className="px-4 py-3 text-right">{role.recentlyActive || 0}</td>
                      <td className="px-4 py-3 text-right">{(role.avgDaysSinceLastLogin || 0).toFixed(1)}</td>
                      <td className="px-4 py-3 text-right">{(role.loginRate || 0).toFixed(1)}%</td>
                      <td className="px-4 py-3 text-right">{(role.activityRate || 0).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {userLoginDetails.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">User Login Details</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">User</th>
                    <th className="px-4 py-3 text-left font-medium">Role</th>
                    <th className="px-4 py-3 text-left font-medium">Last Login</th>
                    <th className="px-4 py-3 text-right font-medium">Days Since Login</th>
                    <th className="px-4 py-3 text-left font-medium">Login Frequency</th>
                    <th className="px-4 py-3 text-left font-medium">Activity Status</th>
                    <th className="px-4 py-3 text-right font-medium">Login Attempts</th>
                    <th className="px-4 py-3 text-center font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {userLoginDetails.map((user: any, index: number) => (
                    <tr key={index} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium">{user.username || 'Unknown'}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </td>
                      <td className="px-4 py-3">{user.role || 'N/A'}</td>
                      <td className="px-4 py-3">
                        {user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
                      </td>
                      <td className="px-4 py-3 text-right">{(user.daysSinceLastLogin || 0).toFixed(1)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                          user.loginFrequency === 'Daily' ? 'bg-green-100 text-green-800' :
                          user.loginFrequency === 'Weekly' ? 'bg-blue-100 text-blue-800' :
                          user.loginFrequency === 'Monthly' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {user.loginFrequency || 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                          user.activityStatus === 'Active' ? 'bg-green-100 text-green-800' :
                          user.activityStatus === 'Moderately Active' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {user.activityStatus || 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">{user.login_attempts || 0}</td>
                      <td className="px-4 py-3 text-center">
                        {user.isLocked ? (
                          <span className="inline-flex px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                            Locked
                          </span>
                        ) : user.is_active ? (
                          <span className="inline-flex px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                            Inactive
                          </span>
                        )}
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
    if (!data) return null;

    const userLoginDetails = data.userLoginDetails || [];

    const columns = [
      { key: 'userName', label: 'User' },
      { key: 'email', label: 'Email' },
      { key: 'role', label: 'Role' },
      { key: 'lastLogin', label: 'Last Login' },
      { key: 'daysSinceLastLogin', label: 'Days Since Login' },
      { key: 'daysSinceCreation', label: 'Days Since Creation' },
      { key: 'loginFrequency', label: 'Login Frequency' },
      { key: 'activityStatus', label: 'Activity Status' },
      { key: 'loginAttempts', label: 'Login Attempts' },
      { key: 'hasLoggedIn', label: 'Has Logged In' },
      { key: 'isLocked', label: 'Is Locked' },
      { key: 'isActive', label: 'Is Active' },
    ];

    const tableData = userLoginDetails.map((user: any) => ({
      userName: user.username || 'Unknown',
      email: user.email || 'N/A',
      role: user.role || 'N/A',
      lastLogin: user.last_login ? new Date(user.last_login).toLocaleString() : 'Never',
      daysSinceLastLogin: (user.daysSinceLastLogin || 0).toFixed(1),
      daysSinceCreation: (user.daysSinceCreation || 0).toFixed(1),
      loginFrequency: user.loginFrequency || 'Inactive',
      activityStatus: user.activityStatus || 'Inactive',
      loginAttempts: user.login_attempts || 0,
      hasLoggedIn: user.hasLoggedIn ? 'Yes' : 'No',
      isLocked: user.isLocked ? 'Yes' : 'No',
      isActive: user.is_active ? 'Yes' : 'No',
    }));

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="User Login Patterns"
      subtitle="Login frequency and session duration"
      icon={<LogIn className="h-5 w-5" />}
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

export default UserLoginPatternsReport;
