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
}

export const DealershipOverviewReport: React.FC<DealershipOverviewReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getDealershipOverview(params);
      setData(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load dealership overview data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting dealership overview report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.data || data.data.length === 0) return null;
    
    const totals = data.data.reduce((acc: any, dealership: any) => ({
      totalDealerships: acc.totalDealerships + 1,
      totalVehicles: acc.totalVehicles + (dealership.vehicles?.total || 0),
      totalUsers: acc.totalUsers + (dealership.users?.total || 0),
      totalQuotes: acc.totalQuotes + (dealership.workshop?.totalQuotes || 0),
    }), { totalDealerships: 0, totalVehicles: 0, totalUsers: 0, totalQuotes: 0 });

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
          title="Total Quotes"
          value={totals.totalQuotes}
          icon={<Wrench className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data?.data || data.data.length === 0) return null;

    const vehicleDistribution: PieChartData[] = data.data.map((dealership: any) => ({
      name: dealership.dealershipName,
      value: dealership.vehicles?.total || 0,
    }));

    const workshopData = data.data.map((dealership: any) => ({
      name: dealership.dealershipName,
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
            <h4 className="text-sm font-medium mb-4">Workshop Performance by Dealership</h4>
            <StackedBarChart
              data={workshopData}
              xAxisKey="name"
              series={[
                { dataKey: 'quotes', name: 'Quotes' },
                { dataKey: 'reports', name: 'Reports' },
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
      { key: 'totalVehicles', label: 'Vehicles' },
      { key: 'totalUsers', label: 'Users' },
      { key: 'totalQuotes', label: 'Quotes' },
      { key: 'totalReports', label: 'Reports' },
      { key: 'totalRevenue', label: 'Revenue' },
      { key: 'status', label: 'Status' },
    ];

    const tableData = data.data.map((dealership: any) => ({
      dealershipName: dealership.dealershipName,
      totalVehicles: dealership.vehicles?.total || 0,
      totalUsers: dealership.users?.total || 0,
      totalQuotes: dealership.workshop?.totalQuotes || 0,
      totalReports: dealership.workshop?.totalReports || 0,
      totalRevenue: `$${(dealership.workshop?.totalRevenue || 0).toLocaleString()}`,
      status: dealership.status,
    }));

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
