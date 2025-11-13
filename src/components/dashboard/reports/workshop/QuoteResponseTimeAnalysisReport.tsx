import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Clock } from 'lucide-react';

interface QuoteResponseTimeAnalysisReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const QuoteResponseTimeAnalysisReport: React.FC<QuoteResponseTimeAnalysisReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getQuoteResponseTimeAnalysis(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load response time data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting response time report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.supplierResponseTimes) return null;
    
    // Calculate overall metrics from supplier data
    const validSuppliers = data.supplierResponseTimes.filter((s: any) => s.avgResponseTime !== null);
    const totalResponses = data.supplierResponseTimes.reduce((sum: number, s: any) => sum + (s.totalResponses || 0), 0);
    const avgResponseTime = validSuppliers.length > 0
      ? validSuppliers.reduce((sum: number, s: any) => sum + (s.avgResponseTime || 0), 0) / validSuppliers.length
      : 0;
    const minResponseTime = validSuppliers.length > 0
      ? Math.min(...validSuppliers.map((s: any) => s.minResponseTime || Infinity))
      : 0;
    const maxResponseTime = validSuppliers.length > 0
      ? Math.max(...validSuppliers.map((s: any) => s.maxResponseTime || 0))
      : 0;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Avg Response Time"
          value={`${avgResponseTime.toFixed(1)}h`}
          icon={<Clock className="h-5 w-5" />}
        />
        <MetricCard
          title="Fastest Response"
          value={`${minResponseTime.toFixed(1)}h`}
        />
        <MetricCard
          title="Slowest Response"
          value={`${maxResponseTime.toFixed(1)}h`}
        />
        <MetricCard
          title="Total Responses"
          value={totalResponses}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data?.supplierResponseTimes) return null;

    // Filter out entries with null avgResponseTime and map to chart data
    const chartData = data.supplierResponseTimes
      .filter((item: any) => item.avgResponseTime !== null)
      .map((item: any) => ({
        supplier: item.supplierName || item.supplierId || 'Unknown',
        minResponseTime: item.minResponseTime || 0,
        avgResponseTime: item.avgResponseTime || 0,
        maxResponseTime: item.maxResponseTime || 0,
      }));

    return (
      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-medium mb-4">Response Time by Supplier (Hours)</h4>
          <StackedBarChart
            data={chartData}
            xAxisKey="supplier"
            series={[
              { dataKey: 'minResponseTime', name: 'Minimum', color: '#10b981' },
              { dataKey: 'avgResponseTime', name: 'Average', color: '#3b82f6' },
              { dataKey: 'maxResponseTime', name: 'Maximum', color: '#ef4444' },
            ]}
            height={300}
          />
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.supplierResponseTimes) return null;

    const tableData = data.supplierResponseTimes.map((item: any) => ({
      supplier: item.supplierName || item.supplierId || 'Unknown',
      totalResponses: item.totalResponses || 0,
      avgResponseTime: item.avgResponseTime !== null ? `${item.avgResponseTime.toFixed(2)}h` : 'N/A',
      minResponseTime: item.minResponseTime !== null ? `${item.minResponseTime.toFixed(2)}h` : 'N/A',
      maxResponseTime: item.maxResponseTime !== null ? `${item.maxResponseTime.toFixed(2)}h` : 'N/A',
    }));

    const columns = [
      { key: 'supplier', label: 'Supplier' },
      { key: 'totalResponses', label: 'Total Responses' },
      { key: 'avgResponseTime', label: 'Avg Response Time' },
      { key: 'minResponseTime', label: 'Min Response Time' },
      { key: 'maxResponseTime', label: 'Max Response Time' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Quote Response Time Analysis"
      subtitle="Response time metrics and patterns"
      icon={<Clock className="h-5 w-5" />}
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

export default QuoteResponseTimeAnalysisReport;
