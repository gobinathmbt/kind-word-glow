import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Users, Activity, TrendingUp, Award } from 'lucide-react';

interface UserPerformanceMetricsReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const UserPerformanceMetricsReport: React.FC<UserPerformanceMetricsReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getUserPerformanceMetrics(params);
      setData(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load user performance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting user performance report as ${format}`);
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
          title="Active Users"
          value={data.metrics.activeUsers || 0}
          icon={<Activity className="h-5 w-5" />}
          trend={{ value: data.metrics.activeUsersTrend || 0, isPositive: true }}
        />
        <MetricCard
          title="Avg Productivity Score"
          value={data.metrics.avgProductivityScore || 0}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="Top Performers"
          value={data.metrics.topPerformers || 0}
          icon={<Award className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const activityData: PieChartData[] = data.activityDistribution?.map((item: any) => ({
      name: item.activityLevel,
      value: item.count,
    })) || [];

    const performanceData = data.performanceByRole || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Activity Level Distribution</h4>
            <InteractivePieChart data={activityData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Performance by Role</h4>
            <StackedBarChart
              data={performanceData}
              xAxisKey="role"
              series={[
                { dataKey: 'avgProductivity', name: 'Productivity' },
                { dataKey: 'avgTaskCompletion', name: 'Task Completion' },
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
      { key: 'userName', label: 'User' },
      { key: 'role', label: 'Role' },
      { key: 'activityLevel', label: 'Activity' },
      { key: 'productivityScore', label: 'Productivity' },
      { key: 'tasksCompleted', label: 'Tasks' },
      { key: 'avgResponseTime', label: 'Response Time' },
    ];

    return <DataTable columns={columns} data={data.tableData} />;
  };

  return (
    <ReportCard
      title="User Performance Metrics"
      subtitle="Activity and productivity metrics"
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

export default UserPerformanceMetricsReport;
