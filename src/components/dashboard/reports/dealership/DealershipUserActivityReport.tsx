import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Users, UserCheck, Activity, TrendingUp } from 'lucide-react';

interface DealershipUserActivityReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
  shouldLoad?: boolean;
}

export const DealershipUserActivityReport: React.FC<DealershipUserActivityReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getDealershipUserActivity(params);
      // Handle response structure: response.data.data or response.data
      const responseData = response.data?.data || response.data;
      // Ensure we have an array
      setData(Array.isArray(responseData) ? responseData : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load user activity data');
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
    console.log(`Exporting user activity report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data || !Array.isArray(data) || data.length === 0) return null;
    
    const validDealerships = data.filter((d: any) => d.dealershipId);
    
    const totals = validDealerships.reduce((acc: any, dealership: any) => ({
      totalUsers: acc.totalUsers + (dealership.users?.total || 0),
      activeUsers: acc.activeUsers + (dealership.users?.active || 0),
      totalVehiclesCreated: acc.totalVehiclesCreated + (dealership.productivity?.vehiclesCreated || 0),
      totalQuotesCreated: acc.totalQuotesCreated + (dealership.productivity?.quotesCreated || 0),
      recentlyActive: acc.recentlyActive + (dealership.loginActivity?.recentlyActive || 0),
    }), { totalUsers: 0, activeUsers: 0, totalVehiclesCreated: 0, totalQuotesCreated: 0, recentlyActive: 0 });

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Users"
          value={totals.totalUsers}
          icon={<Users className="h-5 w-5" />}
          subtitle={`${validDealerships.length} dealership(s)`}
        />
        <MetricCard
          title="Recently Active"
          value={totals.recentlyActive}
          icon={<UserCheck className="h-5 w-5" />}
          subtitle={`${totals.activeUsers} active users`}
        />
        <MetricCard
          title="Vehicles Created"
          value={totals.totalVehiclesCreated}
          icon={<Activity className="h-5 w-5" />}
        />
        <MetricCard
          title="Quotes Created"
          value={totals.totalQuotesCreated}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data || !Array.isArray(data) || data.length === 0) return null;

    // Color palettes for different charts
    const userColors = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a', '#172554'];
    const activityColors = ['#10b981', '#ef4444'];

    const validDealerships = data.filter((d: any) => d.dealershipId);

    const userDistribution: PieChartData[] = validDealerships.map((dealership: any, index: number) => ({
      name: dealership.dealershipName || 'Unknown',
      value: dealership.users?.total || 0,
      label: `${dealership.users?.total || 0} users`,
      color: userColors[index % userColors.length],
    }));

    const activityData = validDealerships.map((dealership: any) => ({
      name: dealership.dealershipName || 'Unknown',
      recentlyActive: dealership.loginActivity?.recentlyActive || 0,
      inactive: dealership.loginActivity?.inactive || 0,
      activityRate: dealership.loginActivity?.activityRate || 0,
    }));

    const productivityData = validDealerships.map((dealership: any) => ({
      name: dealership.dealershipName || 'Unknown',
      vehiclesCreated: dealership.productivity?.vehiclesCreated || 0,
      quotesCreated: dealership.productivity?.quotesCreated || 0,
    }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">User Distribution by Dealership</h4>
            <InteractivePieChart data={userDistribution} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">User Activity Status</h4>
            <StackedBarChart
              data={activityData}
              xAxisKey="name"
              series={[
                { dataKey: 'recentlyActive', name: 'Recently Active', color: activityColors[0] },
                { dataKey: 'inactive', name: 'Inactive', color: activityColors[1] },
              ]}
              height={300}
            />
          </div>
        </div>
        <div>
          <h4 className="text-sm font-medium mb-4">Productivity by Dealership</h4>
          <StackedBarChart
            data={productivityData}
            xAxisKey="name"
            series={[
              { dataKey: 'vehiclesCreated', name: 'Vehicles Created', color: '#8b5cf6' },
              { dataKey: 'quotesCreated', name: 'Quotes Created', color: '#ec4899' },
            ]}
            height={300}
          />
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (!data || !Array.isArray(data)) return null;

    const validDealerships = data.filter((d: any) => d.dealershipId);

    const columns = [
      { key: 'dealershipName', label: 'Dealership Name' },
      { key: 'totalUsers', label: 'Total Users' },
      { key: 'activeUsers', label: 'Active' },
      { key: 'inactiveUsers', label: 'Inactive' },
      { key: 'recentlyActive', label: 'Recently Active' },
      { key: 'activityRate', label: 'Activity %' },
      { key: 'usersWithLogin', label: 'Users with Login' },
      { key: 'avgDaysSinceLogin', label: 'Avg Days Since Login' },
      { key: 'vehiclesCreated', label: 'Vehicles Created' },
      { key: 'activeVehicleCreators', label: 'Active Vehicle Creators' },
      { key: 'avgVehiclesPerUser', label: 'Avg Vehicles/User' },
      { key: 'quotesCreated', label: 'Quotes Created' },
      { key: 'activeQuoteCreators', label: 'Active Quote Creators' },
      { key: 'avgQuotesPerUser', label: 'Avg Quotes/User' },
    ];

    const tableData = validDealerships.map((dealership: any) => ({
      dealershipName: dealership.dealershipName || 'N/A',
      totalUsers: dealership.users?.total || 0,
      activeUsers: dealership.users?.active || 0,
      inactiveUsers: dealership.users?.inactive || 0,
      recentlyActive: dealership.loginActivity?.recentlyActive || 0,
      activityRate: `${(dealership.loginActivity?.activityRate || 0).toFixed(1)}%`,
      usersWithLogin: dealership.loginActivity?.usersWithLogin || 0,
      avgDaysSinceLogin: (dealership.loginActivity?.avgDaysSinceLastLogin || 0).toFixed(1),
      vehiclesCreated: dealership.productivity?.vehiclesCreated || 0,
      activeVehicleCreators: dealership.productivity?.activeVehicleCreators || 0,
      avgVehiclesPerUser: (dealership.productivity?.avgVehiclesPerUser || 0).toFixed(1),
      quotesCreated: dealership.productivity?.quotesCreated || 0,
      activeQuoteCreators: dealership.productivity?.activeQuoteCreators || 0,
      avgQuotesPerUser: (dealership.productivity?.avgQuotesPerUser || 0).toFixed(1),
    }));

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Dealership User Activity"
      subtitle="User productivity by dealership"
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

export default DealershipUserActivityReport;
