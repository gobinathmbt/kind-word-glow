import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Settings } from 'lucide-react';

interface MasterVehicleSpecificationsReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const MasterVehicleSpecificationsReport: React.FC<MasterVehicleSpecificationsReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getMasterVehicleSpecifications(params);
      setData(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load master vehicle specifications data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting master vehicle specifications report as ${format}`);
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
          icon={<Settings className="h-5 w-5" />}
        />
        <MetricCard
          title="Unique Models"
          value={data.metrics.uniqueModels || 0}
        />
        <MetricCard
          title="Avg Engine Size"
          value={`${data.metrics.avgEngineSize || 0}L`}
        />
        <MetricCard
          title="Avg Year"
          value={data.metrics.avgYear || 0}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const transmissionData: PieChartData[] = data.transmissionDistribution?.map((item: any) => ({
      name: item.transmission,
      value: item.count,
    })) || [];

    const fuelTypeData = data.fuelTypeDistribution || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Transmission Distribution</h4>
            <InteractivePieChart data={transmissionData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Fuel Type Distribution</h4>
            <StackedBarChart
              data={fuelTypeData}
              xAxisKey="fuelType"
              series={[
                { dataKey: 'count', name: 'Count' },
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
      { key: 'make', label: 'Make' },
      { key: 'model', label: 'Model' },
      { key: 'transmission', label: 'Transmission' },
      { key: 'fuelType', label: 'Fuel Type' },
      { key: 'engineSize', label: 'Engine Size' },
      { key: 'count', label: 'Count' },
    ];

    return <DataTable columns={columns} data={data.tableData} />;
  };

  return (
    <ReportCard
      title="Master Vehicle Specifications"
      subtitle="Detailed specification analysis"
      icon={<Settings className="h-5 w-5" />}
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

export default MasterVehicleSpecificationsReport;
