import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { LineChart } from '@/components/dashboard/charts/LineChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Activity } from 'lucide-react';

interface VehicleOdometerTrendsReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const VehicleOdometerTrendsReport: React.FC<VehicleOdometerTrendsReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getVehicleOdometerTrends(params);
      setData(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load odometer trends data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting odometer trends report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.metrics) return null;
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Avg Odometer"
          value={`${data.metrics.avgOdometer?.toLocaleString() || 0} km`}
          icon={<Activity className="h-5 w-5" />}
        />
        <MetricCard
          title="Low Mileage"
          value={data.metrics.lowMileage || 0}
        />
        <MetricCard
          title="Medium Mileage"
          value={data.metrics.mediumMileage || 0}
        />
        <MetricCard
          title="High Mileage"
          value={data.metrics.highMileage || 0}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const trendsData = data.trends || [];
    const rangeData = data.mileageRanges || [];

    return (
      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-medium mb-4">Odometer Trends Over Time</h4>
          <LineChart
            data={trendsData}
            xAxisKey="month"
            lines={[
              { dataKey: 'avgOdometer', name: 'Avg Odometer' },
            ]}
            height={300}
          />
        </div>
        <div>
          <h4 className="text-sm font-medium mb-4">Mileage Range Distribution</h4>
          <StackedBarChart
            data={rangeData}
            xAxisKey="range"
            series={[
              { dataKey: 'count', name: 'Vehicles' },
            ]}
            height={300}
          />
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.tableData) return null;

    const columns = [
      { key: 'vehicleType', label: 'Vehicle Type' },
      { key: 'avgOdometer', label: 'Avg Odometer (km)' },
      { key: 'minOdometer', label: 'Min (km)' },
      { key: 'maxOdometer', label: 'Max (km)' },
      { key: 'totalVehicles', label: 'Total' },
    ];

    return <DataTable columns={columns} data={data.tableData} />;
  };

  return (
    <ReportCard
      title="Vehicle Odometer Trends"
      subtitle="Odometer reading patterns and trends"
      icon={<Activity className="h-5 w-5" />}
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

export default VehicleOdometerTrendsReport;
