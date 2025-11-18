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
import { Users, Activity, TrendingUp, Award } from 'lucide-react';

interface UserPerformanceMetricsReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
  shouldLoad?: boolean;
}

export const UserPerformanceMetricsReport: React.FC<UserPerformanceMetricsReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getUserPerformanceMetrics(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load user performance data');
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
    console.log(`Exporting user performance report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data || !Array.isArray(data) || data.length === 0) return null;
    
    const validUsers = data.filter((u: any) => u.userId);
    
    const totals = validUsers.reduce((acc: any, user: any) => ({
      totalVehicles: acc.totalVehicles + (user.vehicleActivity?.total || 0),
      totalQuotes: acc.totalQuotes + (user.quoteActivity?.total || 0),
      totalReports: acc.totalReports + (user.reportActivity?.total || 0),
      totalRevenue: acc.totalRevenue + (user.reportActivity?.totalRevenue || 0),
      avgProductivity: acc.avgProductivity + (user.productivityScore || 0),
      highActivity: acc.highActivity + (user.activityLevel === 'High' ? 1 : 0),
    }), { totalVehicles: 0, totalQuotes: 0, totalReports: 0, totalRevenue: 0, avgProductivity: 0, highActivity: 0 });

    const avgProductivityScore = validUsers.length > 0 ? (totals.avgProductivity / validUsers.length).toFixed(1) : '0.0';

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Users"
          value={validUsers.length}
          icon={<Users className="h-5 w-5" />}
          subtitle={`${totals.highActivity} high activity`}
        />
        <MetricCard
          title="Total Vehicles"
          value={totals.totalVehicles}
          icon={<Activity className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Productivity Score"
          value={avgProductivityScore}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="Total Revenue"
          value={`$${totals.totalRevenue.toFixed(2)}`}
          icon={<Award className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data || !Array.isArray(data) || data.length === 0) return null;

    // Color palettes for different charts
    const activityColors = ['#10b981', '#f59e0b', '#ef4444'];
    const roleColors = ['#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
    const productivityColors = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5', '#059669', '#047857', '#065f46', '#064e3b', '#022c22'];

    const validUsers = data.filter((u: any) => u.userId);

    // Activity Level Distribution
    const activityLevelMap = new Map();
    validUsers.forEach((user: any) => {
      const level = user.activityLevel || 'Low';
      activityLevelMap.set(level, (activityLevelMap.get(level) || 0) + 1);
    });

    const activityData: PieChartData[] = Array.from(activityLevelMap.entries()).map(([level, count], index) => ({
      name: level,
      value: count as number,
      label: `${count} users`,
      color: activityColors[index % activityColors.length],
    }));

    // Role Distribution
    const roleMap = new Map();
    validUsers.forEach((user: any) => {
      const role = user.role || 'Unknown';
      roleMap.set(role, (roleMap.get(role) || 0) + 1);
    });

    const roleData: PieChartData[] = Array.from(roleMap.entries()).map(([role, count], index) => ({
      name: role,
      value: count as number,
      label: `${count} users`,
      color: roleColors[index % roleColors.length],
    }));

    // Top performers by productivity score
    const topPerformers = validUsers
      .filter((u: any) => u.productivityScore > 0)
      .sort((a: any, b: any) => (b.productivityScore || 0) - (a.productivityScore || 0))
      .slice(0, 10)
      .map((user: any, index: number) => ({
        name: user.username || user.fullName || 'Unknown',
        value: user.productivityScore || 0,
        label: `${(user.productivityScore || 0).toFixed(1)}`,
        color: productivityColors[index % productivityColors.length],
      }));

    // Activity by user
    const activityByUser = validUsers
      .sort((a: any, b: any) => (b.vehicleActivity?.total || 0) - (a.vehicleActivity?.total || 0))
      .slice(0, 10)
      .map((user: any) => ({
        name: user.username || user.fullName || 'Unknown',
        vehicles: user.vehicleActivity?.total || 0,
        quotes: user.quoteActivity?.total || 0,
        reports: user.reportActivity?.total || 0,
      }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Activity Level Distribution</h4>
            <InteractivePieChart data={activityData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">User Distribution by Role</h4>
            <InteractivePieChart data={roleData} height={300} />
          </div>
        </div>
        {topPerformers.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Top Performers by Productivity Score</h4>
            <ComparisonChart data={topPerformers} height={300} />
          </div>
        )}
        {activityByUser.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">User Activity (Top 10)</h4>
            <StackedBarChart
              data={activityByUser}
              xAxisKey="name"
              series={[
                { dataKey: 'vehicles', name: 'Vehicles', color: '#3b82f6' },
                { dataKey: 'quotes', name: 'Quotes', color: '#10b981' },
                { dataKey: 'reports', name: 'Reports', color: '#f59e0b' },
              ]}
              height={300}
            />
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data || !Array.isArray(data)) return null;

    const validUsers = data.filter((u: any) => u.userId);

    const columns = [
      { key: 'userName', label: 'User' },
      { key: 'email', label: 'Email' },
      { key: 'role', label: 'Role' },
      { key: 'dealershipCount', label: 'Dealerships' },
      { key: 'totalVehicles', label: 'Vehicles' },
      { key: 'totalQuotes', label: 'Quotes' },
      { key: 'completedQuotes', label: 'Completed Quotes' },
      { key: 'quoteCompletionRate', label: 'Quote Completion %' },
      { key: 'totalReports', label: 'Reports' },
      { key: 'totalRevenue', label: 'Revenue' },
      { key: 'avgRevenue', label: 'Avg Revenue' },
      { key: 'productivityScore', label: 'Productivity Score' },
      { key: 'activityLevel', label: 'Activity Level' },
      { key: 'daysSinceLastLogin', label: 'Days Since Login' },
    ];

    const tableData = validUsers.map((user: any) => ({
      userName: user.fullName || user.username || 'Unknown',
      email: user.email || 'N/A',
      role: user.role || 'N/A',
      dealershipCount: user.dealershipCount || 0,
      totalVehicles: user.vehicleActivity?.total || 0,
      totalQuotes: user.quoteActivity?.total || 0,
      completedQuotes: user.quoteActivity?.completed || 0,
      quoteCompletionRate: `${(user.quoteActivity?.completionRate || 0).toFixed(1)}%`,
      totalReports: user.reportActivity?.total || 0,
      totalRevenue: `$${(user.reportActivity?.totalRevenue || 0).toFixed(2)}`,
      avgRevenue: `$${(user.reportActivity?.avgRevenue || 0).toFixed(2)}`,
      productivityScore: (user.productivityScore || 0).toFixed(1),
      activityLevel: user.activityLevel || 'Low',
      daysSinceLastLogin: user.daysSinceLastLogin || 0,
    }));

    return <DataTable columns={columns} data={tableData} />;
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
