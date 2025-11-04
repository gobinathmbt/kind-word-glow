import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { LineChart } from '@/components/dashboard/charts/LineChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { ListChecks } from 'lucide-react';

interface VehicleQueueProcessingReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const VehicleQueueProcessingReport: React.FC<VehicleQueueProcessingReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getVehicleQueueProcessing(params);
      setData(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load queue processing data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting queue processing report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.metrics) return null;
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="In Queue"
          value={data.metrics.inQueue || 0}
          icon={<ListChecks className="h-5 w-5" />}
        />
        <MetricCard
          title="Processing"
          value={data.metrics.processing || 0}
        />
        <MetricCard
          title="Completed"
          value={data.metrics.completed || 0}
        />
        <MetricCard
          title="Failed"
          value={data.metrics.failed || 0}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const statusData: PieChartData[] = data.queueStatus?.map((item: any) => ({
      name: item.status,
      value: item.count,
    })) || [];

    const processingData = data.processingTrends || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Queue Status</h4>
            <InteractivePieChart data={statusData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Processing Trends</h4>
            <LineChart
              data={processingData}
              xAxisKey="date"
              lines={[
                { dataKey: 'processed', name: 'Processed' },
                { dataKey: 'failed', name: 'Failed' },
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
      { key: 'queueType', label: 'Queue Type' },
      { key: 'inQueue', label: 'In Queue' },
      { key: 'processing', label: 'Processing' },
      { key: 'completed', label: 'Completed' },
      { key: 'failed', label: 'Failed' },
      { key: 'avgProcessTime', label: 'Avg Time (min)' },
    ];

    return <DataTable columns={columns} data={data.tableData} />;
  };

  return (
    <ReportCard
      title="Vehicle Queue Processing"
      subtitle="Queue status and processing attempts"
      icon={<ListChecks className="h-5 w-5" />}
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

export default VehicleQueueProcessingReport;
