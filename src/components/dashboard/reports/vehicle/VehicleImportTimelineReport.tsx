import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { LineChart } from '@/components/dashboard/charts/LineChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Ship } from 'lucide-react';

interface VehicleImportTimelineReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const VehicleImportTimelineReport: React.FC<VehicleImportTimelineReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getVehicleImportTimeline(params);
      setData(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load import timeline data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting import timeline report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.metrics) return null;
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Imports"
          value={data.metrics.totalImports || 0}
          icon={<Ship className="h-5 w-5" />}
        />
        <MetricCard
          title="In Transit"
          value={data.metrics.inTransit || 0}
        />
        <MetricCard
          title="Avg Transit Days"
          value={data.metrics.avgTransitDays || 0}
        />
        <MetricCard
          title="Delayed"
          value={data.metrics.delayed || 0}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const timelineData = data.timeline || [];
    const portData = data.portDistribution || [];

    return (
      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-medium mb-4">Import Timeline</h4>
          <LineChart
            data={timelineData}
            xAxisKey="month"
            lines={[
              { dataKey: 'imports', name: 'Imports' },
              { dataKey: 'arrivals', name: 'Arrivals' },
            ]}
            height={300}
          />
        </div>
        <div>
          <h4 className="text-sm font-medium mb-4">Port Distribution</h4>
          <StackedBarChart
            data={portData}
            xAxisKey="port"
            series={[
              { dataKey: 'pending', name: 'Pending' },
              { dataKey: 'arrived', name: 'Arrived' },
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
      { key: 'port', label: 'Port' },
      { key: 'totalImports', label: 'Total' },
      { key: 'inTransit', label: 'In Transit' },
      { key: 'arrived', label: 'Arrived' },
      { key: 'avgDays', label: 'Avg Days' },
      { key: 'delayed', label: 'Delayed' },
    ];

    return <DataTable columns={columns} data={data.tableData} />;
  };

  return (
    <ReportCard
      title="Vehicle Import Timeline"
      subtitle="Import details and ETD/ETA analysis"
      icon={<Ship className="h-5 w-5" />}
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

export default VehicleImportTimelineReport;
