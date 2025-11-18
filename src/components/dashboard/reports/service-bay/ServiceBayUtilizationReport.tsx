import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Wrench, TrendingUp, Clock, CheckCircle, Activity, AlertCircle } from 'lucide-react';

interface ServiceBayUtilizationReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
  shouldLoad?: boolean;
}

export const ServiceBayUtilizationReport: React.FC<ServiceBayUtilizationReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getServiceBayUtilization(params);
      setData(response.data?.data || response.data);
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
    console.log(`Exporting service bay utilization as ${format}`);
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
          title="Total Bays"
          value={summary.totalBays || 0}
          icon={<Wrench className="h-5 w-5" />}
        />
        <MetricCard
          title="Active Bays"
          value={summary.activeBays || 0}
          icon={<Activity className="h-5 w-5" />}
        />
        <MetricCard
          title="Total Bookings"
          value={summary.totalBookings || 0}
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Utilization"
          value={`${summary.avgUtilizationRate || 0}%`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="Completed Bookings"
          value={summary.totalCompletedBookings || 0}
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Completion Rate"
          value={`${summary.avgCompletionRate || 0}%`}
          icon={<Clock className="h-5 w-5" />}
        />
        <MetricCard
          title="Total Revenue"
          value={`$${(summary.totalRevenue || 0).toLocaleString()}`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="Inactive Bays"
          value={summary.inactiveBays || 0}
          icon={<AlertCircle className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const capacityData: PieChartData[] = data.summary?.capacityDistribution ? [
      { name: 'High Capacity', value: data.summary.capacityDistribution.high || 0, color: '#ef4444' },
      { name: 'Medium Capacity', value: data.summary.capacityDistribution.medium || 0, color: '#f59e0b' },
      { name: 'Low Capacity', value: data.summary.capacityDistribution.low || 0, color: '#10b981' },
    ] : [];

    const utilizationData = data.bays?.slice(0, 10).map((bay: any) => ({
      name: bay.bayName || 'Unknown',
      utilization: bay.utilizationMetrics?.utilizationRate || 0,
      bookings: bay.bookingMetrics?.total || 0,
      completed: bay.bookingMetrics?.completed || 0,
    })) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Capacity Distribution</h4>
            <InteractivePieChart data={capacityData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Top 10 Bays by Utilization</h4>
            <StackedBarChart
              data={utilizationData}
              xAxisKey="name"
              series={[
                { dataKey: 'utilization', name: 'Utilization %', color: '#3b82f6' },
              ]}
              height={300}
            />
          </div>
        </div>

        {data.bays && data.bays.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-4">Bay Details</h4>
            <DataTable
              columns={[
                { key: 'bayName', label: 'Bay Name' },
                { key: 'dealership', label: 'Dealership' },
                { key: 'utilization', label: 'Utilization %' },
                { key: 'bookings', label: 'Bookings' },
                { key: 'completed', label: 'Completed' },
                { key: 'revenue', label: 'Revenue' },
                { key: 'status', label: 'Status' },
              ]}
              data={data.bays.slice(0, 20).map((bay: any) => ({
                bayName: bay.bayName || 'N/A',
                dealership: bay.dealership?.name || 'N/A',
                utilization: `${bay.utilizationMetrics?.utilizationRate || 0}%`,
                bookings: bay.bookingMetrics?.total || 0,
                completed: bay.bookingMetrics?.completed || 0,
                revenue: `$${(bay.bookingMetrics?.totalValue || 0).toLocaleString()}`,
                status: bay.utilizationMetrics?.capacityStatus || 'N/A',
              }))}
            />
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.bays) return null;

    const tableData = data.bays.map((bay: any) => ({
      bayName: bay.bayName || 'Unknown',
      dealership: bay.dealership?.name || 'N/A',
      isActive: bay.isActive ? 'Active' : 'Inactive',
      utilizationRate: `${bay.utilizationMetrics?.utilizationRate || 0}%`,
      totalBookings: bay.bookingMetrics?.total || 0,
      completedBookings: bay.bookingMetrics?.completed || 0,
      completionRate: `${bay.bookingMetrics?.completionRate || 0}%`,
      totalRevenue: `$${(bay.bookingMetrics?.totalValue || 0).toLocaleString()}`,
      capacityStatus: bay.utilizationMetrics?.capacityStatus || 'N/A',
      workingHoursPerWeek: bay.workingHours?.perWeek || 0,
    }));

    const columns = [
      { key: 'bayName', label: 'Bay Name' },
      { key: 'dealership', label: 'Dealership' },
      { key: 'isActive', label: 'Status' },
      { key: 'utilizationRate', label: 'Utilization' },
      { key: 'totalBookings', label: 'Bookings' },
      { key: 'completedBookings', label: 'Completed' },
      { key: 'completionRate', label: 'Completion Rate' },
      { key: 'totalRevenue', label: 'Revenue' },
      { key: 'capacityStatus', label: 'Capacity' },
      { key: 'workingHoursPerWeek', label: 'Hours/Week' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Service Bay Utilization"
      subtitle="Bay usage and capacity analysis"
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

export default ServiceBayUtilizationReport;
