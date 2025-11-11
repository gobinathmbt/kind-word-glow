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
}

export const GroupPermissionUsageReport: React.FC<GroupPermissionUsageReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getGroupPermissionUsage(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load group permission usage data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting group permission usage as ${format}`);
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
          title="Total Groups"
          value={summary.totalGroups || 0}
          icon={<Shield className="h-5 w-5" />}
        />
        <MetricCard
          title="Active Groups"
          value={summary.activeGroups || 0}
          icon={<Activity className="h-5 w-5" />}
        />
        <MetricCard
          title="Total Users"
          value={summary.totalUsers || 0}
          icon={<Users className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Users/Group"
          value={(summary.avgUsersPerGroup || 0).toFixed(1)}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const groupData: PieChartData[] = data.groups?.slice(0, 10).map((item: any) => ({
      name: item.groupName || 'Unknown',
      value: item.userCount || 0,
    })) || [];

    const usageData = data.groups?.slice(0, 10).map((group: any) => ({
      name: group.groupName || 'Unknown',
      users: group.userCount || 0,
      permissions: group.permissionCount || 0,
    })) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Top 10 Groups by Users</h4>
            <InteractivePieChart data={groupData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Group Usage</h4>
            <StackedBarChart
              data={usageData}
              xAxisKey="name"
              series={[
                { dataKey: 'users', name: 'Users', color: '#3b82f6' },
                { dataKey: 'permissions', name: 'Permissions', color: '#10b981' },
              ]}
              height={300}
            />
          </div>
        </div>

        {data.groups && data.groups.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Group Details</h4>
            <DataTable
              columns={[
                { key: 'groupName', label: 'Group' },
                { key: 'users', label: 'Users' },
                { key: 'permissions', label: 'Permissions' },
                { key: 'modules', label: 'Modules' },
                { key: 'status', label: 'Status' },
              ]}
              data={data.groups.slice(0, 20).map((group: any) => ({
                groupName: group.groupName || 'N/A',
                users: group.userCount || 0,
                permissions: group.permissionCount || 0,
                modules: group.moduleCount || 0,
                status: group.isActive ? 'Active' : 'Inactive',
              }))}
            />
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.groups) return null;

    const tableData = data.groups.map((group: any) => ({
      groupName: group.groupName || 'Unknown',
      userCount: group.userCount || 0,
      permissionCount: group.permissionCount || 0,
      moduleCount: group.moduleCount || 0,
      usagePercentage: `${group.usagePercentage || 0}%`,
      isActive: group.isActive ? 'Active' : 'Inactive',
    }));

    const columns = [
      { key: 'groupName', label: 'Group' },
      { key: 'userCount', label: 'Users' },
      { key: 'permissionCount', label: 'Permissions' },
      { key: 'moduleCount', label: 'Modules' },
      { key: 'usagePercentage', label: 'Usage %' },
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
