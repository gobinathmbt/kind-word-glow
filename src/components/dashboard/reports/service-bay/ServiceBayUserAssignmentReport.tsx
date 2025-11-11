import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Users, TrendingUp, Activity, AlertTriangle, CheckCircle } from 'lucide-react';

interface ServiceBayUserAssignmentReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const ServiceBayUserAssignmentReport: React.FC<ServiceBayUserAssignmentReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getServiceBayUserAssignment(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load service bay user assignment data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting service bay user assignment as ${format}`);
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
          title="Total Users"
          value={summary.totalUsers || 0}
          icon={<Users className="h-5 w-5" />}
        />
        <MetricCard
          title="Total Bays"
          value={summary.totalBays || 0}
          icon={<Activity className="h-5 w-5" />}
        />
        <MetricCard
          title="Unstaffed Bays"
          value={summary.unstaffedBays || 0}
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Users/Bay"
          value={(summary.avgUsersPerBay || 0).toFixed(1)}
          icon={<Users className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Bays/User"
          value={(summary.avgBaysPerUser || 0).toFixed(1)}
          icon={<Activity className="h-5 w-5" />}
        />
        <MetricCard
          title="Total Bookings"
          value={summary.totalBookings || 0}
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Workload/User"
          value={(summary.avgWorkloadPerUser || 0).toFixed(1)}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="Balance Score"
          value={`${summary.workloadBalance?.score || 0}%`}
          icon={<Activity className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const workloadDistData: PieChartData[] = data.summary?.workloadDistribution ? [
      { name: 'High Workload', value: data.summary.workloadDistribution.high || 0, color: '#ef4444' },
      { name: 'Medium Workload', value: data.summary.workloadDistribution.medium || 0, color: '#f59e0b' },
      { name: 'Low Workload', value: data.summary.workloadDistribution.low || 0, color: '#10b981' },
    ] : [];

    const productivityData: PieChartData[] = data.summary?.productivityDistribution ? [
      { name: 'High Productivity', value: data.summary.productivityDistribution.high || 0, color: '#10b981' },
      { name: 'Medium Productivity', value: data.summary.productivityDistribution.medium || 0, color: '#f59e0b' },
      { name: 'Low Productivity', value: data.summary.productivityDistribution.low || 0, color: '#ef4444' },
    ] : [];

    const topUsersData = data.users?.slice(0, 10).map((user: any) => ({
      name: user.name || 'Unknown',
      bookings: user.workloadMetrics?.totalBookings || 0,
      completed: user.workloadMetrics?.completedBookings || 0,
      completionRate: user.workloadMetrics?.completionRate || 0,
    })) || [];

    const bayStaffingData = data.bays?.map((bay: any) => ({
      name: bay.bayName || 'Unknown',
      users: bay.assignedUserCount || 0,
      workload: bay.totalWorkload || 0,
    })) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Workload Distribution</h4>
            <InteractivePieChart data={workloadDistData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Productivity Distribution</h4>
            <InteractivePieChart data={productivityData} height={300} />
          </div>
        </div>

        {topUsersData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Top 10 Users by Workload</h4>
            <StackedBarChart
              data={topUsersData}
              xAxisKey="name"
              series={[
                { dataKey: 'bookings', name: 'Total Bookings', color: '#3b82f6' },
                { dataKey: 'completed', name: 'Completed', color: '#10b981' },
              ]}
              height={300}
            />
          </div>
        )}

        {bayStaffingData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Bay Staffing Levels</h4>
            <StackedBarChart
              data={bayStaffingData.slice(0, 15)}
              xAxisKey="name"
              series={[
                { dataKey: 'users', name: 'Assigned Users', color: '#8b5cf6' },
              ]}
              height={300}
            />
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.users) return null;

    const tableData = data.users.map((user: any) => ({
      name: user.name || 'Unknown',
      email: user.email || 'N/A',
      role: user.role || 'N/A',
      bayCount: user.bayCount || 0,
      totalBookings: user.workloadMetrics?.totalBookings || 0,
      completedBookings: user.workloadMetrics?.completedBookings || 0,
      completionRate: `${user.workloadMetrics?.completionRate || 0}%`,
      workloadLevel: user.workloadLevel || 'N/A',
      productivity: user.productivity || 'N/A',
    }));

    const columns = [
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'role', label: 'Role' },
      { key: 'bayCount', label: 'Bays' },
      { key: 'totalBookings', label: 'Bookings' },
      { key: 'completedBookings', label: 'Completed' },
      { key: 'completionRate', label: 'Completion Rate' },
      { key: 'workloadLevel', label: 'Workload' },
      { key: 'productivity', label: 'Productivity' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Service Bay User Assignment"
      subtitle="User assignment and workload distribution"
      icon={<Users className="h-5 w-5" />}
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

export default ServiceBayUserAssignmentReport;
