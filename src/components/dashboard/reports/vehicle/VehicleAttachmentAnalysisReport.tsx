import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Paperclip } from 'lucide-react';

interface VehicleAttachmentAnalysisReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const VehicleAttachmentAnalysisReport: React.FC<VehicleAttachmentAnalysisReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getVehicleAttachmentAnalysis(params);
      setData(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load attachment analysis data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting attachment analysis report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.metrics) return null;
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Attachments"
          value={data.metrics.totalAttachments || 0}
          icon={<Paperclip className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg per Vehicle"
          value={data.metrics.avgPerVehicle?.toFixed(1) || 0}
        />
        <MetricCard
          title="Images"
          value={data.metrics.totalImages || 0}
        />
        <MetricCard
          title="Documents"
          value={data.metrics.totalDocuments || 0}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const typeData: PieChartData[] = data.attachmentsByType?.map((item: any) => ({
      name: item.type,
      value: item.count,
    })) || [];

    const categoryData = data.attachmentsByCategory || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Attachments by Type</h4>
            <InteractivePieChart data={typeData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Attachments by Category</h4>
            <StackedBarChart
              data={categoryData}
              xAxisKey="category"
              series={[
                { dataKey: 'images', name: 'Images' },
                { dataKey: 'documents', name: 'Documents' },
                { dataKey: 'videos', name: 'Videos' },
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
      { key: 'vehicleType', label: 'Vehicle Type' },
      { key: 'totalAttachments', label: 'Total' },
      { key: 'images', label: 'Images' },
      { key: 'documents', label: 'Documents' },
      { key: 'avgPerVehicle', label: 'Avg/Vehicle' },
      { key: 'totalSize', label: 'Total Size (MB)' },
    ];

    return <DataTable columns={columns} data={data.tableData} />;
  };

  return (
    <ReportCard
      title="Vehicle Attachment Analysis"
      subtitle="Attachment patterns and quality metrics"
      icon={<Paperclip className="h-5 w-5" />}
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

export default VehicleAttachmentAnalysisReport;
