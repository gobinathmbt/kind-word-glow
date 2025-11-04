import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Car, TrendingUp } from 'lucide-react';

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
      setData(response.data);
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
    if (!data?.data?.distributionByDealership) return null;
    
    const totals = data.data.distributionByDealership.reduce((acc: any, dealership: any) => ({
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
        />
        <MetricCard
          title="Master Vehicles"
          value={totals.totalMaster}
        />
        <MetricCard
          title="Advertise Vehicles"
          value={totals.totalAdvertise}
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
    if (!data?.data?.distributionByDealership) return null;

    const distributionData: PieChartData[] = data.data.distributionByDealership.map((dealership: any) => ({
      name: dealership.dealershipName,
      value: dealership.grandTotal || 0,
    }));

    const vehicleTypeData = data.data.distributionByDealership.map((dealership: any) => ({
      name: dealership.dealershipName,
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
                { dataKey: 'vehicles', name: 'Vehicles' },
                { dataKey: 'master', name: 'Master' },
                { dataKey: 'advertise', name: 'Advertise' },
              ]}
              height={300}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.data?.distributionByDealership) return null;

    const columns = [
      { key: 'dealershipName', label: 'Dealership' },
      { key: 'vehicles', label: 'Vehicles' },
      { key: 'masterVehicles', label: 'Master' },
      { key: 'advertiseVehicles', label: 'Advertise' },
      { key: 'grandTotal', label: 'Total' },
    ];

    const tableData = data.data.distributionByDealership.map((dealership: any) => ({
      dealershipName: dealership.dealershipName,
      vehicles: dealership.vehicles?.total || 0,
      masterVehicles: dealership.masterVehicles?.total || 0,
      advertiseVehicles: dealership.advertiseVehicles?.total || 0,
      grandTotal: dealership.grandTotal || 0,
    }));

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
