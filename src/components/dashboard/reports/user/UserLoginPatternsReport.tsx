import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { LineChart } from '@/components/dashboard/charts/LineChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { LogIn, Clock, Calendar, TrendingUp } from 'lucide-react';

interface UserLoginPatternsReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const UserLoginPatternsReport: React.FC<UserLoginPatternsReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getUserLoginPatterns(params);
      setData(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load login patterns data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting login patterns report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.metrics) return null;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Logins"
          value={data.metrics.totalLogins || 0}
          icon={<LogIn className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Session Duration"
          value={`${data.metrics.avgSessionDuration || 0} min`}
          icon={<Clock className="h-5 w-5" />}
        />
        <MetricCard
          title="Daily Active Users"
          value={data.metrics.dailyActiveUsers || 0}
          icon={<Calendar className="h-5 w-5" />}
          trend={{ value: data.metrics.dauTrend || 0, isPositive: true }}
        />
        <MetricCard
          title="Peak Login Hour"
          value={`${data.metrics.peakLoginHour || 0}:00`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const loginTrendData = data.loginTrend || [];
    const hourlyData = data.hourlyDistribution || [];

    return (
      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-medium mb-4">Login Trend Over Time</h4>
          <LineChart
            data={loginTrendData}
            xAxisKey="date"
            lines={[
              { dataKey: 'logins', name: 'Logins', color: 'hsl(var(--chart-1))' },
              { dataKey: 'uniqueUsers', name: 'Unique Users', color: 'hsl(var(--chart-2))' },
            ]}
            height={300}
          />
        </div>
        <div>
          <h4 className="text-sm font-medium mb-4">Hourly Login Distribution</h4>
          <StackedBarChart
            data={hourlyData}
            xAxisKey="hour"
            series={[
              { dataKey: 'count', name: 'Logins' },
            ]}
            height={300}
          />
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.tableData) return null;

    const columns = [
      { key: 'userName', label: 'User' },
      { key: 'totalLogins', label: 'Total Logins' },
      { key: 'lastLogin', label: 'Last Login' },
      { key: 'avgSessionDuration', label: 'Avg Session (min)' },
      { key: 'loginFrequency', label: 'Frequency' },
    ];

    return <DataTable columns={columns} data={data.tableData} />;
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
