import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Car, TrendingUp, Package, Megaphone } from 'lucide-react';

interface DealershipVehicleDistributionReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const DealershipVehicleDistributionReport: React.FC<DealershipVehicleDistributionReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getDealershipVehicleDistribution(params);
      // Handle response structure: response.data.data or response.data
      const responseData = response.data?.data || response.data;
      setData(responseData);
    } catch (err: any) {
      setError(err.message || 'Failed to load vehicle distribution data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting vehicle distribution report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.distributionByDealership) return null;

    const validDealerships = data.distributionByDealership.filter((d: any) => d.dealershipId);

    const totals = validDealerships.reduce((acc: any, dealership: any) => ({
      totalVehicles: acc.totalVehicles + (dealership.vehicles?.total || 0),
      totalMaster: acc.totalMaster + (dealership.masterVehicles?.total || 0),
      totalAdvertise: acc.totalAdvertise + (dealership.advertiseVehicles?.total || 0),
      grandTotal: acc.grandTotal + (dealership.grandTotal || 0),
    }), { totalVehicles: 0, totalMaster: 0, totalAdvertise: 0, grandTotal: 0 });

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Vehicles"
          value={totals.totalVehicles}
          icon={<Car className="h-5 w-5" />}
          subtitle={`${validDealerships.length} dealership(s)`}
        />
        <MetricCard
          title="Master Vehicles"
          value={totals.totalMaster}
          icon={<Package className="h-5 w-5" />}
        />
        <MetricCard
          title="Advertise Vehicles"
          value={totals.totalAdvertise}
          icon={<Megaphone className="h-5 w-5" />}
        />
        <MetricCard
          title="Grand Total"
          value={totals.grandTotal}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data?.distributionByDealership) return null;

    // Color palettes for different charts
    const pieColors = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5', '#059669', '#047857', '#065f46', '#064e3b', '#022c22'];

    const validDealerships = data.distributionByDealership.filter((d: any) => d.dealershipId);

    const distributionData: PieChartData[] = validDealerships.map((dealership: any, index: number) => ({
      name: dealership.dealershipName || 'Unknown',
      value: dealership.grandTotal || 0,
      color: pieColors[index % pieColors.length],
    }));

    const vehicleTypeData = validDealerships.map((dealership: any) => ({
      name: dealership.dealershipName || 'Unknown',
      vehicles: dealership.vehicles?.total || 0,
      master: dealership.masterVehicles?.total || 0,
      advertise: dealership.advertiseVehicles?.total || 0,
    }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Total Distribution by Dealership</h4>
            <InteractivePieChart data={distributionData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Vehicle Types by Dealership</h4>
            <StackedBarChart
              data={vehicleTypeData}
              xAxisKey="name"
              series={[
                { dataKey: 'vehicles', name: 'Vehicles', color: '#3b82f6' },
                { dataKey: 'master', name: 'Master', color: '#10b981' },
                { dataKey: 'advertise', name: 'Advertise', color: '#f59e0b' },
              ]}
              height={300}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.distributionByDealership) return null;

    const validDealerships = data.distributionByDealership.filter((d: any) => d.dealershipId);

    const columns = [
      { key: 'dealershipName', label: 'Dealership Name' },
      { key: 'vehicles', label: 'Vehicles' },
      { key: 'vehiclesByType', label: 'Vehicle Types' },
      { key: 'masterVehicles', label: 'Master' },
      { key: 'masterByStatus', label: 'Master Status' },
      { key: 'advertiseVehicles', label: 'Advertise' },
      { key: 'advertiseByStatus', label: 'Advertise Status' },
      { key: 'grandTotal', label: 'Grand Total' },
    ];

    const tableData = validDealerships.map((dealership: any) => {
      const vehicleTypes = dealership.vehicles?.byType || [];
      const masterStatus = dealership.masterVehicles?.byStatus || [];
      const advertiseStatus = dealership.advertiseVehicles?.byStatus || [];

      return {
        dealershipName: dealership.dealershipName || 'N/A',
        vehicles: dealership.vehicles?.total || 0,
        vehiclesByType: vehicleTypes.length > 0
          ? vehicleTypes.map((v: any) => `${v._id}: ${v.count}`).join(', ')
          : 'N/A',
        masterVehicles: dealership.masterVehicles?.total || 0,
        masterByStatus: masterStatus.length > 0
          ? masterStatus.map((s: any) => `${s._id}: ${s.count}`).join(', ')
          : 'N/A',
        advertiseVehicles: dealership.advertiseVehicles?.total || 0,
        advertiseByStatus: advertiseStatus.length > 0
          ? advertiseStatus.map((s: any) => `${s._id}: ${s.count}`).join(', ')
          : 'N/A',
        grandTotal: dealership.grandTotal || 0,
      };
    });

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Dealership Vehicle Distribution"
      subtitle="Vehicle distribution across all schemas by dealership"
      icon={<Car className="h-5 w-5" />}
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

export default DealershipVehicleDistributionReport;
