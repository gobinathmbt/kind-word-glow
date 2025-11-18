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
import { Shield, Key, Lock, Unlock } from 'lucide-react';

interface UserPermissionUtilizationReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
  shouldLoad?: boolean;
}

export const UserPermissionUtilizationReport: React.FC<UserPermissionUtilizationReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getUserPermissionUtilization(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load permission utilization data');
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
    console.log(`Exporting permission utilization report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data) return null;
    
    const permissionStats = data.permissionStats || {};
    const totalUsers = permissionStats.totalUsers || 0;
    const usersWithPermissions = permissionStats.usersWithPermissions || 0;
    const totalPermissions = permissionStats.totalPermissions || 0;
    const avgPermissions = permissionStats.avgPermissionsPerUser || 0;
    const permissionCoverage = permissionStats.permissionCoverage || 0;

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Permissions"
          value={totalPermissions}
          icon={<Shield className="h-5 w-5" />}
          subtitle={`${usersWithPermissions}/${totalUsers} users`}
        />
        <MetricCard
          title="Permission Coverage"
          value={`${permissionCoverage}%`}
          icon={<Unlock className="h-5 w-5" />}
        />
        <MetricCard
          title="Module Access Coverage"
          value={`${permissionStats.moduleAccessCoverage || 0}%`}
          icon={<Lock className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Permissions/User"
          value={avgPermissions.toFixed(1)}
          icon={<Key className="h-5 w-5" />}
          subtitle={`${(permissionStats.avgModuleAccessPerUser || 0).toFixed(1)} avg modules`}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    // Color palettes
    const distributionColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    const moduleColors = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5', '#059669', '#047857', '#065f46'];
    const roleColors = ['#3b82f6', '#8b5cf6'];

    const permissionDistribution = data.permissionDistribution || [];
    const commonModuleAccess = data.commonModuleAccess || [];
    const permissionByRole = data.permissionByRole || [];

    // Permission Distribution
    const distributionData: PieChartData[] = permissionDistribution.map((item: any, index: number) => ({
      name: item._id === 0 ? 'No Permissions' : `${item._id} Permission${item._id > 1 ? 's' : ''}`,
      value: item.count || 0,
      label: `${item.count || 0} users`,
      color: distributionColors[index % distributionColors.length],
    }));

    // Top Module Access
    const topModules = commonModuleAccess
      .sort((a: any, b: any) => (b.userCount || 0) - (a.userCount || 0))
      .slice(0, 10)
      .map((module: any, index: number) => ({
        name: module.module || module._id || 'Unknown',
        value: module.userCount || 0,
        label: `${module.userCount || 0} users`,
        color: moduleColors[index % moduleColors.length],
      }));

    // Permission by Role
    const rolePermissionData = permissionByRole.map((role: any) => ({
      name: role._id || 'Unknown',
      avgPermissions: role.avgPermissions || 0,
      avgModuleAccess: role.avgModuleAccess || 0,
      withPermissions: role.totalUsers - (role.usersWithNoPermissions || 0),
      withoutPermissions: role.usersWithNoPermissions || 0,
    }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Permission Distribution</h4>
            <InteractivePieChart data={distributionData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Users by Permission Count</h4>
            <StackedBarChart
              data={rolePermissionData}
              xAxisKey="name"
              series={[
                { dataKey: 'withPermissions', name: 'With Permissions', color: roleColors[0] },
                { dataKey: 'withoutPermissions', name: 'Without Permissions', color: roleColors[1] },
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

    const userPermissionProfiles = data.userPermissionProfiles || [];

    const columns = [
      { key: 'userName', label: 'User' },
      { key: 'email', label: 'Email' },
      { key: 'role', label: 'Role' },
      { key: 'permissionCount', label: 'Permissions' },
      { key: 'moduleAccessCount', label: 'Module Access' },
      { key: 'groupPermissionName', label: 'Group Permission' },
      { key: 'hasGroupPermissions', label: 'Has Group Perms' },
      { key: 'isActive', label: 'Active' },
    ];

    const tableData = userPermissionProfiles.map((user: any) => ({
      userName: user.fullName || user.username || 'Unknown',
      email: user.email || 'N/A',
      role: user.role || 'N/A',
      permissionCount: user.permissionCount || 0,
      moduleAccessCount: user.moduleAccessCount || 0,
      groupPermissionName: user.groupPermissionName || 'None',
      hasGroupPermissions: user.hasGroupPermissions ? 'Yes' : 'No',
      isActive: user.is_active ? 'Yes' : 'No',
    }));

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="User Permission Utilization"
      subtitle="Permission and module access usage"
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

export default UserPermissionUtilizationReport;
