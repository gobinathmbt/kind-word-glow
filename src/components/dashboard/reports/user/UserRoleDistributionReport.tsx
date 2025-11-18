import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { ComparisonChart } from '@/components/dashboard/charts/ComparisonChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Users, Shield, UserCog, Award } from 'lucide-react';

interface UserRoleDistributionReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const UserRoleDistributionReport: React.FC<UserRoleDistributionReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getUserRoleDistribution(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load role distribution data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting role distribution report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data) return null;
    
    const overallStats = data.overallStats || {};
    const roleDistribution = data.roleDistribution || [];
    
    const totalUsers = overallStats.totalUsers || 0;
    const uniqueRoles = overallStats.uniqueRoleCount || roleDistribution.length;
    const primaryAdmins = overallStats.totalPrimaryAdmins || 0;
    const activeUsers = overallStats.totalActiveUsers || 0;

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Users"
          value={totalUsers}
          icon={<Users className="h-5 w-5" />}
          subtitle={`${activeUsers} active`}
        />
        <MetricCard
          title="Unique Roles"
          value={uniqueRoles}
          icon={<Shield className="h-5 w-5" />}
        />
        <MetricCard
          title="Primary Admins"
          value={primaryAdmins}
          icon={<UserCog className="h-5 w-5" />}
        />
        <MetricCard
          title="Active Rate"
          value={`${overallStats.activeRate || 0}%`}
          icon={<Award className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    // Color palettes for different charts
    const roleColors = ['#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#10b981', '#f59e0b', '#ef4444'];
    const statusColors = ['#10b981', '#ef4444'];
    const permissionColors = ['#8b5cf6', '#ec4899', '#14b8a6'];

    const roleDistribution = data.roleDistribution || [];
    const dealershipAssignment = data.dealershipAssignmentByRole || [];
    const permissionComplexity = data.permissionComplexityByRole || [];

    // Role Distribution Pie Chart
    const roleData: PieChartData[] = roleDistribution.map((item: any, index: number) => ({
      name: item._id || 'Unknown',
      value: item.totalUsers || 0,
      label: `${item.totalUsers || 0} users`,
      color: roleColors[index % roleColors.length],
    }));

    // Active vs Inactive by Role
    const statusByRoleData = roleDistribution.map((item: any) => ({
      name: item._id || 'Unknown',
      active: item.activeUsers || 0,
      inactive: item.inactiveUsers || 0,
    }));

    // Login Rate by Role
    const loginRateData = roleDistribution
      .sort((a: any, b: any) => (b.loginRate || 0) - (a.loginRate || 0))
      .map((item: any, index: number) => ({
        name: item._id || 'Unknown',
        value: item.loginRate || 0,
        label: `${(item.loginRate || 0).toFixed(1)}%`,
        color: roleColors[index % roleColors.length],
      }));

    // Permission Complexity by Role
    const permissionData = permissionComplexity.map((item: any) => ({
      name: item._id || 'Unknown',
      avgPermissions: item.avgPermissions || 0,
      avgModuleAccess: item.avgModuleAccess || 0,
      maxPermissions: item.maxPermissions || 0,
    }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Role Distribution</h4>
            <InteractivePieChart data={roleData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Active vs Inactive by Role</h4>
            <StackedBarChart
              data={statusByRoleData}
              xAxisKey="name"
              series={[
                { dataKey: 'active', name: 'Active', color: statusColors[0] },
                { dataKey: 'inactive', name: 'Inactive', color: statusColors[1] },
              ]}
              height={300}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (!data) return null;

    const roleDistribution = data.roleDistribution || [];

    const columns = [
      { key: 'role', label: 'Role' },
      { key: 'totalUsers', label: 'Total Users' },
      { key: 'activeUsers', label: 'Active' },
      { key: 'inactiveUsers', label: 'Inactive' },
      { key: 'primaryAdmins', label: 'Primary Admins' },
      { key: 'usersWithLogin', label: 'With Login' },
      { key: 'usersWithGroupPermissions', label: 'With Group Perms' },
      { key: 'avgDealershipCount', label: 'Avg Dealerships' },
      { key: 'avgPermissionCount', label: 'Avg Permissions' },
      { key: 'avgModuleAccessCount', label: 'Avg Module Access' },
      { key: 'activeRate', label: 'Active Rate %' },
      { key: 'loginRate', label: 'Login Rate %' },
      { key: 'groupPermissionRate', label: 'Group Perm Rate %' },
    ];

    const tableData = roleDistribution.map((role: any) => ({
      role: role._id || 'Unknown',
      totalUsers: role.totalUsers || 0,
      activeUsers: role.activeUsers || 0,
      inactiveUsers: role.inactiveUsers || 0,
      primaryAdmins: role.primaryAdmins || 0,
      usersWithLogin: role.usersWithLogin || 0,
      usersWithGroupPermissions: role.usersWithGroupPermissions || 0,
      avgDealershipCount: (role.avgDealershipCount || 0).toFixed(1),
      avgPermissionCount: (role.avgPermissionCount || 0).toFixed(1),
      avgModuleAccessCount: (role.avgModuleAccessCount || 0).toFixed(1),
      activeRate: `${(role.activeRate || 0).toFixed(1)}%`,
      loginRate: `${(role.loginRate || 0).toFixed(1)}%`,
      groupPermissionRate: `${(role.groupPermissionRate || 0).toFixed(1)}%`,
    }));

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="User Role Distribution"
      subtitle="Role-based user analysis"
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

export default UserRoleDistributionReport;
