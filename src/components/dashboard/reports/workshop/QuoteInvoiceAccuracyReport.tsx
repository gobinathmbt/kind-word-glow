import React, { useState, useEffect } from 'react';
import { ReportCard, ViewMode } from '@/components/dashboard/common/ReportCard';
import { MetricCard } from '@/components/dashboard/common/MetricCard';
import { InteractivePieChart, PieChartData } from '@/components/dashboard/charts/InteractivePieChart';
import { ComparisonChart } from '@/components/dashboard/charts/ComparisonChart';
import { DataTable } from '@/components/dashboard/charts/DataTable';
import { ExportButton } from '@/components/dashboard/common/ExportButton';
import { RefreshButton } from '@/components/dashboard/common/RefreshButton';
import { dashboardAnalyticsServices } from '@/api/services';
import { FileCheck } from 'lucide-react';

interface QuoteInvoiceAccuracyReportProps {
  dealershipIds?: string[] | null;
  dateRange?: { from: string; to: string };
  refreshTrigger?: number;
  exportEnabled?: boolean;
}

export const QuoteInvoiceAccuracyReport: React.FC<QuoteInvoiceAccuracyReportProps> = ({
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
      const response = await dashboardAnalyticsServices.getQuoteInvoiceAccuracy(params);
      setData(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load invoice accuracy data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealershipIds, dateRange, refreshTrigger]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting invoice accuracy report as ${format}`);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const renderMetrics = () => {
    if (!data?.summary) return null;
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Overall Accuracy"
          value={`${(data.summary.overallAccuracy || 0).toFixed(1)}%`}
          icon={<FileCheck className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Variance"
          value={`$${(data.summary.avgVariance || 0).toFixed(2)}`}
        />
        <MetricCard
          title="Total Invoices"
          value={data.summary.totalInvoices || 0}
        />
        <MetricCard
          title="Accurate Invoices"
          value={data.summary.accurateInvoices || 0}
        />
      </div>
    );
  };

  const renderCharts = () => {
    if (!data?.accuracyByType) return null;

    const pieData: PieChartData[] = data.accuracyByType.map((item: any) => ({
      name: item._id || 'Unknown',
      value: item.accuracyRate || 0,
    }));

    const comparisonData = data.accuracyByType.map((item: any) => ({
      name: item._id || 'Unknown',
      value: item.accuracyRate || 0,
      label: `${(item.accuracyRate || 0).toFixed(1)}%`,
    }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Accuracy Rate by Quote Type</h4>
            <InteractivePieChart data={pieData} height={300} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Accuracy Comparison</h4>
            <ComparisonChart data={comparisonData} height={300} />
          </div>
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (!data?.accuracyByType) return null;

    const tableData = data.accuracyByType.map((item: any) => ({
      quoteType: item._id || 'Unknown',
      totalInvoices: item.totalInvoices || 0,
      avgVariance: `$${(item.avgVariance || 0).toFixed(2)}`,
      accuracyRate: `${(item.accuracyRate || 0).toFixed(1)}%`,
    }));

    const columns = [
      { key: 'quoteType', label: 'Quote Type' },
      { key: 'totalInvoices', label: 'Total Invoices' },
      { key: 'avgVariance', label: 'Avg Variance' },
      { key: 'accuracyRate', label: 'Accuracy Rate' },
    ];

    return <DataTable columns={columns} data={tableData} />;
  };

  return (
    <ReportCard
      title="Quote Invoice Accuracy"
      subtitle="Invoice vs quote variance analysis"
      icon={<FileCheck className="h-5 w-5" />}
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

export default QuoteInvoiceAccuracyReport;
