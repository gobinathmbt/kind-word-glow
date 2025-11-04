import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { MapPin } from 'lucide-react';

interface MasterVehicleSourceAnalysisReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const MasterVehicleSourceAnalysisReport: React.FC<MasterVehicleSourceAnalysisReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getMasterVehicleSourceAnalysis(params);
      setData(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load master vehicle source analysis data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting master vehicle source analysis report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.metrics) return null;
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Sources"
          value={data.metrics.totalSources || 0}
          icon={<MapPin className="h-5 w-5" />}
        />
        <MetricCard
          title="Active Suppliers"
          value={data.metrics.activeSuppliers || 0}
        />
        <MetricCard
          title="Import Sources"
          value={data.metrics.importSources || 0}
        />
        <MetricCard
          title="Local Sources"
          value={data.metrics.localSources || 0}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data) return null;

    const sourceData: PieChartData[] = data.sourceDistribution?.map((item: any) => ({
      name: item.source,
      value: item.count,
    })) || [];

    const supplierData = data.supplierPerformance || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Source Distribution</h4>
            <InteractivePieChart data={sourceData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Top Suppliers</h4>
            <StackedBarChart
              data={supplierData}
              xAxisKey="supplier"
              series={[
                { dataKey: 'vehicles', name: 'Vehicles' },
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
      { key: 'source', label: 'Source' },
      { key: 'supplier', label: 'Supplier' },
      { key: 'totalVehicles', label: 'Total Vehicles' },
      { key: 'avgPrice', label: 'Avg Price' },
      { key: 'lastPurchase', label: 'Last Purchase' },
    ];

    return <DataTable columns={columns} data={data.tableData} />;
  };

  return (
    <ReportCard
      title="Master Vehicle Source Analysis"
      subtitle="Source and supplier tracking"
      icon={<MapPin className="h-5 w-5" />}
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

export default MasterVehicleSourceAnalysisReport;
