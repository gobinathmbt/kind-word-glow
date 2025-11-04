import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Wrench, Activity, Clock } from 'lucide-react';

interface DealershipServiceBayUtilizationReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const DealershipServiceBayUtilizationReport: React.FC<DealershipServiceBayUtilizationReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getDealershipServiceBayUtilization(params);
      setData(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load service bay utilization data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting service bay utilization report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.data || data.data.length === 0) return null;
    
    const totals = data.data.reduce((acc: any, dealership: any) => ({
      totalBays: acc.totalBays + (dealership.serviceBays?.totalBays || 0),
      activeBays: acc.activeBays + (dealership.serviceBays?.activeBays || 0),
      totalBookings: acc.totalBookings + (dealership.bayUtilization?.totalBookings || 0),
      avgUtilization: acc.avgUtilization + (dealership.bayUtilization?.utilizationRate || 0),
    }), { totalBays: 0, activeBays: 0, totalBookings: 0, avgUtilization: 0 });

    const dealershipCount = data.data.length;

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Service Bays"
          value={totals.totalBays}
          icon={<Wrench className="h-5 w-5" />}
        />
        <MetricCard
          title="Active Bays"
          value={totals.activeBays}
          icon={<Activity className="h-5 w-5" />}
        />
        <MetricCard
          title="Total Bookings"
          value={totals.totalBookings}
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
    if (!data?.data || data.data.length === 0) return null;

    const bayDistribution: PieChartData[] = data.data.map((dealership: any) => ({
      name: dealership.dealershipName,
      value: dealership.serviceBays?.totalBays || 0,
    }));

    const utilizationData = data.data.map((dealership: any) => ({
      name: dealership.dealershipName,
      utilizationRate: dealership.bayUtilization?.utilizationRate || 0,
      totalBookings: dealership.bayUtilization?.totalBookings || 0,
      avgBookingDuration: dealership.bayUtilization?.avgBookingDuration || 0,
    }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Service Bay Distribution</h4>
            <InteractivePieChart data={bayDistribution} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Utilization by Dealership</h4>
            <StackedBarChart
              data={utilizationData}
              xAxisKey="name"
              series={[
                { dataKey: 'utilizationRate', name: 'Utilization %' },
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
      { key: 'totalBays', label: 'Total Bays' },
      { key: 'activeBays', label: 'Active' },
      { key: 'totalBookings', label: 'Bookings' },
      { key: 'utilizationRate', label: 'Utilization %' },
      { key: 'avgBookingDuration', label: 'Avg Duration (hrs)' },
    ];

    const tableData = data.data.map((dealership: any) => ({
      dealershipName: dealership.dealershipName,
      totalBays: dealership.serviceBays?.totalBays || 0,
      activeBays: dealership.serviceBays?.activeBays || 0,
      totalBookings: dealership.bayUtilization?.totalBookings || 0,
      utilizationRate: `${dealership.bayUtilization?.utilizationRate || 0}%`,
      avgBookingDuration: (dealership.bayUtilization?.avgBookingDuration || 0).toFixed(1),
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
