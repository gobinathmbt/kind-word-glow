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
    if (!data?.summary) return null;
    const summary = data.summary;
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Groups"
          value={summary.totalGroups || 0}
          icon={<ShieldCheck className="h-5 w-5" />}
        />
        <MetricCard
          title="Effective Groups"
          value={summary.effectiveGroups || 0}
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Effectiveness"
          value={`${summary.avgEffectiveness || 0}%`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Utilization"
          value={`${summary.avgUtilization || 0}%`}
          icon={<Activity className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const effectivenessData: PieChartData[] = [
      { name: 'High', value: data.summary?.effectivenessDistribution?.high || 0, color: '#10b981' },
      { name: 'Medium', value: data.summary?.effectivenessDistribution?.medium || 0, color: '#f59e0b' },
      { name: 'Low', value: data.summary?.effectivenessDistribution?.low || 0, color: '#ef4444' },
    ];

    const groupData = data.groups?.slice(0, 10).map((group: any) => ({
      name: group.groupName || 'Unknown',
      effectiveness: group.effectivenessScore || 0,
      utilization: group.utilizationRate || 0,
    })) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Effectiveness Distribution</h4>
            <InteractivePieChart data={effectivenessData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Top 10 by Effectiveness</h4>
            <StackedBarChart
              data={groupData}
              xAxisKey="name"
              series={[
                { dataKey: 'effectiveness', name: 'Effectiveness %', color: '#3b82f6' },
                { dataKey: 'utilization', name: 'Utilization %', color: '#10b981' },
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
                { key: 'effectiveness', label: 'Effectiveness' },
                { key: 'utilization', label: 'Utilization' },
                { key: 'users', label: 'Users' },
                { key: 'status', label: 'Status' },
              ]}
              data={data.groups.slice(0, 20).map((group: any) => ({
                groupName: group.groupName || 'N/A',
                effectiveness: `${group.effectivenessScore || 0}%`,
                utilization: `${group.utilizationRate || 0}%`,
                users: group.userCount || 0,
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
      effectivenessScore: `${group.effectivenessScore || 0}%`,
      utilizationRate: `${group.utilizationRate || 0}%`,
      userCount: group.userCount || 0,
      permissionCount: group.permissionCount || 0,
      accessCount: group.accessCount || 0,
      isActive: group.isActive ? 'Active' : 'Inactive',
    }));

    const columns = [
      { key: 'groupName', label: 'Group' },
      { key: 'effectivenessScore', label: 'Effectiveness' },
      { key: 'utilizationRate', label: 'Utilization' },
      { key: 'userCount', label: 'Users' },
      { key: 'permissionCount', label: 'Permissions' },
      { key: 'accessCount', label: 'Access Count' },
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
