import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Users, Shield, UserCog } from 'lucide-react';

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
      setData(response.data);
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
    if (!data?.metrics) return null;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Users"
          value={data.metrics.totalUsers || 0}
          icon={<Users className="h-5 w-5" />}
        />
        <MetricCard
          title="Total Roles"
          value={data.metrics.totalRoles || 0}
          icon={<Shield className="h-5 w-5" />}
        />
        <MetricCard
          title="Admins"
          value={data.metrics.adminCount || 0}
          icon={<UserCog className="h-5 w-5" />}
        />
        <MetricCard
          title="Regular Users"
          value={data.metrics.regularUserCount || 0}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const roleData: PieChartData[] = data.roleDistribution?.map((item: any) => ({
      name: item.role,
      value: item.count,
    })) || [];

    const statusByRoleData = data.statusByRole || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Role Distribution</h4>
            <InteractivePieChart data={roleData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Status by Role</h4>
            <StackedBarChart
              data={statusByRoleData}
              xAxisKey="role"
              series={[
                { dataKey: 'active', name: 'Active' },
                { dataKey: 'inactive', name: 'Inactive' },
              ]}
              height={300}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.tableData) return null;

    const columns = [
      { key: 'role', label: 'Role' },
      { key: 'totalUsers', label: 'Total Users' },
      { key: 'activeUsers', label: 'Active' },
      { key: 'inactiveUsers', label: 'Inactive' },
      { key: 'percentage', label: 'Percentage' },
    ];

    return <DataTable columns={columns} data={data.tableData} />;
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
