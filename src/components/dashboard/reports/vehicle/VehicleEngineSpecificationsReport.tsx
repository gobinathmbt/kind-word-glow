import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Gauge } from 'lucide-react';

interface VehicleEngineSpecificationsReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const VehicleEngineSpecificationsReport: React.FC<VehicleEngineSpecificationsReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getVehicleEngineSpecifications(params);
      setData(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load engine specifications data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting engine specifications report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.metrics) return null;
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Vehicles"
          value={data.metrics.totalVehicles || 0}
          icon={<Gauge className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Engine Size"
          value={`${data.metrics.avgEngineSize || 0}L`}
        />
        <MetricCard
          title="Petrol"
          value={data.metrics.petrol || 0}
        />
        <MetricCard
          title="Diesel"
          value={data.metrics.diesel || 0}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const fuelTypeData: PieChartData[] = data.fuelTypes?.map((item: any) => ({
      name: item.type,
      value: item.count,
    })) || [];

    const transmissionData = data.transmissionByType || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Fuel Type Distribution</h4>
            <InteractivePieChart data={fuelTypeData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Transmission by Type</h4>
            <StackedBarChart
              data={transmissionData}
              xAxisKey="type"
              series={[
                { dataKey: 'automatic', name: 'Automatic' },
                { dataKey: 'manual', name: 'Manual' },
              ]}
              height={300}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.tableData) return null;

    const columns = [
      { key: 'engineSize', label: 'Engine Size' },
      { key: 'count', label: 'Count' },
      { key: 'fuelType', label: 'Fuel Type' },
      { key: 'transmission', label: 'Transmission' },
      { key: 'avgPower', label: 'Avg Power (HP)' },
    ];

    return <DataTable columns={columns} data={data.tableData} />;
  };

  return (
    <ReportCard
      title="Vehicle Engine Specifications"
      subtitle="Engine types, transmission, and fuel analysis"
      icon={<Gauge className="h-5 w-5" />}
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

export default VehicleEngineSpecificationsReport;
