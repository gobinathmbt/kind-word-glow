import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
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
}

export const UserPermissionUtilizationReport: React.FC<UserPermissionUtilizationReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getUserPermissionUtilization(params);
      setData(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load permission utilization data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting permission utilization report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.metrics) return null;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Permissions"
          value={data.metrics.totalPermissions || 0}
          icon={<Shield className="h-5 w-5" />}
        />
        <MetricCard
          title="Active Permissions"
          value={data.metrics.activePermissions || 0}
          icon={<Unlock className="h-5 w-5" />}
        />
        <MetricCard
          title="Unused Permissions"
          value={data.metrics.unusedPermissions || 0}
          icon={<Lock className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Permissions per User"
          value={data.metrics.avgPermissionsPerUser || 0}
          icon={<Key className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const permissionData: PieChartData[] = data.permissionDistribution?.map((item: any) => ({
      name: item.module,
      value: item.count,
    })) || [];

    const utilizationData = data.utilizationByRole || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Permission Distribution by Module</h4>
            <InteractivePieChart data={permissionData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Utilization by Role</h4>
            <StackedBarChart
              data={utilizationData}
              xAxisKey="role"
              series={[
                { dataKey: 'used', name: 'Used' },
                { dataKey: 'unused', name: 'Unused' },
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
      { key: 'module', label: 'Module' },
      { key: 'totalPermissions', label: 'Total' },
      { key: 'activePermissions', label: 'Active' },
      { key: 'unusedPermissions', label: 'Unused' },
      { key: 'utilizationRate', label: 'Utilization %' },
    ];

    return <DataTable columns={columns} data={data.tableData} />;
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
