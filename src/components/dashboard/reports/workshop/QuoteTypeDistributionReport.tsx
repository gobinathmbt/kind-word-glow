import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { StackedBarChart } from '@/components/dashboard/charts/StackedBarChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { Layers } from 'lucide-react';

interface QuoteTypeDistributionReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const QuoteTypeDistributionReport: React.FC<QuoteTypeDistributionReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getQuoteTypeDistribution(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load quote type distribution data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting quote type distribution report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.summary) return null;
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Supplier Quotes"
          value={data.summary.supplierQuotes || 0}
          icon={<Layers className="h-5 w-5" />}
        />
        <MetricCard
          title="Bay Quotes"
          value={data.summary.bayQuotes || 0}
        />
        <MetricCard
          title="Manual Quotes"
          value={data.summary.manualQuotes || 0}
        />
        <MetricCard
          title="Total Quotes"
          value={data.summary.totalQuotes || 0}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data?.distribution) return null;

    const pieData: PieChartData[] = data.distribution.map((item: any) => ({
      name: item._id || 'Unknown',
      value: item.count || 0,
    }));

    const barData = data.distribution.map((item: any) => ({
      type: item._id || 'Unknown',
      count: item.count || 0,
      avgAmount: item.avgQuoteAmount || 0,
    }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Quote Type Distribution</h4>
            <InteractivePieChart data={pieData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Average Quote Amount by Type</h4>
            <StackedBarChart
              data={barData}
              xAxisKey="type"
              series={[{ dataKey: 'avgAmount', name: 'Avg Amount', color: '#3b82f6' }]}
              height={300}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.distribution) return null;

    const tableData = data.distribution.map((item: any) => ({
      quoteType: item._id || 'Unknown',
      count: item.count || 0,
      avgQuoteAmount: `$${(item.avgQuoteAmount || 0).toFixed(2)}`,
      totalQuoteAmount: `$${(item.totalQuoteAmount || 0).toFixed(2)}`,
    }));

    const columns = [
      { key: 'quoteType', label: 'Quote Type' },
      { key: 'count', label: 'Count' },
      { key: 'avgQuoteAmount', label: 'Avg Quote Amount' },
      { key: 'totalQuoteAmount', label: 'Total Quote Amount' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Quote Type Distribution"
      subtitle="Distribution across supplier/bay/manual quotes"
      icon={<Layers className="h-5 w-5" />}
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

export default QuoteTypeDistributionReport;
