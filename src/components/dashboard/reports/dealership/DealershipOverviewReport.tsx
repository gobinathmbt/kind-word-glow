import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Building2, Users, Wrench, Car } from 'lucide-react';

interface DealershipOverviewReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
  shouldLoad?: boolean;
}

export const DealershipOverviewReport: React.FC<DealershipOverviewReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getDealershipOverview(params);
      // Handle response structure: response.data.data or response.data
      const responseData = response.data?.data || response.data;
      // Ensure we have an array
      setData(Array.isArray(responseData) ? responseData : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load dealership overview data');
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
    console.log(`Exporting dealership overview report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data || data.length === 0) return null;

    const totals = data.reduce((acc: any, dealership: any) => ({
      totalDealerships: acc.totalDealerships + 1,
      totalVehicles: acc.totalVehicles + (dealership.vehicles?.total || 0),
      totalUsers: acc.totalUsers + (dealership.users?.total || 0),
      totalQuotes: acc.totalQuotes + (dealership.workshop?.totalQuotes || 0),
      totalServiceBays: acc.totalServiceBays + (dealership.serviceBays?.total || 0),
      totalRevenue: acc.totalRevenue + (dealership.workshop?.totalRevenue || 0),
    }), { totalDealerships: 0, totalVehicles: 0, totalUsers: 0, totalQuotes: 0, totalServiceBays: 0, totalRevenue: 0 });

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Dealerships"
          value={totals.totalDealerships}
          icon={<Building2 className="h-5 w-5" />}
        />
        <MetricCard
          title="Total Vehicles"
          value={totals.totalVehicles}
          icon={<Car className="h-5 w-5" />}
        />
        <MetricCard
          title="Total Users"
          value={totals.totalUsers}
          icon={<Users className="h-5 w-5" />}
        />
        <MetricCard
          title="Total Revenue"
          value={`$${totals.totalRevenue.toFixed(2)}`}
          icon={<Wrench className="h-5 w-5" />}
          subtitle={`${totals.totalQuotes} quotes`}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data || data.length === 0) return null;

    // Color palettes for different charts
    const vehicleColors = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5', '#059669', '#047857', '#065f46', '#064e3b', '#022c22'];
    const userColors = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a', '#172554'];

    const vehicleDistribution: PieChartData[] = data.map((dealership: any, index: number) => ({
      name: dealership.dealershipName || 'Unknown',
      value: dealership.vehicles?.total || 0,
      color: vehicleColors[index % vehicleColors.length],
    }));

    const userDistribution: PieChartData[] = data.map((dealership: any, index: number) => ({
      name: dealership.dealershipName || 'Unknown',
      value: dealership.users?.total || 0,
      color: userColors[index % userColors.length],
    }));

    const workshopData = data.map((dealership: any) => ({
      name: dealership.dealershipName || 'Unknown',
      quotes: dealership.workshop?.totalQuotes || 0,
      reports: dealership.workshop?.totalReports || 0,
      revenue: dealership.workshop?.totalRevenue || 0,
    }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Vehicle Distribution by Dealership</h4>
            <InteractivePieChart data={vehicleDistribution} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">User Distribution by Dealership</h4>
            <InteractivePieChart data={userDistribution} height={300} />
          </div>
        </div>
        <div>
          <h4 className="text-sm font-medium mb-4">Workshop Performance by Dealership</h4>
          <StackedBarChart
            data={workshopData}
            xAxisKey="name"
            series={[
              { dataKey: 'quotes', name: 'Quotes', color: '#3b82f6' },
              { dataKey: 'reports', name: 'Reports', color: '#10b981' },
            ]}
            height={300}
          />
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (!data) return null;

    const tableData = data.map((dealership: any) => ({
      dealershipName: dealership.dealershipName || 'N/A',
      totalVehicles: dealership.vehicles?.total || 0,
      inspection: dealership.vehicles?.inspection || 0,
      tradein: dealership.vehicles?.tradein || 0,
      master: dealership.vehicles?.master || 0,
      advertisement: dealership.vehicles?.advertisement || 0,
      totalUsers: dealership.users?.total || 0,
      activeUsers: dealership.users?.active || 0,
      totalQuotes: dealership.workshop?.totalQuotes || 0,
      completedQuotes: dealership.workshop?.completedQuotes || 0,
      inProgressQuotes: dealership.workshop?.inProgressQuotes || 0,
      totalReports: dealership.workshop?.totalReports || 0,
      totalRevenue: `$${(dealership.workshop?.totalRevenue || 0).toFixed(2)}`,
      totalServiceBays: dealership.serviceBays?.total || 0,
      activeServiceBays: dealership.serviceBays?.active || 0,
    }));

    const columns = [
      { key: 'dealershipName', label: 'Dealership Name' },
      { key: 'totalVehicles', label: 'Total Vehicles' },
      { key: 'inspection', label: 'Inspection' },
      { key: 'tradein', label: 'Trade-in' },
      { key: 'master', label: 'Master' },
      { key: 'advertisement', label: 'Advertisement' },
      { key: 'totalUsers', label: 'Total Users' },
      { key: 'activeUsers', label: 'Active Users' },
      { key: 'totalQuotes', label: 'Total Quotes' },
      { key: 'completedQuotes', label: 'Completed' },
      { key: 'inProgressQuotes', label: 'In Progress' },
      { key: 'totalReports', label: 'Reports' },
      { key: 'totalRevenue', label: 'Revenue' },
      { key: 'totalServiceBays', label: 'Service Bays' },
      { key: 'activeServiceBays', label: 'Active Bays' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Dealership Overview"
      subtitle="Summary metrics per dealership"
      icon={<Building2 className="h-5 w-5" />}
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

export default DealershipOverviewReport;
