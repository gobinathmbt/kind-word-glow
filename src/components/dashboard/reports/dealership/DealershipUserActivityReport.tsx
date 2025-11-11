import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Users, UserCheck, Activity } from 'lucide-react';

interface DealershipUserActivityReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const DealershipUserActivityReport: React.FC<DealershipUserActivityReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getDealershipUserActivity(params);
      setData(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load user activity data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting user activity report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.data || data.data.length === 0) return null;
    
    const totals = data.data.reduce((acc: any, dealership: any) => ({
      totalUsers: acc.totalUsers + (dealership.users?.totalUsers || 0),
      activeUsers: acc.activeUsers + (dealership.users?.activeUsers || 0),
      totalVehiclesCreated: acc.totalVehiclesCreated + (dealership.vehicleActivity?.totalVehiclesCreated || 0),
      totalQuotesCreated: acc.totalQuotesCreated + (dealership.quoteActivity?.totalQuotesCreated || 0),
    }), { totalUsers: 0, activeUsers: 0, totalVehiclesCreated: 0, totalQuotesCreated: 0 });

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Users"
          value={totals.totalUsers}
          icon={<Users className="h-5 w-5" />}
        />
        <MetricCard
          title="Active Users"
          value={totals.activeUsers}
          icon={<UserCheck className="h-5 w-5" />}
        />
        <MetricCard
          title="Vehicles Created"
          value={totals.totalVehiclesCreated}
          icon={<Activity className="h-5 w-5" />}
        />
        <MetricCard
          title="Quotes Created"
          value={totals.totalQuotesCreated}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data?.data || data.data.length === 0) return null;

    const userDistribution: PieChartData[] = data.data.map((dealership: any) => ({
      name: dealership.dealershipName,
      value: dealership.users?.totalUsers || 0,
    }));

    const activityData = data.data.map((dealership: any) => ({
      name: dealership.dealershipName,
      activeUsers: dealership.users?.activeUsers || 0,
      inactiveUsers: dealership.users?.inactiveUsers || 0,
      vehiclesCreated: dealership.vehicleActivity?.totalVehiclesCreated || 0,
    }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">User Distribution by Dealership</h4>
            <InteractivePieChart data={userDistribution} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">User Activity by Dealership</h4>
            <StackedBarChart
              data={activityData}
              xAxisKey="name"
              series={[
                { dataKey: 'activeUsers', name: 'Active Users' },
                { dataKey: 'inactiveUsers', name: 'Inactive Users' },
              ]}
              height={300}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.data) return null;

    const columns = [
      { key: 'dealershipName', label: 'Dealership' },
      { key: 'totalUsers', label: 'Total Users' },
      { key: 'activeUsers', label: 'Active' },
      { key: 'inactiveUsers', label: 'Inactive' },
      { key: 'vehiclesCreated', label: 'Vehicles' },
      { key: 'quotesCreated', label: 'Quotes' },
      { key: 'activityRate', label: 'Activity %' },
    ];

    const tableData = data.data.map((dealership: any) => ({
      dealershipName: dealership.dealershipName,
      totalUsers: dealership.users?.totalUsers || 0,
      activeUsers: dealership.users?.activeUsers || 0,
      inactiveUsers: dealership.users?.inactiveUsers || 0,
      vehiclesCreated: dealership.vehicleActivity?.totalVehiclesCreated || 0,
      quotesCreated: dealership.quoteActivity?.totalQuotesCreated || 0,
      activityRate: `${dealership.loginPatterns?.activityRate || 0}%`,
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
