import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Wrench, Activity, Clock, DollarSign } from 'lucide-react';

interface DealershipServiceBayUtilizationReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
  shouldLoad?: boolean;
}

export const DealershipServiceBayUtilizationReport: React.FC<DealershipServiceBayUtilizationReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getDealershipServiceBayUtilization(params);
      // Handle response structure: response.data.data or response.data
      const responseData = response.data?.data || response.data;
      // Ensure we have an array
      setData(Array.isArray(responseData) ? responseData : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load service bay utilization data');
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
    console.log(`Exporting service bay utilization report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data || !Array.isArray(data) || data.length === 0) return null;
    
    const validDealerships = data.filter((d: any) => d.dealershipId);
    
    const totals = validDealerships.reduce((acc: any, dealership: any) => ({
      totalBays: acc.totalBays + (dealership.serviceBays?.total || 0),
      activeBays: acc.activeBays + (dealership.serviceBays?.active || 0),
      totalBookings: acc.totalBookings + (dealership.bookings?.total || 0),
      completedJobs: acc.completedJobs + (dealership.performance?.completedJobs || 0),
      totalRevenue: acc.totalRevenue + (dealership.performance?.totalRevenue || 0),
      avgUtilization: acc.avgUtilization + (dealership.serviceBays?.utilizationCapacity || 0),
    }), { totalBays: 0, activeBays: 0, totalBookings: 0, completedJobs: 0, totalRevenue: 0, avgUtilization: 0 });

    const dealershipCount = validDealerships.length || 1;

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Service Bays"
          value={totals.totalBays}
          icon={<Wrench className="h-5 w-5" />}
          subtitle={`${totals.activeBays} active bays`}
        />
        <MetricCard
          title="Total Bookings"
          value={totals.totalBookings}
          icon={<Activity className="h-5 w-5" />}
          subtitle={`${totals.completedJobs} completed`}
        />
        <MetricCard
          title="Total Revenue"
          value={`$${totals.totalRevenue.toFixed(2)}`}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Utilization"
          value={`${(totals.avgUtilization / dealershipCount).toFixed(1)}%`}
          icon={<Clock className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data || !Array.isArray(data) || data.length === 0) return null;

    // Color palettes for different charts
    const bayColors = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a', '#172554'];
    const bookingColors = ['#10b981', '#ef4444', '#f59e0b'];

    const validDealerships = data.filter((d: any) => d.dealershipId);

    const bayDistribution: PieChartData[] = validDealerships.map((dealership: any, index: number) => ({
      name: dealership.dealershipName || 'Unknown',
      value: dealership.serviceBays?.total || 0,
      label: `${dealership.serviceBays?.total || 0} bays`,
      color: bayColors[index % bayColors.length],
    }));

    const bookingStatusData = validDealerships.map((dealership: any) => ({
      name: dealership.dealershipName || 'Unknown',
      completed: dealership.bookings?.completed || 0,
      inProgress: dealership.bookings?.inProgress || 0,
      pending: dealership.bookings?.pending || 0,
    }));

    const performanceData = validDealerships.map((dealership: any) => ({
      name: dealership.dealershipName || 'Unknown',
      completedJobs: dealership.performance?.completedJobs || 0,
      totalRevenue: dealership.performance?.totalRevenue || 0,
      avgRevenuePerJob: dealership.performance?.avgRevenuePerJob || 0,
    }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Service Bay Distribution</h4>
            <InteractivePieChart data={bayDistribution} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Booking Status by Dealership</h4>
            <StackedBarChart
              data={bookingStatusData}
              xAxisKey="name"
              series={[
                { dataKey: 'completed', name: 'Completed', color: bookingColors[0] },
                { dataKey: 'inProgress', name: 'In Progress', color: bookingColors[1] },
                { dataKey: 'pending', name: 'Pending', color: bookingColors[2] },
              ]}
              height={300}
            />
          </div>
        </div>
        <div>
          <h4 className="text-sm font-medium mb-4">Performance by Dealership</h4>
          <StackedBarChart
            data={performanceData}
            xAxisKey="name"
            series={[
              { dataKey: 'completedJobs', name: 'Completed Jobs', color: '#8b5cf6' },
              { dataKey: 'totalRevenue', name: 'Total Revenue', color: '#ec4899' },
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
      { key: 'totalBays', label: 'Total Bays' },
      { key: 'activeBays', label: 'Active' },
      { key: 'inactiveBays', label: 'Inactive' },
      { key: 'utilizationCapacity', label: 'Utilization %' },
      { key: 'totalBookings', label: 'Total Bookings' },
      { key: 'completedBookings', label: 'Completed' },
      { key: 'inProgressBookings', label: 'In Progress' },
      { key: 'pendingBookings', label: 'Pending' },
      { key: 'completionRate', label: 'Completion Rate %' },
      { key: 'avgBookingValue', label: 'Avg Booking Value' },
      { key: 'totalRevenue', label: 'Total Revenue' },
      { key: 'avgCompletionTime', label: 'Avg Completion Time (h)' },
      { key: 'uniqueUsers', label: 'Unique Users' },
    ];

    const tableData = validDealerships.map((dealership: any) => ({
      dealershipName: dealership.dealershipName || 'N/A',
      totalBays: dealership.serviceBays?.total || 0,
      activeBays: dealership.serviceBays?.active || 0,
      inactiveBays: dealership.serviceBays?.inactive || 0,
      utilizationCapacity: `${(dealership.serviceBays?.utilizationCapacity || 0).toFixed(1)}%`,
      totalBookings: dealership.bookings?.total || 0,
      completedBookings: dealership.bookings?.completed || 0,
      inProgressBookings: dealership.bookings?.inProgress || 0,
      pendingBookings: dealership.bookings?.pending || 0,
      completionRate: `${(dealership.bookings?.completionRate || 0).toFixed(1)}%`,
      avgBookingValue: `$${(dealership.bookings?.avgValue || 0).toFixed(2)}`,
      totalRevenue: `$${(dealership.performance?.totalRevenue || 0).toFixed(2)}`,
      avgCompletionTime: (dealership.performance?.avgCompletionTime || 0).toFixed(1),
      uniqueUsers: dealership.userAssignment?.uniqueUsers || 0,
    }));

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Dealership Service Bay Utilization"
      subtitle="Service bay usage by dealership"
      icon={<Wrench className="h-5 w-5" />}
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

export default DealershipServiceBayUtilizationReport;
